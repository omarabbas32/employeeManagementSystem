const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { authorizeRoles } = require('../middleware/auth');
const AttendanceController = require('../controllers/AttendanceController');

// Check in
router.post(
  '/checkin',
  asyncHandler(async (req, res) => {
    const targetId = Number(req.body.employeeId);

    // Allow if: admin, manager, or checking in for themselves
    if (!req.user.isAdmin && req.user.role !== 'managerial' && targetId !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const record = await AttendanceController.checkIn(req.body);
    res.status(201).json(record);
  })
);

// Check out
router.post(
  '/checkout',
  asyncHandler(async (req, res) => {
    const targetId = Number(req.body.employeeId);

    // Allow if: admin, manager, or checking out for themselves
    if (!req.user.isAdmin && req.user.role !== 'managerial' && targetId !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const record = await AttendanceController.checkOut(req.body);
    res.json(record);
  })
);

router.get(
  '/:employeeId',
  asyncHandler(async (req, res) => {
    const requestedId = Number(req.params.employeeId);
    if (!req.user.isAdmin && req.user.role !== 'managerial' && requestedId !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const attendance = await AttendanceController.getAttendance(req.params.employeeId, req.query.month);
    res.json(attendance);
  })
);

// NEW: Get today's sessions for an employee
router.get(
  '/:employeeId/today',
  asyncHandler(async (req, res) => {
    const requestedId = Number(req.params.employeeId);
    if (!req.user.isAdmin && req.user.role !== 'managerial' && requestedId !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const sessions = await AttendanceController.getTodaySessions(req.params.employeeId);
    res.json(sessions);
  })
);

// Get monthly total hours for an employee
router.get(
  '/:employeeId/monthly-total',
  asyncHandler(async (req, res) => {
    const requestedId = Number(req.params.employeeId);
    if (!req.user.isAdmin && req.user.role !== 'managerial' && requestedId !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const total = await AttendanceController.getMonthlyTotal(req.params.employeeId, req.query.month);
    res.json(total);
  })
);

module.exports = router;
