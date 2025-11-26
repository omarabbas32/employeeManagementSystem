const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const AuthController = require('../controllers/AuthController');

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const result = await AuthController.login(req.body);
    res.json(result);
  })
);

module.exports = router;

