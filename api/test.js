// Minimal test serverless function to identify the crash
module.exports = (req, res) => {
  try {
    console.log('Test function called');
    console.log('Environment variables:', {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET',
      AVATAR_API_KEY: process.env.AVATAR_API_KEY ? 'SET' : 'NOT SET',
      DAVE_MODEL: process.env.DAVE_MODEL || 'NOT SET'
    });
    
    res.json({ 
      status: 'test-success', 
      timestamp: new Date().toISOString(),
      env: {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET',
        AVATAR_API_KEY: process.env.AVATAR_API_KEY ? 'SET' : 'NOT SET',
        DAVE_MODEL: process.env.DAVE_MODEL || 'NOT SET'
      }
    });
  } catch (error) {
    console.error('Test function error:', error);
    res.status(500).json({ 
      error: 'Test function crashed', 
      message: error.message,
      stack: error.stack 
    });
  }
};
