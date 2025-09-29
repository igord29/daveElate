// Dave's Model Configuration Options
// Choose the model that best fits your needs

const MODEL_OPTIONS = {
  // Current working configuration
  GPT_4O_MINI: {
    llmId: "0934d97d-0c3a-4f33-91b0-5e136a0ef466",
    name: "GPT-4o Mini",
    description: "Fast, cost-effective, recommended for most applications",
    capabilities: ["conversation", "reasoning", "cost-effective"],
    bestFor: "General moving consultations, cost-conscious applications"
  },

  // Alternative: Llama 3.3 70B for more complex reasoning
  LLAMA_70B: {
    llmId: "ANAM_LLAMA_v3_3_70B_V1",
    name: "Llama 3.3 70B",
    description: "Open-source model with larger context window",
    capabilities: ["complex-reasoning", "large-context", "open-source"],
    bestFor: "Complex moving scenarios, detailed analysis"
  },

  // Alternative: Gemini 2.5 Flash for speed
  GEMINI_FLASH: {
    llmId: "9d8900ee-257d-4401-8817-ba9c835e9d36",
    name: "Gemini 2.5 Flash",
    description: "Fastest model available",
    capabilities: ["speed", "fast-responses", "efficiency"],
    bestFor: "Quick consultations, high-volume interactions"
  },

  // Alternative: Legacy GPT-4o Mini format
  GPT_4O_MINI_LEGACY: {
    llmId: "ANAM_GPT_4O_MINI_V1",
    name: "GPT-4o Mini (Legacy)",
    description: "Legacy format for backwards compatibility",
    capabilities: ["conversation", "reasoning", "compatibility"],
    bestFor: "Existing applications, compatibility"
  }
};

// Example: How to switch models in server.js
function getModelConfig(modelChoice) {
  switch(modelChoice) {
    case 'llama':
      return MODEL_OPTIONS.LLAMA_70B;
    case 'gemini':
      return MODEL_OPTIONS.GEMINI_FLASH;
    case 'legacy':
      return MODEL_OPTIONS.GPT_4O_MINI_LEGACY;
    default:
      return MODEL_OPTIONS.GPT_4O_MINI; // Default
  }
}

// Usage example:
// const selectedModel = getModelConfig('llama');
// console.log(`Selected: ${selectedModel.name} - ${selectedModel.description}`);

module.exports = { MODEL_OPTIONS, getModelConfig };
