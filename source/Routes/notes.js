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
  authorizeRoles('admin', 'managerial'),
  asyncHandler(async (req, res) => {
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

