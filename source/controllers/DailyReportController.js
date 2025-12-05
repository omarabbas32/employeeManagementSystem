const dayjs = require('dayjs');
const { TaskAssignment, Task, Employee } = require('../Data/database');

/**
 * Get daily report of tasks (Admin and Managerial only)
 * Shows tasks based on due date OR completion date
 */
const getDailyReport = async (date) => {
    const targetDate = date ? dayjs(date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');

    // Query for task assignments (from task_templates system)
    const assignments = await TaskAssignment.aggregate([
        {
            $match: {
                $or: [
                    { dueDate: { $regex: `^${targetDate}` } },
                    { completedAt: { $regex: `^${targetDate}` } }
                ]
            }
        },
        {
            $lookup: {
                from: 'task_templates',
                localField: 'templateId',
                foreignField: 'id',
                as: 'template'
            }
        },
        { $unwind: '$template' },
        {
            $lookup: {
                from: 'employees',
                localField: 'assignedEmployeeId',
                foreignField: 'id',
                as: 'employee'
            }
        },
        { $unwind: '$employee' },
        {
            $project: {
                id: 1,
                assignedEmployeeId: 1,
                status: 1,
                createdAt: 1,
                dueDate: 1,
                completedAt: 1,
                taskName: '$template.name',
                description: '$template.description',
                price: '$template.price',
                factor: '$template.factor',
                employeeName: '$employee.name',
                employeeUsername: '$employee.username'
            }
        },
        { $sort: { dueDate: 1, completedAt: 1 } }
    ]);

    // Query for legacy tasks (from tasks table)
    const legacyTasks = await Task.aggregate([
        {
            $match: {
                dueDate: { $regex: `^${targetDate}` }
            }
        },
        {
            $lookup: {
                from: 'employees',
                localField: 'assignedEmployeeId',
                foreignField: 'id',
                as: 'employee'
            }
        },
        { $unwind: '$employee' },
        {
            $project: {
                id: 1,
                assignedEmployeeId: 1,
                status: 1,
                dueDate: 1,
                taskName: '$name',
                description: 1,
                price: 1,
                factor: 1,
                employeeName: '$employee.name',
                employeeUsername: '$employee.username'
            }
        },
        { $sort: { dueDate: 1 } }
    ]);

    // Combine and format results
    const allTasks = [
        ...assignments.map(task => ({
            id: task.id,
            taskName: task.taskName,
            description: task.description,
            employeeId: task.assignedEmployeeId,
            employeeName: task.employeeName,
            employeeUsername: task.employeeUsername,
            status: task.status,
            dueDate: task.dueDate,
            completedAt: task.completedAt,
            price: task.price,
            factor: task.factor,
            createdAt: task.createdAt,
            source: 'assignment'
        })),
        ...legacyTasks.map(task => ({
            id: task.id,
            taskName: task.taskName,
            description: task.description,
            employeeId: task.assignedEmployeeId,
            employeeName: task.employeeName,
            employeeUsername: task.employeeUsername,
            status: task.status,
            dueDate: task.dueDate,
            completedAt: null,
            price: task.price,
            factor: task.factor,
            createdAt: null,
            source: 'legacy'
        }))
    ];

    return allTasks;
};

module.exports = {
    getDailyReport
};
