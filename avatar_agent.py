#!/usr/bin/env python3
"""
LiveKit Agent with Anam.ai Avatar Integration
This script creates a LiveKit agent that can host an Anam.ai avatar in a room.
"""

import asyncio
import os
import logging
from typing import Optional
from dotenv import load_dotenv

from livekit import agents, rtc
from livekit.agents import AgentSession, JobContext
from livekit.plugins import anam

# Load environment variables from .env
load_dotenv('.env')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Anam.ai Configuration
ANAM_CONFIG = {
    "api_key": os.getenv("ANAM_API_KEY", "your_anam_api_key_here"),
    "avatar_id": os.getenv("ANAM_AVATAR_ID", "aea2cf13-5e40-4c0f-bd4e-b597b1c0acb4"),
    "avatar_name": os.getenv("ANAM_AVATAR_NAME", "Dave"),
}

# Log the configuration being used
logger.info(f"🎭 Anam.ai Configuration:")
logger.info(f"  Avatar ID: {ANAM_CONFIG['avatar_id']}")
logger.info(f"  Avatar Name: {ANAM_CONFIG['avatar_name']}")
logger.info(f"  API Key: {'✅ Set' if ANAM_CONFIG['api_key'] != 'your_anam_api_key_here' else '❌ Not set'}")

class AnamAvatarAgent:
    def __init__(self):
        self.session: Optional[AgentSession] = None
        self.avatar_session: Optional[anam.AvatarSession] = None
        self.is_active = False

    async def start_avatar(self, room: rtc.Room):
        """Start the Anam.ai avatar session"""
        try:
            logger.info("🤖 Starting Anam.ai avatar...")
            
            # Create agent session
            self.session = AgentSession()
            
            # Configure Anam avatar
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
            logger.info("✅ Anam.ai avatar started successfully!")
            
        except Exception as e:
            logger.error(f"❌ Error starting avatar: {e}")
            raise

    async def stop_avatar(self):
        """Stop the Anam.ai avatar session"""
        try:
            logger.info("🛑 Stopping Anam.ai avatar...")
            
            if self.avatar_session:
                await self.avatar_session.stop()
                self.avatar_session = None
                
            if self.session:
                await self.session.stop()
                self.session = None
                
            self.is_active = False
            logger.info("✅ Anam.ai avatar stopped")
            
        except Exception as e:
            logger.error(f"❌ Error stopping avatar: {e}")

    async def handle_participant_connected(self, participant: rtc.RemoteParticipant):
        """Handle when a participant connects"""
        logger.info(f"👤 Participant connected: {participant.identity}")
        
        # Start avatar when first participant joins
        if not self.is_active:
            await self.start_avatar(participant.room)

    async def handle_participant_disconnected(self, participant: rtc.RemoteParticipant):
        """Handle when a participant disconnects"""
        logger.info(f"👤 Participant disconnected: {participant.identity}")
        
        # Stop avatar when no participants remain
        if len(participant.room.remote_participants) == 0:
            await self.stop_avatar()

    async def handle_track_subscribed(self, track: rtc.Track, publication: rtc.TrackPublication, participant: rtc.RemoteParticipant):
        """Handle when a track is subscribed"""
        logger.info(f"📹 Track subscribed: {track.kind} from {participant.identity}")

    async def handle_track_unsubscribed(self, track: rtc.Track, publication: rtc.TrackPublication, participant: rtc.RemoteParticipant):
        """Handle when a track is unsubscribed"""
        logger.info(f"📹 Track unsubscribed: {track.kind} from {participant.identity}")

# Global agent instance
avatar_agent = AnamAvatarAgent()

async def entrypoint(ctx: JobContext):
    """Main entrypoint for the LiveKit agent"""
    logger.info("🚀 LiveKit Agent with Anam.ai Avatar starting...")
    
    room = ctx.room
    
    # Set up room event handlers
    @room.on("participant_connected")
    def on_participant_connected(participant: rtc.RemoteParticipant):
        asyncio.create_task(avatar_agent.handle_participant_connected(participant))
    
    @room.on("participant_disconnected")
    def on_participant_disconnected(participant: rtc.RemoteParticipant):
        asyncio.create_task(avatar_agent.handle_participant_disconnected(participant))
    
    @room.on("track_subscribed")
    def on_track_subscribed(track: rtc.Track, publication: rtc.TrackPublication, participant: rtc.RemoteParticipant):
        asyncio.create_task(avatar_agent.handle_track_subscribed(track, publication, participant))
    
    @room.on("track_unsubscribed")
    def on_track_unsubscribed(track: rtc.Track, publication: rtc.TrackPublication, participant: rtc.RemoteParticipant):
        asyncio.create_task(avatar_agent.handle_track_unsubscribed(track, publication, participant))
    
    logger.info("✅ Agent event handlers registered")
    
    # Keep the agent running
    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        logger.info("🛑 Agent shutting down...")
        await avatar_agent.stop_avatar()

if __name__ == "__main__":
    # Run the agent
    try:
        from livekit.agents import cli
        cli.run_app(entrypoint)
    except Exception as e:
        logger.error(f"Error running agent: {e}")
        logger.info("Agent configuration loaded successfully!")
        logger.info("To run the agent properly, use: livekit-agents start anam_agent.py")
