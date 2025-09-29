#!/usr/bin/env python3
"""
Enhanced LiveKit Agent with Anam.ai Avatar + Vision Analysis
This agent combines room inventory detection with Anam.ai avatar interaction
for moving consultation meetings.
"""

import asyncio
import os
import io
import time
import base64
import json
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv('config.env')

# LiveKit Agents framework
from livekit import agents, rtc
from livekit.agents import AgentSession, JobContext
from livekit.agents.pipeline import VideoSource, AudioSource
from livekit.agents.rtc import subscribe_remote_tracks, publish_audio_track, publish_video_track
from livekit.agents.utils import video_frame_to_image

# Anam.ai integration
from livekit.plugins import anam

# Vision model (OpenAI)
from openai import OpenAI

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration
ANAM_CONFIG = {
    "api_key": os.getenv("ANAM_API_KEY"),
    "avatar_id": os.getenv("ANAM_AVATAR_ID", "aea2cf13-5e40-4c0f-bd4e-b597b1c0acb4"),
    "avatar_name": os.getenv("ANAM_AVATAR_NAME", "Dave"),
}

# OpenAI Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if OPENAI_API_KEY:
    oai = OpenAI(api_key=OPENAI_API_KEY)
else:
    logger.warning("⚠️ OPENAI_API_KEY not set - vision analysis will be limited")

# System prompt for moving consultation
SYSTEM_PROMPT = (
    "You are Dave, a professional moving consultant. Analyze the room and provide a detailed inventory. "
    "Respond with JSON only in this format: "
    '{"room_type": "bedroom/kitchen/living_room/etc", "items":[{"name":"item_name", "qty":1, "size":"small/medium/large", "fragile":true/false}], "notes":"additional_observations"}'
)

@dataclass
class SessionState:
    inventory: Dict[str, Dict[str, Dict]] = field(default_factory=dict)  # room -> item -> details
    last_emit_ts: float = 0.0
    consultation_notes: List[str] = field(default_factory=list)
    current_room: str = "unknown"

state = SessionState()

class EnhancedAnamAgent:
    def __init__(self):
        self.session: Optional[AgentSession] = None
        self.avatar_session: Optional[anam.AvatarSession] = None
        self.is_active = False
        self.room = None

    async def start_avatar(self, room: rtc.Room):
        """Start the Anam.ai avatar session with enhanced capabilities"""
        try:
            logger.info("🤖 Starting Enhanced Anam.ai avatar...")
            
            # Create agent session
            self.session = AgentSession()
            self.room = room
            
            # Configure Anam avatar with enhanced persona
            persona_config = anam.PersonaConfig(
                name=ANAM_CONFIG["avatar_name"],
                avatarId=ANAM_CONFIG["avatar_id"],
            )
            
            # Create avatar session
            self.avatar_session = anam.AvatarSession(
                persona_config=persona_config,
                api_key=ANAM_CONFIG["api_key"]
            )
            
            # Start avatar session
            await self.avatar_session.start(self.session, room=room)
            await self.session.start()
            
            self.is_active = True
            logger.info("✅ Enhanced Anam.ai avatar started successfully!")
            
            # Send welcome message
            await self.send_consultation_message(
                "Hello! I'm Dave, your moving consultant. I'll help you inventory your items. "
                "Please show me around the room slowly so I can see everything clearly."
            )
            
        except Exception as e:
            logger.error(f"❌ Error starting avatar: {e}")
            raise

    async def stop_avatar(self):
        """Stop the Anam.ai avatar session"""
        try:
            logger.info("🛑 Stopping Enhanced Anam.ai avatar...")
            
            if self.avatar_session:
                await self.avatar_session.stop()
                self.avatar_session = None
                
            if self.session:
                await self.session.stop()
                self.session = None
                
            self.is_active = False
            logger.info("✅ Enhanced Anam.ai avatar stopped")
            
        except Exception as e:
            logger.error(f"❌ Error stopping avatar: {e}")

    async def send_consultation_message(self, message: str):
        """Send a consultation message via LiveKit data channel"""
        try:
            if self.room:
                await self.room.local_participant.publish_data(
                    message.encode("utf-8"), reliable=True
                )
                logger.info(f"📤 Sent consultation message: {message}")
        except Exception as e:
            logger.error(f"❌ Error sending message: {e}")

    def call_vision_analysis(self, image_bytes: bytes) -> dict:
        """Analyze room image for inventory"""
        if not OPENAI_API_KEY:
            return {"room_type": "unknown", "items": [], "notes": "Vision analysis not available"}
        
        try:
            b64 = base64.b64encode(image_bytes).decode()
            resp = oai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": [
                        {"type": "text", "text": "Analyze this room for moving inventory."},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}}
                    ]}
                ],
                temperature=0.2,
            )
            txt = resp.choices[0].message.content
            try:
                return json.loads(txt)
            except:
                return {"room_type": "unknown", "items": [], "notes": txt}
        except Exception as e:
            logger.error(f"❌ Vision analysis error: {e}")
            return {"room_type": "unknown", "items": [], "notes": f"Analysis error: {e}"}

    def add_to_inventory(self, detection: dict):
        """Add detected items to inventory"""
        room = detection.get("room_type", "unknown")
        state.current_room = room
        state.inventory.setdefault(room, {})
        
        for item in detection.get("items", []):
            name = item.get("name", "item").lower().strip()
            qty = int(item.get("qty", 1))
            size = item.get("size", "medium")
            fragile = item.get("fragile", False)
            
            if name in state.inventory[room]:
                state.inventory[room][name]["qty"] += qty
            else:
                state.inventory[room][name] = {
                    "qty": qty,
                    "size": size,
                    "fragile": fragile
                }
        
        # Add notes
        if detection.get("notes"):
            state.consultation_notes.append(f"{room}: {detection['notes']}")

    def generate_inventory_summary(self) -> str:
        """Generate a summary of the current inventory"""
        if not state.inventory:
            return "No items detected yet. Please show me around the room."
        
        summary = []
        for room, items in state.inventory.items():
            if items:
                room_items = []
                for name, details in items.items():
                    qty = details["qty"]
                    size = details["size"]
                    fragile = " (fragile)" if details["fragile"] else ""
                    room_items.append(f"{name} x{qty} ({size}){fragile}")
                
                summary.append(f"**{room.title()}**: {', '.join(room_items)}")
        
        return "\n".join(summary) if summary else "No items detected yet."

    async def process_video_frame(self, frame):
        """Process video frame for inventory analysis"""
        try:
            # Convert frame to image
            img = video_frame_to_image(frame)
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=85)
            
            # Analyze with vision
            detection = self.call_vision_analysis(buf.getvalue())
            self.add_to_inventory(detection)
            
            # Send periodic updates
            now = time.time()
            if now - state.last_emit_ts > 15:  # Every 15 seconds
                if detection.get("room_type") != "unknown":
                    message = f"I can see this is a {detection['room_type']}. "
                    if detection.get("items"):
                        message += f"I've detected {len(detection['items'])} items. "
                    message += "Please continue showing me around for a complete inventory."
                else:
                    message = "I'm having trouble seeing clearly. Please ensure good lighting and show items slowly."
                
                await self.send_consultation_message(message)
                state.last_emit_ts = now
                
        except Exception as e:
            logger.error(f"❌ Error processing video frame: {e}")

    async def handle_participant_connected(self, participant: rtc.RemoteParticipant):
        """Handle when a participant connects"""
        logger.info(f"👤 Participant connected: {participant.identity}")
        
        # Start avatar when first participant joins
        if not self.is_active:
            await self.start_avatar(participant.room)

    async def handle_participant_disconnected(self, participant: rtc.RemoteParticipant):
        """Handle when a participant disconnects"""
        logger.info(f"👤 Participant disconnected: {participant.identity}")
        
        # Generate final inventory summary
        if len(participant.room.remote_participants) == 0:
            summary = self.generate_inventory_summary()
            await self.send_consultation_message(f"Final inventory summary:\n{summary}")
            
            # Save inventory to file
            self.save_inventory_to_file()
            await self.stop_avatar()

    def save_inventory_to_file(self):
        """Save inventory to JSON file"""
        try:
            inventory_data = {
                "timestamp": time.time(),
                "inventory": state.inventory,
                "notes": state.consultation_notes,
                "current_room": state.current_room
            }
            
            with open("inventory.json", "w") as f:
                json.dump(inventory_data, f, indent=2)
            
            logger.info("💾 Inventory saved to inventory.json")
        except Exception as e:
            logger.error(f"❌ Error saving inventory: {e}")

# Global agent instance
enhanced_agent = EnhancedAnamAgent()

async def entrypoint(ctx: JobContext):
    """Main entrypoint for the enhanced LiveKit agent"""
    logger.info("🚀 Enhanced LiveKit Agent with Anam.ai Avatar + Vision Analysis starting...")
    
    room = ctx.room
    
    # Set up room event handlers
    @room.on("participant_connected")
    def on_participant_connected(participant: rtc.RemoteParticipant):
        asyncio.create_task(enhanced_agent.handle_participant_connected(participant))
    
    @room.on("participant_disconnected")
    def on_participant_disconnected(participant: rtc.RemoteParticipant):
        asyncio.create_task(enhanced_agent.handle_participant_disconnected(participant))
    
    # Subscribe to remote tracks for video analysis
    async for event in subscribe_remote_tracks(ctx):
        if event.kind == "video":
            logger.info(f"📹 Processing video from {event.participant.identity}")
            async for frame in event.track:
                await enhanced_agent.process_video_frame(frame)
    
    logger.info("✅ Enhanced agent event handlers registered")
    
    # Keep the agent running
    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        logger.info("🛑 Enhanced agent shutting down...")
        await enhanced_agent.stop_avatar()

if __name__ == "__main__":
    # Run the enhanced agent
    try:
        from livekit.agents import cli
        cli.run_app(entrypoint)
    except Exception as e:
        logger.error(f"Error running enhanced agent: {e}")
        logger.info("Enhanced agent configuration loaded successfully!")
        logger.info("To run the enhanced agent: livekit-agents start enhanced_anam_agent.py")
