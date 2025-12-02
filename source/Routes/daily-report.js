const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { authorizeRoles } = require('../middleware/auth');
const DailyReportController = require('../controllers/DailyReportController');

// Get daily report (Admin and Managerial only)
router.get(
    '/',
    authorizeRoles('admin', 'managerial'),
    asyncHandler(async (req, res) => {
        const { date } = req.query;

        const report = await DailyReportController.getDailyReport(date);

        res.json({
            date: date || new Date().toISOString().split('T')[0],
            tasks: report,
            totalTasks: report.length
        });
    })
);

module.exports = router;
