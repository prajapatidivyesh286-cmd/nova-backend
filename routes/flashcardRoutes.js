const express = require('express');
const router = express.Router();
const flashcardController = require('../controllers/flashcardController');

router.post('/generate', flashcardController.generateFlashcards);
router.get('/list', flashcardController.listAllCards);
router.get('/review', flashcardController.getReviewCards);
router.post('/review', flashcardController.updateReview);

module.exports = router;
