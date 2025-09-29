#!/usr/bin/env python3
"""
Test script to verify that the agent reads configuration from .env file
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv('.env')

print("🔧 Testing Configuration Loading")
print("=" * 40)

# Test Anam.ai configuration
anam_api_key = os.getenv("ANAM_API_KEY")
anam_avatar_id = os.getenv("ANAM_AVATAR_ID")
anam_avatar_name = os.getenv("ANAM_AVATAR_NAME")

print(f"📁 Loading from: .env file")
print(f"🤖 Anam API Key: {anam_api_key}")
print(f"🎭 Avatar ID: {anam_avatar_id}")
print(f"👤 Avatar Name: {anam_avatar_name}")

# Test if values are loaded correctly
if anam_avatar_id and anam_avatar_id != "demo-avatar-001":
    print(f"✅ Avatar ID is set to: {anam_avatar_id}")
else:
    print("❌ Avatar ID is still using default value")

if anam_api_key and anam_api_key != "your_anam_api_key_here":
    print(f"✅ API Key is set (length: {len(anam_api_key)})")
else:
    print("❌ API Key is still using placeholder value")

print("\n📋 To update your configuration:")
print("1. Edit the .env file")
print("2. Update ANAM_AVATAR_ID with your actual avatar ID")
print("3. Update ANAM_API_KEY with your actual API key")
print("4. Run: python anam_agent.py")
