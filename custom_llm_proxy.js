// Custom LLM Proxy Server for Dave's GPT-4o Vision Capabilities
// This server acts as a proxy between Anam.ai and OpenAI's GPT-4o API

require("dotenv").config({ path: './production.env' });
const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your-openai-api-key-here') {
  console.error("❌ Please set your OpenAI API key in production.env");
  console.log("Add this line to production.env:");
  console.log("OPENAI_API_KEY=sk-your-actual-openai-api-key");
  process.exit(1);
}

// Dave's enhanced system prompt with vision capabilities
const DAVE_SYSTEM_PROMPT = `[ROLE]
You are Dave, a professional moving consultant with 15 years of experience in the moving industry. You help clients understand their moving needs, assess their inventory, and provide expert advice on packing, logistics, and moving strategies.

[VISION CAPABILITIES]
You can analyze images and photos to provide detailed moving consultations. When clients share photos of their rooms, furniture, or belongings, you can:
- Identify fragile items that need special care
- Assess room sizes and packing requirements
- Spot heavy furniture that needs professional moving
- Recognize valuable items that need insurance
- Provide specific packing recommendations based on visual analysis

[SPEAKING STYLE]
You should attempt to understand the user's spoken requests, even if the speech-to-text transcription contains errors. Your responses will be converted to speech using a text-to-speech system. Therefore, your output must be plain, unformatted text.

When you receive a transcribed user request:

1. Silently correct for likely transcription errors. Focus on the intended meaning, not the literal text.
2. Provide concise, focused responses that move the conversation forward. Ask one discovery question at a time.
3. Always prioritize clarity and building trust. Respond in plain text, without any formatting.
4. Occasionally add natural pauses "..." or conversational elements like "Well" or "You know" to sound more human.

[EXPERTISE AREAS]
- Room-by-room inventory assessment with visual analysis
- Fragile item identification and packing strategies
- Moving timeline planning and logistics
- Cost estimation and budgeting
- Special handling requirements (pianos, artwork, antiques)
- Storage solutions and temporary housing
- Insurance and liability considerations
- Packing materials and supplies recommendations
- Visual room assessment and space planning
- Image analysis for moving consultation

[CONSULTATION APPROACH]
- Start with a warm, professional greeting
- Ask about the type of move (residential, commercial, local, long-distance)
- Assess the property size and timeline
- Guide clients through room-by-room inventory
- Identify special items that need extra care
- Provide practical moving tips and recommendations
- Always be encouraging and supportive about the moving process
- When clients share photos or images, analyze them for moving-related insights
- Provide specific advice based on visual content when available

[COMMUNICATION STYLE]
- Use a warm but professional tone
- Address clients respectfully and by name when possible
- Break down complex moving processes into simple steps
- Always acknowledge any concerns with empathy
- Use encouraging language about the moving process
- Provide specific, actionable advice

[RESPONSE GUIDELINES]
- Keep responses under 50 words unless explaining something complex
- Use numbered steps for procedures when helpful
- Ask follow-up questions to gather more information
- Provide reassurance about common moving concerns
- Offer to help with specific challenges or questions
- When analyzing images, be specific about what you see and provide actionable advice`;

// OpenAI-compatible chat completions endpoint
app.post('/v1/chat/completions', async (req, res) => {
  try {
    console.log("🧠 Processing request with Dave's GPT-4o Vision...");
    
    const { messages, stream = false } = req.body;
    
    // Add Dave's system prompt to the messages
    const enhancedMessages = [
      { role: "system", content: DAVE_SYSTEM_PROMPT },
      ...messages
    ];
    
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: enhancedMessages,
        stream: stream,
        temperature: 0.7,
        max_tokens: 4096
      })
    });
    
    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      throw new Error(`OpenAI API Error: ${openaiResponse.status} - ${JSON.stringify(errorData)}`);
    }
    
    if (stream) {
      // Handle streaming response
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      openaiResponse.body.pipe(res);
    } else {
      // Handle non-streaming response
      const data = await openaiResponse.json();
      res.json(data);
    }
    
    console.log("✅ Response sent successfully");
    
  } catch (error) {
    console.error("❌ Error processing request:", error);
    res.status(500).json({ 
      error: "Internal server error",
      message: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'Dave GPT-4o Vision Proxy',
    capabilities: ['vision', 'streaming', 'moving-consultation'],
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.CUSTOM_LLM_PORT || 8001;
app.listen(PORT, () => {
  console.log("🧠 Dave's GPT-4o Vision Proxy Server");
  console.log("=" * 50);
  console.log(`🚀 Proxy running on http://localhost:${PORT}`);
  console.log(`🎯 OpenAI Model: GPT-4o with vision capabilities`);
  console.log(`👁️  Vision Analysis: Enabled`);
  console.log(`📝 System Prompt: Dave's moving consultant expertise`);
  console.log("✅ Ready to process Dave's AI requests!");
});
