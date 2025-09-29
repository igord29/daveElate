// Custom LLM Model Configurations for Dave
// Different model options for custom LLM setup

const CUSTOM_MODEL_CONFIGS = {
  // GPT-4o with Vision (Recommended for Dave)
  GPT4O_VISION: {
    name: "Dave GPT-4o Vision",
    description: "GPT-4o with vision capabilities for moving consultation",
    llmFormat: "openai",                 // ← Anam.ai format
    model: "gpt-4o",                     // ← Model name
    endpoints: [
      {
        url: "https://api.openai.com/v1/chat/completions",
        apiKey: process.env.OPENAI_API_KEY,
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    ],
    capabilities: {
      vision: true,                      // ← Vision enabled
      streaming: true,
      maxTokens: 4096,
      temperature: 0.7
    }
  },

  // GPT-4o Mini (Cost-effective)
  GPT4O_MINI: {
    name: "Dave GPT-4o Mini",
    description: "GPT-4o Mini for cost-effective consultations",
    llmFormat: "openai",                // ← Anam.ai format
    model: "gpt-4o-mini",               // ← Model name
    endpoints: [
      {
        url: "https://api.openai.com/v1/chat/completions",
        apiKey: process.env.OPENAI_API_KEY,
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    ],
    capabilities: {
      vision: false,                     // ← No vision
      streaming: true,
      maxTokens: 2048,
      temperature: 0.7
    }
  },

  // GPT-4 Turbo (High performance)
  GPT4_TURBO: {
    name: "Dave GPT-4 Turbo",
    description: "GPT-4 Turbo for high-performance consultations",
    llmFormat: "openai",                // ← Anam.ai format
    model: "gpt-4-turbo",               // ← Model name
    endpoints: [
      {
        url: "https://api.openai.com/v1/chat/completions",
        apiKey: process.env.OPENAI_API_KEY,
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    ],
    capabilities: {
      vision: true,                      // ← Vision enabled
      streaming: true,
      maxTokens: 8192,
      temperature: 0.7
    }
  },

  // Azure OpenAI GPT-4o
  AZURE_GPT4O: {
    name: "Dave Azure GPT-4o",
    description: "Azure OpenAI GPT-4o for enterprise deployment",
    llmFormat: "azure_openai",          // ← Anam.ai format
    model: "gpt-4o",                   // ← Model name
    endpoints: [
      {
        url: "https://your-resource.openai.azure.com/openai/deployments/your-deployment/chat/completions?api-version=2024-02-01",
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        headers: {
          "api-key": process.env.AZURE_OPENAI_API_KEY,
          "Content-Type": "application/json"
        }
      }
    ],
    capabilities: {
      vision: true,
      streaming: true,
      maxTokens: 4096,
      temperature: 0.7
    }
  },

  // Gemini 2.0 Flash (Google)
  GEMINI_FLASH: {
    name: "Dave Gemini Flash",
    description: "Gemini 2.0 Flash for fast consultations",
    llmFormat: "gemini",               // ← Anam.ai format
    model: "gemini-2.0-flash-exp",     // ← Model name
    endpoints: [
      {
        url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:streamGenerateContent",
        apiKey: process.env.GEMINI_API_KEY,
        headers: {
          "x-goog-api-key": process.env.GEMINI_API_KEY,
          "Content-Type": "application/json"
        }
      }
    ],
    capabilities: {
      vision: true,
      streaming: true,
      maxTokens: 4096,
      temperature: 0.7
    }
  }
};

// Function to get model configuration
function getCustomModelConfig(modelChoice) {
  switch(modelChoice) {
    case 'gpt4o-vision':
      return CUSTOM_MODEL_CONFIGS.GPT4O_VISION;
    case 'gpt4o-mini':
      return CUSTOM_MODEL_CONFIGS.GPT4O_MINI;
    case 'gpt4-turbo':
      return CUSTOM_MODEL_CONFIGS.GPT4_TURBO;
    case 'azure-gpt4o':
      return CUSTOM_MODEL_CONFIGS.AZURE_GPT4O;
    case 'gemini-flash':
      return CUSTOM_MODEL_CONFIGS.GEMINI_FLASH;
    default:
      return CUSTOM_MODEL_CONFIGS.GPT4O_VISION; // Default to GPT-4o Vision
  }
}

// Usage example:
// const modelConfig = getCustomModelConfig('gpt4o-vision');
// console.log(`Selected model: ${modelConfig.model} with vision: ${modelConfig.capabilities.vision}`);

module.exports = { CUSTOM_MODEL_CONFIGS, getCustomModelConfig };
