const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { authorizeRoles } = require('../middleware/auth');
const DeductionController = require('../controllers/DeductionController');

router.get(
  '/',
  authorizeRoles('admin'),
  asyncHandler(async (req, res) => {
    const rules = await DeductionController.listDeductions(req.user);
    res.json(rules);
  })
);

router.post(
  '/',
  authorizeRoles('admin'),
  asyncHandler(async (req, res) => {
    const rule = await DeductionController.createDeduction(req.body);
    res.status(201).json(rule);
  })
);

router.put(
  '/:id',
  authorizeRoles('admin'),
  asyncHandler(async (req, res) => {
    const rule = await DeductionController.updateDeduction(req.params.id, req.body);
    res.json(rule);
  })
);

router.delete(
  '/:id',
  authorizeRoles('admin'),
  asyncHandler(async (req, res) => {
    await DeductionController.deleteDeduction(req.params.id);
    res.json({ success: true });
  })
);

module.exports = router;
