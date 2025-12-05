const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { authorizeRoles } = require('../middleware/auth');
const AttendanceController = require('../controllers/AttendanceController');
const { Employee } = require('../Data/database');

// Helper to check if user can access employee data
const canAccessEmployee = async (req, targetId) => {
  if (req.user.isAdmin || req.user.role === 'managerial') return true;

  // Direct comparison
  if (targetId.toString() === req.user.id.toString()) return true;

  // Lookup employee to handle both numeric id and MongoDB _id
  try {
    const numericId = parseInt(targetId);
    const query = { $or: [] };

    // Add numeric id query if valid
    if (!isNaN(numericId)) {
      query.$or.push({ id: numericId });
    }

    // Add MongoDB _id query if it looks like an ObjectId (24 hex chars)
    if (typeof targetId === 'string' && targetId.length === 24 && /^[0-9a-fA-F]{24}$/.test(targetId)) {
      query.$or.push({ _id: targetId });
    }

    if (query.$or.length === 0) return false;

    const employee = await Employee.findOne(query).lean();
    return employee && (employee.id.toString() === req.user.id.toString() || employee._id.toString() === req.user.id.toString());
  } catch (err) {
    return false;
  }
};

// Check in
router.post(
  '/checkin',
  asyncHandler(async (req, res) => {
    if (!(await canAccessEmployee(req, req.body.employeeId))) {
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
    if (!(await canAccessEmployee(req, req.body.employeeId))) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const record = await AttendanceController.checkOut(req.body);
    res.json(record);
  })
);

router.get(
  '/:employeeId',
  asyncHandler(async (req, res) => {
    if (!(await canAccessEmployee(req, req.params.employeeId))) {
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
    if (!(await canAccessEmployee(req, req.params.employeeId))) {
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
    if (!(await canAccessEmployee(req, req.params.employeeId))) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const total = await AttendanceController.getMonthlyTotal(req.params.employeeId, req.query.month);
    res.json(total);
  })
);

module.exports = router;
