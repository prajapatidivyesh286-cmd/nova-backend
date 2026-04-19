const express = require('express');
const router = express.Router();

// Import the controller function that handles the route logic
const { handleChat } = require('../controllers/chatController');

// Define a POST endpoint on the root of this route component (maps to POST /chat)
router.post('/', handleChat);

module.exports = router;
