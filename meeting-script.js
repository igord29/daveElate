// Dave's Professional Moving Consultant - Meeting Interface
console.log("🎭 Dave's Meeting Interface Loading...");

// Import AnamEvent for proper event handling
let AnamEvent = null;

// Global state
let isMeetingActive = false;
let sessionToken = null;
let daveConnection = null;
let localStream = null;
let capturedItems = [];
let daveAvatar = null;
let visionUpdateCount = 0;

// Mobile detection (declare once, use everywhere)
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// ============================================================================
// SESSION CLEANUP - Enhanced session management
// ============================================================================

// Store the current session ID globally
let currentSessionId = null;

// Session timeout protection (client-side backup to server watchdog)
let sessionTimeout = null;

// ============================================================================
// ENHANCED SESSION INITIALIZATION
// ============================================================================

async function initializeSession() {
  try {
    console.log('[SESSION] Initializing session...');
    const response = await fetch('/api/session-token', { method: 'POST' });
    const data = await response.json();
    
    // CRITICAL: Store the session_id for cleanup
    currentSessionId = data.session_id;
    console.log('[SESSION] Session created:', currentSessionId);
    
    // Auto-end session after 30 minutes as backup to server watchdog
    sessionTimeout = setTimeout(async () => {
        console.warn('[TIMEOUT] Session exceeded 30 minutes - ending');
        await endSession();
    }, 30 * 60 * 1000);
    
    return data;
  } catch (error) {
    console.error('[ERROR] Failed to initialize session:', error);
    throw error;
  }
}

// ============================================================================
// ENHANCED SESSION TERMINATION
// ============================================================================

async function endSession() {
  if (!currentSessionId) {
    console.log('[SESSION] No active session to end');
    return;
  }

  try {
    console.log('[SESSION] Ending session:', currentSessionId);
    
    // Clear the timeout
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
      sessionTimeout = null;
    }
    
    await fetch('/api/end-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: currentSessionId })
    });
    
    console.log('[SUCCESS] Session ended successfully');
    currentSessionId = null;
    
  } catch (error) {
    console.error('[ERROR] Failed to end session:', error);
  }
}

// Audio processing state
let audioContext = null;
let analyser = null;
let microphone = null;
let audioLevelMonitor = null;
let isAudioLevelMonitoring = false;
let noiseSuppressionEnabled = true;

// Vision processing state
let visionInterval = null;
let isVisionActive = false;

// Pre-loaded SDK for faster initialization
let preloadedSDK = null;

// Speech recognition for CUSTOMER_CLIENT_V1 mode
let recognition = null;

// Conversation history for maintaining context
let conversationHistory = [];

// DOM elements
const startMeetingBtn = document.getElementById('start-meeting');
const stopMeetingBtn = document.getElementById('stop-meeting');
const muteAudioBtn = document.getElementById('mute-audio');
const captureItemsBtn = document.getElementById('capture-items');
const switchCameraBtn = document.getElementById('switch-camera');
const daveGreetingBtn = document.getElementById('dave-greeting');
const daveTipsBtn = document.getElementById('dave-tips');
const imageUploadBtn = document.getElementById('imageUpload');
const noiseSuppressionBtn = document.getElementById('noise-suppression');
const audioQualityBtn = document.getElementById('audio-quality');

// Status elements
const meetingStatus = document.getElementById('meetingStatus');
const daveStatus = document.getElementById('daveStatus');
const cameraStatus = document.getElementById('cameraStatus');
const itemsCaptured = document.getElementById('itemsCaptured');
const consultationMessages = document.getElementById('consultation-messages');

// Pre-load the Anam.ai SDK for faster initialization
async function preloadSDK() {
    try {
        console.log("🔗 Pre-loading Anam.ai SDK...");
        preloadedSDK = await import('https://esm.sh/@anam-ai/js-sdk@latest');
        console.log("✅ SDK pre-loaded successfully");
    } catch (error) {
        console.error("❌ Failed to pre-load SDK:", error);
    }
}

// Initialize the interface
document.addEventListener('DOMContentLoaded', function() {
    console.log("✅ Meeting interface initialized");
    setupEventListeners();
    updateStatus('ready', 'Meeting interface ready');
    
    // Pre-load the SDK for faster avatar initialization
    preloadSDK();
    
    // Mobile-specific initialization
    if (isMobile) {
        console.log('📱 Mobile device detected - setting up mobile-specific features');
        setupMobileFeatures();
    }
});

// Mobile-specific setup
function setupMobileFeatures() {
    // Initialize mobile audio context on first user interaction
    let audioContextInitialized = false;
    let globalAudioContext = null;
    
    function initializeMobileAudio() {
        if (audioContextInitialized) return;
        
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                globalAudioContext = new AudioContextClass();
                if (globalAudioContext.state === 'suspended') {
                    globalAudioContext.resume().then(() => {
                        console.log('📱 Mobile audio context initialized');
                        audioContextInitialized = true;
                        addLogMessage('success', '📱 Mobile audio ready');
                    });
                } else {
                    console.log('📱 Mobile audio context already active');
                    audioContextInitialized = true;
                }
            }
        } catch (error) {
            console.log('📱 Mobile audio initialization failed:', error.message);
        }
    }
    
    // Initialize audio on first user interaction
    document.addEventListener('touchstart', initializeMobileAudio, { once: true });
    document.addEventListener('click', initializeMobileAudio, { once: true });
    document.addEventListener('touchend', initializeMobileAudio, { once: true });
    
    // Add mobile-specific event listeners
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && isMeetingActive) {
            console.log('📱 App backgrounded - pausing speech recognition');
            if (recognition) {
                try {
                    recognition.stop();
                } catch (e) {
                    console.log('📱 Speech recognition already stopped');
                }
            }
        } else if (!document.hidden && isMeetingActive) {
            console.log('📱 App foregrounded - resuming speech recognition');
            setTimeout(() => {
                if (isMeetingActive && recognition) {
                    try {
                        recognition.start();
                    } catch (e) {
                        console.log('📱 Failed to restart speech recognition:', e);
                    }
                }
            }, 1000);
        }
    });
    
    // Handle mobile orientation changes
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            if (isMeetingActive) {
                console.log('📱 Orientation changed - checking speech recognition');
                if (recognition) {
                    try {
                        recognition.start();
                    } catch (e) {
                        console.log('📱 Speech recognition restart after orientation change failed:', e);
                    }
                }
            }
        }, 500);
    });
}

// Setup event listeners
function setupEventListeners() {
    startMeetingBtn.addEventListener('click', startMeeting);
    stopMeetingBtn.addEventListener('click', stopMeeting);
    muteAudioBtn.addEventListener('click', toggleMute);
    captureItemsBtn.addEventListener('click', captureItems);
    switchCameraBtn.addEventListener('click', switchCamera);
    daveGreetingBtn.addEventListener('click', triggerDaveGreeting);
    daveTipsBtn.addEventListener('click', triggerDaveTips);
    // Noise suppression disabled to prevent ding noise
    // noiseSuppressionBtn.addEventListener('click', toggleNoiseSuppression);
    audioQualityBtn.addEventListener('click', showAudioQualityMetrics);
    
    // ============================================================================
    // CRITICAL: BROWSER CLOSE/REFRESH PROTECTION
    // ============================================================================
    
    // Use sendBeacon for reliable cleanup when page closes
    // This works even when the browser is closing
    window.addEventListener('beforeunload', (event) => {
        if (currentSessionId) {
            console.log('[SESSION] Page unloading - cleaning up session');
            
            // sendBeacon is more reliable than fetch for page unload
            const blob = new Blob(
                [JSON.stringify({ session_id: currentSessionId })],
                { type: 'application/json' }
            );
            navigator.sendBeacon('/api/end-session', blob);
        }
    });

    // Handle tab visibility changes (user switches tabs or minimizes browser)
    document.addEventListener('visibilitychange', async () => {
        if (document.hidden && currentSessionId) {
            console.log('[SESSION] Tab hidden - maintaining session');
            // Don't end session on hide, only on beforeunload
            // This prevents ending session when user switches tabs
        }
    });
    
    // ============================================================================
    // ERROR HANDLING - End session on critical errors
    // ============================================================================
    
    window.addEventListener('error', async (event) => {
        console.error('[ERROR] Global error detected:', event.error);
        // Don't end session on every error, but you can add logic here
        // to end session on critical errors
    });
    
    // ============================================================================
    // SESSION MONITORING (for debugging)
    // ============================================================================
    
    // Log session status every minute
    setInterval(() => {
        if (currentSessionId) {
            console.log('[SESSION] Active session:', currentSessionId);
        } else {
            console.log('[SESSION] No active session');
        }
    }, 60 * 1000);
}

// Check permissions before starting meeting
async function checkPermissions() {
    try {
        console.log("🔍 Checking camera and microphone permissions...");
        addLogMessage('info', '🔍 Checking camera and microphone permissions...');
        
        // Test camera permission
        const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        cameraStream.getTracks().forEach(track => track.stop());
        console.log("✅ Camera permission granted");
        
        // Test microphone permission  
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStream.getTracks().forEach(track => track.stop());
        console.log("✅ Microphone permission granted");
        
        addLogMessage('success', '✅ Camera and microphone permissions confirmed');
        return true;
        
    } catch (error) {
        console.error("❌ Permission check failed:", error);
        
        if (error.name === 'NotAllowedError') {
            addLogMessage('error', '❌ Camera and microphone permissions are required for the avatar to work.');
            addLogMessage('info', '💡 Please allow both camera and microphone access in your browser settings and refresh the page.');
            addLogMessage('info', '🔧 To enable permissions: Click the camera/microphone icons in your browser\'s address bar and select "Allow"');
        } else if (error.name === 'NotFoundError') {
            addLogMessage('error', '❌ No camera or microphone found. Please connect a camera and microphone and try again.');
        } else if (error.name === 'NotReadableError') {
            addLogMessage('error', '❌ Camera or microphone is being used by another application. Please close other applications and try again.');
        } else {
            addLogMessage('error', `❌ Permission check failed: ${error.message}`);
        }
        
        return false;
    }
}

// Start meeting function
async function startMeeting() {
    try {
        console.log("🚀 Starting meeting...");
        updateStatus('starting', 'Starting meeting...');
        
        // Check permissions first
        const permissionsOk = await checkPermissions();
        if (!permissionsOk) {
            updateStatus('error', 'Permissions required');
            return;
        }
        
        // Initialize session and get session token
        const data = await initializeSession();
        sessionToken = data.sessionToken;
        console.log("✅ Session token received");
        
        // Initialize Dave's avatar FIRST for instant appearance
        console.log("🎭 Initializing Dave's avatar immediately...");
        await initializeDaveAvatar();
        
        setTimeout(() => {
            if (isMeetingActive) {
                startSpeechRecognition();
                
                setTimeout(() => {
                    if (daveAvatar) {
                        daveAvatar.talk("Hi, I'm Dave with Elate Moving. I'm here to walk through your space and put together a moving quote for you. I can see your room through the camera. Let's start - what room whould you like to start with?");
                        addLogMessage('info', '👋 Dave is introducing himself...');
                    }
                }, 1000);
            }
        }, 2000);
        
        // Get user media with mobile-specific constraints
        if (isMobile) {
            console.log('📱 Mobile device detected - using mobile-optimized audio constraints');
            
            // Mobile-specific audio constraints
            localStream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    width: { ideal: 1280, max: 1920 }, 
                    height: { ideal: 720, max: 1080 },
                    facingMode: 'user' // Front camera for mobile
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true, // Enable AGC for mobile
                    sampleRate: 44100, // Standard mobile sample rate
                    channelCount: 1
                }
            });
        } else {
            // Desktop-specific audio constraints
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices.filter(d => d.kind === 'audioinput');

            console.log('🎤 Available audio inputs:', audioInputs.map(d => d.label));

            // Filter out virtual microphones
            const physicalMic = audioInputs.find(d => {
                const label = d.label.toLowerCase();
                return !label.includes('virtual') && 
                       !label.includes('cable') && 
                       !label.includes('voicemeeter') &&
                       !label.includes('obs') &&
                       !label.includes('wave link') &&
                       d.deviceId !== 'default';
            });

            const micDeviceId = physicalMic ? physicalMic.deviceId : 'default';
            console.log('🎤 Using microphone:', physicalMic ? physicalMic.label : 'default device');

            localStream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    width: 1280, 
                    height: 720 
                },
                audio: {
                    deviceId: { exact: micDeviceId },
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: false,
                    channelCount: 1,
                    sampleRate: 16000
                }
            });
        }
        
        console.log("✅ Camera and microphone access granted with noise suppression");
        
        // Connect user's camera to the video element
        const cameraVideo = document.getElementById('cameraVideo');
        if (cameraVideo) {
            cameraVideo.srcObject = localStream;
            cameraVideo.style.display = 'block';
            console.log("✅ User camera connected to video element");
            addLogMessage('success', '📹 Your camera is now active');
            
            // Update camera status
            updateCameraStatus('active');
        } else {
            console.error("❌ Camera video element not found");
            addLogMessage('error', '❌ Camera video element not found');
        }
        
        // Update microphone status
        updateMicrophoneStatus('active');
        
        // Audio level monitoring disabled to prevent ding noise
        // startAudioLevelMonitor();
        
        // User guidance for best audio quality
        addLogMessage('info', '🎤 For best audio quality: minimize background noise and speak clearly toward your microphone');
        addLogMessage('info', '💡 Tip: Using headphones or earbuds improves Dave\'s ability to hear you');
        
        
        // Start vision updates after 3 seconds (reduced from 5 seconds)
        setTimeout(() => {
            if (isMeetingActive) {
                startVisionUpdates();
                addLogMessage('success', '👁️ Vision enabled - Dave can see your room every 30 seconds');
            }
        }, 3000);
        
        
        // Update UI
        isMeetingActive = true;
        updateMeetingControls();
        updateStatus('active', 'Meeting active - Dave is ready!');
        addLogMessage('success', '🎉 Meeting started successfully! Dave is ready to help with your move.');
        
        // Enable controls
        enableControls();
        
    } catch (error) {
        console.error("❌ Failed to start meeting:", error);
        
        // Handle specific permission errors
        if (error.name === 'NotAllowedError') {
            if (error.message.includes('camera') || error.message.includes('video')) {
                updateStatus('error', 'Camera permission denied');
                addLogMessage('error', '❌ Camera permission denied. Please allow camera access in your browser settings and refresh the page.');
                addLogMessage('info', '💡 To enable camera: Click the camera icon in your browser\'s address bar and select "Allow"');
            } else if (error.message.includes('microphone') || error.message.includes('audio')) {
                updateStatus('error', 'Microphone permission denied');
                addLogMessage('error', '❌ Microphone permission denied. Please allow microphone access in your browser settings and refresh the page.');
                addLogMessage('info', '💡 To enable microphone: Click the microphone icon in your browser\'s address bar and select "Allow"');
            } else {
                updateStatus('error', 'Camera and microphone permissions required');
                addLogMessage('error', '❌ Camera and microphone permissions are required for the avatar to work properly.');
                addLogMessage('info', '💡 Please allow both camera and microphone access in your browser settings and refresh the page.');
            }
        } else if (error.name === 'NotFoundError') {
            updateStatus('error', 'Camera or microphone not found');
            addLogMessage('error', '❌ No camera or microphone found. Please connect a camera and microphone and try again.');
        } else if (error.name === 'NotReadableError') {
            updateStatus('error', 'Camera or microphone in use');
            addLogMessage('error', '❌ Camera or microphone is being used by another application. Please close other applications and try again.');
        } else {
            updateStatus('error', `Failed to start: ${error.message}`);
            addLogMessage('error', `❌ Failed to start meeting: ${error.message}`);
        }
    }
}

// Stop meeting function
async function stopMeeting() {
    try {
        console.log("⏹️ Stopping meeting...");
        
        // Audio level monitoring disabled to prevent ding noise
        // stopAudioLevelMonitor();
        
        // Stop speech recognition
        stopSpeechRecognition();
        
        // Stop vision updates
        stopVisionUpdates();
        
        // Stop local stream and clear video
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }
        
        // Clear user camera video
        const cameraVideo = document.getElementById('cameraVideo');
        if (cameraVideo) {
            cameraVideo.srcObject = null;
            cameraVideo.style.display = 'none';
        }
        
        // Reset status indicators
        updateCameraStatus('inactive');
        updateMicrophoneStatus('inactive');
        
        // Clean up Dave's avatar
        if (daveAvatar) {
            try {
                // Stop Dave's avatar stream
                if (daveAvatar.streamingClient && daveAvatar.streamingClient.isStreaming) {
                    daveAvatar.streamingClient.stopStreaming();
                    console.log("🎭 Dave's avatar stream stopped");
                }
                
                // Disconnect Dave's avatar
                if (daveAvatar.disconnect) {
                    daveAvatar.disconnect();
                    console.log("🎭 Dave's avatar disconnected");
                }
                
                daveAvatar = null;
            } catch (error) {
                console.error("❌ Error disconnecting Dave's avatar:", error);
            }
        }
        
        // Clear Dave's video element and remove logo overlay
        const personaVideo = document.getElementById('persona-video');
        if (personaVideo) {
            personaVideo.srcObject = null;
            personaVideo.style.display = 'none';
            
            // Remove Elate logo overlay
            const logoOverlay = document.getElementById('elate-logo-overlay');
            if (logoOverlay) {
                logoOverlay.remove();
            }
        }
        
        // Show placeholder
        const videoPlaceholder = document.getElementById('video-placeholder');
        if (videoPlaceholder) {
            videoPlaceholder.innerHTML = 'Dave\'s video will appear here';
            videoPlaceholder.style.display = 'block';
        }
        
        // End session
        await endSession();
        
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
            
            // Switch to next device with mobile-friendly constraints
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    deviceId: { ideal: nextDevice.deviceId },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: false
                }
            });

            // Replace old stream
            localStream.getTracks().forEach(track => track.stop());
            localStream = newStream;
            
            // Update the video element with new stream
            const cameraVideo = document.getElementById('cameraVideo');
            if (cameraVideo) {
                cameraVideo.srcObject = localStream;
                console.log("✅ Camera stream updated in video element");
            }
            
            addLogMessage('success', `🔄 Switched to camera: ${nextDevice.label || 'Camera'}`);
        }
        
    } catch (error) {
        console.error("❌ Failed to switch camera:", error);
        addLogMessage('error', `❌ Failed to switch camera: ${error.message}`);
    }
}

// Setup message logging for debugging
function setupMessageLogging(anamClient) {
    try {
        console.log("🔍 Setting up message logging...");
        
        // Log all messages from the Anam client
        if (anamClient && anamClient.publicEventEmitter) {
            anamClient.publicEventEmitter.on('message', (message) => {
                console.log("💬 Dave says:", message);
                addLogMessage('info', `💬 Dave: ${message.content || message}`);
            });
            
            anamClient.publicEventEmitter.on('userMessage', (message) => {
                console.log("👤 User says:", message);
                addLogMessage('info', `👤 User: ${message.content || message}`);
            });
            
            anamClient.publicEventEmitter.on('error', (error) => {
                console.error("❌ Anam client error:", error);
                addLogMessage('error', `❌ Avatar error: ${error.message || error}`);
            });
            
            console.log("✅ Message logging setup complete");
        } else {
            console.log("⚠️ Anam client doesn't have publicEventEmitter");
        }
    } catch (error) {
        console.error("❌ Error setting up message logging:", error);
    }
}

// Add Elate Moving logo overlay to Dave's video
function addElateLogoOverlay() {
    try {
        const personaVideo = document.getElementById('persona-video');
        if (!personaVideo) return;
        
        // Create logo overlay container
        const logoOverlay = document.createElement('div');
        logoOverlay.id = 'elate-logo-overlay';
        logoOverlay.style.cssText = `
            position: absolute;
            top: 15px;
            left: 15px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            font-weight: bold;
            z-index: 1000;
            backdrop-filter: blur(5px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        `;
        
        logoOverlay.innerHTML = `
            <div style="font-size: 16px; font-weight: bold; color: #4CAF50;">ELATE</div>
            <div style="font-size: 10px; color: rgba(255, 255, 255, 0.8); margin-top: -2px;">MOVING</div>
        `;
        
        // Make sure the video container is positioned relatively
        personaVideo.style.position = 'relative';
        
        // Add the logo overlay
        personaVideo.appendChild(logoOverlay);
        
        console.log("✅ Elate Moving logo overlay added");
        addLogMessage('success', '🏢 Elate Moving branding added to Dave\'s video');
        
    } catch (error) {
        console.error("❌ Error adding Elate logo overlay:", error);
    }
}

// Trigger Dave's greeting
async function triggerDaveGreeting() {
    try {
        console.log("👋 Triggering Dave's greeting...");
        
        // Add greeting to conversation history
        conversationHistory.push({ role: 'user', content: 'Hello' });
        
        // Send conversation history to Dave's custom LLM
        const response = await fetch('/api/chat-stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: conversationHistory
            })
        });
        
        if (response.ok) {
            console.log("✅ Dave's greeting sent");
            addLogMessage('info', '👋 Dave is introducing himself...');
        } else {
            console.error("❌ Failed to send Dave's greeting:", response.status);
            addLogMessage('error', '❌ Failed to trigger Dave\'s greeting');
        }
    } catch (error) {
        console.error("❌ Error triggering Dave's greeting:", error);
        addLogMessage('error', '❌ Error triggering Dave\'s greeting');
    }
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
    // noiseSuppressionBtn.disabled = false; // Disabled to prevent ding noise
    audioQualityBtn.disabled = false;
    
    // Update noise suppression button state
    updateNoiseSuppressionButton();
}

// Disable controls
function disableControls() {
    stopMeetingBtn.disabled = true;
    muteAudioBtn.disabled = true;
    captureItemsBtn.disabled = true;
    switchCameraBtn.disabled = true;
    daveGreetingBtn.disabled = true;
    daveTipsBtn.disabled = true;
    // noiseSuppressionBtn.disabled = true; // Disabled to prevent ding noise
    audioQualityBtn.disabled = true;
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
        microphoneStatus.textContent = 'Active';
        microphoneStatus.className = 'status-value connected';
    } else if (status === 'error') {
        daveStatus.textContent = 'Error';
        daveStatus.className = 'status-value error';
        cameraStatus.textContent = 'Error';
        cameraStatus.className = 'status-value error';
        microphoneStatus.textContent = 'Error';
        microphoneStatus.className = 'status-value error';
    } else {
        daveStatus.textContent = 'Not Connected';
        daveStatus.className = 'status-value';
        cameraStatus.textContent = 'Not Active';
        cameraStatus.className = 'status-value';
        microphoneStatus.textContent = 'Not Active';
        microphoneStatus.className = 'status-value';
    }
}

// Update camera status independently
function updateCameraStatus(status) {
    const cameraStatus = document.getElementById('cameraStatus');
    if (cameraStatus) {
        if (status === 'active') {
            cameraStatus.textContent = 'Active';
            cameraStatus.className = 'status-value connected';
        } else if (status === 'error') {
            cameraStatus.textContent = 'Error';
            cameraStatus.className = 'status-value error';
        } else {
            cameraStatus.textContent = 'Not Active';
            cameraStatus.className = 'status-value';
        }
    }
}

// Update microphone status independently
function updateMicrophoneStatus(status) {
    const microphoneStatus = document.getElementById('microphoneStatus');
    if (microphoneStatus) {
        if (status === 'active') {
            microphoneStatus.textContent = 'Active';
            microphoneStatus.className = 'status-value connected';
        } else if (status === 'error') {
            microphoneStatus.textContent = 'Error';
            microphoneStatus.className = 'status-value error';
        } else {
            microphoneStatus.textContent = 'Not Active';
            microphoneStatus.className = 'status-value';
        }
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
        <div class="log-entry log-info">📋 Professional moving consultant with 15 years experience</div>
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
        
        // Get the persona video element first
        const personaVideo = document.getElementById('persona-video');
        if (!personaVideo) {
            throw new Error('Persona video element not found');
        }
        
        // Show video element immediately for instant appearance
        videoPlaceholder.style.display = 'none';
        personaVideo.style.display = 'block';
        
        // Add loading indicator to video element with Elate Moving branding
        personaVideo.innerHTML = `
            <div style="position: relative; width: 100%; height: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 18px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <!-- Elate Moving Logo -->
                <div style="position: absolute; top: 20px; left: 20px; background: rgba(0,0,0,0.6); padding: 12px 18px; border-radius: 10px; backdrop-filter: blur(15px); border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                    <div style="font-size: 28px; font-weight: bold; color: #4CAF50; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">ELATE</div>
                    <div style="font-size: 14px; color: rgba(255,255,255,0.9); margin-top: -3px; font-weight: 500;">MOVING</div>
                    <div style="font-size: 10px; color: rgba(255,255,255,0.7); margin-top: 2px;">Professional Moving Services</div>
                </div>
                
                <!-- Main content -->
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 2;">
                    <div style="margin-bottom: 20px; font-size: 48px;">🎭</div>
                    <div style="margin-bottom: 10px; font-weight: bold;">Dave from Elate Moving</div>
                    <div style="font-size: 14px; opacity: 0.8;">Connecting...</div>
                    <div style="margin-top: 20px; width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.3); border-top: 3px solid white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                </div>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
        
        addLogMessage('success', '🎭 Dave is connecting...');
        
        // Try real Anam.ai SDK first, then fallback to simulation
        try {
            addLogMessage('info', '🔗 Loading Anam.ai SDK...');
            console.log('🔗 Attempting to import Anam.ai SDK...');
            
            // Use pre-loaded SDK or import if not available
            let sdk = preloadedSDK;
            if (!sdk) {
                console.log('📦 SDK not pre-loaded, importing now...');
                sdk = await import('https://esm.sh/@anam-ai/js-sdk@latest');
            }
            console.log('✅ SDK ready, keys:', Object.keys(sdk));
            
            // Initialize AnamEvent for proper event handling
            AnamEvent = sdk.AnamEvent;
            console.log('✅ AnamEvent initialized:', AnamEvent);
            
            // Get the unsafe_createClientWithApiKey function from the SDK
            const unsafeCreateClient = sdk.unsafe_createClientWithApiKey;
            console.log('✅ unsafe_createClientWithApiKey function:', unsafeCreateClient);
            
            addLogMessage('success', '✅ Anam.ai SDK loaded successfully');
            
            // Use the session token we already have (no need for another API call)
            if (!sessionToken) {
                throw new Error('No session token available');
            }
            
            // Create Anam client with session token using the official SDK method
            const { createClient } = sdk;
            daveAvatar = createClient(sessionToken);
            const anamClient = daveAvatar;
            
            addLogMessage('info', '🎭 Anam client created with session token');
            console.log('📦 Client methods:', Object.getOwnPropertyNames(anamClient));
            
            // Mobile-specific video streaming setup
            if (isMobile) {
                console.log('📱 Mobile device detected - using mobile-optimized video streaming');
                addLogMessage('info', '📱 Mobile-optimized avatar streaming...');
                
                // Mobile-specific video constraints
                personaVideo.setAttribute('playsinline', 'true');
                personaVideo.setAttribute('webkit-playsinline', 'true');
                personaVideo.muted = true; // Required for autoplay on mobile
            }
            
            // Stream to video element using the element ID (as per Anam.ai docs)
            addLogMessage('info', '🎭 Streaming Dave\'s avatar to video element...');
            console.log('🎭 Using video element ID: persona-video');
            
            // Use streamToVideoElement with the element ID string
            await anamClient.streamToVideoElement('persona-video');
            
            addLogMessage('success', '🎉 Dave\'s avatar is now streaming!');
            console.log('✅ Avatar streaming to video element');
            
            // Mobile-specific audio handling
            if (isMobile) {
                console.log('📱 Mobile device - configuring audio for Dave\'s avatar');
                // Force unmute and play on mobile
                personaVideo.muted = false;
                personaVideo.volume = 1.0;
                
                // Attempt to play with user interaction
                personaVideo.addEventListener('canplay', () => {
                    personaVideo.play().catch(e => {
                        console.log('[MOBILE] Autoplay blocked:', e);
                        addLogMessage('info', '📱 Tap the video to enable Dave\'s audio');
                    });
                });
            }
            
        // Add Elate Moving logo overlay to Dave's video
        addElateLogoOverlay();
        
        // Add mobile audio enable button if on mobile
        if (isMobile) {
            addMobileAudioButton();
        }
            
            // Add message logging for debugging
            setupMessageLogging(anamClient);
            
        } catch (error) {
            console.error('❌ Anam.ai SDK failed:', error);
            addLogMessage('warning', `⚠️ Anam.ai SDK failed, using fallback: ${error.message}`);
            
            // Enhanced fallback for mobile
            if (isMobile) {
                addLogMessage('info', '📱 Mobile fallback: Creating mobile-optimized avatar simulation');
                console.log('📱 Using mobile-optimized fallback avatar');
            }
            
            // Fallback to canvas simulation
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 480;
            const ctx = canvas.getContext('2d');
            
            // Create Dave's avatar appearance
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#2c2c2c');
            gradient.addColorStop(1, '#ff6b35');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add Dave's avatar representation
            ctx.fillStyle = 'white';
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('🎭 Dave', canvas.width / 2, canvas.height / 2 - 40);
            ctx.font = '24px Arial';
            ctx.fillText('Professional Moving Consultant', canvas.width / 2, canvas.height / 2 + 20);
            
            ctx.font = 'bold 20px Arial';
            ctx.fillStyle = '#ff6b35';
            ctx.fillText('ELATE MOVING', canvas.width / 2, canvas.height / 2 + 60);
            
            ctx.font = '14px Arial';
            ctx.fillStyle = '#cccccc';
            ctx.fillText('Professional Moving Services', canvas.width / 2, canvas.height / 2 + 85);
            
            // Add status indicator
            ctx.fillStyle = '#28a745';
            ctx.beginPath();
            ctx.arc(canvas.width - 30, 30, 10, 0, 2 * Math.PI);
            ctx.fill();
            
            // Add Elate Moving branding
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = '12px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('Dave - Elate Moving', 10, canvas.height - 20);
            
            // Convert canvas to video stream
            const avatarStream = canvas.captureStream(30);
            
            // Set the video stream
            personaVideo.srcObject = avatarStream;
            personaVideo.style.display = 'block';
            
            // Mobile-specific video attributes
            if (isMobile) {
                personaVideo.setAttribute('playsinline', 'true');
                personaVideo.setAttribute('webkit-playsinline', 'true');
                personaVideo.muted = false; // Unmute for mobile
                personaVideo.volume = 1.0;
                
                // Attempt to play with user interaction
                personaVideo.addEventListener('canplay', () => {
                    personaVideo.play().catch(e => {
                        console.log('[MOBILE] Fallback autoplay blocked:', e);
                        addLogMessage('info', '📱 Tap the video to enable Dave\'s audio');
                    });
                });
            }
            
            // Hide the placeholder
            videoPlaceholder.style.display = 'none';
            
            // Add Elate Moving logo overlay to fallback simulation
            addElateLogoOverlay();
        }
        
        // Avatar is now ready
        addLogMessage('info', '🎭 Dave\'s avatar is loading...');
        console.log('🎭 Avatar initialization complete');
        
        // Add event listeners for the video
        if (personaVideo) {
            console.log('📹 Setting up video event listeners');
            
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            personaVideo.addEventListener('loadedmetadata', () => {
                console.log('📹 Video metadata loaded');
                addLogMessage('success', '📹 Dave\'s avatar video loaded');
            });
            
            personaVideo.addEventListener('canplay', () => {
                console.log('🎉 Video can play');
                addLogMessage('success', '🎉 Dave\'s avatar is ready! You can now interact with him.');
            });
            
            personaVideo.addEventListener('error', (e) => {
                console.error('❌ Video error:', e);
                addLogMessage('error', `❌ Avatar video error: ${e.message}`);
            });
            
            // Mobile-specific video handling
            if (isMobile) {
                personaVideo.addEventListener('loadstart', () => {
                    console.log('📱 Mobile video load started');
                    addLogMessage('info', '📱 Mobile video loading...');
                });
                
                personaVideo.addEventListener('loadeddata', () => {
                    console.log('📱 Mobile video data loaded');
                    addLogMessage('info', '📱 Mobile video data ready');
                });
            }
            
            // Try to play the video with mobile-specific handling
            try {
                if (isMobile) {
                    // Mobile requires user interaction for autoplay
                    console.log('📱 Mobile device - attempting video play with user interaction');
                    addLogMessage('info', '📱 Mobile video play initiated');
                }
                
                await personaVideo.play();
                console.log('▶️ Video play started');
            } catch (playError) {
                console.error('❌ Video play failed:', playError);
                addLogMessage('error', `❌ Video play failed: ${playError.message}`);
                
                // Mobile-specific play error handling
                if (isMobile) {
                    addLogMessage('info', '📱 Mobile video play requires user interaction - tap the video to start');
                    console.log('📱 Mobile video play blocked - user interaction required');
                }
            }
        }
        
        console.log("✅ Dave's avatar initialized in video area");
        
    } catch (error) {
        console.error("❌ Failed to initialize Dave's avatar:", error);
        addLogMessage('error', `❌ Failed to initialize Dave's avatar: ${error.message}`);
    }
}

// Vision Demo Enhancement Functions
function showVisionIndicator() {
    const indicator = document.getElementById('vision-indicator');
    if (indicator) {
        indicator.classList.add('active');
        setTimeout(() => {
            indicator.classList.remove('active');
        }, 2000);
    }
    
    // Also show the vision status for demo
    if (typeof showVisionStatus === 'function') {
        showVisionStatus();
    }
    
    // Update vision analytics
    if (typeof updateVisionAnalytics === 'function') {
        updateVisionAnalytics();
    }
}

function showVisionStatus() {
    const status = document.getElementById('vision-status');
    if (status) {
        status.classList.add('active');
        setTimeout(() => {
            status.classList.remove('active');
        }, 3000);
    }
}

// ==================== NOISE SUPPRESSION SYSTEM ====================

/**
 * Start audio level monitoring for noise detection and suppression
 */
function startAudioLevelMonitor() {
    if (isAudioLevelMonitoring || !localStream) return;
    
    try {
        // Create audio context for analysis
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(localStream);
        
        // Connect microphone to analyser
        microphone.connect(analyser);
        
        // Configure analyser for noise detection
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        isAudioLevelMonitoring = true;
        
        console.log("🎤 Audio level monitoring started");
        addLogMessage('info', '🎤 Audio monitoring active - detecting noise levels');
        
        // Start monitoring loop
        audioLevelMonitor = requestAnimationFrame(function checkAudioLevel() {
            if (!isAudioLevelMonitoring || !isMeetingActive) return;
            
            analyser.getByteFrequencyData(dataArray);
            
            // Calculate audio metrics
            const audioMetrics = calculateAudioMetrics(dataArray);
            
            // Process noise detection and suppression
            processNoiseDetection(audioMetrics);
            
            // Continue monitoring
            audioLevelMonitor = requestAnimationFrame(checkAudioLevel);
        });
        
    } catch (error) {
        console.error("❌ Failed to start audio monitoring:", error);
        addLogMessage('error', '❌ Audio monitoring failed - noise suppression disabled');
    }
}

/**
 * Calculate comprehensive audio metrics
 */
function calculateAudioMetrics(dataArray) {
    const length = dataArray.length;
    let sum = 0;
    let peak = 0;
    let lowFreqSum = 0;
    let midFreqSum = 0;
    let highFreqSum = 0;
    
    for (let i = 0; i < length; i++) {
        const value = dataArray[i];
        sum += value;
        peak = Math.max(peak, value);
        
        // Frequency analysis for noise detection
        if (i < length * 0.3) {
            lowFreqSum += value;  // Low frequencies (bass, rumble)
        } else if (i < length * 0.7) {
            midFreqSum += value;  // Mid frequencies (speech)
        } else {
            highFreqSum += value; // High frequencies (hiss, static)
        }
    }
    
    return {
        average: sum / length,
        peak: peak,
        lowFreq: lowFreqSum / (length * 0.3),
        midFreq: midFreqSum / (length * 0.4),
        highFreq: highFreqSum / (length * 0.3),
        dynamicRange: peak - (sum / length)
    };
}

/**
 * Process noise detection and provide user feedback
 */
function processNoiseDetection(metrics) {
    const { average, peak, lowFreq, midFreq, highFreq, dynamicRange } = metrics;
    
    // Detect different types of noise
    const noiseTypes = detectNoiseTypes(metrics);
    
    // Provide real-time feedback
    if (noiseTypes.length > 0) {
        provideNoiseFeedback(noiseTypes, metrics);
    }
    
    // Update UI with audio quality indicator
    updateAudioQualityIndicator(metrics);
}

/**
 * Detect specific types of noise
 */
function detectNoiseTypes(metrics) {
    const noiseTypes = [];
    
    // Too quiet (microphone too far or muted)
    if (metrics.average < 5) {
        noiseTypes.push({
            type: 'too_quiet',
            message: '🎤 Speak closer to your microphone',
            severity: 'warning'
        });
    }
    
    // Too loud (clipping or shouting)
    if (metrics.peak > 200) {
        noiseTypes.push({
            type: 'too_loud',
            message: '🔊 Reduce your speaking volume',
            severity: 'warning'
        });
    }
    
    // Background noise (high low-frequency content)
    if (metrics.lowFreq > metrics.midFreq * 1.5) {
        noiseTypes.push({
            type: 'background_noise',
            message: '🌪️ Reduce background noise (fans, AC, etc.)',
            severity: 'info'
        });
    }
    
    // Static/hiss (high frequency noise)
    if (metrics.highFreq > metrics.midFreq * 2) {
        noiseTypes.push({
            type: 'static',
            message: '📡 Check microphone connection',
            severity: 'warning'
        });
    }
    
    // Poor dynamic range (monotone or compressed audio)
    if (metrics.dynamicRange < 20) {
        noiseTypes.push({
            type: 'poor_dynamic_range',
            message: '🎵 Vary your speaking volume naturally',
            severity: 'info'
        });
    }
    
    return noiseTypes;
}

/**
 * Provide real-time noise feedback to user
 */
function provideNoiseFeedback(noiseTypes, metrics) {
    // Only show feedback every 5 seconds to avoid spam
    if (!window.lastNoiseFeedback || Date.now() - window.lastNoiseFeedback > 5000) {
        const primaryNoise = noiseTypes[0];
        
        if (primaryNoise.severity === 'warning') {
            addLogMessage('warning', primaryNoise.message);
        } else if (primaryNoise.severity === 'info') {
            addLogMessage('info', primaryNoise.message);
        }
        
        window.lastNoiseFeedback = Date.now();
    }
}

/**
 * Update audio quality indicator in UI
 */
function updateAudioQualityIndicator(metrics) {
    // Create or update audio quality indicator
    let indicator = document.getElementById('audio-quality-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'audio-quality-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            z-index: 1000;
            display: none;
        `;
        document.body.appendChild(indicator);
    }
    
    // Determine audio quality level
    let quality = 'Good';
    let color = '#28a745';
    
    if (metrics.average < 5) {
        quality = 'Too Quiet';
        color = '#ffc107';
    } else if (metrics.peak > 200) {
        quality = 'Too Loud';
        color = '#dc3545';
    } else if (metrics.lowFreq > metrics.midFreq * 1.5) {
        quality = 'Noisy';
        color = '#ffc107';
    } else if (metrics.average > 50) {
        quality = 'Excellent';
        color = '#28a745';
    }
    
    // Show indicator only if there are issues
    if (quality !== 'Good' && quality !== 'Excellent') {
        indicator.textContent = `🎤 Audio: ${quality}`;
        indicator.style.backgroundColor = color;
        indicator.style.display = 'block';
    } else {
        indicator.style.display = 'none';
    }
}

/**
 * Stop audio level monitoring
 */
function stopAudioLevelMonitor() {
    if (audioLevelMonitor) {
        cancelAnimationFrame(audioLevelMonitor);
        audioLevelMonitor = null;
    }
    
    if (microphone) {
        microphone.disconnect();
        microphone = null;
    }
    
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    
    isAudioLevelMonitoring = false;
    console.log("🎤 Audio level monitoring stopped");
}

/**
 * Toggle noise suppression on/off
 */
function toggleNoiseSuppression() {
    noiseSuppressionEnabled = !noiseSuppressionEnabled;
    
    if (noiseSuppressionEnabled) {
        addLogMessage('success', '🎤 Noise suppression enabled');
        if (isMeetingActive && !isAudioLevelMonitoring) {
            startAudioLevelMonitor();
        }
    } else {
        addLogMessage('info', '🎤 Noise suppression disabled');
        stopAudioLevelMonitor();
    }
    
    // Update button state
    updateNoiseSuppressionButton();
    
    return noiseSuppressionEnabled;
}

/**
 * Get current audio quality metrics
 */
function getAudioQualityMetrics() {
    if (!isAudioLevelMonitoring || !analyser) {
        return null;
    }
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    return calculateAudioMetrics(dataArray);
}

/**
 * Show audio quality metrics in a popup
 */
function showAudioQualityMetrics() {
    const metrics = getAudioQualityMetrics();
    
    if (!metrics) {
        addLogMessage('warning', '📊 Audio monitoring not active - start meeting first');
        return;
    }
    
    // Create metrics display
    const metricsText = `
🎤 Audio Quality Report:
• Average Level: ${metrics.average.toFixed(1)}
• Peak Level: ${metrics.peak}
• Low Freq: ${metrics.lowFreq.toFixed(1)} (background noise)
• Mid Freq: ${metrics.midFreq.toFixed(1)} (speech)
• High Freq: ${metrics.highFreq.toFixed(1)} (static/hiss)
• Dynamic Range: ${metrics.dynamicRange.toFixed(1)}

${metrics.average < 5 ? '⚠️ Too quiet - speak closer to microphone' : ''}
${metrics.peak > 200 ? '⚠️ Too loud - reduce volume' : ''}
${metrics.lowFreq > metrics.midFreq * 1.5 ? '⚠️ Background noise detected' : ''}
${metrics.highFreq > metrics.midFreq * 2 ? '⚠️ Static/hiss detected' : ''}
${metrics.dynamicRange < 20 ? '⚠️ Poor dynamic range' : ''}
    `.trim();
    
    addLogMessage('info', metricsText);
}

/**
 * Update noise suppression button state
 */
function updateNoiseSuppressionButton() {
    if (noiseSuppressionBtn) {
        if (noiseSuppressionEnabled) {
            noiseSuppressionBtn.textContent = '🎤 Noise Suppression: ON';
            noiseSuppressionBtn.className = 'btn btn-success';
        } else {
            noiseSuppressionBtn.textContent = '🎤 Noise Suppression: OFF';
            noiseSuppressionBtn.className = 'btn btn-warning';
        }
    }
}

function updateVisionAnalytics() {
    visionUpdateCount++;
    
    const updatesEl = document.getElementById('updates-count');
    const lastUpdateEl = document.getElementById('last-update');
    const analyticsPanel = document.getElementById('vision-analytics');
    
    if (updatesEl) updatesEl.textContent = visionUpdateCount;
    if (lastUpdateEl) lastUpdateEl.textContent = new Date().toLocaleTimeString();
    if (analyticsPanel) analyticsPanel.style.display = 'block';
}

// ==================== VISION ANALYSIS SYSTEM ====================

/**
 * Start vision updates - captures camera image and sends for analysis
 */
function startVisionUpdates() {
    if (isVisionActive || !localStream) return;
    
    isVisionActive = true;
    console.log("👁️ Starting vision updates...");
    
    // Initial vision capture
    captureAndAnalyzeVision();
    
    // Set up periodic vision updates every 30 seconds
    visionInterval = setInterval(() => {
        if (isMeetingActive && isVisionActive) {
            captureAndAnalyzeVision();
        }
    }, 60000); // 30 seconds
    
    addLogMessage('info', '👁️ Vision monitoring started - Dave can see your room');
}

/**
 * Stop vision updates
 */
function stopVisionUpdates() {
    if (visionInterval) {
        clearInterval(visionInterval);
        visionInterval = null;
    }
    isVisionActive = false;
    console.log("👁️ Vision updates stopped");
}

/**
 * Capture camera image and send for vision analysis
 */
async function captureAndAnalyzeVision() {
    if (!localStream || !isMeetingActive) return;
    
    try {
        // Capture image from camera
        const canvas = document.createElement('canvas');
        const video = document.getElementById('cameraVideo');
        
        if (!video || !video.videoWidth || !video.videoHeight) {
            console.log("👁️ Camera not ready for vision capture");
            return;
        }
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        
        console.log("👁️ Capturing vision data...");
        
        // Send to server for analysis
        const response = await fetch('/api/passive-vision', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ imageData })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log("✅ Vision analysis completed:", data.analysis);
            addLogMessage('info', '👁️ Room analyzed - Dave can see your space');
            
            // Update vision analytics
            updateVisionAnalytics();
        } else {
            console.error("❌ Vision analysis failed:", response.status);
        }
        
    } catch (error) {
        console.error("❌ Vision capture failed:", error);
    }
}

/**
 * Manual vision capture (for testing)
 */
async function captureVisionManually() {
    if (!isMeetingActive) {
        addLogMessage('warning', '⚠️ Start a meeting first to enable vision');
        return;
    }
    
    addLogMessage('info', '📸 Capturing room image for analysis...');
    await captureAndAnalyzeVision();
}

function startSpeechRecognition() {
    if (isMobile) {
        console.log('📱 Mobile device detected - using browser speech recognition');
        addLogMessage('info', '📱 Mobile speech recognition starting...');
        
        // Mobile: Use browser speech recognition (more reliable than AssemblyAI)
        if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
            console.error('Speech recognition not supported');
            addLogMessage('error', 'Speech recognition not supported in this browser');
            return;
        }
        
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = false; // Mobile works better with continuous=false
        recognition.interimResults = true; // Enable interim results for mobile
        recognition.maxAlternatives = 1;
        recognition.lang = 'en-US';
        
        setupBrowserSpeechRecognition();
    } else {
        // Desktop: Use browser speech recognition
        if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
            console.error('Speech recognition not supported');
            addLogMessage('error', 'Speech recognition not supported in this browser');
            return;
        }
        
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        setupBrowserSpeechRecognition();
    }
}

// AssemblyAI speech recognition for mobile
function startAssemblyAISpeechRecognition() {
    console.log('🎤 Starting AssemblyAI speech recognition for mobile');
    addLogMessage('success', '🎤 AssemblyAI speech recognition active');
    
    // Start audio recording for AssemblyAI
    startAudioRecording();
}

// Audio recording for AssemblyAI
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

function startAudioRecording() {
    if (!localStream) {
        console.error('No local stream available for recording');
        return;
    }
    
    try {
        // Create MediaRecorder for audio capture
        mediaRecorder = new MediaRecorder(localStream, {
            mimeType: 'audio/webm;codecs=opus'
        });
        
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = async () => {
            if (audioChunks.length > 0) {
                try {
                    await processAudioWithAssemblyAI();
                } catch (error) {
                    console.error('❌ AssemblyAI processing failed:', error);
                    addLogMessage('warning', '⚠️ AssemblyAI failed, trying browser speech recognition');
                    // Fallback to browser speech recognition
                    startBrowserSpeechRecognitionFallback();
                }
            }
        };
        
        // Start recording
        mediaRecorder.start(1000); // Record in 1-second chunks
        isRecording = true;
        console.log('🎤 Audio recording started for AssemblyAI');
        
        // Auto-stop and process after 3 seconds of silence
        setTimeout(() => {
            if (isRecording) {
                stopAudioRecording();
            }
        }, 3000);
        
    } catch (error) {
        console.error('❌ Failed to start audio recording:', error);
        addLogMessage('error', '❌ Failed to start audio recording');
    }
}

function stopAudioRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        console.log('🎤 Audio recording stopped');
    }
}

async function processAudioWithAssemblyAI() {
    try {
        // Combine audio chunks
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        
        // Convert to base64
        const base64Audio = await blobToBase64(audioBlob);
        
        console.log('🎤 Sending audio to AssemblyAI...');
        
        // Send to AssemblyAI endpoint
        const response = await fetch('/api/speech-recognition', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                audioData: base64Audio
            })
        });
        
        if (!response.ok) {
            throw new Error(`AssemblyAI request failed: ${response.status}`);
        }
        
        const data = await response.json();
        const transcript = data.transcript;
        
        if (transcript && transcript.trim().length > 2) {
            console.log('👤 User said (AssemblyAI):', transcript);
            addLogMessage('info', `👤 You: ${transcript}`);
            
            // Process the transcript the same way as browser speech recognition
            await processUserSpeech(transcript);
        } else {
            console.log('🎤 No speech detected, restarting recording...');
            // Restart recording after a short delay
            setTimeout(() => {
                if (isMeetingActive) {
                    startAudioRecording();
                }
            }, 1000);
        }
        
    } catch (error) {
        console.error('❌ AssemblyAI processing failed:', error);
        addLogMessage('error', '❌ Speech recognition failed');
        
        // Restart recording after error
        setTimeout(() => {
            if (isMeetingActive) {
                startAudioRecording();
            }
        }, 2000);
    }
}

// Helper function to convert blob to base64
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Process user speech (shared by both AssemblyAI and browser recognition)
async function processUserSpeech(transcript) {
    try {
        // Add user message to conversation history
        conversationHistory.push({ role: 'user', content: transcript });
        
        // Call your custom LLM with vision context and full history
        const response = await fetch('/api/chat-stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: conversationHistory
            })
        });
        
        if (!response.ok) {
            console.error('LLM request failed');
            return;
        }
        
        // Stop speech recognition BEFORE processing Dave's response
        if (recognition) {
            try {
                recognition.stop();
                console.log('🎤 Pausing speech recognition while Dave talks');
            } catch (e) {
                // Already stopped
            }
        }
        
        // Stop AssemblyAI recording if active
        if (mediaRecorder && isRecording) {
            stopAudioRecording();
        }
        
        // Read streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
                try {
                    const data = JSON.parse(line);
                    if (data.content) {
                        fullResponse += data.content;
                    }
                } catch (e) {
                    // Skip invalid JSON
                }
            }
        }
        
        console.log('💬 Dave response:', fullResponse);

        // Add to conversation history
        conversationHistory.push({ role: 'assistant', content: fullResponse });

        // Make Dave talk
        if (daveAvatar && fullResponse) {
            addLogMessage('info', `Dave: ${fullResponse}`);
            
            // Mobile-specific audio handling
            if (isMobile) {
                console.log('📱 Mobile device - handling audio playback');
                addLogMessage('info', '📱 Mobile audio: Dave is speaking...');
                
                // Mobile browsers require user interaction for audio
                // Try to enable audio context if needed
                try {
                    if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
                        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                        if (AudioContextClass) {
                            const audioContext = new AudioContextClass();
                            if (audioContext.state === 'suspended') {
                                await audioContext.resume();
                                console.log('📱 Mobile audio context resumed');
                            }
                        }
                    }
                } catch (audioError) {
                    console.log('📱 Mobile audio context handling:', audioError.message);
                }
                
                // Add mobile audio enable button if not already present
                if (!document.getElementById('mobile-audio-btn')) {
                    addMobileAudioButton();
                }
            }
            
            daveAvatar.talk(fullResponse);
            
            // Conservative timing to prevent echo
            const wordCount = fullResponse.split(' ').length;
            const speakingTime = (wordCount / 90) * 60 * 1000; // 90 words per minute
            const avatarProcessing = 3000;  // 3 seconds for avatar to process
            const audioClearing = 5000;     // 5 seconds for audio to fully clear
            const totalWaitTime = speakingTime + avatarProcessing + audioClearing;
            
            console.log(`⏱️ Waiting ${(totalWaitTime/1000).toFixed(1)}s for Dave to finish (${wordCount} words)`);
            
            setTimeout(() => {
                if (isMeetingActive) {
                    // Restart appropriate speech recognition
                    if (isMobile) {
                        startAudioRecording();
                    } else if (recognition) {
                        try {
                            recognition.start();
                            console.log('🎤 Speech recognition restarted after Dave finished');
                        } catch (e) {
                            console.log('Recognition already running');
                        }
                    }
                }
            }, totalWaitTime);
        }
        
    } catch (error) {
        console.error('Error processing speech:', error);
        addLogMessage('error', 'Failed to process speech');
    }
}

// Browser speech recognition setup (for desktop)
function setupBrowserSpeechRecognition() {
    recognition.onstart = () => {
        console.log('🎤 Speech recognition started');
        addLogMessage('success', '🎤 Listening...');
    };
    
    recognition.onresult = async (event) => {
        let transcript = '';
        
        // Handle mobile vs desktop differently
        if (isMobile) {
            // Mobile: Get the final result
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    transcript = event.results[i][0].transcript;
                    break;
                }
            }
        } else {
            // Desktop: Get the latest result
            transcript = event.results[event.results.length - 1][0].transcript;
        }
        
        // Only process if we have a meaningful transcript
        if (!transcript || transcript.trim().length < 2) {
            console.log('🎤 Empty or too short transcript, ignoring');
            return;
        }
        
        console.log('👤 User said:', transcript);
        addLogMessage('info', `👤 You: ${transcript}`);
        
        // Use shared speech processing function
        await processUserSpeech(transcript);
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        
        // Mobile-specific error handling
        if (event.error === 'no-speech') {
            // Ignore no-speech errors
            return;
        }
        
        if (event.error === 'not-allowed') {
            addLogMessage('error', '❌ Microphone permission denied. Please allow microphone access and refresh the page.');
            return;
        }
        
        if (event.error === 'network') {
            addLogMessage('error', '❌ Network error. Please check your internet connection.');
            return;
        }
        
        if (isMobile && event.error === 'aborted') {
            // Mobile-specific: user might have switched apps or locked screen
            console.log('📱 Mobile speech recognition aborted - likely app switch or screen lock');
            return;
        }
        
        addLogMessage('warning', `Speech error: ${event.error}`);
        
        // For mobile, try to restart after a delay
        if (isMobile && isMeetingActive) {
            setTimeout(() => {
                if (isMeetingActive && recognition) {
                    try {
                        recognition.start();
                        console.log('📱 Mobile speech recognition restarted after error');
                    } catch (e) {
                        console.error('📱 Failed to restart mobile speech recognition:', e);
                    }
                }
            }, 2000);
        }
    };
    
    recognition.onend = () => {
        // Auto-restart if meeting is still active
        if (isMeetingActive && recognition) {
            // Add small delay for mobile to prevent rapid restart issues
            const delay = isMobile ? 1000 : 100; // 1 second delay for mobile, 100ms for desktop
            
            setTimeout(() => {
                if (isMeetingActive && recognition) {
                    try {
                        recognition.start();
                        console.log('🎤 Speech recognition restarted');
                    } catch (error) {
                        console.log('🎤 Speech recognition restart failed:', error.message);
                        // Try again after a longer delay
                        setTimeout(() => {
                            if (isMeetingActive && recognition) {
                                try {
                                    recognition.start();
                                } catch (e) {
                                    console.error('🎤 Speech recognition restart failed again:', e.message);
                                }
                            }
                        }, 2000);
                    }
                }
            }, delay);
        }
    };
    
    recognition.start();
}

function stopSpeechRecognition() {
    // Stop browser speech recognition
    if (recognition) {
        recognition.stop();
        recognition = null;
        console.log('🎤 Browser speech recognition stopped');
    }
    
    // Stop AssemblyAI recording
    if (mediaRecorder && isRecording) {
        stopAudioRecording();
        mediaRecorder = null;
        console.log('🎤 AssemblyAI recording stopped');
    }
}

// Add mobile audio enable button
function addMobileAudioButton() {
    // Remove existing button if present
    const existingButton = document.getElementById('mobile-audio-btn');
    if (existingButton) {
        existingButton.remove();
    }
    
    const audioButton = document.createElement('button');
    audioButton.id = 'mobile-audio-btn';
    audioButton.innerHTML = '🔊 Enable Audio';
    audioButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #ff6b35;
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 25px;
        font-size: 14px;
        font-weight: bold;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        cursor: pointer;
        display: block;
    `;
    
    audioButton.addEventListener('click', async () => {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                const audioContext = new AudioContextClass();
                if (audioContext.state === 'suspended') {
                    await audioContext.resume();
                    console.log('📱 Mobile audio enabled by user');
                    addLogMessage('success', '📱 Audio enabled! Dave can now speak.');
                }
            }
            
            // Also try to enable Dave's video audio
            const personaVideo = document.getElementById('persona-video');
            if (personaVideo) {
                personaVideo.muted = false;
                personaVideo.volume = 1.0;
                try {
                    await personaVideo.play();
                    console.log('📱 Dave\'s video audio enabled');
                    addLogMessage('success', '📱 Dave\'s audio is now enabled!');
                } catch (playError) {
                    console.log('📱 Dave\'s video play failed:', playError);
                    addLogMessage('info', '📱 Tap Dave\'s video to enable his audio');
                }
            }
            
            // Hide the button after enabling
            audioButton.style.display = 'none';
            
        } catch (error) {
            console.error('📱 Mobile audio enable failed:', error);
            addLogMessage('error', '📱 Failed to enable audio. Please try again.');
        }
    });
    
    document.body.appendChild(audioButton);
    
    // Don't auto-hide - let user control it
    console.log('📱 Mobile audio button added');
}

// Fallback browser speech recognition for mobile when AssemblyAI fails
function startBrowserSpeechRecognitionFallback() {
    console.log('🔄 Starting browser speech recognition fallback for mobile');
    addLogMessage('info', '🔄 Using browser speech recognition...');
    
    if (!recognition) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognition = new SpeechRecognition();
            setupBrowserSpeechRecognition();
        } else {
            addLogMessage('error', '❌ Speech recognition not supported on this device');
            return;
        }
    }
    
    try {
        recognition.start();
        console.log('🎤 Browser speech recognition started as fallback');
    } catch (error) {
        console.error('❌ Browser speech recognition fallback failed:', error);
        addLogMessage('error', '❌ Speech recognition not available');
    }
}

// Export functions for global access
window.clearLog = clearLog;
window.handleImageUpload = handleImageUpload;
window.showVisionIndicator = showVisionIndicator;
window.showVisionStatus = showVisionStatus;
window.updateVisionAnalytics = updateVisionAnalytics;

console.log("✅ Meeting script loaded successfully");
