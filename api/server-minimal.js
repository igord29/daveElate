// Minimal working serverless function
module.exports = (req, res) => {
  try {
    console.log('Minimal serverless function called');
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    // Route handling
    const url = req.url;
    const method = req.method;
    
    console.log(`${method} ${url}`);
    
    // Health check
    if (url === '/api/health' && method === 'GET') {
      res.json({ 
        status: "healthy", 
        service: "Dave Moving Consultant",
        timestamp: new Date().toISOString(),
        method: method,
        url: url
      });
      return;
    }
    
    // Session token endpoint
    if (url === '/api/session-token' && method === 'POST') {
      res.json({ 
        sessionToken: "test-token-123",
        message: "Session token endpoint working"
      });
      return;
    }
    
    // Default response
    res.json({ 
      message: "Dave's AI Moving Consultant API",
      status: "working",
      method: method,
      url: url,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Serverless function error:', error);
    res.status(500).json({ 
      error: 'Serverless function crashed',
      message: error.message,
      stack: error.stack
    });
  }
};
