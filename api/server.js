// api/server.js - Full Dave's AI Moving Consultant Serverless Function
require("dotenv").config();
const express = require("express");
const path = require("path");
const VisionAnalyzer = require('../vision_analyzer');
const ItemCaptureSystem = require('../item_capture_system');

const app = express();
app.use(express.json());

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

// API Routes
app.post("/api/session-token", async (req, res) => {
  try {
    console.log("🎭 Creating session token for Dave...");

    const response = await fetch("https://api.avatar-platform.com/v1/auth/session-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AVATAR_API_KEY}`,
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
app.post("/api/analyze-room", async (req, res) => {
  try {
    const { imageData } = req.body;
    
    if (!imageData) {
      return res.status(400).json({ error: "Image data is required" });
    }

    console.log("👁️ Analyzing room image with GPT-4o Vision...");
    const analysis = await visionAnalyzer.analyzeRoomImage(imageData);
    console.log("✅ Vision analysis completed");
    
    res.json({ analysis });
  } catch (error) {
    console.error("❌ Vision analysis failed:", error);
    res.status(500).json({ error: "Vision analysis failed" });
  }
});

// Item capture endpoint
app.post("/api/capture-item", async (req, res) => {
  try {
    const { imageData, description, category, priority } = req.body;
    
    if (!imageData || !description) {
      return res.status(400).json({ error: "Image data and description are required" });
    }

    console.log("📸 Capturing item for admin review...");
    const capturedItem = await itemCaptureSystem.captureItemImage(
      imageData, 
      description, 
      category || 'general', 
      priority || 'medium'
    );
    
    console.log(`📸 Item captured: ${description} (${category})`);
    res.json({ success: true, item: capturedItem });
  } catch (error) {
    console.error("❌ Item capture failed:", error);
    res.status(500).json({ error: "Item capture failed" });
  }
});

// Dave's note-taking endpoint
app.post("/api/dave/note", async (req, res) => {
  try {
    const { content, category = 'general', priority = 'medium' } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Note content is required" });
    }

    const note = itemCaptureSystem.addNote(content, category, priority);
    console.log(`📝 Dave's note: ${content.substring(0, 50)}...`);

    res.json({ success: true, note });
  } catch (error) {
    console.error("❌ Failed to add Dave's note:", error);
    res.status(500).json({ error: "Failed to add note" });
  }
});

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

// Notes endpoints
app.get("/api/admin/notes", (req, res) => {
  try {
    const notes = itemCaptureSystem.getNotes();
    res.json({ notes });
  } catch (error) {
    console.error("❌ Failed to get notes:", error);
    res.status(500).json({ error: "Failed to get notes" });
  }
});

app.post("/api/admin/notes", (req, res) => {
  try {
    const { content, category, priority } = req.body;
    const note = itemCaptureSystem.addNote(content, category, priority);
    res.json({ success: true, note });
  } catch (error) {
    console.error("❌ Failed to add note:", error);
    res.status(500).json({ error: "Failed to add note" });
  }
});

app.put("/api/admin/notes/:noteId/status", (req, res) => {
  try {
    const { noteId } = req.params;
    const { status } = req.body;
    const updatedNote = itemCaptureSystem.updateNoteStatus(noteId, status);
    if (updatedNote) {
      res.json({ success: true, note: updatedNote });
    } else {
      res.status(404).json({ error: "Note not found" });
    }
  } catch (error) {
    console.error("❌ Failed to update note status:", error);
    res.status(500).json({ error: "Failed to update note status" });
  }
});

app.delete("/api/admin/notes/:noteId", (req, res) => {
  try {
    const { noteId } = req.params;
    const success = itemCaptureSystem.deleteNote(noteId);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Note not found" });
    }
  } catch (error) {
    console.error("❌ Failed to delete note:", error);
    res.status(500).json({ error: "Failed to delete note" });
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

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    service: "Dave Moving Consultant",
    timestamp: new Date().toISOString()
  });
});

// Vercel expects a handler (req, res). Express apps are request handlers.
// Exporting this makes it a Serverless Function at /api/server
module.exports = (req, res) => app(req, res);
