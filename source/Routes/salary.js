const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { authorizeRoles } = require('../middleware/auth');
const SalaryController = require('../controllers/SalaryController');
const { Employee } = require('../Data/database');

// Helper to check if user can access employee data
const canAccessEmployee = async (req, targetId) => {
  if (req.user.isAdmin) return true;

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

router.get(
  '/:employeeId',
  asyncHandler(async (req, res) => {
    if (!(await canAccessEmployee(req, req.params.employeeId))) {
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

// NEW: Generate detailed invoice for a specific employee
router.get(
  '/invoice/:employeeId',
  authorizeRoles('admin'),
  asyncHandler(async (req, res) => {
    const invoice = await SalaryController.generateEmployeeInvoice(req.params.employeeId, req.query.month);
    res.json(invoice);
  })
);

module.exports = router;
