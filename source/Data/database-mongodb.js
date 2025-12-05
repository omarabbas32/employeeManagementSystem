const { connectDB } = require('./mongodb');
const {
    EmployeeType,
    Employee,
    Task,
    TaskTemplate,
    TaskAssignment,
    Responsibility,
    Attendance,
    Note,
    AdminSettings,
    DeductionRule,
    Announcement
} = require('./models');

// Compatibility layer to match SQLite API
const runAsync = async (sql, params = []) => {
    // This is a compatibility shim - MongoDB operations are handled by Mongoose
    // This function exists to maintain the same export signature
    throw new Error('runAsync is deprecated with MongoDB. Use Mongoose models directly.');
};

const getAsync = async (sql, params = []) => {
    // This is a compatibility shim - MongoDB operations are handled by Mongoose
    throw new Error('getAsync is deprecated with MongoDB. Use Mongoose models directly.');
};

const allAsync = async (sql, params = []) => {
    // This is a compatibility shim - MongoDB operations are handled by Mongoose
    throw new Error('allAsync is deprecated with MongoDB. Use Mongoose models directly.');
};

const initDatabase = async () => {
    // Connect to MongoDB
    await connectDB();

    const dayjs = require('dayjs');
    const currentMonth = dayjs().format('YYYY-MM');

    // Initialize predefined employee types
    const predefinedTypes = ['Admin', 'Managerial', 'Financial', 'Assistant'];
    for (const typeName of predefinedTypes) {
        await EmployeeType.findOneAndUpdate(
            { name: typeName },
            { name: typeName, privileges: typeName.toLowerCase() },
            { upsert: true, new: true }
        );
    }

    // Initialize admin settings (singleton)
    const existingSettings = await AdminSettings.findOne({ _id: 1 });
    if (!existingSettings) {
        await AdminSettings.create({
            _id: 1,
            id: 1,
            normalHourRate: 10,
            overtimeHourRate: 15,
            overtimeThresholdHours: 160
        });
    }

    // Backfill completedAt for completed tasks
    await TaskAssignment.updateMany(
        { status: 'Completed', completedAt: null },
        [{
            $set: {
                completedAt: {
                    $ifNull: ['$dueDate', { $ifNull: ['$createdAt', new Date().toISOString()] }]
                }
            }
        }]
    );

    // Backfill month fields
    await Responsibility.updateMany(
        { month: null },
        { $set: { month: currentMonth } }
    );

    await DeductionRule.updateMany(
        { month: null },
        { $set: { month: currentMonth } }
    );

    // Backfill completedMonth for completed tasks
    await TaskAssignment.updateMany(
        {
            $or: [{ status: 'Done' }, { status: 'Completed' }],
            completedAt: { $ne: null },
            completedMonth: null
        },
        [{
            $set: {
                completedMonth: { $substr: ['$completedAt', 0, 7] }
            }
        }]
    );

    console.log('✅ Database initialized successfully');
    console.log('✅ Multiple check-ins per day enabled');
    console.log('✅ Monthly payroll system enabled');
    console.log('✅ Hour-based deduction feature enabled');
};

// Export models and functions
module.exports = {
    // Models
    EmployeeType,
    Employee,
    Task,
    TaskTemplate,
    TaskAssignment,
    Responsibility,
    Attendance,
    Note,
    AdminSettings,
    DeductionRule,
    Announcement,

    // Functions
    initDatabase,
    runAsync,
    getAsync,
    allAsync,

    // Legacy compatibility (deprecated)
    db: null // SQLite db object no longer exists
};
