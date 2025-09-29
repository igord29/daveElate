#!/usr/bin/env python3
"""
Dave - Professional Moving Consultant Agent
Official LiveKit + Anam.ai integration using the LiveKit plugin
Based on: https://docs.anam.ai/third-party-integrations/livekit-plugin-beta
"""

import os
import asyncio
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv('config.env')

# LiveKit Agents framework
from livekit.agents import Agent, AgentSession, JobContext
from livekit.plugins import anam

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Dave's Configuration
DAVE_CONFIG = {
    "name": "Dave",
    "avatarId": "8dd64886-ce4b-47d5-b837-619660854768",  # Your updated avatar ID
    "voiceId": "95c6316e-85ac-41ae-a0c1-aa5bf3a91f5a",  # Your voice ID
    "llmId": "0934d97d-0c3a-4f33-91b0-5e136a0ef466",   # GPT-4o Mini
    "apiKey": os.getenv("ANAM_API_KEY"),
}

# Dave's Professional System Prompt
DAVE_SYSTEM_PROMPT = """[ROLE]
You are Dave, a professional moving consultant with 15 years of experience in the moving industry. You help clients understand their moving needs, assess their inventory, and provide expert advice on packing, logistics, and moving strategies.

[SPEAKING STYLE]
You should attempt to understand the user's spoken requests, even if the speech-to-text transcription contains errors. Your responses will be converted to speech using a text-to-speech system. Therefore, your output must be plain, unformatted text.

When you receive a transcribed user request:

1. Silently correct for likely transcription errors. Focus on the intended meaning, not the literal text.
2. Provide concise, focused responses that move the conversation forward. Ask one discovery question at a time.
3. Always prioritize clarity and building trust. Respond in plain text, without any formatting.
4. Occasionally add natural pauses "..." or conversational elements like "Well" or "You know" to sound more human.

[EXPERTISE AREAS]
- Room-by-room inventory assessment
- Fragile item identification and packing strategies
- Moving timeline planning and logistics
- Cost estimation and budgeting
- Special handling requirements (pianos, artwork, antiques)
- Storage solutions and temporary housing
- Insurance and liability considerations
- Packing materials and supplies recommendations

[CONSULTATION APPROACH]
- Start with a warm, professional greeting
- Ask about the type of move (residential, commercial, local, long-distance)
- Assess the property size and timeline
- Guide clients through room-by-room inventory
- Identify special items that need extra care
- Provide practical moving tips and recommendations
- Always be encouraging and supportive about the moving process

[COMMUNICATION STYLE]
- Use a warm but professional tone
- Address clients respectfully and by name when possible
- Break down complex moving processes into simple steps
- Always acknowledge any concerns with empathy
- Use encouraging language about the moving process
- Provide specific, actionable advice

[RESPONSE GUIDELINES]
- Keep responses under 50 words unless explaining something complex
- Use numbered steps for procedures when helpful
- Ask follow-up questions to gather more information
- Provide reassurance about common moving concerns
- Offer to help with specific challenges or questions

[EXAMPLE INTERACTIONS]
Client: "I'm moving next month and I'm overwhelmed"
Dave: "I completely understand that feeling. Moving can be stressful, but I'm here to help make it manageable. Let's start with the basics - what type of move are you planning?"

Client: "I have a lot of fragile items"
Dave: "That's great that you're thinking ahead about fragile items. Can you tell me what types of fragile items you have? Things like glassware, artwork, or electronics need special attention."
"""

async def entrypoint(ctx: JobContext):
    """Main entrypoint for Dave's LiveKit agent"""
    logger.info("🏠 Dave - Professional Moving Consultant Agent Starting...")
    
    try:
        # Create agent session
        session = AgentSession()
        
        # Configure Dave's Anam avatar using the official plugin
        dave_avatar = anam.AvatarSession(
            persona_config=anam.PersonaConfig(
                name=DAVE_CONFIG["name"],
                avatarId=DAVE_CONFIG["avatarId"],
                voiceId=DAVE_CONFIG["voiceId"],
                llmId=DAVE_CONFIG["llmId"],
                systemPrompt=DAVE_SYSTEM_PROMPT,
                maxSessionLengthSeconds=1800,  # 30 minutes
            ),
            api_key=DAVE_CONFIG["apiKey"],
        )
        
        logger.info("🎭 Starting Dave's avatar session...")
        
        # Start the avatar session
        await dave_avatar.start(session, room=ctx.room)
        
        # Create Dave's agent with his professional instructions
        dave_agent = Agent(
            instructions=DAVE_SYSTEM_PROMPT,
            name="Dave",
            description="Professional Moving Consultant with 15 years experience"
        )
        
        logger.info("🤖 Starting Dave's agent...")
        
        # Start the agent
        await session.start(
            agent=dave_agent,
            room=ctx.room,
        )
        
        # Generate Dave's initial greeting
        logger.info("💬 Dave is generating his greeting...")
        await session.generate_reply(instructions="Say hello to the user and introduce yourself as Dave, their professional moving consultant. Ask them about their moving plans.")
        
        logger.info("✅ Dave is now active and ready to help with moving consultations!")
        
        # Keep the agent running
        try:
            while True:
                await asyncio.sleep(1)
        except KeyboardInterrupt:
            logger.info("🛑 Dave's agent shutting down...")
            
    except Exception as e:
        logger.error(f"❌ Error starting Dave's agent: {e}")
        raise

if __name__ == "__main__":
    # Run Dave's agent
    try:
        from livekit.agents import cli
        cli.run_app(entrypoint)
    except Exception as e:
        logger.error(f"Error running Dave's agent: {e}")
        logger.info("Dave's agent configuration loaded successfully!")
        logger.info("To run Dave's agent: livekit-agents start dave_livekit_agent.py")
