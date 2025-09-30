// Static file server for Vercel with debugging
const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  try {
    const url = req.url;
    console.log('Static file request:', url);
    
    // Handle root path
    if (url === '/') {
      const filePath = path.join(process.cwd(), 'index.html');
      console.log('DEBUG: Root path, checking:', filePath);
      if (fs.existsSync(filePath)) {
        console.log('DEBUG: index.html found');
        const content = fs.readFileSync(filePath, 'utf8');
        res.setHeader('Content-Type', 'text/html');
        res.send(content);
        return;
      } else {
        console.log('DEBUG: index.html NOT found');
      }
    }
    
    // Handle HTML files
    if (url.endsWith('.html')) {
      const filePath = path.join(process.cwd(), url);
      console.log('DEBUG: HTML file request, checking:', filePath);
      console.log('DEBUG: process.cwd():', process.cwd());
      console.log('DEBUG: Resolved path:', filePath);
      console.log('DEBUG: File exists:', fs.existsSync(filePath));
      
      if (fs.existsSync(filePath)) {
        console.log('DEBUG: HTML file found, serving content');
        const content = fs.readFileSync(filePath, 'utf8');
        res.setHeader('Content-Type', 'text/html');
        res.send(content);
        return;
      } else {
        console.log('DEBUG: HTML file NOT found');
        // List files in current working directory for debugging
        try {
          const files = fs.readdirSync(process.cwd());
          console.log('DEBUG: Files in cwd:', files);
        } catch (e) {
          console.log('DEBUG: Error listing cwd:', e.message);
        }
      }
    }
    
    // Handle other static files
    const filePath = path.join(process.cwd(), url);
    console.log('DEBUG: Other static file, checking:', filePath);
    if (fs.existsSync(filePath)) {
      console.log('DEBUG: Other static file found');
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
    } else {
      console.log('DEBUG: Other static file NOT found');
    }
    
    // File not found
    console.log('DEBUG: File not found, returning 404');
    res.status(404).json({ 
      error: 'File not found',
      url: url,
      message: 'Static file not found',
      debug: {
        __dirname: __dirname,
        processCwd: process.cwd(),
        resolvedPath: path.join(process.cwd(), url)
      }
    });
    
  } catch (error) {
    console.error('Static file error:', error);
    res.status(500).json({ 
      error: 'Static file server error',
      message: error.message,
      stack: error.stack
    });
  }
};
