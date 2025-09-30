// Step 1: Add Express.js to minimal function
const express = require("express");

const app = express();
app.use(express.json());

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    service: "Dave Moving Consultant",
    timestamp: new Date().toISOString(),
    step: "Express.js added"
  });
});

// Session token endpoint with real functionality
app.post("/api/session-token", async (req, res) => {
  try {
    console.log("🎭 Creating session token for Dave...");

    const DAVE_PERSONA_CONFIG = {
      name: "Dave",
      avatarId: "8dd64886-ce4b-47d5-b837-619660854768",
      voiceId: "95c6316e-85ac-41ae-a0c1-aa5bf3a91f5a",
      llmId: "gpt-4o",
      systemPrompt: "You are Dave, a professional moving consultant.",
      maxSessionLengthSeconds: 1800,
    };

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

// Default route
app.get("*", (req, res) => {
  res.json({ 
    message: "Dave's AI Moving Consultant API - Step 1",
    status: "working",
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });
});

// Vercel expects a handler (req, res). Express apps are request handlers.
module.exports = (req, res) => app(req, res);
