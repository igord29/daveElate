// Debug files available in Vercel environment
const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  try {
    console.log('=== FILE SYSTEM DEBUG ===');
    console.log('__dirname:', __dirname);
    console.log('process.cwd():', process.cwd());
    
    // List files in current working directory
    const cwdFiles = fs.readdirSync(process.cwd());
    console.log('Files in process.cwd():', cwdFiles);
    
    // List files in parent directory
    const parentDir = path.join(process.cwd(), '..');
    const parentFiles = fs.readdirSync(parentDir);
    console.log('Files in parent directory:', parentFiles);
    
    // Check if specific files exist
    const testFiles = ['index.html', 'meeting.html', 'admin.html', 'test.html'];
    const fileChecks = {};
    
    for (const file of testFiles) {
      const filePath = path.join(process.cwd(), file);
      fileChecks[file] = {
        path: filePath,
        exists: fs.existsSync(filePath)
      };
    }
    
    console.log('File existence checks:', fileChecks);
    
    res.json({
      debug: {
        __dirname: __dirname,
        processCwd: process.cwd(),
        cwdFiles: cwdFiles,
        parentFiles: parentFiles,
        fileChecks: fileChecks
      }
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({
      error: 'Debug failed',
      message: error.message,
      stack: error.stack
    });
  }
};
