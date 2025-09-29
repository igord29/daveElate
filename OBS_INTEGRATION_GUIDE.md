# 🎬 OBS + Google Meet Integration Guide

## 🎯 **Goal**: Get your Anam.ai avatar "Dave" working in Google Meet via OBS

## 📋 **Prerequisites**
- ✅ LiveKit room working (`anam-avatar-test.html`)
- ✅ OBS Studio installed
- ✅ Google Meet access
- ✅ Your Anam.ai avatar "Dave" configured

## 🚀 **Step-by-Step Setup**

### **Step 1: Test LiveKit Room**
1. Open `anam-avatar-test.html` in your browser
2. Click "Join Room" 
3. Allow camera/microphone permissions
4. Verify you see the blue screen with "🎭 Dave (Anam.ai)"
5. **This confirms your LiveKit room is working!**

### **Step 2: Set Up OBS Studio**

#### **2.1 Install OBS Studio**
- Download from: https://obsproject.com/
- Install and launch OBS Studio

#### **2.2 Add Browser Source**
1. In OBS, click the **"+"** button in Sources
2. Select **"Browser Source"**
3. Name it: **"LiveKit Avatar Room"**
4. Set URL to: `file:///C:/Development_Folder/Elate_Avatar/anam-avatar-test.html`
5. Set width: **1280**, height: **720**
6. Click **"OK"**

#### **2.3 Configure Browser Source**
- ✅ **Shutdown source when not visible**: Unchecked
- ✅ **Refresh browser when scene becomes active**: Checked
- ✅ **Restart source when scene becomes active**: Checked

### **Step 3: Set Up Virtual Camera**

#### **3.1 Enable Virtual Camera**
1. In OBS, click **"Start Virtual Camera"**
2. Set resolution: **1280x720**
3. Set FPS: **30**
4. Click **"Start"**

#### **3.2 Test Virtual Camera**
1. Open Camera app on Windows
2. Select **"OBS Virtual Camera"** as source
3. You should see your LiveKit room with avatar

### **Step 4: Configure Audio**

#### **4.1 Set Up Audio Sources**
1. In OBS, add **"Audio Input Capture"** for your microphone
2. Add **"Audio Output Capture"** for system audio
3. Configure audio levels and monitoring

#### **4.2 Audio Routing**
- **Microphone**: Your voice input
- **System Audio**: Any audio from your computer
- **Avatar Audio**: Will come from LiveKit room (when real avatar is working)

### **Step 5: Google Meet Integration**

#### **5.1 Join Google Meet**
1. Open Google Meet in your browser
2. Join a meeting or start a new one
3. Click the **camera icon** to change video source
4. Select **"OBS Virtual Camera"** as your camera

#### **5.2 Test the Setup**
1. **You should see**: Your LiveKit room with the blue "Dave" avatar
2. **Others should see**: The same avatar in Google Meet
3. **Audio should work**: Your microphone through OBS

## 🎭 **Current Status: Simulation Mode**

### **What You'll See Now:**
- ✅ Blue screen with "🎭 Dave (Anam.ai)" text
- ✅ LiveKit room connection working
- ✅ OBS capturing the room
- ✅ Google Meet receiving the feed

### **What We Need to Fix:**
- ❌ **Real Avatar Video**: Currently shows blue screen simulation
- ❌ **Python Agent**: Needs to be fixed to show real Anam.ai avatar

## 🔧 **Next Steps to Get Real Avatar**

### **Option 1: Fix Python Agent (Recommended)**
```bash
# Try running the agent (may fail on Windows)
python anam_agent.py dev

# If it fails, use WSL
wsl --install
# Then run in WSL environment
```

### **Option 2: Cloud Deployment**
- Deploy the Python agent to a cloud service
- Use the cloud agent to provide real avatar video
- Connect OBS to the cloud-deployed room

### **Option 3: Alternative Avatar Solutions**
- Use other avatar services that work better with Windows
- Implement a different avatar integration approach

## 🧪 **Testing Your Setup**

### **Test 1: LiveKit Room**
1. Open `anam-avatar-test.html`
2. Click "Join Room"
3. Should see blue screen with "🎭 Dave (Anam.ai)"

### **Test 2: OBS Integration**
1. Open OBS Studio
2. Add Browser Source pointing to your HTML file
3. Should see the same blue screen in OBS

### **Test 3: Google Meet**
1. Start Virtual Camera in OBS
2. Join Google Meet
3. Select "OBS Virtual Camera" as camera source
4. Others should see your avatar in the meeting

## 🐛 **Troubleshooting**

### **Issue 1: OBS Not Showing Video**
- **Solution**: Check browser source URL is correct
- **Solution**: Make sure HTML file is accessible
- **Solution**: Try refreshing the browser source

### **Issue 2: Google Meet Not Detecting Camera**
- **Solution**: Restart OBS Studio
- **Solution**: Restart Google Meet
- **Solution**: Check Windows camera permissions

### **Issue 3: Audio Issues**
- **Solution**: Check OBS audio settings
- **Solution**: Verify microphone permissions
- **Solution**: Test audio levels in OBS

## 🎉 **Success Criteria**

### **Current Status: 70% Complete**
- ✅ LiveKit room working
- ✅ OBS integration ready
- ✅ Google Meet setup ready
- ❌ Real avatar video (needs Python agent fix)

### **When Complete, You'll Have:**
- 🎭 Real Anam.ai avatar "Dave" in Google Meet
- 🎤 Your voice controlling the avatar
- 🎬 Professional avatar setup for meetings
- 🚀 Scalable solution for multiple meetings

---

**🎬 Your avatar integration is almost ready! The foundation is solid - we just need to get the real avatar video working! 🚀**

