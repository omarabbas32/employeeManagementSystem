const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { authorizeRoles } = require('../middleware/auth');
const NoteController = require('../controllers/NoteController');

router.post(
  '/',
  authorizeRoles('admin'),
  asyncHandler(async (req, res) => {
    const note = await NoteController.addNote(req.body);
    res.status(201).json(note);
  })
);

router.get(
  '/:employeeId',
  asyncHandler(async (req, res) => {
    const requestedId = Number(req.params.employeeId);
    const { user } = req;

    // Employees can only view their own notes
    // Admin and Managerial can view any employee's notes
    if (!user.isAdmin && user.role !== 'managerial' && requestedId !== Number(user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const notes = await NoteController.listNotes(req.params.employeeId);
    res.json(notes);
  })
);

router.delete(
  '/:id',
  authorizeRoles('admin'),
  asyncHandler(async (req, res) => {
    await NoteController.deleteNote(req.params.id);
    res.json({ success: true });
  })
);

module.exports = router;
