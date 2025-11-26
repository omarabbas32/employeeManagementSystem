const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { authorizeRoles } = require('../middleware/auth');
const TaskController = require('../controllers/TaskController');

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { user } = req;
    const filters = {
      status: req.query.status,
    };

    if (req.query.employeeId) {
      const requestedId = Number(req.query.employeeId);
      if (!user.isAdmin && user.role !== 'managerial' && requestedId !== Number(user.id)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      filters.employeeId = requestedId;
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

module.exports = router;

