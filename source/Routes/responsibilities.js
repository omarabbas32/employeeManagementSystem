const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { authorizeRoles } = require('../middleware/auth');
const ResponsibilityController = require('../controllers/ResponsibilityController');

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { user } = req;
    const filters = {};

    if (req.query.employeeId) {
      const requestedId = Number(req.query.employeeId);
      if (!user.isAdmin && user.role !== 'managerial' && requestedId !== Number(user.id)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      filters.employeeId = requestedId;
    } else if (!user.isAdmin && user.role !== 'managerial') {
      filters.employeeId = user.id;
    }

    const responsibilities = await ResponsibilityController.listResponsibilities(filters);
    res.json(responsibilities);
  })
);

router.post(
  '/',
  authorizeRoles('admin'),
  asyncHandler(async (req, res) => {
    const responsibility = await ResponsibilityController.createResponsibility(req.body);
    res.status(201).json(responsibility);
  })
);

router.put(
  '/:id',
  authorizeRoles('admin'),
  asyncHandler(async (req, res) => {
    const responsibility = await ResponsibilityController.updateResponsibility(req.params.id, req.body);
    res.json(responsibility);
  })
);

router.delete(
  '/:id',
  authorizeRoles('admin'),
  asyncHandler(async (req, res) => {
    await ResponsibilityController.deleteResponsibility(req.params.id);
    res.json({ success: true });
  })
);

module.exports = router;

