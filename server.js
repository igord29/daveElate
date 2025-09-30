require("dotenv").config();
const express = require("express");
const path = require("path");
const app = express();
const VisionAnalyzer = require('./vision_analyzer');
const ItemCaptureSystem = require('./item_capture_system');

app.use(express.json());
app.use(express.static("public"));

// Serve redirect page as default
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "redirect.html"));
});

// Initialize vision analyzer and item capture system
const visionAnalyzer = new VisionAnalyzer(process.env.OPENAI_API_KEY);
const itemCaptureSystem = new ItemCaptureSystem();

// Model Configuration
const MODEL_CONFIGS = {
  'gpt4o': "gpt-4o",                                         // GPT-4o with Vision (required for image analysis)
  'gpt4o-mini': "0934d97d-0c3a-4f33-91b0-5e136a0ef466",     // GPT-4o Mini (no vision)
  'llama-70b': "ANAM_LLAMA_v3_3_70B_V1",                     // Llama 3.3 70B
  'gemini-flash': "9d8900ee-257d-4401-8817-ba9c835e9d36",     // Gemini 2.5 Flash
  'legacy': "ANAM_GPT_4O_MINI_V1"                            // Legacy GPT-4o Mini
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
  avatarId: "8dd64886-ce4b-47d5-b837-619660854768", // Your updated avatar ID
  voiceId: "95c6316e-85ac-41ae-a0c1-aa5bf3a91f5a", // Your voice ID
  llmId: MODEL_CONFIGS[selectedModel],   // Dynamic model selection
  systemPrompt: `You are Dave, a professional moving consultant with 15 years of experience. You help clients with their moving needs.

CRITICAL RULES:
- Speak ONLY as a moving consultant, never mention technical systems or code
- Keep responses conversational and under 100 words
- Focus ONLY on moving-related advice
- Be concise and practical

When analyzing rooms:
- Describe only what you can actually see
- Provide specific moving advice based on what you see
- Identify fragile items, heavy furniture, and packing needs
- Be honest if you can't see something clearly
- Ask for better views when needed

Communication style:
- Warm but professional tone
- Break down complex processes into simple steps
- Provide specific, actionable advice
- Be encouraging and supportive
- Keep responses focused and practical

Remember: You're a moving consultant helping clients, not a technical system. Keep it simple and professional.`,
  maxSessionLengthSeconds: 1800, // 30 minutes
};

app.post("/api/session-token", async (req, res) => {
  try {
    console.log("🎭 Creating session token for Dave...");
    
    const response = await fetch("https://api.anam.ai/v1/auth/session-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ANAM_API_KEY}`,
      },
      body: JSON.stringify({
        personaConfig: DAVE_PERSONA_CONFIG,
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log("✅ Session token created successfully");
    res.json({ sessionToken: data.sessionToken });
  } catch (error) {
    console.error("❌ Failed to create session token:", error);
    res.status(500).json({ error: "Failed to create session token" });
  }
});

// Vision analysis endpoint
app.post("/api/analyze-image", async (req, res) => {
  try {
    const { imageData, captureItems = false } = req.body;
    
    if (!imageData) {
      return res.status(400).json({ error: "No image data provided" });
    }

    console.log("👁️ Analyzing room image with GPT-4o Vision...");
    const analysis = await visionAnalyzer.analyzeRoomImage(imageData);
    
    // If captureItems is true, analyze for items that need special handling
    let capturedItems = [];
    if (captureItems) {
      capturedItems = await analyzeAndCaptureItems(imageData, analysis);
    }
    
    console.log("✅ Vision analysis completed");
    res.json({ 
      analysis,
      capturedItems: capturedItems.length > 0 ? capturedItems : null
    });
    
  } catch (error) {
    console.error("❌ Vision analysis failed:", error);
    res.status(500).json({ error: "Failed to analyze image" });
  }
});

// Analyze and capture items that need special handling
async function analyzeAndCaptureItems(imageData, analysis) {
  try {
    const items = [];
    
    // Check for fragile items
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
    
    // Check for heavy furniture
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
    
    // Check for valuable items
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
    
    // Check for electronics
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

// Admin endpoints for captured items
app.get("/api/admin/items", (req, res) => {
  try {
    const items = itemCaptureSystem.getCapturedItems();
    res.json({ items });
  } catch (error) {
    console.error("❌ Failed to get captured items:", error);
    res.status(500).json({ error: "Failed to get captured items" });
  }
});

app.get("/api/admin/report", (req, res) => {
  try {
    const report = itemCaptureSystem.generateAdminReport();
    res.json(report);
  } catch (error) {
    console.error("❌ Failed to generate admin report:", error);
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
    console.error("❌ Failed to update item status:", error);
    res.status(500).json({ error: "Failed to update item status" });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    service: "Dave Moving Consultant",
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log("🏠 Dave - Professional Moving Consultant Server");
  console.log("=".repeat(50));
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🎭 Dave's Avatar ID: ${DAVE_PERSONA_CONFIG.avatarId}`);
  console.log(`🎤 Dave's Voice ID: ${DAVE_PERSONA_CONFIG.voiceId}`);
  console.log(`🧠 Dave's LLM: GPT-4o with Vision (Real Image Analysis)`);
  console.log(`⏱️  Session Duration: 30 minutes`);
  console.log("✅ Ready for client consultations!");
});
