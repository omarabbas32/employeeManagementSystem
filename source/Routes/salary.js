const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { authorizeRoles } = require('../middleware/auth');
const SalaryController = require('../controllers/SalaryController');

router.get(
  '/:employeeId',
  asyncHandler(async (req, res) => {
    const requestedId = Number(req.params.employeeId);
    if (!req.user.isAdmin && requestedId !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const report = await SalaryController.calculateSalaryForEmployee(req.params.employeeId, req.query.month);
    res.json(report);
  })
);

router.post(
  '/calculate',
  authorizeRoles('admin'),
  asyncHandler(async (req, res) => {
    const reports = await SalaryController.calculateAllSalaries(req.body.month);
    res.json(reports);
  })
);

module.exports = router;

