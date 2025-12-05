const express = require('express');
const router = express.Router();
const {
    getAllAnnouncements,
    createAnnouncement,
    deleteAnnouncement,
} = require('../controllers/AnnouncementController');
const { Employee } = require('../Data/database');

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
        const { role, id } = req.user;

        // Check if user is admin or managerial (lowercase from auth middleware)
        if (role !== 'admin' && role !== 'managerial') {
            const error = new Error('Only admins and managers can create announcements');
            error.status = 403;
            throw error;
        }

        // Get full employee data to get name and original employeeType
        const numericId = parseInt(id);
        let employee;

        if (!isNaN(numericId)) {
            // Use numeric id field
            employee = await Employee.findOne({ id: numericId }).lean();
        } else if (typeof id === 'string' && id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)) {
            // Use MongoDB _id for backward compatibility
            employee = await Employee.findById(id).lean();
        }

        if (!employee) {
            const error = new Error('Employee not found');
            error.status = 404;
            throw error;
        }

        const announcement = await createAnnouncement({
            ...req.body,
            authorId: employee.id,
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
        console.log('DELETE ROUTE: Received delete request for ID:', req.params.id);
        const { role, id: userId } = req.user;

        if (role !== 'admin' && role !== 'managerial') {
            const error = new Error('Only admins and managers can delete announcements');
            error.status = 403;
            throw error;
        }

        // Get employee to check their actual role
        const numericUserId = parseInt(userId);
        let employee;

        if (!isNaN(numericUserId)) {
            employee = await Employee.findOne({ id: numericUserId }).lean();
        } else if (typeof userId === 'string' && userId.length === 24 && /^[0-9a-fA-F]{24}$/.test(userId)) {
            employee = await Employee.findById(userId).lean();
        }

        // Pass the ID as-is (could be numeric or MongoDB ObjectId string)
        const announcementId = req.params.id;
        const parsedId = parseInt(announcementId);
        const finalId = !isNaN(parsedId) ? parsedId : announcementId;

        console.log('DELETE ROUTE: Calling deleteAnnouncement with ID:', finalId);
        const result = await deleteAnnouncement(
            finalId,
            parseInt(userId),
            employee ? employee.employeeType : (role === 'admin' ? 'Admin' : 'Managerial')
        );

        console.log('DELETE ROUTE: Success, result:', result);
        res.json(result);
    } catch (error) {
        console.error('DELETE ROUTE: Error:', error);
        next(error);
    }
});

module.exports = router;
