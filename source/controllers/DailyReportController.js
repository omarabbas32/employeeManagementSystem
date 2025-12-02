const dayjs = require('dayjs');
const { allAsync } = require('../Data/database');

/**
 * Get daily report of tasks (Admin and Managerial only)
 * Shows tasks based on due date OR completion date
 */
const getDailyReport = async (date) => {
    const targetDate = date ? dayjs(date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');

    // Query for task assignments (from task_templates system)
    const assignments = await allAsync(
        `SELECT 
      ta.id,
      ta.assignedEmployeeId,
      ta.status,
      ta.createdAt,
      ta.dueDate,
      ta.completedAt,
      tt.name as taskName,
      tt.description,
      tt.price,
      tt.factor,
      e.name as employeeName,
      e.username as employeeUsername
    FROM task_assignments ta
    JOIN task_templates tt ON ta.templateId = tt.id
    JOIN employees e ON ta.assignedEmployeeId = e.id
    WHERE (DATE(ta.dueDate) = ? OR DATE(ta.completedAt) = ?)
    ORDER BY ta.dueDate ASC, ta.completedAt ASC`,
        [targetDate, targetDate]
    );

    // Query for legacy tasks (from tasks table) - may not have createdAt in old schema
    const legacyTasks = await allAsync(
        `SELECT 
      t.id,
      t.assignedEmployeeId,
      t.status,
      t.dueDate,
      t.name as taskName,
      t.description,
      t.price,
      t.factor,
      e.name as employeeName,
      e.username as employeeUsername
    FROM tasks t
    JOIN employees e ON t.assignedEmployeeId = e.id
    WHERE DATE(t.dueDate) = ?
    ORDER BY t.dueDate ASC`,
        [targetDate]
    );

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
            createdAt: null, // Legacy tasks may not have this column
            source: 'legacy'
        }))
    ];

    return allTasks;
};

module.exports = {
    getDailyReport
};
