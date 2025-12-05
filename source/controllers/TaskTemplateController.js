const { TaskTemplate, TaskAssignment } = require('../Data/database');

// ==================== TASK TEMPLATES ====================

const listTemplates = async (filters = {}) => {
    const query = {};

    // Only show active templates by default
    if (filters.includeInactive !== true) {
        query.isActive = 1;
    }

    // Filter by type if specified
    if (filters.type) {
        query.type = filters.type;
    }

    const templates = await TaskTemplate.find(query).sort({ createdAt: -1 }).lean();

    // For each template, count active assignments
    for (const template of templates) {
        const count = await TaskAssignment.countDocuments({
            templateId: template.id,
            status: { $ne: 'Done' }
        });
        template.activeAssignments = count;
    }

    return templates;
};

const createTemplate = async (payload) => {
    const { name, description = '', price = 0, factor = 1, type = 'task', createdBy = 'Admin' } = payload;

    if (!name) {
        throw new Error('Template name is required');
    }

    const template = await TaskTemplate.create({
        name,
        description,
        price,
        factor,
        type,
        createdBy
    });

    const result = template.toObject();
    result.activeAssignments = 0; // New template has no assignments
    return result;
};

const updateTemplate = async (id, payload) => {
    const template = await TaskTemplate.findOne({ id }).lean();
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
        isActive: payload.isActive ?? template.isActive,
    };

    await TaskTemplate.updateOne({ id }, { $set: updatedTemplate });

    const updated = await TaskTemplate.findOne({ id }).lean();

    // Count active assignments
    const count = await TaskAssignment.countDocuments({
        templateId: id,
        status: { $ne: 'Done' }
    });
    updated.activeAssignments = count;

    return updated;
};

const deactivateTemplate = async (id) => {
    const template = await TaskTemplate.findOne({ id }).lean();
    if (!template) {
        const error = new Error('Template not found');
        error.status = 404;
        throw error;
    }

    await TaskTemplate.updateOne({ id }, { $set: { isActive: 0 } });
    return { success: true };
};

const getTemplateById = async (id) => {
    const template = await TaskTemplate.findOne({ id }).lean();
    if (!template) {
        const error = new Error('Template not found');
        error.status = 404;
        throw error;
    }

    // Count active assignments
    const count = await TaskAssignment.countDocuments({
        templateId: id,
        status: { $ne: 'Done' }
    });
    template.activeAssignments = count;

    return template;
};

// ==================== TASK ASSIGNMENTS ====================

const listAssignments = async (filters = {}) => {
    const { Employee } = require('../Data/database');
    const query = {};

    if (filters.employeeId) {
        query.assignedEmployeeId = parseInt(filters.employeeId);
    }

    if (filters.status) {
        query.status = filters.status;
    }

    if (filters.templateId) {
        query.templateId = parseInt(filters.templateId);
    }

    if (filters.type) {
        query.type = filters.type;
    }

    const assignments = await TaskAssignment.find(query).sort({ createdAt: -1 }).lean();

    // Get template details for each assignment
    const templateIds = [...new Set(assignments.map(a => a.templateId))];
    const templates = await TaskTemplate.find({ id: { $in: templateIds } }).lean();
    const templateMap = {};
    templates.forEach(t => { templateMap[t.id] = t; });

    // Get employee details for each assignment
    const employeeIds = [...new Set(assignments.map(a => a.assignedEmployeeId))];
    const employees = await Employee.find({ id: { $in: employeeIds } }).lean();
    const employeeMap = {};
    employees.forEach(e => { employeeMap[e.id] = e; });

    // Enrich assignments with template and employee data
    return assignments.map(a => ({
        ...a,
        templateName: templateMap[a.templateId]?.name,
        templateDescription: templateMap[a.templateId]?.description,
        templatePrice: templateMap[a.templateId]?.price,
        templateFactor: templateMap[a.templateId]?.factor,
        templateType: templateMap[a.templateId]?.type,
        employeeName: employeeMap[a.assignedEmployeeId]?.name,
        employeeType: employeeMap[a.assignedEmployeeId]?.employeeType
    }));
};

const createAssignment = async (payload) => {
    const { templateId, assignedEmployeeId, assignedBy, startDate, dueDate } = payload;

    if (!templateId || !assignedEmployeeId || !assignedBy) {
        throw new Error('templateId, assignedEmployeeId, and assignedBy are required');
    }

    // Verify template exists and is active
    const template = await TaskTemplate.findOne({ id: templateId, isActive: 1 }).lean();
    if (!template) {
        const error = new Error('Template not found or inactive');
        error.status = 404;
        throw error;
    }

    // Copy type from template to assignment
    const assignment = await TaskAssignment.create({
        templateId,
        assignedEmployeeId,
        assignedBy,
        type: template.type,
        startDate,
        dueDate,
        status: 'Pending'
    });

    return {
        ...assignment.toObject(),
        name: template.name,
        description: template.description,
        price: template.price,
        factor: template.factor,
        templateType: template.type
    };
};

const reassignTask = async (assignmentId, newEmployeeId) => {
    const assignment = await TaskAssignment.findOne({ id: assignmentId }).lean();
    if (!assignment) {
        const error = new Error('Assignment not found');
        error.status = 404;
        throw error;
    }

    await TaskAssignment.updateOne(
        { id: assignmentId },
        { $set: { assignedEmployeeId: newEmployeeId } }
    );

    const updated = await TaskAssignment.findOne({ id: assignmentId }).lean();
    const template = await TaskTemplate.findOne({ id: updated.templateId }).lean();

    return {
        ...updated,
        name: template?.name,
        description: template?.description,
        price: template?.price,
        factor: template?.factor,
        templateType: template?.type
    };
};

const updateAssignmentStatus = async (assignmentId, status) => {
    const assignment = await TaskAssignment.findOne({ id: assignmentId }).lean();
    if (!assignment) {
        const error = new Error('Assignment not found');
        error.status = 404;
        throw error;
    }

    const dayjs = require('dayjs');
    const completedAt = (status === 'Done' || status === 'Completed') ? new Date().toISOString() : assignment.completedAt;
    const completedMonth = (status === 'Done' || status === 'Completed') ? dayjs().format('YYYY-MM') : assignment.completedMonth;

    await TaskAssignment.updateOne(
        { id: assignmentId },
        { $set: { status, completedAt, completedMonth } }
    );

    const updated = await TaskAssignment.findOne({ id: assignmentId }).lean();
    const template = await TaskTemplate.findOne({ id: updated.templateId }).lean();

    return {
        ...updated,
        name: template?.name,
        description: template?.description,
        price: template?.price,
        factor: template?.factor,
        templateType: template?.type
    };
};

const updateAssignment = async (assignmentId, payload) => {
    const assignment = await TaskAssignment.findOne({ id: assignmentId }).lean();
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

    // If status changed to Done/Completed, set completedAt and completedMonth
    const dayjs = require('dayjs');
    let completedAt = assignment.completedAt;
    let completedMonth = assignment.completedMonth;

    if ((updates.status === 'Completed' || updates.status === 'Done') &&
        (assignment.status !== 'Completed' && assignment.status !== 'Done')) {
        completedAt = new Date().toISOString();
        completedMonth = dayjs().format('YYYY-MM');
    }

    await TaskAssignment.updateOne(
        { id: assignmentId },
        {
            $set: {
                assignedEmployeeId: updates.assignedEmployeeId,
                status: updates.status,
                startDate: updates.startDate,
                dueDate: updates.dueDate,
                completedAt,
                completedMonth
            }
        }
    );

    const updated = await TaskAssignment.findOne({ id: assignmentId }).lean();
    const template = await TaskTemplate.findOne({ id: updated.templateId }).lean();

    return {
        ...updated,
        name: template?.name,
        description: template?.description,
        price: template?.price,
        factor: template?.factor,
        templateType: template?.type
    };
};

const deleteAssignment = async (assignmentId) => {
    await TaskAssignment.deleteOne({ id: assignmentId });
    return { success: true };
};

// Get assignments by date (for daily schedule)
const getAssignmentsByDate = async (date) => {
    const { Employee } = require('../Data/database');

    // Query assignments where dueDate matches the selected date
    const assignments = await TaskAssignment.aggregate([
        {
            $match: {
                dueDate: date
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
        {
            $unwind: {
                path: '$template',
                preserveNullAndEmptyArrays: true
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
        {
            $unwind: {
                path: '$employee',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                id: 1,
                templateId: 1,
                assignedEmployeeId: 1,
                status: 1,
                dueDate: 1,
                startDate: 1,
                createdAt: 1,
                templateName: '$template.name',
                templateDescription: '$template.description',
                templatePrice: '$template.price',
                templateFactor: '$template.factor',
                templateType: '$template.type',
                employeeName: '$employee.name',
                employeeType: '$employee.employeeType'
            }
        },
        {
            $sort: { templateName: 1, employeeName: 1 }
        }
    ]);

    return assignments;
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
    getAssignmentsByDate, // NEW
};
