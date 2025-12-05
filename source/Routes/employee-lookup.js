const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { authorizeRoles } = require('../middleware/auth');
const { Employee } = require('../Data/database');

// Lookup employee by username
router.get(
    '/:username',
    authorizeRoles('admin', 'managerial'),
    asyncHandler(async (req, res) => {
        const { username } = req.params;

        if (!username) {
            return res.status(400).json({ message: 'Username is required' });
        }

        const employee = await Employee.findOne({ username })
            .select('id name username email employeeType')
            .lean();

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found with username: ' + username });
        }

        res.json(employee);
    })
);

module.exports = router;
