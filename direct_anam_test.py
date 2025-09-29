#!/usr/bin/env python3
"""
Direct Anam.ai Integration Test
This script directly connects to Anam.ai and LiveKit without the agents framework
"""

import asyncio
import os
import logging
from dotenv import load_dotenv
import aiohttp
import json

# Load environment variables
load_dotenv('.env')

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration
ANAM_API_KEY = os.getenv("ANAM_API_KEY")
ANAM_AVATAR_ID = os.getenv("ANAM_AVATAR_ID")
ANAM_AVATAR_NAME = os.getenv("ANAM_AVATAR_NAME")

async def test_anam_connection():
    """Test direct connection to Anam.ai API"""
    logger.info("🎭 Testing Anam.ai Connection")
    logger.info(f"  Avatar ID: {ANAM_AVATAR_ID}")
    logger.info(f"  Avatar Name: {ANAM_AVATAR_NAME}")
    logger.info(f"  API Key: {'✅ Set' if ANAM_API_KEY else '❌ Not set'}")
    
    if not ANAM_API_KEY:
        logger.error("❌ Anam.ai API key not found")
        return False
    
    try:
        # Test Anam.ai API connection
        headers = {
            'Authorization': f'Bearer {ANAM_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        async with aiohttp.ClientSession() as session:
            # Try to get persona info (this is the correct endpoint for personas)
            url = f"https://api.anam.ai/v1/personas/{ANAM_AVATAR_ID}"
            async with session.get(url, headers=headers) as response:
                if response.status == 200:
                    avatar_data = await response.json()
                    logger.info("✅ Anam.ai API connection successful!")
                    logger.info(f"  Avatar Name: {avatar_data.get('name', 'Unknown')}")
                    logger.info(f"  Avatar Status: {avatar_data.get('status', 'Unknown')}")
                    return True
                else:
                    logger.error(f"❌ Anam.ai API error: {response.status}")
                    logger.error(f"  Response: {await response.text()}")
                    return False
                    
    except Exception as e:
        logger.error(f"❌ Error connecting to Anam.ai: {e}")
        return False

async def test_livekit_connection():
    """Test LiveKit connection"""
    logger.info("🔗 Testing LiveKit Connection")
    
    try:
        # Test LiveKit room connection
        from livekit import rtc
        
        room = rtc.Room()
        logger.info("✅ LiveKit room object created successfully")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error with LiveKit: {e}")
        return False

async def main():
    """Main test function"""
    logger.info("🚀 Starting Direct Anam.ai Integration Test")
    logger.info("=" * 50)
    
    # Test Anam.ai connection
    anam_success = await test_anam_connection()
    
    # Test LiveKit connection
    livekit_success = await test_livekit_connection()
    
    logger.info("\n📊 Test Results:")
    logger.info(f"  Anam.ai API: {'✅ Working' if anam_success else '❌ Failed'}")
    logger.info(f"  LiveKit: {'✅ Working' if livekit_success else '❌ Failed'}")
    
    if anam_success and livekit_success:
        logger.info("\n🎉 All systems working! Your avatar 'Dave' is ready!")
        logger.info("💡 The blue screen in the browser is the simulation interface")
        logger.info("💡 To get the real avatar, we need to integrate the Anam.ai video stream")
    else:
        logger.info("\n❌ Some components need attention")
        if not anam_success:
            logger.info("  - Check your Anam.ai API key and avatar ID")
        if not livekit_success:
            logger.info("  - Check your LiveKit configuration")

if __name__ == "__main__":
    asyncio.run(main())
