const express = require('express');
const router = express.Router();
const {
    getAllAnnouncements,
    createAnnouncement,
    deleteAnnouncement,
} = require('../controllers/AnnouncementController');
const { getAsync } = require('../Data/database');

// Get all announcements (all authenticated users)
router.get('/', async (req, res, next) => {
    try {
        const announcements = await getAllAnnouncements();
        res.json(announcements);
    } catch (error) {
        next(error);
    }
});

// Create announcement (Admin and Manager only)
router.post('/', async (req, res, next) => {
    try {
        console.log('DEBUG: req.user =', req.user);
        const { role, id } = req.user;

        console.log('DEBUG: role =', role, 'id =', id);

        // Check if user is admin or managerial (lowercase from auth middleware)
        if (role !== 'admin' && role !== 'managerial') {
            const error = new Error('Only admins and managers can create announcements');
            error.status = 403;
            throw error;
        }

        // Get full employee data to get name and original employeeType
        const employee = await getAsync('SELECT * FROM employees WHERE id = ?', [id]);
        if (!employee) {
            const error = new Error('Employee not found');
            error.status = 404;
            throw error;
        }

        const announcement = await createAnnouncement({
            ...req.body,
            authorId: id,
            authorName: employee.name,
            authorRole: employee.employeeType,
        });

        res.status(201).json(announcement);
    } catch (error) {
        next(error);
    }
});

// Delete announcement
router.delete('/:id', async (req, res, next) => {
    try {
        const { role, id: userId } = req.user;

        if (role !== 'admin' && role !== 'managerial') {
            const error = new Error('Only admins and managers can delete announcements');
            error.status = 403;
            throw error;
        }

        // Get employee to check their actual role
        const employee = await getAsync('SELECT * FROM employees WHERE id = ?', [userId]);

        const result = await deleteAnnouncement(
            parseInt(req.params.id),
            userId,
            employee ? employee.employeeType : (role === 'admin' ? 'Admin' : 'Managerial')
        );

        res.json(result);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
