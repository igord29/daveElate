// Custom LLM Setup for Dave - GPT-4o with Vision Capabilities
// Based on Anam.ai Custom LLM documentation

require("dotenv").config({ path: './production.env' });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY not found in production.env");
  console.log("Please add your OpenAI API key to production.env:");
  console.log("OPENAI_API_KEY=your-openai-api-key-here");
  process.exit(1);
}

async function createCustomLLM() {
  try {
    console.log("🔧 Setting up custom GPT-4o LLM for Dave...");
    
    // Get model configuration
    const { getCustomModelConfig } = require('./custom_llm_models');
    const modelChoice = process.env.DAVE_CUSTOM_MODEL || 'gpt4o-vision';
    const customLLMConfig = getCustomModelConfig(modelChoice);
    
    console.log(`🎯 Selected model: ${customLLMConfig.model}`);
    console.log(`👁️  Vision capabilities: ${customLLMConfig.capabilities.vision ? 'Enabled' : 'Disabled'}`);
    console.log(`📝 Provider: ${customLLMConfig.provider}`);
    
    // Custom LLM configuration for Dave (correct Anam.ai format)
    const fullCustomLLMConfig = {
      displayName: customLLMConfig.name,     // ← Required field
      description: customLLMConfig.description,
      llmFormat: customLLMConfig.llmFormat,
      modelName: customLLMConfig.model,     // ← Required field
      urls: ["https://api.openai.com/v1/chat/completions"],  // ← Required field (array of strings)
      secret: OPENAI_API_KEY,               // ← Required field (string, not object)
      capabilities: customLLMConfig.capabilities,
      systemPrompt: `[ROLE]
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
- When analyzing images, be specific about what you see and provide actionable advice`
    };

    // Register the custom LLM with Anam.ai
    const response = await fetch("https://api.anam.ai/v1/llms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.ANAM_API_KEY}`,
      },
      body: JSON.stringify(fullCustomLLMConfig),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to create custom LLM: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    console.log("✅ Custom LLM created successfully!");
    console.log(`🎯 Custom LLM ID: ${result.llmId}`);
    console.log(`📝 Name: ${result.name}`);
    console.log(`🔍 Vision Capabilities: ${result.capabilities.vision ? 'Enabled' : 'Disabled'}`);
    
    // Update production.env with the custom LLM ID
    const fs = require('fs');
    const envContent = fs.readFileSync('./production.env', 'utf8');
    const updatedEnv = envContent + `\n# Custom LLM Configuration\nDAVE_CUSTOM_LLM_ID=${result.llmId}`;
    fs.writeFileSync('./production.env', updatedEnv);
    
    console.log("📝 Updated production.env with custom LLM ID");
    console.log("🚀 Dave is now ready with GPT-4o vision capabilities!");
    
    return result.llmId;
    
  } catch (error) {
    console.error("❌ Failed to create custom LLM:", error.message);
    
    if (error.message.includes("401")) {
      console.log("💡 Check your Anam.ai API key in production.env");
    } else if (error.message.includes("400")) {
      console.log("💡 Check your OpenAI API key in production.env");
    }
    
    throw error;
  }
}

// Run the setup
createCustomLLM()
  .then((llmId) => {
    console.log("\n🎉 Setup Complete!");
    console.log(`Custom LLM ID: ${llmId}`);
    console.log("Next: Update server.js to use the custom LLM ID");
  })
  .catch((error) => {
    console.error("Setup failed:", error);
    process.exit(1);
  });
