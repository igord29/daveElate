// Static file server for Vercel
const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  try {
    const url = req.url;
    console.log('Static file request:', url);
    
    // Handle root path
    if (url === '/') {
      const filePath = path.join(__dirname, '..', 'index.html');
      const content = fs.readFileSync(filePath, 'utf8');
      res.setHeader('Content-Type', 'text/html');
      res.send(content);
      return;
    }
    
    // Handle HTML files
    if (url.endsWith('.html')) {
      const filePath = path.join(__dirname, '..', url);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        res.setHeader('Content-Type', 'text/html');
        res.send(content);
        return;
      }
    }
    
    // Handle other static files
    const filePath = path.join(__dirname, '..', url);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath);
      const contentTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml'
      };
      
      const contentType = contentTypes[ext] || 'text/plain';
      res.setHeader('Content-Type', contentType);
      
      const content = fs.readFileSync(filePath);
      res.send(content);
      return;
    }
    
    // File not found
    res.status(404).json({ 
      error: 'File not found',
      url: url,
      message: 'Static file not found'
    });
    
  } catch (error) {
    console.error('Static file error:', error);
    res.status(500).json({ 
      error: 'Static file server error',
      message: error.message
    });
  }
};
