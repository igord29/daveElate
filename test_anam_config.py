#!/usr/bin/env python3
"""
Test Anam.ai configuration loading for the agent
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env')

print("🎭 Anam.ai Configuration Test")
print("=" * 40)

# Simulate the same configuration loading as anam_agent.py
ANAM_CONFIG = {
    "api_key": os.getenv("ANAM_API_KEY", "your_anam_api_key_here"),
    "avatar_id": os.getenv("ANAM_AVATAR_ID", "demo-avatar-001"),
    "avatar_name": os.getenv("ANAM_AVATAR_NAME", "AI Assistant"),
}

print(f"🎭 Anam.ai Configuration:")
print(f"  Avatar ID: {ANAM_CONFIG['avatar_id']}")
print(f"  Avatar Name: {ANAM_CONFIG['avatar_name']}")
print(f"  API Key: {'✅ Set' if ANAM_CONFIG['api_key'] != 'your_anam_api_key_here' else '❌ Not set'}")

# Test if the configuration is correct
if ANAM_CONFIG['avatar_id'] == "aea2cf13-5e40-4c0f-bd4e-b597b1c0acb4":
    print("✅ Avatar ID is correctly set to your actual avatar!")
else:
    print(f"❌ Avatar ID mismatch. Expected: aea2cf13-5e40-4c0f-bd4e-b597b1c0acb4, Got: {ANAM_CONFIG['avatar_id']}")

if ANAM_CONFIG['avatar_name'] == "Dave":
    print("✅ Avatar Name is correctly set to 'Dave'!")
else:
    print(f"❌ Avatar Name mismatch. Expected: Dave, Got: {ANAM_CONFIG['avatar_name']}")

if ANAM_CONFIG['api_key'] != "your_anam_api_key_here":
    print("✅ API Key is set with your actual Anam.ai credentials!")
else:
    print("❌ API Key is still using placeholder value")

print("\n🚀 Configuration Status:")
if all([
    ANAM_CONFIG['avatar_id'] == "aea2cf13-5e40-4c0f-bd4e-b597b1c0acb4",
    ANAM_CONFIG['avatar_name'] == "Dave",
    ANAM_CONFIG['api_key'] != "your_anam_api_key_here"
]):
    print("✅ All Anam.ai configuration is correctly set!")
    print("✅ The anam_agent.py will use your actual avatar: Dave")
    print("✅ The agent is ready to run with your real Anam.ai avatar!")
else:
    print("❌ Some configuration values need to be updated")
    print("Please check your .env file and ensure all values are correct")
