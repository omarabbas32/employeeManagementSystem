const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { authorizeRoles } = require('../middleware/auth');
const TypeController = require('../controllers/TypeController');

router.get(
  '/',
  authorizeRoles('admin'),
  asyncHandler(async (req, res) => {
    const types = await TypeController.listTypes();
    res.json(types);
  })
);

router.post(
  '/',
  authorizeRoles('admin'),
  asyncHandler(async (req, res) => {
    const types = await TypeController.createType(req.body);
    res.status(201).json(types);
  })
);

router.delete(
  '/:id',
  authorizeRoles('admin'),
  asyncHandler(async (req, res) => {
    await TypeController.deleteType(req.params.id);
    res.json({ success: true });
  })
);

module.exports = router;

