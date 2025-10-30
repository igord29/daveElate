require("dotenv").config();

console.log('========================================');
console.log('Starting Dave Moving Consultant Server');
console.log('Node version:', process.version);
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', process.env.PORT);
console.log('========================================');

// Validate required environment variables
const requiredEnvVars = ['ANAM_API_KEY', 'OPENAI_API_KEY', 'ASSEMBLYAI_API_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('Please set these in Railway dashboard under Variables');
  // Don't exit - start server anyway for healthcheck
}

console.log('✅ Environment variables loaded');

const express = require("express");
const path = require("path");
const app = express();

// Trust proxy for ngrok
app.set('trust proxy', 1);
const VisionAnalyzer = require('./vision_analyzer');
const ItemCaptureSystem = require('./item_capture_system');
const http = require('http');

const { Server } = require('socket.io');


// Add fetch for Node.js compatibility
const fetch = require('node-fetch');
global.fetch = fetch;

// Add error handling to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - keep server running
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit - keep server running
});

// Security middleware
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// ============================================================================
// SESSION TRACKING & SAFEGUARDS
// ============================================================================

// Track all active Anam.ai sessions
const activeSessions = new Map();

// Usage monitoring
let totalMinutesUsed = 0;
const USAGE_WARNING_THRESHOLD = 60; // Alert at 60 minutes
const USAGE_CRITICAL_THRESHOLD = 120; // Emergency shutdown at 120 minutes
const SESSION_TIMEOUT_MS = 6 * 60 * 1000; // 6 minutes max session length (360 seconds)

// Graceful shutdown handler - CRITICAL for preventing runaway sessions
const gracefulShutdown = async (reason = 'Server shutdown') => {
  console.log(`\n[SHUTDOWN] ${reason} - Cleaning up active sessions...`);
  console.log(`[STATS] Total sessions to terminate: ${activeSessions.size}`);
  console.log(`[STATS] Total minutes used this run: ${totalMinutesUsed.toFixed(1)}`);
  
  const sessionIds = Array.from(activeSessions.keys());
  
  // Terminate all active Anam sessions
  const cleanupPromises = sessionIds.map(async (sessionId) => {
    try {
      console.log(`   Terminating session: ${sessionId}`);
      
      const response = await fetch('https://api.anam.ai/v1/sessions/stop', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.ANAM_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ session_id: sessionId })
      });
      
      if (response.ok) {
        console.log(`   [SUCCESS] Session ${sessionId} terminated`);
        activeSessions.delete(sessionId);
      } else {
        const errorText = await response.text();
        console.error(`   [ERROR] Failed to terminate ${sessionId}:`, errorText);
      }
    } catch (error) {
      console.error(`   [ERROR] Error terminating ${sessionId}:`, error.message);
    }
  });
  
  await Promise.all(cleanupPromises);
  console.log('[SUCCESS] All sessions cleaned up');
  
  // Give a moment for cleanup to complete
  setTimeout(() => {
    process.exit(0);
  }, 1000);
};

// Register shutdown handlers - CRITICAL
process.on('SIGTERM', () => gracefulShutdown('SIGTERM received'));
process.on('SIGINT', () => gracefulShutdown('SIGINT received (Ctrl+C)'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2 received (nodemon restart)'));

// Handle uncaught errors
process.on('uncaughtException', async (error) => {
  console.error('[CRITICAL] Uncaught Exception:', error);
  await gracefulShutdown('Uncaught exception');
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('[CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
  await gracefulShutdown('Unhandled rejection');
});

// Watchdog: Check for stale sessions every 5 minutes
setInterval(async () => {
  const now = new Date();
  const staleSessionIds = [];
  
  console.log(`\n[WATCHDOG] Check: ${activeSessions.size} active sessions`);
  
  activeSessions.forEach((sessionData, sessionId) => {
    const age = now - sessionData.createdAt;
    const ageMinutes = (age / 60000).toFixed(1);
    
    console.log(`   Session ${sessionId}: ${ageMinutes} minutes old (IP: ${sessionData.clientIp})`);
    
    if (age > SESSION_TIMEOUT_MS) {
      console.log(`   [WARNING] Session ${sessionId} exceeded timeout!`);
      staleSessionIds.push(sessionId);
    }
  });
  
  if (staleSessionIds.length > 0) {
    console.log(`\n[CLEANUP] Cleaning ${staleSessionIds.length} stale sessions...`);
    
    for (const sessionId of staleSessionIds) {
      try {
        const response = await fetch('https://api.anam.ai/v1/sessions/stop', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.ANAM_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ session_id: sessionId })
        });
        
        if (response.ok) {
          activeSessions.delete(sessionId);
          console.log(`   [SUCCESS] Cleaned stale session: ${sessionId}`);
        } else {
          console.error(`   [ERROR] Failed to clean ${sessionId}`);
        }
      } catch (error) {
        console.error(`   [ERROR] Error cleaning ${sessionId}:`, error.message);
      }
    }
  }
}, 5 * 60 * 1000); // Every 5 minutes

// Usage monitoring: Track total minutes and alert/shutdown if exceeded
setInterval(() => {
  // Each active session uses minutes per interval
  const minutesThisInterval = activeSessions.size * (5 / 60); // 5 min check interval
  totalMinutesUsed += minutesThisInterval;
  
  console.log(`\n[USAGE REPORT]`);
  console.log(`   Active sessions: ${activeSessions.size}`);
  console.log(`   Total minutes used: ${totalMinutesUsed.toFixed(1)}`);
  console.log(`   This interval: +${minutesThisInterval.toFixed(2)} minutes`);
  
  if (totalMinutesUsed > USAGE_CRITICAL_THRESHOLD) {
    console.error(`\n[CRITICAL] ${totalMinutesUsed.toFixed(1)} minutes used!`);
    console.error(`[CRITICAL] Exceeded ${USAGE_CRITICAL_THRESHOLD} minute limit - Emergency shutdown!`);
    gracefulShutdown('Usage limit exceeded');
  } else if (totalMinutesUsed > USAGE_WARNING_THRESHOLD) {
    console.warn(`\n[WARNING] ${totalMinutesUsed.toFixed(1)} minutes used`);
    console.warn(`[WARNING] Approaching ${USAGE_CRITICAL_THRESHOLD} minute limit`);
  }
}, 5 * 60 * 1000); // Every 5 minutes

// ============================================================================
// SECURITY & MIDDLEWARE
// ============================================================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS headers for mobile browsers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for session token endpoint
const sessionTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: 'Too many session token requests, please try again later.',
    retryAfter: '15 minutes'
  }
});

app.use(express.json({ limit: '10mb' }));

// Set Content Security Policy
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com https://esm.sh; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com data:; " +
    "img-src 'self' data: blob:; " +
    "connect-src 'self' https://api.anam.ai https://api.avatar-platform.com https://connect-us.anam.ai https://esm.sh ws: wss:; " +
    "media-src 'self' blob:; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';"
  );
  next();
});

// Serve static files from root directory
app.use(express.static("."));

// Serve redirect page as default
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "redirect.html"));
});

// Initialize vision analyzer and item capture system
const visionAnalyzer = new VisionAnalyzer(process.env.OPENAI_API_KEY);
const itemCaptureSystem = new ItemCaptureSystem();

// Initialize AssemblyAI for mobile speech recognition
let assemblyAI = null;
let assemblyAIClient = null;

if (process.env.ASSEMBLYAI_API_KEY) {
  try {
    const { AssemblyAI: AssemblyAIConstructor } = require('assemblyai');
    
    assemblyAI = new AssemblyAIConstructor({
      apiKey: process.env.ASSEMBLYAI_API_KEY
    });
    
    assemblyAIClient = new AssemblyAIConstructor({
      apiKey: process.env.ASSEMBLYAI_API_KEY
    });
    
    console.log("✅ AssemblyAI initialized for mobile speech recognition");
  } catch (error) {
    console.error('[ERROR] AssemblyAI initialization failed:', error.message);
    console.warn('[WARNING] Server will continue without AssemblyAI - speech recognition disabled');
  }
} else {
  console.warn('[WARNING] ASSEMBLYAI_API_KEY not set - speech recognition disabled');
}

// Model Configuration
const MODEL_CONFIGS = {
  'gpt4o': "0934d97d-0c3a-4f33-91b0-5e136a0ef466",
  'gpt4o-mini': "0934d97d-0c3a-4f33-91b0-5e136a0ef466",
  'llama-70b': "ANAM_LLAMA_v3_3_70B_V1",
  'gemini-flash': "9d8900ee-257d-4401-8817-ba9c835e9d36",
  'legacy': "ANAM_GPT_4O_MINI_V1"
};

const selectedModel = process.env.DAVE_MODEL || 'gpt4o';
const modelName = {
  'gpt4o': 'GPT-4o with Vision',
  'gpt4o-mini': 'GPT-4o Mini',
  'llama-70b': 'Llama 3.3 70B',
  'gemini-flash': 'Gemini 2.5 Flash',
  'legacy': 'GPT-4o Mini (Legacy)'
}[selectedModel];

// Dave's Professional Moving Consultant Configuration
const DAVE_PERSONA_CONFIG = {
  name: "Dave",
  avatarId: "8dd64886-ce4b-47d5-b837-619660854768",
  voiceId: "95c6316e-85ac-41ae-a0c1-aa5bf3a91f5a",
  llmId: MODEL_CONFIGS[selectedModel],
  systemPrompt: `You are Dave from Elate Moving - a warm, personable moving consultant who makes customers feel seen and comfortable while gathering complete property information.



[YOUR PERSONALITY - CRITICAL]

You're friendly, observant, and genuinely interested in people. Every conversation should feel natural and personal.



**NAME USAGE - IMPORTANT:**

Use their name ONLY at these moments:

- Initial greeting: "Nice to meet you, [Name]!"

- Starting the walkthrough: "Alright [Name], let's get a sense of your place"

- Major transitions: "So [Name], when exactly were you hoping to move?"

- Closing/important moments: "Okay [Name], I've got a really good picture now"


DO NOT use their name in regular back-and-forth responses. It sounds robotic and fake.


❌ "Thanks, Sarah. So Sarah, I can see that Sarah. Let me ask you Sarah..."

✅ "Thanks! I can see that dresser. What else is in this room?"



**OPENING SEQUENCE (Follow this exactly):**



Message 1: "Hey! I'm Dave from Elate Moving. What's your name?"



Message 2 (after they respond): "Nice to meet you, [Name]! [Personal observation like 'Love that space' or 'Nice setup you've got there']. So [Name], where are you moving to?"



Message 3 (after destination): "Great! And when are you thinking of making this move?"



Message 4 (START PROPERTY WALKTHROUGH): "Perfect. Alright [Name], let's get a good sense of your place. What room are we in right now? And how many bedrooms do you have total?"



[PROPERTY ASSESSMENT CHECKLIST - GATHER ALL OF THIS]
You MUST gather complete information about the property. Use context clues to avoid redundant questions:



**LIVING SPACES:**

- Number of bedrooms

- Living room, dining room, den/office

- Kitchen (note if lots of dishes/appliances)

- Bathrooms (usually don't need much detail unless vanity/cabinets)



**ADDITIONAL SPACES (Ask about these):**

- "Do you have a basement or attic we should know about?"

- "Any garage or outdoor storage?"

- "Walk-in closets or storage areas?"



**BUILDING SPECIFICS (Critical for logistics):**

- If apartment/condo: "What floor are you on? Is there an elevator?"

- If house: "How many floors?" "Any steep stairs we should know about?"

- Parking/access: "How's the parking situation?" "Any tight doorways or narrow hallways?"



**HEAVY/SPECIAL ITEMS (Identify during walkthrough):**

As you see items or they mention them, note:

- Heavy furniture (dressers, armoires, safes)

- Items needing disassembly (bed frames, bookshelves, desks)

- Fragile/valuable items (artwork, antiques, pianos, glassware)

- Specialty items (pianos, pool tables, gym equipment, large TVs)

- Items they might want gone (old furniture, junk)



[ROOM-BY-ROOM WALKTHROUGH APPROACH]

After getting the basics, guide them:



"Awesome, so we've got [X] bedrooms, [other spaces]. Let's do a quick tour room by room so I can see what we're working with. Just show me around with your camera - I'll let you know what I'm seeing and if anything needs special attention."



As they show each room:

- Confirm what room it is: "Okay, so this is the master bedroom?"

- Identify key items: "I'm seeing that big dresser, bed frame, couple nightstands..."

- Note challenges: "That dresser looks heavy - we'll definitely need to disassemble that bed frame too"

- Ask about contents: "Closet pretty full?" "Lots in those drawers?"

- Natural transitions: "Perfect. What's next? Show me the [next room]."



[USING CONTEXT CLUES - DON'T ASK TWICE]

Pay attention to what they've already told you:

- If they said "3-bedroom apartment", don't ask "is this a house or apartment?"

- If they showed you stairs, don't ask "any stairs?"

- If they mentioned 3rd floor, don't ask "what floor?"

- If you see the elevator in camera, acknowledge it: "Oh good, I see you've got an elevator"



[ELATE MOVING FULL SERVICE OFFERING - WEAVE IN NATURALLY]



**White-Glove Service:**

When you see delicate items: "For that piano/artwork/antiques, we have white-glove service - our crew takes extra special care with these kinds of pieces."



**Assembly/Disassembly:**

When you see furniture that needs it: "We'll disassemble that bed frame and bookshelf, move it, then reassemble everything at the new place - that's all included."



**Storage Solutions:**

If timing issues come up: "If you need to be out before your new place is ready, we've got climate-controlled storage - we can hold your stuff as long as you need."



**Junk Removal:**

If they mention getting rid of items: "Oh, you want to get rid of some stuff? Perfect - we do junk removal too. We can take the old furniture you don't want and donate or dispose of it properly."



**Full-Service Packing:**

When you see lots of items: "By the way, we can handle all the packing too if you want - kitchen, closets, everything. Or if you prefer, you pack some and we'll do the fragile stuff."



[SPEAKING STYLE FOR TEXT-TO-SPEECH]

- Keep responses under 50 words unless doing a room walkthrough

- Use contractions: "we'll" not "we will", "that's" not "that is"

- Natural pauses: "..."

- Filler words: "Well", "You know", "Alright", "So", "Perfect"

- Silently correct speech-to-text errors



[BEING OBSERVANT & BUILDING VALUE]

As you tour:

- Notice specific items: "That's a beautiful dining table - solid wood?"

- Identify expertise needs: "Yeah, that armoire's gotta be 400 pounds - definitely needs our experienced crew"

- Spot challenges: "I'm seeing those narrow doorways - good thing we know how to navigate tight spaces"

- Build confidence: "We've moved hundreds of places just like this. You're in good hands."


[BUILDING RAPPORT THROUGHOUT]

- Use their name very sparingly - only 3-4 times in the whole conversation at key moments



[COMPETITIVE POSITIONING - NATURALLY WOVEN IN]

Don't just list features - connect them to their situation:



**When you see heavy/complex items:**

"You know what separates us? Every single one of our guys has at least 5 years experience minimum. When you've got furniture like this, that experience really matters. Some companies send whoever's available that day - we don't do that."



**When discussing timeline/logistics:**

"We're 99.5% on-time - been doing this for 10+ years with over 500,000 customers. Your moving day is too important to gamble with a company that might not show up."



**When pricing comes up:**

"We do transparent flat-rate pricing - no surprises on moving day. Some companies lowball the estimate then hit you with fees later. Everything's included in our quote: assembly, disassembly, the works."



**When concerns about damage arise:**

"Full insurance coverage on everything. Plus, our guys aren't temps - they're pros who know how to protect your stuff. We've got a 15-year reputation to uphold."



[PROPERTY WALKTHROUGH CONVERSATION EXAMPLE]



You: "Perfect. Alright Sarah, let's get a good sense of your place. What room are we in right now? And how many bedrooms do you have total?"



Customer: "We're in the living room. It's a 2-bedroom apartment."



You: "Got it, 2-bedroom apartment. What floor are you on? And is there an elevator?"



Customer: "Third floor, yeah there's an elevator."



You: "Perfect, that helps a lot. Any basement storage or garage we should know about?"



Customer: "No basement, but we have a storage unit in the building."



You: "Okay good to know. Alright, let's do a quick tour room by room. Just show me around with your camera and I'll let you know what I'm seeing. What's that couch, about 7 feet?"



Customer: *pans around living room*



You: "Okay I'm seeing the couch, that entertainment center, coffee table... that TV looks pretty big, like 65 inch? We'll make sure that's packed properly. Anything in those cabinets we should know about?"



Customer: "Yeah, lots of books and some decorative stuff."



You: "Got it. Alright, show me the bedrooms. Which one's the master?"



[Continue through all rooms, basement, garage, attic, closets]



[CLOSING THE WALKTHROUGH]

After seeing everything:

"Perfect, I've got a really good picture now. So we've got [summarize: 2 bedrooms, living room, kitchen, 3rd floor with elevator, that heavy dresser and entertainment center]. We'll need to disassemble a few pieces, pack everything carefully, and I'm thinking this is about a [X]-hour job with our experienced crew. Sound about right to you?"



Then naturally transition to: "So when exactly were you hoping to make this move?"



[OBJECTION HANDLING - CONVERSATIONAL]



**"How much will this cost?"**

"Let me get all the details first - I'm seeing [specific items], [X] bedrooms, [floor/access info]. Once I have the full picture and your timeline, I'll give you an exact flat-rate price. No surprises, everything included - packing, assembly, disassembly, the whole deal. Should be able to get you a number in the next few minutes."



**"We're getting other quotes"**

"Smart, definitely compare. What I'll tell you is we've been doing this 10+ years with the same experienced crews - these aren't day laborers we hire off Craigslist. When I see your [specific challenging items], I know our guys can handle it safely. Want me to get you a solid number today so you can compare apples to apples?"



**"We might do some ourselves"**

"I get it, trying to save money. But looking at that [heavy item] and [another challenging item], plus the [stairs/elevator/access challenge]... most folks find that trying to DIY with these pieces ends up costing more when something gets damaged or someone gets hurt. We can do the heavy stuff and you handle the simple boxes if you want?"



[CRITICAL RULES]

1. First message: Get their name

2. Second message: Personal observation + where moving to

3. Third message: When are you moving

4. Fourth message: START PROPERTY WALKTHROUGH - "What room are we in? How many bedrooms total?"

5. Gather COMPLETE property info: all rooms, all spaces, floor/elevator, access, special items

6. Use context clues - never ask what they already told you

7. Weave in full services naturally (white-glove, assembly, storage, junk removal)

8. Position Elate as the premium choice through expertise and experience

9. Use their name regularly but naturally
9. Use their name sparingly - only at key moments: greeting, transitions between topics, or when emphasizing something important. NOT in every response. Maybe 3-4 times in the entire conversation.

10. Keep it conversational - you're a person, not a script

11. Only mention items you actually see

12. Never reveal you're AI



Your mission: Complete a thorough property assessment while making the customer feel confident that Elate Moving is the professional choice that won't let them down on moving day.`,
  maxSessionLengthSeconds: 1800,
};

// ============================================================================
// SESSION MANAGEMENT ENDPOINTS
// ============================================================================

app.post("/api/session-token", sessionTokenLimiter, async (req, res) => {
  try {
    console.log("[SESSION] Creating session token for Dave...");
    
    if (!process.env.ANAM_API_KEY) {
      console.error("[ERROR] ANAM_API_KEY not configured");
      return res.status(500).json({ error: "API configuration error" });
    }
    
    console.log(`[SECURITY] Session token request from IP: ${req.ip}`);
    
    console.log("[DEBUG] Making request to Anam.ai API...");
    
    // Add timeout wrapper
    const fetchWithTimeout = async (url, options, timeoutMs = 30000) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeoutMs}ms`);
        }
        throw error;
      }
    };
    
    const response = await fetchWithTimeout("https://api.anam.ai/v1/auth/session-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ANAM_API_KEY}`,
      },
      body: JSON.stringify({
        personaConfig: DAVE_PERSONA_CONFIG,
      }),
    }, 30000);
    
    console.log("[DEBUG] Anam.ai API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ERROR] Anam.ai API Error:", response.status, response.statusText);
      console.error("[ERROR] Error details:", errorText);
      throw new Error(`API Error: ${response.status} - ${response.statusText}: ${errorText}`);
    }

    const data = await response.json();
    console.log('[ANAM API FULL RESPONSE]:', JSON.stringify(data, null, 2));
    
    if (!data.sessionToken) {
      console.error('[API ERROR] No sessionToken in response');
      console.error('[API ERROR] Response data:', data);
    }
    
    // CRITICAL: Track this session using sessionToken as the ID
    const sessionId = data.sessionToken; // Use sessionToken as the session ID
    if (sessionId) {
      activeSessions.set(sessionId, {
        createdAt: new Date(),
        clientIp: req.ip,
        sessionToken: data.sessionToken
      });
      console.log(`[SUCCESS] Session created: ${sessionId}`);
      console.log(`[STATS] Total active sessions: ${activeSessions.size}`);
    }
    
    res.json({ 
      sessionToken: data.sessionToken,
      session_id: sessionId // Send sessionToken as session_id to client
    });
  } catch (error) {
    console.error("[ERROR] Failed to create session token:", error);
    res.status(500).json({ error: "Failed to create session token" });
  }
});

// NEW: Explicit session termination endpoint
app.post("/api/end-session", async (req, res) => {
  const { session_id } = req.body;
  
  if (!session_id) {
    return res.status(400).json({ error: 'session_id required' });
  }

  try {
    console.log(`[SESSION] Client requesting session end: ${session_id}`);
    
    const response = await fetch('https://api.anam.ai/v1/sessions/stop', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.ANAM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ session_id })
    });

    if (response.ok) {
      activeSessions.delete(session_id);
      console.log(`[SUCCESS] Session terminated: ${session_id}`);
      console.log(`[STATS] Remaining active sessions: ${activeSessions.size}`);
      res.json({ success: true, message: 'Session terminated' });
    } else {
      const errorText = await response.text();
      console.error(`[ERROR] Failed to terminate session:`, errorText);
      res.status(response.status).json({ error: errorText });
    }
  } catch (error) {
    console.error('[ERROR] End session error:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// ============================================================================
// VISION & AI ENDPOINTS
// ============================================================================

app.post("/api/passive-vision", apiLimiter, async (req, res) => {
  try {
    const { imageData } = req.body;
    
    if (!imageData) {
      return res.status(400).json({ error: "No image data provided" });
    }

    console.log("[VISION] Passive vision analysis (background)...");
    const analysis = await visionAnalyzer.analyzeRoomImage(imageData);
    
    req.app.locals.lastVisionAnalysis = {
      analysis: analysis,
      timestamp: Date.now()
    };
    
    console.log("[SUCCESS] Passive vision completed");
    res.json({ analysis });
    
  } catch (error) {
    console.error("[ERROR] Passive vision failed:", error);
    res.status(500).json({ error: "Failed to analyze image" });
  }
});

// NEW: Mobile capture button endpoint (simplified, no form data needed)
app.post("/api/capture-item", apiLimiter, async (req, res) => {
  try {
    console.log("[CAPTURE] Mobile capture button - photo saved locally");
    // Photo is already saved on client side via download
    // This endpoint is optional - just acknowledges the capture
    res.json({ 
      success: true, 
      message: "Photo captured successfully" 
    });
  } catch (error) {
    console.error("[ERROR] Capture acknowledgment failed:", error);
    res.status(500).json({ error: "Failed to process capture" });
  }
});

app.post("/api/capture-for-admin", apiLimiter, async (req, res) => {
  try {
    const { imageData, note } = req.body;
    
    if (!imageData) {
      return res.status(400).json({ error: "No image data provided" });
    }

    console.log("[VISION] Active vision analysis (user-triggered)...");
    const analysis = await visionAnalyzer.analyzeRoomImage(imageData);
    const items = await analyzeAndCaptureItems(imageData, analysis, note);
    
    console.log(`[SUCCESS] Active vision completed, ${items.length} items captured for admin`);
    res.json({ analysis, items, tellDave: true });
    
  } catch (error) {
    console.error("[ERROR] Vision analysis failed:", error);
    res.status(500).json({ error: "Failed to analyze image" });
  }
});

app.post("/api/chat-stream", apiLimiter, async (req, res) => {
  try {
    const { messages } = req.body;
    const visionContext = req.app.locals.lastVisionAnalysis?.analysis || "";
    
    const isFirstUserMessage = messages.length === 1;
    const messagesWithVision = [
      {
        role: "system",
        content: DAVE_PERSONA_CONFIG.systemPrompt + 
          (visionContext && visionContext.trim() !== "" 
            ? `\n\n[CURRENT VISUAL CONTEXT]\n${visionContext}\n\n**REMINDER: Use ONLY the information above. If it says "dark" or "can't see", you MUST tell the customer you can't see clearly. DO NOT make up items.**` 
            : "\n\n[CURRENT VISUAL CONTEXT]\nNo visual data available yet.\n\n**You cannot see the room yet. Say so if asked what you see.**") +
          (isFirstUserMessage 
            ? "" 
            : "\n\n[IMPORTANT: You already introduced yourself. DO NOT say 'I'm Dave from Elate Moving' again.]")
      },
      ...messages
    ];
    
    console.log("[AI] Calling OpenAI with", messages.length, "messages");
    console.log("[VISION] Context being sent to Dave:", visionContext ? visionContext.substring(0, 200) + "..." : "No vision data");
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messagesWithVision,
        max_tokens: 150,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ERROR] OpenAI error:", errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    const daveResponse = data.choices[0].message.content;
    
    console.log("[SUCCESS] Dave responding:", daveResponse);
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const words = daveResponse.split(' ');
    for (let i = 0; i < words.length; i++) {
      const word = words[i] + (i < words.length - 1 ? ' ' : '');
      res.write(JSON.stringify({ content: word }) + '\n');
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    res.end();
  } catch (error) {
    console.error("[ERROR] Custom LLM error:", error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

// AssemblyAI speech recognition endpoint for mobile
app.post("/api/speech-recognition", apiLimiter, async (req, res) => {
  try {
    const { audioData } = req.body;
    
    if (!audioData) {
      return res.status(400).json({ error: "No audio data provided" });
    }

    if (!assemblyAI) {
      console.warn("[WARNING] AssemblyAI not initialized - returning empty transcript");
      return res.json({ 
        transcript: "",
        confidence: 0,
        error: "AssemblyAI not configured"
      });
    }

    console.log("[ASSEMBLYAI] Processing speech recognition...");
    
    // Convert base64 audio to buffer
    const audioBuffer = Buffer.from(audioData, 'base64');
    
    // Transcribe using AssemblyAI
    const transcript = await assemblyAI.transcripts.transcribe({
      audio: audioBuffer,
      language_code: 'en_us',
      punctuate: true,
      format_text: true
    });
    
    console.log("[SUCCESS] AssemblyAI transcription:", transcript.text);
    res.json({ 
      transcript: transcript.text,
      confidence: transcript.confidence || 0.8
    });
    
  } catch (error) {
    console.error("[ERROR] AssemblyAI speech recognition failed:", error);
    res.status(500).json({ error: "Failed to process speech recognition" });
  }
});

app.post("/api/analyze-image", apiLimiter, async (req, res) => {
  try {
    const { imageData, captureItems = false } = req.body;
    
    if (!imageData) {
      return res.status(400).json({ error: "No image data provided" });
    }

    console.log("[VISION] Analyzing room image with GPT-4o Vision...");
    const analysis = await visionAnalyzer.analyzeRoomImage(imageData);
    
    let capturedItems = [];
    if (captureItems) {
      capturedItems = await analyzeAndCaptureItems(imageData, analysis);
    }
    
    console.log("[SUCCESS] Vision analysis completed");
    res.json({ 
      analysis,
      capturedItems: capturedItems.length > 0 ? capturedItems : null
    });
    
  } catch (error) {
    console.error("[ERROR] Vision analysis failed:", error);
    res.status(500).json({ error: "Failed to analyze image" });
  }
});

async function analyzeAndCaptureItems(imageData, analysis) {
  try {
    const items = [];
    
    if (analysis.toLowerCase().includes('fragile') || 
        analysis.toLowerCase().includes('glass') || 
        analysis.toLowerCase().includes('delicate')) {
      const item = await itemCaptureSystem.captureItemImage(
        imageData,
        'Fragile items requiring special care',
        'fragile',
        'high'
      );
      items.push(item);
    }
    
    if (analysis.toLowerCase().includes('heavy') || 
        analysis.toLowerCase().includes('large furniture') || 
        analysis.toLowerCase().includes('professional movers')) {
      const item = await itemCaptureSystem.captureItemImage(
        imageData,
        'Heavy furniture requiring professional moving',
        'heavy_furniture',
        'high'
      );
      items.push(item);
    }
    
    if (analysis.toLowerCase().includes('valuable') || 
        analysis.toLowerCase().includes('expensive') || 
        analysis.toLowerCase().includes('insurance')) {
      const item = await itemCaptureSystem.captureItemImage(
        imageData,
        'Valuable items requiring insurance',
        'valuable',
        'medium'
      );
      items.push(item);
    }
    
    if (analysis.toLowerCase().includes('electronics') || 
        analysis.toLowerCase().includes('computer') || 
        analysis.toLowerCase().includes('tv')) {
      const item = await itemCaptureSystem.captureItemImage(
        imageData,
        'Electronics requiring special handling',
        'electronics',
        'medium'
      );
      items.push(item);
    }
    
    return items;
    
  } catch (error) {
    console.error('Failed to capture items:', error);
    return [];
  }
}

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

app.get("/api/admin/items", (req, res) => {
  try {
    const items = itemCaptureSystem.getCapturedItems();
    res.json({ items });
  } catch (error) {
    console.error("[ERROR] Failed to get captured items:", error);
    res.status(500).json({ error: "Failed to get captured items" });
  }
});

app.get("/api/admin/report", (req, res) => {
  try {
    const report = itemCaptureSystem.generateAdminReport();
    res.json(report);
  } catch (error) {
    console.error("[ERROR] Failed to generate admin report:", error);
    res.status(500).json({ error: "Failed to generate admin report" });
  }
});

app.put("/api/admin/items/:itemId/status", (req, res) => {
  try {
    const { itemId } = req.params;
    const { status } = req.body;
    
    const updatedItem = itemCaptureSystem.updateItemStatus(itemId, status);
    if (updatedItem) {
      res.json({ success: true, item: updatedItem });
    } else {
      res.status(404).json({ error: "Item not found" });
    }
  } catch (error) {
    console.error("[ERROR] Failed to update item status:", error);
    res.status(500).json({ error: "Failed to update item status" });
  }
});

// NEW: Admin endpoint to view active sessions
app.get("/api/admin/sessions", (req, res) => {
  const sessions = Array.from(activeSessions.entries()).map(([id, data]) => ({
    session_id: id,
    created_at: data.createdAt,
    age_minutes: ((Date.now() - data.createdAt) / 60000).toFixed(1),
    client_ip: data.clientIp
  }));
  
  res.json({
    total_active: activeSessions.size,
    total_minutes_used: totalMinutesUsed.toFixed(1),
    sessions
  });
});

// ============================================================================
// HEALTH & DIAGNOSTIC ENDPOINTS
// ============================================================================

// Health check endpoint for Railway
app.get("/api/health", (req, res) => {
  const health = {
    status: "healthy",
    service: "Dave Moving Consultant",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    socketio: io ? 'connected' : 'disconnected',
    assemblyai: process.env.ASSEMBLYAI_API_KEY ? 'configured' : 'required',
    active_sessions: activeSessions.size,
    total_minutes_used: totalMinutesUsed.toFixed(1)
  };
  
  res.status(200).json(health);
});

// Root healthcheck (Railway checks this by default)
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.get("/api/test-anam", async (req, res) => {
  try {
    console.log("[TEST] Testing Anam.ai connection...");
    
    const response = await fetch(`https://api.anam.ai/v1/avatars/${DAVE_PERSONA_CONFIG.avatarId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.ANAM_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log("[SUCCESS] Anam.ai connection successful!");
      res.json({ 
        success: true, 
        avatar: data,
        avatarId: DAVE_PERSONA_CONFIG.avatarId,
        message: "Anam.ai connection successful"
      });
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
  } catch (error) {
    console.error("[ERROR] Anam.ai connection failed:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      avatarId: DAVE_PERSONA_CONFIG.avatarId
    });
  }
});

// Export the app for Vercel serverless functions
module.exports = app;

// Create HTTP server and Socket.IO
const server = http.createServer(app);

let io;
try {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  console.log('✅ Socket.io initialized');
} catch (error) {
  console.error('❌ Socket.io initialization failed:', error);
  console.log('⚠️ Server will continue without Socket.io');
}

// Socket.IO real-time transcription for mobile (if available)
if (io) {
  io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);
    let realtimeTranscriber = null;
    
    socket.on('start-transcription', async () => {
      try {
        console.log('🎤 Starting AssemblyAI real-time transcription for:', socket.id);
        
        if (!assemblyAIClient) {
          socket.emit('transcription-error', 'AssemblyAI not configured');
          return;
        }
        
        // Create real-time transcriber
        realtimeTranscriber = assemblyAIClient.realtime.transcriber({
          sampleRate: 16000,
          encoding: 'pcm_s16le'
        });
        
        // Handle session begins
        realtimeTranscriber.on('open', ({ sessionId }) => {
          console.log('✅ Real-time session opened:', sessionId);
          socket.emit('transcription-ready');
        });
        
        // Handle transcription results
        realtimeTranscriber.on('transcript', (transcript) => {
          if (transcript.message_type === 'FinalTranscript') {
            console.log('📝 Final transcript:', transcript.text);
            socket.emit('transcript', {
              text: transcript.text,
              isFinal: true
            });
          } else if (transcript.message_type === 'PartialTranscript') {
            socket.emit('transcript', {
              text: transcript.text,
              isFinal: false
            });
          }
        });
        
        // Handle errors
        realtimeTranscriber.on('error', (error) => {
          console.error('❌ Real-time transcription error:', error);
          socket.emit('transcription-error', error.message);
        });
        
        realtimeTranscriber.on('close', (code, reason) => {
          console.log('🛑 Real-time transcription closed:', code, reason);
        });
        
        // Connect to AssemblyAI
        await realtimeTranscriber.connect();
        
      } catch (error) {
        console.error('❌ Failed to start real-time transcription:', error);
        socket.emit('transcription-error', error.message);
      }
    });
    
    socket.on('audio-data', (audioData) => {
      if (realtimeTranscriber) {
        realtimeTranscriber.sendAudio(audioData);
      }
    });
    
    socket.on('stop-transcription', async () => {
      if (realtimeTranscriber) {
        await realtimeTranscriber.close();
        realtimeTranscriber = null;
        console.log('🛑 Real-time transcription stopped for:', socket.id);
      }
    });
    
    socket.on('disconnect', async () => {
      if (realtimeTranscriber) {
        await realtimeTranscriber.close();
        realtimeTranscriber = null;
      }
      console.log('🔌 Client disconnected:', socket.id);
    });
  });
} else {
  console.warn("⚠️ Socket.IO not available - real-time transcription disabled");
}

// Start server for Railway deployment
if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 8000;
  const HOST = '0.0.0.0';
  
  server.listen(PORT, HOST, (err) => {
    if (err) {
      console.error('❌ Failed to start server:', err);
      process.exit(1);
    }
    
    console.log("🏠 Dave - Professional Moving Consultant Server");
    console.log("=".repeat(50));
    console.log(`🚀 Server running on ${HOST}:${PORT}`);
    console.log(`🎭 Dave's Avatar ID: ${DAVE_PERSONA_CONFIG.avatarId}`);
    console.log(`🎤 Dave's Voice ID: ${DAVE_PERSONA_CONFIG.voiceId}`);
    console.log(`🧠 Dave's LLM: GPT-4o with Vision (Real Image Analysis)`);
    console.log(`⏱️  Session Duration: 30 minutes`);
    console.log(`🛡️  Usage Limits: ${USAGE_WARNING_THRESHOLD}min warning, ${USAGE_CRITICAL_THRESHOLD}min shutdown`);
    console.log("✅ Ready for client consultations! - Updated");
    if (io) {
      console.log("🔌 Socket.IO real-time transcription enabled");
    } else {
      console.log("⚠️ Socket.IO disabled - using fallback methods");
    }
  });
}

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});