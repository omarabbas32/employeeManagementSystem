const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { authorizeRoles } = require('../middleware/auth');
const SettingsController = require('../controllers/SettingsController');

router.get(
  '/',
  authorizeRoles('admin'),
  asyncHandler(async (req, res) => {
    const settings = await SettingsController.getSettings();
    res.json(settings);
  })
);

router.put(
  '/',
  authorizeRoles('admin'),
  asyncHandler(async (req, res) => {
    const settings = await SettingsController.updateSettings(req.body);
    res.json(settings);
  })
);

router.post(
  '/attendance-code',
  authorizeRoles('admin'),
  asyncHandler(async (req, res) => {
    const settings = await SettingsController.updateAttendanceCode(req.body.code);
    res.json(settings);
  })
);

module.exports = router;

