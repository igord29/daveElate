// Dave's Professional Moving Consultant - Meeting Interface
console.log("🎭 Dave's Meeting Interface Loading...");

// Global state
let isMeetingActive = false;
let sessionToken = null;
let daveConnection = null;
let localStream = null;
let capturedItems = [];
let daveAvatar = null;

// DOM elements
const startMeetingBtn = document.getElementById('start-meeting');
const stopMeetingBtn = document.getElementById('stop-meeting');
const muteAudioBtn = document.getElementById('mute-audio');
const captureItemsBtn = document.getElementById('capture-items');
const switchCameraBtn = document.getElementById('switch-camera');
const daveGreetingBtn = document.getElementById('dave-greeting');
const daveTipsBtn = document.getElementById('dave-tips');
const imageUploadBtn = document.getElementById('imageUpload');

// Status elements
const meetingStatus = document.getElementById('meetingStatus');
const daveStatus = document.getElementById('daveStatus');
const cameraStatus = document.getElementById('cameraStatus');
const itemsCaptured = document.getElementById('itemsCaptured');
const consultationMessages = document.getElementById('consultation-messages');

// Initialize the interface
document.addEventListener('DOMContentLoaded', function() {
    console.log("✅ Meeting interface initialized");
    setupEventListeners();
    updateStatus('ready', 'Meeting interface ready');
});

// Setup event listeners
function setupEventListeners() {
    startMeetingBtn.addEventListener('click', startMeeting);
    stopMeetingBtn.addEventListener('click', stopMeeting);
    muteAudioBtn.addEventListener('click', toggleMute);
    captureItemsBtn.addEventListener('click', captureItems);
    switchCameraBtn.addEventListener('click', switchCamera);
    daveGreetingBtn.addEventListener('click', triggerDaveGreeting);
    daveTipsBtn.addEventListener('click', triggerDaveTips);
}

// Start meeting function
async function startMeeting() {
    try {
        console.log("🚀 Starting meeting...");
        updateStatus('starting', 'Starting meeting...');
        
        // Get session token
        const response = await fetch('/api/session-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to get session token: ${response.status}`);
        }
        
        const data = await response.json();
        sessionToken = data.sessionToken;
        console.log("✅ Session token received");
        
        // Get user media
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        
        console.log("✅ Camera and microphone access granted");
        
        // Initialize Dave's avatar
        await initializeDaveAvatar();
        
        // Update UI
        isMeetingActive = true;
        updateMeetingControls();
        updateStatus('active', 'Meeting active - Dave is ready!');
        addLogMessage('success', '🎉 Meeting started successfully! Dave is ready to help with your move.');
        
        // Enable controls
        enableControls();
        
    } catch (error) {
        console.error("❌ Failed to start meeting:", error);
        updateStatus('error', `Failed to start: ${error.message}`);
        addLogMessage('error', `❌ Failed to start meeting: ${error.message}`);
    }
}

// Stop meeting function
function stopMeeting() {
    try {
        console.log("⏹️ Stopping meeting...");
        
        // Stop local stream
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }
        
        // Clean up avatar
        const videoPlaceholder = document.getElementById('video-placeholder');
        if (videoPlaceholder) {
            videoPlaceholder.innerHTML = 'Dave\'s video will appear here';
            videoPlaceholder.style.display = 'block';
        }
        
        // Reset state
        isMeetingActive = false;
        sessionToken = null;
        daveConnection = null;
        daveAvatar = null;
        
        // Update UI
        updateMeetingControls();
        updateStatus('stopped', 'Meeting stopped');
        addLogMessage('info', '⏹️ Meeting stopped');
        
        // Disable controls
        disableControls();
        
    } catch (error) {
        console.error("❌ Error stopping meeting:", error);
        addLogMessage('error', `❌ Error stopping meeting: ${error.message}`);
    }
}

// Toggle mute function
function toggleMute() {
    if (localStream) {
        const audioTracks = localStream.getAudioTracks();
        audioTracks.forEach(track => {
            track.enabled = !track.enabled;
        });
        
        const isMuted = !audioTracks[0].enabled;
        muteAudioBtn.textContent = isMuted ? '🔊 Unmute Audio' : '🔇 Mute Audio';
        addLogMessage('info', isMuted ? '🔇 Audio muted' : '🔊 Audio unmuted');
    }
}

// Capture items function
async function captureItems() {
    try {
        console.log("📸 Capturing items...");
        addLogMessage('info', '📸 Analyzing room for items that need special handling...');
        
        // This would integrate with the vision analysis API
        // For now, simulate item capture
        const mockItems = [
            { type: 'fragile', description: 'Glass items detected', priority: 'high' },
            { type: 'heavy_furniture', description: 'Large furniture requiring professional movers', priority: 'high' }
        ];
        
        capturedItems.push(...mockItems);
        itemsCaptured.textContent = capturedItems.length;
        
        addLogMessage('success', `📦 Captured ${mockItems.length} items requiring special handling`);
        
    } catch (error) {
        console.error("❌ Failed to capture items:", error);
        addLogMessage('error', `❌ Failed to capture items: ${error.message}`);
    }
}

// Switch camera function
async function switchCamera() {
    try {
        console.log("🔄 Switching camera...");
        
        if (localStream) {
            const videoTracks = localStream.getVideoTracks();
            const currentDeviceId = videoTracks[0].getSettings().deviceId;
            
            // Get available devices
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            // Find next device
            const currentIndex = videoDevices.findIndex(device => device.deviceId === currentDeviceId);
            const nextIndex = (currentIndex + 1) % videoDevices.length;
            const nextDevice = videoDevices[nextIndex];
            
            // Switch to next device
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: nextDevice.deviceId },
                audio: true
            });
            
            // Replace old stream
            localStream.getTracks().forEach(track => track.stop());
            localStream = newStream;
            
            addLogMessage('success', `🔄 Switched to camera: ${nextDevice.label || 'Camera'}`);
        }
        
    } catch (error) {
        console.error("❌ Failed to switch camera:", error);
        addLogMessage('error', `❌ Failed to switch camera: ${error.message}`);
    }
}

// Trigger Dave's greeting
function triggerDaveGreeting() {
    addLogMessage('info', '👋 Dave: "Hello! I\'m Dave, your professional moving consultant. I\'m here to help make your move as smooth as possible. What can I help you with today?"');
}

// Trigger Dave's tips
function triggerDaveTips() {
    const tips = [
        "📦 Start packing non-essential items 2-3 weeks before your move",
        "🏷️ Label boxes by room and contents for easy unpacking",
        "📋 Create an inventory list of valuable items for insurance",
        "🔌 Disconnect and pack electronics with their original boxes if possible",
        "📦 Use wardrobe boxes for hanging clothes to keep them wrinkle-free"
    ];
    
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    addLogMessage('info', `💡 Dave's Moving Tip: ${randomTip}`);
}

// Update meeting controls
function updateMeetingControls() {
    if (isMeetingActive) {
        startMeetingBtn.style.display = 'none';
        stopMeetingBtn.style.display = 'block';
    } else {
        startMeetingBtn.style.display = 'block';
        stopMeetingBtn.style.display = 'none';
    }
}

// Enable controls
function enableControls() {
    stopMeetingBtn.disabled = false;
    muteAudioBtn.disabled = false;
    captureItemsBtn.disabled = false;
    switchCameraBtn.disabled = false;
    daveGreetingBtn.disabled = false;
    daveTipsBtn.disabled = false;
}

// Disable controls
function disableControls() {
    stopMeetingBtn.disabled = true;
    muteAudioBtn.disabled = true;
    captureItemsBtn.disabled = true;
    switchCameraBtn.disabled = true;
    daveGreetingBtn.disabled = true;
    daveTipsBtn.disabled = true;
}

// Update status
function updateStatus(status, message) {
    meetingStatus.textContent = message;
    meetingStatus.className = `status-value ${status}`;
    
    if (status === 'active') {
        daveStatus.textContent = 'Connected';
        daveStatus.className = 'status-value connected';
        cameraStatus.textContent = 'Active';
        cameraStatus.className = 'status-value connected';
    } else if (status === 'error') {
        daveStatus.textContent = 'Error';
        daveStatus.className = 'status-value error';
        cameraStatus.textContent = 'Error';
        cameraStatus.className = 'status-value error';
    } else {
        daveStatus.textContent = 'Not Connected';
        daveStatus.className = 'status-value';
        cameraStatus.textContent = 'Not Active';
        cameraStatus.className = 'status-value';
    }
}

// Add log message
function addLogMessage(type, message) {
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    logEntry.textContent = message;
    
    consultationMessages.appendChild(logEntry);
    consultationMessages.scrollTop = consultationMessages.scrollHeight;
}

// Clear log function
function clearLog() {
    consultationMessages.innerHTML = `
        <div class="log-entry log-info">🚀 Dave's Professional Moving Consultation System Ready</div>
        <div class="log-entry log-info">📋 AI-powered moving consultant with 15 years experience</div>
        <div class="log-entry log-info">💡 Click "Start Meeting" to begin your consultation</div>
    `;
}

// Handle image upload
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        console.log("📸 Image uploaded:", file.name);
        addLogMessage('info', `📸 Image uploaded: ${file.name}`);
        
        // Here you would process the image with the vision analysis API
        // For now, just log it
    }
}

// Initialize Dave's avatar
async function initializeDaveAvatar() {
    try {
        console.log("🎭 Initializing Dave's avatar...");
        
        // Get the video placeholder element
        const videoPlaceholder = document.getElementById('video-placeholder');
        if (!videoPlaceholder) {
            throw new Error('Video placeholder element not found');
        }
        
        // Replace the placeholder with Dave's avatar
        videoPlaceholder.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: linear-gradient(135deg, #2c2c2c 0%, #ff6b35 100%); border-radius: 12px; padding: 20px; text-align: center;">
                <div style="color: #ffffff; font-size: 4em; margin-bottom: 15px; animation: pulse 2s infinite;">🎭</div>
                <div style="color: #ffffff; font-size: 1.5em; font-weight: bold; margin-bottom: 8px;">Dave</div>
                <div style="color: #cccccc; font-size: 1em; margin-bottom: 15px;">Professional Moving Consultant</div>
                <div style="color: #28a745; font-size: 0.9em; margin-bottom: 15px; display: flex; align-items: center; justify-content: center;">
                    <span style="display: inline-block; width: 8px; height: 8px; background: #28a745; border-radius: 50%; margin-right: 8px; animation: blink 1.5s infinite;"></span>
                    Connected & Ready
                </div>
                <div style="color: #ffffff; font-size: 0.85em; line-height: 1.4; max-width: 250px; margin-top: 10px; padding: 10px; background: rgba(255, 255, 255, 0.1); border-radius: 8px;">
                    "Hello! I'm Dave, your professional moving consultant. I'm here to help make your move as smooth as possible. What can I help you with today?"
                </div>
            </div>
            <style>
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
                @keyframes blink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0.3; }
                }
            </style>
        `;
        
        // Hide the placeholder and show the avatar
        videoPlaceholder.style.display = 'block';
        
        // Simulate avatar loading
        addLogMessage('info', '🎭 Dave\'s avatar is loading...');
        
        // In a real implementation, you would integrate with Anam.ai SDK here
        // For now, we'll simulate the avatar connection
        setTimeout(() => {
            addLogMessage('success', '🎉 Dave\'s avatar is ready! You can now interact with him.');
        }, 2000);
        
        console.log("✅ Dave's avatar initialized in video area");
        
    } catch (error) {
        console.error("❌ Failed to initialize Dave's avatar:", error);
        addLogMessage('error', `❌ Failed to initialize Dave's avatar: ${error.message}`);
    }
}

// Export functions for global access
window.clearLog = clearLog;
window.handleImageUpload = handleImageUpload;

console.log("✅ Meeting script loaded successfully");
