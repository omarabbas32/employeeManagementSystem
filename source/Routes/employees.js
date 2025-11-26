const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { authorizeRoles } = require('../middleware/auth');
const EmployeeController = require('../controllers/EmployeeController');

router.get(
  '/',
  authorizeRoles('admin', 'managerial'),
  asyncHandler(async (req, res) => {
    const employees = await EmployeeController.listEmployees();
    res.json(employees);
  })
);

router.get(
  '/:id',
  authorizeRoles('admin'),
  asyncHandler(async (req, res) => {
    const employee = await EmployeeController.getEmployeeDetails(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.json(employee);
  })
);

router.post(
  '/',
  authorizeRoles('admin'),
  asyncHandler(async (req, res) => {
    const employee = await EmployeeController.createEmployee(req.body);
    res.status(201).json(employee);
  })
);

router.put(
  '/:id',
  authorizeRoles('admin'),
  asyncHandler(async (req, res) => {
    const employee = await EmployeeController.updateEmployee(req.params.id, req.body);
    res.json(employee);
  })
);

router.delete(
  '/:id',
  authorizeRoles('admin'),
  asyncHandler(async (req, res) => {
    await EmployeeController.deleteEmployee(req.params.id);
    res.json({ success: true });
  })
);

module.exports = router;

