const { allAsync, getAsync, runAsync } = require('../Data/database');

// ==================== TASK TEMPLATES ====================

const listTemplates = async (filters = {}) => {
    const conditions = [];
    const params = [];

    // Only show active templates by default
    if (filters.includeInactive !== true) {
        conditions.push('isActive = 1');
    }

    // Filter by type if specified
    if (filters.type) {
        conditions.push('type = ?');
        params.push(filters.type);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const templates = await allAsync(
        `SELECT * FROM task_templates ${whereClause} ORDER BY createdAt DESC`,
        params
    );

    // For each template, count active assignments
    for (const template of templates) {
        const countResult = await getAsync(
            `SELECT COUNT(*) as count FROM task_assignments WHERE templateId = ? AND status != 'Done'`,
            [template.id]
        );
        template.activeAssignments = countResult.count;
    }

    return templates;
};

const createTemplate = async (payload) => {
    const { name, description = '', price = 0, factor = 1, type = 'task', createdBy = 'Admin' } = payload;

    if (!name) {
        throw new Error('Template name is required');
    }

    const result = await runAsync(
        `INSERT INTO task_templates (name, description, price, factor, type, createdBy)
     VALUES (?, ?, ?, ?, ?, ?)`,
        [name, description, price, factor, type, createdBy]
    );

    const template = await getAsync(`SELECT * FROM task_templates WHERE id = ?`, [result.lastID]);
    template.activeAssignments = 0; // New template has no assignments
    return template;
};

const updateTemplate = async (id, payload) => {
    const template = await getAsync(`SELECT * FROM task_templates WHERE id = ?`, [id]);
    if (!template) {
        const error = new Error('Template not found');
        error.status = 404;
        throw error;
    }

    const updatedTemplate = {
        name: payload.name ?? template.name,
        description: payload.description ?? template.description,
        price: payload.price ?? template.price,
        factor: payload.factor ?? template.factor,
    };

    await runAsync(
        `UPDATE task_templates SET name = ?, description = ?, price = ?, factor = ? WHERE id = ?`,
        [updatedTemplate.name, updatedTemplate.description, updatedTemplate.price, updatedTemplate.factor, id]
    );

    const updated = await getAsync(`SELECT * FROM task_templates WHERE id = ?`, [id]);

    // Count active assignments
    const countResult = await getAsync(
        `SELECT COUNT(*) as count FROM task_assignments WHERE templateId = ? AND status != 'Done'`,
        [id]
    );
    updated.activeAssignments = countResult.count;

    return updated;
};

const deactivateTemplate = async (id) => {
    const template = await getAsync(`SELECT * FROM task_templates WHERE id = ?`, [id]);
    if (!template) {
        const error = new Error('Template not found');
        error.status = 404;
        throw error;
    }

    await runAsync(`UPDATE task_templates SET isActive = 0 WHERE id = ?`, [id]);
    return { success: true };
};

const getTemplateById = async (id) => {
    const template = await getAsync(`SELECT * FROM task_templates WHERE id = ?`, [id]);
    if (!template) {
        const error = new Error('Template not found');
        error.status = 404;
        throw error;
    }

    // Count active assignments
    const countResult = await getAsync(
        `SELECT COUNT(*) as count FROM task_assignments WHERE templateId = ? AND status != 'Done'`,
        [id]
    );
    template.activeAssignments = countResult.count;

    return template;
};

// ==================== TASK ASSIGNMENTS ====================

const listAssignments = async (filters = {}) => {
    const conditions = [];
    const params = [];

    if (filters.employeeId) {
        conditions.push('ta.assignedEmployeeId = ?');
        params.push(filters.employeeId);
    }

    if (filters.status) {
        conditions.push('ta.status = ?');
        params.push(filters.status);
    }

    if (filters.templateId) {
        conditions.push('ta.templateId = ?');
        params.push(filters.templateId);
    }

    if (filters.type) {
        conditions.push('ta.type = ?');
        params.push(filters.type);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Join with template to get template details
    const assignments = await allAsync(
        `SELECT 
      ta.*,
      tt.name,
      tt.description,
      tt.price,
      tt.factor,
      tt.type as templateType
     FROM task_assignments ta
     JOIN task_templates tt ON ta.templateId = tt.id
     ${whereClause}
     ORDER BY ta.createdAt DESC`,
        params
    );

    return assignments;
};

const createAssignment = async (payload) => {
    const { templateId, assignedEmployeeId, assignedBy, startDate, dueDate } = payload;

    if (!templateId || !assignedEmployeeId || !assignedBy) {
        throw new Error('templateId, assignedEmployeeId, and assignedBy are required');
    }

    // Verify template exists and is active
    const template = await getAsync(
        `SELECT * FROM task_templates WHERE id = ? AND isActive = 1`,
        [templateId]
    );
    if (!template) {
        const error = new Error('Template not found or inactive');
        error.status = 404;
        throw error;
    }

    // Copy type from template to assignment
    const result = await runAsync(
        `INSERT INTO task_assignments (templateId, assignedEmployeeId, assignedBy, type, startDate, dueDate, status)
     VALUES (?, ?, ?, ?, ?, ?, 'Pending')`,
        [templateId, assignedEmployeeId, assignedBy, template.type, startDate, dueDate]
    );

    const assignment = await getAsync(
        `SELECT 
      ta.*,
      tt.name,
      tt.description,
      tt.price,
      tt.factor,
      tt.type as templateType
     FROM task_assignments ta
     JOIN task_templates tt ON ta.templateId = tt.id
     WHERE ta.id = ?`,
        [result.lastID]
    );

    return assignment;
};

const reassignTask = async (assignmentId, newEmployeeId) => {
    const assignment = await getAsync(`SELECT * FROM task_assignments WHERE id = ?`, [assignmentId]);
    if (!assignment) {
        const error = new Error('Assignment not found');
        error.status = 404;
        throw error;
    }

    await runAsync(
        `UPDATE task_assignments SET assignedEmployeeId = ? WHERE id = ?`,
        [newEmployeeId, assignmentId]
    );

    const updated = await getAsync(
        `SELECT 
      ta.*,
      tt.name,
      tt.description,
      tt.price,
      tt.factor,
      tt.type as templateType
     FROM task_assignments ta
     JOIN task_templates tt ON ta.templateId = tt.id
     WHERE ta.id = ?`,
        [assignmentId]
    );

    return updated;
};

const updateAssignmentStatus = async (assignmentId, status) => {
    const assignment = await getAsync(`SELECT * FROM task_assignments WHERE id = ?`, [assignmentId]);
    if (!assignment) {
        const error = new Error('Assignment not found');
        error.status = 404;
        throw error;
    }

    const completedAt = status === 'Completed' ? new Date().toISOString() : null;

    await runAsync(
        `UPDATE task_assignments SET status = ?, completedAt = ? WHERE id = ?`,
        [status, completedAt, assignmentId]
    );

    const updated = await getAsync(
        `SELECT 
      ta.*,
      tt.name,
      tt.description,
      tt.price,
      tt.factor,
      tt.type as templateType
     FROM task_assignments ta
     JOIN task_templates tt ON ta.templateId = tt.id
     WHERE ta.id = ?`,
        [assignmentId]
    );

    return updated;
};

const updateAssignment = async (assignmentId, payload) => {
    const assignment = await getAsync(`SELECT * FROM task_assignments WHERE id = ?`, [assignmentId]);
    if (!assignment) {
        const error = new Error('Assignment not found');
        error.status = 404;
        throw error;
    }

    const updates = {
        assignedEmployeeId: payload.assignedEmployeeId ?? assignment.assignedEmployeeId,
        status: payload.status ?? assignment.status,
        startDate: payload.startDate ?? assignment.startDate,
        dueDate: payload.dueDate ?? assignment.dueDate,
    };

    // If status changed to Done, set completedAt
    const completedAt = updates.status === 'Completed' && assignment.status !== 'Completed'
        ? new Date().toISOString()
        : assignment.completedAt;

    await runAsync(
        `UPDATE task_assignments SET 
      assignedEmployeeId = ?, 
      status = ?, 
      startDate = ?, 
      dueDate = ?,
      completedAt = ?
     WHERE id = ?`,
        [updates.assignedEmployeeId, updates.status, updates.startDate, updates.dueDate, completedAt, assignmentId]
    );

    const updated = await getAsync(
        `SELECT 
      ta.*,
      tt.name,
      tt.description,
      tt.price,
      tt.factor,
      tt.type as templateType
     FROM task_assignments ta
     JOIN task_templates tt ON ta.templateId = tt.id
     WHERE ta.id = ?`,
        [assignmentId]
    );

    return updated;
};

const deleteAssignment = async (assignmentId) => {
    await runAsync(`DELETE FROM task_assignments WHERE id = ?`, [assignmentId]);
    return { success: true };
};

module.exports = {
    // Templates
    listTemplates,
    createTemplate,
    updateTemplate,
    deactivateTemplate,
    getTemplateById,

    // Assignments
    listAssignments,
    createAssignment,
    reassignTask,
    updateAssignmentStatus,
    updateAssignment,
    deleteAssignment,
};
