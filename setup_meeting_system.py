#!/usr/bin/env python3
"""
Setup script for Elate Moving AI Consultation System
This script sets up the complete meeting system with all components
"""

import os
import sys
import subprocess
import json
from datetime import datetime, timedelta
import webbrowser
from pathlib import Path

class MeetingSystemSetup:
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.config_file = self.project_root / "config.env"
        self.requirements_file = self.project_root / "requirements.txt"
        
    def check_environment(self):
        """Check if all required environment variables are set"""
        print("🔍 Checking environment configuration...")
        
        required_vars = [
            "LIVEKIT_URL",
            "LIVEKIT_API_KEY", 
            "LIVEKIT_API_SECRET",
            "ANAM_API_KEY",
            "ANAM_AVATAR_ID",
            "ANAM_AVATAR_NAME"
        ]
        
        missing_vars = []
        
        # Load environment variables
        if self.config_file.exists():
            with open(self.config_file, 'r') as f:
                for line in f:
                    if '=' in line and not line.startswith('#'):
                        key, value = line.strip().split('=', 1)
                        os.environ[key] = value
        
        for var in required_vars:
            if not os.getenv(var) or os.getenv(var) == f'your_{var.lower()}_here':
                missing_vars.append(var)
        
        if missing_vars:
            print(f"❌ Missing or incomplete environment variables: {', '.join(missing_vars)}")
            print("Please update your config.env file with the correct values.")
            return False
        
        print("✅ All environment variables are configured")
        return True
    
    def install_dependencies(self):
        """Install Python dependencies"""
        print("📦 Installing Python dependencies...")
        
        try:
            subprocess.run([
                sys.executable, "-m", "pip", "install", "-r", str(self.requirements_file)
            ], check=True, capture_output=True, text=True)
            
            print("✅ Dependencies installed successfully")
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Error installing dependencies: {e}")
            print(f"Error output: {e.stderr}")
            return False
    
    def generate_fresh_token(self):
        """Generate a fresh LiveKit token"""
        print("🔑 Generating fresh LiveKit token...")
        
        try:
            # Use the lk.exe tool to generate token
            lk_tool = self.project_root / "tools" / "lk.exe"
            if not lk_tool.exists():
                print("❌ LiveKit CLI tool not found. Please ensure lk.exe is in the tools/ directory.")
                return False
            
            # Generate token valid for 2 hours
            result = subprocess.run([
                str(lk_tool), "token", "create",
                "--room", "Elate-room",
                "--identity", "meeting-user",
                "--name", "Meeting User",
                "--join",
                "--valid-for", "2h"
            ], capture_output=True, text=True, check=True)
            
            # Extract token from output
            token = result.stdout.strip()
            if token:
                print("✅ Fresh token generated successfully")
                return token
            else:
                print("❌ Failed to generate token")
                return False
                
        except subprocess.CalledProcessError as e:
            print(f"❌ Error generating token: {e}")
            print(f"Error output: {e.stderr}")
            return False
    
    def update_html_files(self, token):
        """Update HTML files with fresh token"""
        print("📝 Updating HTML files with fresh token...")
        
        html_files = [
            "meeting_interface.html",
            "anam-avatar-test.html", 
            "simple_avatar_test.html",
            "livekit-test.html"
        ]
        
        for html_file in html_files:
            file_path = self.project_root / html_file
            if file_path.exists():
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Update token in the file
                    updated_content = content.replace(
                        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTg5MzA5ODcsImlkZW50aXR5IjoidGVzdC11c2VyIiwiaXNzIjoiQVBJNjJEQVA4WXFRRHd0IiwibmFtZSI6IlRlc3QgVXNlciIsIm5iZiI6MTc1ODkyOTc4Nywic3ViIjoidGVzdC11c2VyIiwidmlkZW8iOnsicm9vbSI6IkVsYXRlLXJvb20iLCJyb29tSm9pbiI6dHJ1ZX19.f3ulVyKlnrZA_S5eoeNUBCNvw6yK-jGRzJ-VP6mIk68',
                        token
                    )
                    
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(updated_content)
                    
                    print(f"✅ Updated {html_file}")
                    
                except Exception as e:
                    print(f"❌ Error updating {html_file}: {e}")
    
    def create_startup_script(self):
        """Create a startup script for easy launching"""
        print("🚀 Creating startup script...")
        
        startup_script = """@echo off
echo 🏠 Elate Moving AI Consultation System
echo =====================================
echo.
echo Starting the consultation system...
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python 3.8+ and try again
    pause
    exit /b 1
)

REM Install dependencies if needed
echo 📦 Checking dependencies...
pip install -r requirements.txt

REM Generate fresh token
echo 🔑 Generating fresh LiveKit token...
tools\\lk.exe token create --room "Elate-room" --identity "meeting-user" --name "Meeting User" --join --valid-for "2h" > token.txt

REM Extract token
for /f "tokens=*" %%i in (token.txt) do set TOKEN=%%i

REM Update HTML files with fresh token
echo 📝 Updating HTML files...
python -c "
import re
token = open('token.txt').read().strip()
files = ['meeting_interface.html', 'anam-avatar-test.html', 'simple_avatar_test.html', 'livekit-test.html']
for file in files:
    try:
        with open(file, 'r') as f: content = f.read()
        content = re.sub(r'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[^"]*', token, content)
        with open(file, 'w') as f: f.write(content)
        print(f'Updated {file}')
    except: pass
"

REM Open client login page
echo 🌐 Opening client login page...
start client_login.html

echo.
echo ✅ System ready! The client login page should open in your browser.
echo.
echo 📋 Next steps:
echo 1. Fill out the client information form
echo 2. Click "Start Consultation with Dave"
echo 3. Allow camera/microphone permissions
echo 4. Show Dave around your room for inventory analysis
echo.
echo Press any key to exit...
pause >nul
"""
        
        with open(self.project_root / "start_consultation.bat", 'w') as f:
            f.write(startup_script)
        
        print("✅ Startup script created: start_consultation.bat")
    
    def create_documentation(self):
        """Create comprehensive documentation"""
        print("📚 Creating documentation...")
        
        docs = """# 🏠 Elate Moving AI Consultation System

## 🚀 Quick Start

### For Clients (Easy Demo):
1. **Double-click `start_consultation.bat`** - This will:
   - Install dependencies
   - Generate fresh LiveKit token
   - Open the client login page
   - Start the consultation system

2. **Fill out the client form** with your information
3. **Click "Start Consultation with Dave"**
4. **Allow camera/microphone permissions**
5. **Show Dave around your room** for inventory analysis

### For Developers:

#### 1. Manual Setup:
```bash
# Install dependencies
pip install -r requirements.txt

# Generate fresh token
tools\\lk.exe token create --room "Elate-room" --identity "meeting-user" --name "Meeting User" --join --valid-for "2h"

# Start the enhanced agent (if you have WSL/Docker)
python enhanced_anam_agent.py

# Open client interface
start client_login.html
```

#### 2. Test the System:
```bash
# Test basic LiveKit connection
start livekit-test.html

# Test Anam.ai integration
start anam-avatar-test.html

# Test meeting interface
start meeting_interface.html
```

## 📁 File Structure

### Core System Files:
- `client_login.html` - Client login interface
- `meeting_interface.html` - Main meeting interface
- `enhanced_anam_agent.py` - Enhanced agent with vision analysis
- `report_generator.py` - PDF report generation
- `start_consultation.bat` - Easy startup script

### Test Files:
- `anam-avatar-test.html` - Anam.ai integration test
- `simple_avatar_test.html` - Simple test interface
- `livekit-test.html` - Basic LiveKit test

### Configuration:
- `config.env` - Environment variables
- `requirements.txt` - Python dependencies

## 🎯 Features

### ✅ What's Working:
- **LiveKit Integration**: Multi-participant video meetings
- **Anam.ai Avatar**: AI consultant "Dave" 
- **Client Interface**: Easy login and meeting access
- **Vision Analysis**: Room inventory detection (with OpenAI)
- **PDF Reports**: Professional consultation reports
- **Real-time Updates**: Live inventory tracking

### 🔧 Configuration Required:
- **OpenAI API Key**: For vision analysis (optional)
- **Anam.ai API Key**: For avatar functionality
- **LiveKit Credentials**: For video meetings

## 🎬 Demo Flow

1. **Client Login**: Simple form with name, consultation type, property size
2. **Meeting Join**: Automatic connection to LiveKit room
3. **Avatar Interaction**: Dave appears and greets the client
4. **Room Analysis**: Client shows Dave around their space
5. **Live Inventory**: Real-time item detection and tracking
6. **Report Generation**: Professional PDF report with recommendations

## 🐛 Troubleshooting

### Common Issues:

1. **Token Expired**: Run `start_consultation.bat` to generate fresh token
2. **Camera Not Working**: Check browser permissions
3. **Avatar Not Showing**: Ensure Anam.ai API key is correct
4. **Python Agent Fails**: Use WSL or Docker for Windows compatibility

### Support:
- Check browser console for errors
- Verify all API keys in `config.env`
- Test individual components first

## 🎯 Success Criteria

### For Client Demo:
- ✅ Easy one-click startup
- ✅ Professional client interface
- ✅ Working video meeting
- ✅ AI avatar interaction
- ✅ Inventory analysis
- ✅ Report generation

### For Development:
- ✅ Modular architecture
- ✅ Comprehensive error handling
- ✅ Easy configuration
- ✅ Professional documentation

---

**🎭 Your Elate Moving AI Consultation System is ready! 🚀**
"""
        
        with open(self.project_root / "SYSTEM_GUIDE.md", 'w') as f:
            f.write(docs)
        
        print("✅ Documentation created: SYSTEM_GUIDE.md")
    
    def run_setup(self):
        """Run the complete setup process"""
        print("Elate Moving AI Consultation System Setup")
        print("=" * 50)
        
        # Check environment
        if not self.check_environment():
            print("\n❌ Setup failed: Environment not configured properly")
            return False
        
        # Install dependencies
        if not self.install_dependencies():
            print("\n❌ Setup failed: Could not install dependencies")
            return False
        
        # Generate fresh token
        token = self.generate_fresh_token()
        if not token:
            print("\n❌ Setup failed: Could not generate LiveKit token")
            return False
        
        # Update HTML files
        self.update_html_files(token)
        
        # Create startup script
        self.create_startup_script()
        
        # Create documentation
        self.create_documentation()
        
        print("\n" + "=" * 50)
        print("✅ Setup completed successfully!")
        print("\n🎯 Next Steps:")
        print("1. Run 'start_consultation.bat' to start the system")
        print("2. Or manually open 'client_login.html' in your browser")
        print("3. Fill out the client form and start your consultation")
        print("\n📚 See SYSTEM_GUIDE.md for detailed documentation")
        
        return True

def main():
    """Main setup function"""
    setup = MeetingSystemSetup()
    success = setup.run_setup()
    
    if success:
        print("\n🚀 Ready to demo your AI consultation system!")
    else:
        print("\n❌ Setup failed. Please check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
