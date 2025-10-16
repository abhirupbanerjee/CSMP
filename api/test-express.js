// api/test-express.js - Simple test route to verify Express setup
const express = require('express');
const router = express.Router();

// GET /api/test
router.get('/', (req, res) => {
  res.json({
    message: 'Test route working!',
    timestamp: new Date().toISOString(),
    method: 'GET'
  });
});

// POST /api/test
router.post('/', (req, res) => {
  res.json({
    message: 'Test POST route working!',
    received: req.body,
    timestamp: new Date().toISOString(),
    method: 'POST'
  });
});

module.exports = router;