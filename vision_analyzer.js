// Vision Analysis Service for Dave
// This handles real image analysis using OpenAI GPT-4o Vision

const fetch = require('node-fetch');

class VisionAnalyzer {
  constructor(openaiApiKey) {
    this.apiKey = openaiApiKey;
    this.baseUrl = 'https://api.openai.com/v1/chat/completions';
  }

  async analyzeRoomImage(imageData) {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are Dave, a professional moving consultant with 15 years of experience. Analyze this room image for moving consultation purposes. 

CRITICAL INSTRUCTIONS:
- Speak ONLY as a moving consultant, not as an AI or technical system
- NEVER mention code, technical details, or system information
- Keep responses conversational and professional
- Focus ONLY on moving-related advice
- Be concise and practical

IMPORTANT RULES:
- ONLY describe what you can actually see in the image
- If something is unclear or blurry, say so
- NEVER make up details that aren't visible
- Be specific about furniture, fragile items, and packing requirements
- Provide practical moving advice based on what you can see
- If you cannot see enough detail, ask for a better view

Focus on:
- Furniture types and sizes
- Fragile items that need special care
- Heavy items that need professional moving
- Valuable items that need insurance
- Packing requirements and materials needed
- Room layout and access challenges

RESPONSE STYLE:
- Keep responses under 100 words
- Use natural, conversational language
- Sound like a professional moving consultant
- Never mention technical systems or code`
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Please analyze this room for moving consultation. What do you see and what moving advice can you provide?"
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${imageData}`
                  }
                }
              ]
            }
          ],
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error(`Vision API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;

    } catch (error) {
      console.error('Vision analysis failed:', error);
      return `I'm having trouble analyzing the image right now. Please try again or describe what you'd like me to help with.`;
    }
  }
}

// Export for use in the main application
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VisionAnalyzer;
} else {
  window.VisionAnalyzer = VisionAnalyzer;
}
