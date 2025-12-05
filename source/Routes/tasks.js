const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { authorizeRoles } = require('../middleware/auth');
const TaskController = require('../controllers/TaskController');
const TaskTemplateController = require('../controllers/TaskTemplateController');
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

// ==================== LEGACY TASK ROUTES (Deprecated) ====================

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { user } = req;
    const filters = {
      status: req.query.status,
    };

    if (req.query.employeeId) {
      if (!(await canAccessEmployee(req, req.query.employeeId))) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      filters.employeeId = parseInt(req.query.employeeId);
    } else if (!user.isAdmin && user.role !== 'managerial') {
      filters.employeeId = user.id;
    }

    const tasks = await TaskController.listTasks(filters);
    res.json(tasks);
  })
);

router.post(
  '/',
  authorizeRoles('admin', 'managerial'),
  asyncHandler(async (req, res) => {
    const task = await TaskController.createTask(req.body);
    res.status(201).json(task);
  })
);

router.put(
  '/:id',
  authorizeRoles('admin', 'managerial'),
  asyncHandler(async (req, res) => {
    const task = await TaskController.updateTask(req.params.id, req.body);
    res.json(task);
  })
);

router.delete(
  '/:id',
  authorizeRoles('admin'),
  asyncHandler(async (req, res) => {
    await TaskController.deleteTask(req.params.id);
    res.json({ success: true });
  })
);

// ==================== TASK TEMPLATE ROUTES ====================

router.get(
  '/templates',
  authorizeRoles('admin', 'managerial'),
  asyncHandler(async (req, res) => {
    const filters = {
      includeInactive: req.query.includeInactive === 'true',
    };
    const templates = await TaskTemplateController.listTemplates(filters);
    res.json(templates);
  })
);

router.get(
  '/templates/:id',
  authorizeRoles('admin', 'managerial'),
  asyncHandler(async (req, res) => {
    const template = await TaskTemplateController.getTemplateById(req.params.id);
    res.json(template);
  })
);

router.post(
  '/templates',
  authorizeRoles('admin'),
  asyncHandler(async (req, res) => {
    const template = await TaskTemplateController.createTemplate(req.body);
    res.status(201).json(template);
  })
);

router.put(
  '/templates/:id',
  authorizeRoles('admin'),
  asyncHandler(async (req, res) => {
    const template = await TaskTemplateController.updateTemplate(req.params.id, req.body);
    res.json(template);
  })
);

router.delete(
  '/templates/:id',
  authorizeRoles('admin'),
  asyncHandler(async (req, res) => {
    await TaskTemplateController.deactivateTemplate(req.params.id);
    res.json({ success: true });
  })
);

// ==================== TASK ASSIGNMENT ROUTES ====================

router.get(
  '/assignments',
  asyncHandler(async (req, res) => {
    const { user } = req;
    const filters = {
      status: req.query.status,
      templateId: req.query.templateId ? Number(req.query.templateId) : undefined,
    };

    if (req.query.employeeId) {
      if (!(await canAccessEmployee(req, req.query.employeeId))) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      filters.employeeId = parseInt(req.query.employeeId);
    } else if (!user.isAdmin && user.role !== 'managerial') {
      // Regular employees only see their own assignments
      filters.employeeId = user.id;
    }

    const assignments = await TaskTemplateController.listAssignments(filters);
    res.json(assignments);
  })
);

router.post(
  '/assignments',
  authorizeRoles('admin', 'managerial'),
  asyncHandler(async (req, res) => {
    const assignment = await TaskTemplateController.createAssignment(req.body);
    res.status(201).json(assignment);
  })
);

router.put(
  '/assignments/:id/reassign',
  authorizeRoles('admin', 'managerial'),
  asyncHandler(async (req, res) => {
    const { newEmployeeId } = req.body;
    if (!newEmployeeId) {
      return res.status(400).json({ message: 'newEmployeeId is required' });
    }
    const assignment = await TaskTemplateController.reassignTask(req.params.id, newEmployeeId);
    res.json(assignment);
  })
);

router.put(
  '/assignments/:id/status',
  asyncHandler(async (req, res) => {
    const { user } = req;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'status is required' });
    }

    // Get assignment to check permissions
    const assignments = await TaskTemplateController.listAssignments({});
    const assignment = assignments.find(a => a.id === Number(req.params.id));

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check if user has permission to update this assignment
    if (!user.isAdmin && user.role !== 'managerial' && assignment.assignedEmployeeId !== user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const updated = await TaskTemplateController.updateAssignmentStatus(req.params.id, status);
    res.json(updated);
  })
);

router.put(
  '/assignments/:id',
  authorizeRoles('admin', 'managerial'),
  asyncHandler(async (req, res) => {
    const assignment = await TaskTemplateController.updateAssignment(req.params.id, req.body);
    res.json(assignment);
  })
);

router.delete(
  '/assignments/:id',
  authorizeRoles('admin', 'managerial'),
  asyncHandler(async (req, res) => {
    await TaskTemplateController.deleteAssignment(req.params.id);
    res.json({ success: true });
  })
);

// ==================== DAILY SCHEDULE ====================

router.get(
  '/schedule/:date',
  authorizeRoles('admin', 'managerial'),
  asyncHandler(async (req, res) => {
    const { date } = req.params;
    const assignments = await TaskTemplateController.getAssignmentsByDate(date);
    res.json(assignments);
  })
);

module.exports = router;
