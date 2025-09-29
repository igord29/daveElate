#!/usr/bin/env python3
"""
Environment Setup Script for LiveKit + Anam.ai Integration
This script helps you configure your environment variables.
"""

import os
import shutil

def setup_environment():
    """Set up the environment configuration"""
    print("🔧 Setting up LiveKit + Anam.ai Environment")
    print("=" * 50)
    
    # Check if config.env exists
    if os.path.exists('config.env'):
        print("✅ config.env file found")
    else:
        print("❌ config.env file not found")
        return
    
    # Check if .env exists
    if os.path.exists('.env'):
        print("✅ .env file already exists")
    else:
        # Copy config.env to .env
        shutil.copy('config.env', '.env')
        print("✅ Created .env file from config.env")
    
    # Display current configuration
    print("\n📋 Current Configuration:")
    print("-" * 30)
    
    try:
        with open('.env', 'r') as f:
            lines = f.readlines()
            for line in lines:
                if line.strip() and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    if 'SECRET' in key or 'KEY' in key:
                        display_value = value[:8] + "..." if len(value) > 8 else value
                    else:
                        display_value = value
                    print(f"  {key}: {display_value}")
    except Exception as e:
        print(f"❌ Error reading .env file: {e}")
    
    print("\n🚀 Next Steps:")
    print("1. Update the values in .env file with your actual credentials")
    print("2. Get your Anam.ai API key from https://anam.ai")
    print("3. Get your LiveKit API secret from your LiveKit dashboard")
    print("4. Run: python anam_agent.py")

if __name__ == "__main__":
    setup_environment()
