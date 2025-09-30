// Simple test function
module.exports = (req, res) => {
  res.json({
    message: "Simple test function working",
    timestamp: new Date().toISOString(),
    url: req.url,
    method: req.method
  });
};
