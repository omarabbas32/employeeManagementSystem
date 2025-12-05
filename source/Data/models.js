const mongoose = require('mongoose');

// Counter schema for auto-incrementing IDs
const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);

// Helper function to get next sequence number
async function getNextSequence(name) {
    const counter = await Counter.findByIdAndUpdate(
        name,
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return counter.seq;
}

// Employee Types Schema
const employeeTypeSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    name: { type: String, required: true, unique: true },
    description: { type: String, default: null },
    privileges: { type: String, default: 'employee' }
}, { collection: 'employee_types' });

employeeTypeSchema.pre('save', async function () {
    if (this.isNew && !this.id) {
        this.id = await getNextSequence('employee_types');
    }
});

// Employees Schema
const employeeSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    name: { type: String, required: true },
    username: { type: String, unique: true, sparse: true, default: null },
    email: { type: String, unique: true, sparse: true, default: null },
    passwordHash: { type: String, default: null },
    employeeType: { type: String, required: true },
    baseSalary: { type: Number, default: 0 },
    monthlyFactor: { type: Number, default: 1 },
    overtimeFactor: { type: Number, default: 1 },
    notes: { type: String, default: '' },
    normalHourRate: { type: Number, default: 10 },
    overtimeHourRate: { type: Number, default: 15 },
    requiredMonthlyHours: { type: Number, default: 160 },
    hourlyRate: { type: Number, default: 15 }
}, { collection: 'employees' });

employeeSchema.pre('save', async function () {
    if (this.isNew && !this.id) {
        this.id = await getNextSequence('employees');
    }
});

// Tasks Schema (Legacy)
const taskSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: null },
    price: { type: Number, default: 0 },
    assignedEmployeeId: { type: Number, required: true },
    assignedBy: { type: String, default: null },
    status: { type: String, default: 'Pending' },
    startDate: { type: String, default: null },
    dueDate: { type: String, default: null },
    factor: { type: Number, default: 1 },
    createdAt: { type: String, default: () => new Date().toISOString() }
}, { collection: 'tasks' });

taskSchema.pre('save', async function () {
    if (this.isNew && !this.id) {
        this.id = await getNextSequence('tasks');
    }
});

// Task Templates Schema
const taskTemplateSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: null },
    price: { type: Number, default: 0 },
    factor: { type: Number, default: 1 },
    type: { type: String, default: 'task' },
    createdBy: { type: String, default: 'Admin' },
    isActive: { type: Number, default: 1 },
    createdAt: { type: String, default: () => new Date().toISOString() }
}, { collection: 'task_templates' });

taskTemplateSchema.pre('save', async function () {
    if (this.isNew && !this.id) {
        this.id = await getNextSequence('task_templates');
    }
});

// Task Assignments Schema
const taskAssignmentSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    templateId: { type: Number, required: true },
    assignedEmployeeId: { type: Number, required: true },
    assignedBy: { type: String, required: true },
    type: { type: String, default: 'task' },
    status: { type: String, default: 'Pending' },
    startDate: { type: String, default: null },
    dueDate: { type: String, default: null },
    createdAt: { type: String, default: () => new Date().toISOString() },
    completedAt: { type: String, default: null },
    completedMonth: { type: String, default: null }
}, { collection: 'task_assignments' });

taskAssignmentSchema.index({ templateId: 1 });
taskAssignmentSchema.index({ assignedEmployeeId: 1 });
taskAssignmentSchema.index({ status: 1 });
taskAssignmentSchema.index({ completedMonth: 1 });

taskAssignmentSchema.pre('save', async function () {
    if (this.isNew && !this.id) {
        this.id = await getNextSequence('task_assignments');
    }
});

// Responsibilities Schema
const responsibilitySchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: null },
    monthlyPrice: { type: Number, default: 0 },
    assignedEmployeeId: { type: Number, required: true },
    assignedBy: { type: String, default: null },
    status: { type: String, default: 'Active' },
    factor: { type: Number, default: 1 },
    createdAt: { type: String, default: () => new Date().toISOString() },
    month: { type: String, default: null }
}, { collection: 'responsibilities' });

responsibilitySchema.index({ month: 1, assignedEmployeeId: 1 });

responsibilitySchema.pre('save', async function () {
    if (this.isNew && !this.id) {
        this.id = await getNextSequence('responsibilities');
    }
});

// Attendance Schema
const attendanceSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    employeeId: { type: Number, required: true },
    date: { type: String, required: true },
    checkInTime: { type: String, default: null },
    checkOutTime: { type: String, default: null },
    dailyHours: { type: Number, default: 0 },
    createdAt: { type: String, default: () => new Date().toISOString() }
}, { collection: 'attendance' });

attendanceSchema.index({ employeeId: 1, date: 1 });

attendanceSchema.pre('save', async function () {
    if (this.isNew && !this.id) {
        this.id = await getNextSequence('attendance');
    }
});

// Notes Schema
const noteSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    employeeId: { type: Number, required: true },
    content: { type: String, required: true },
    author: { type: String, required: true, default: 'Admin' },
    visibility: { type: String, default: 'employee' },
    createdAt: { type: String, default: () => new Date().toISOString() }
}, { collection: 'notes' });

noteSchema.pre('save', async function () {
    if (this.isNew && !this.id) {
        this.id = await getNextSequence('notes');
    }
});

// Admin Settings Schema (Singleton)
const adminSettingsSchema = new mongoose.Schema({
    _id: { type: Number, default: 1 },
    id: { type: Number, default: 1 },
    normalHourRate: { type: Number, default: 10 },
    overtimeHourRate: { type: Number, default: 15 },
    overtimeThresholdHours: { type: Number, default: 160 },
    currentAttendanceCode: { type: String, default: null },
    allowTaskOvertimeFactor: { type: Number, default: 0 },
    allowResponsibilityDeduction: { type: Number, default: 0 }
}, { collection: 'admin_settings' });

// Deduction Rules Schema
const deductionRuleSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    name: { type: String, required: true },
    type: { type: String, required: true, enum: ['fixed', 'percentage'] },
    amount: { type: Number, required: true },
    applyToEmployeeId: { type: Number, default: null },
    isActive: { type: Number, default: 1 },
    createdAt: { type: String, default: () => new Date().toISOString() },
    month: { type: String, default: null },
    hours_deducted: { type: Number, default: null }
}, { collection: 'deduction_rules' });

deductionRuleSchema.index({ month: 1, applyToEmployeeId: 1 });

deductionRuleSchema.pre('save', async function () {
    if (this.isNew && !this.id) {
        this.id = await getNextSequence('deduction_rules');
    }
});

// Announcements Schema
const announcementSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    authorId: { type: Number, required: true },
    authorName: { type: String, required: true },
    authorRole: { type: String, required: true },
    createdAt: { type: String, default: () => new Date().toISOString() }
}, { collection: 'announcements' });

announcementSchema.pre('save', async function () {
    if (this.isNew && !this.id) {
        this.id = await getNextSequence('announcements');
    }
});

// Export models
module.exports = {
    EmployeeType: mongoose.model('EmployeeType', employeeTypeSchema),
    Employee: mongoose.model('Employee', employeeSchema),
    Task: mongoose.model('Task', taskSchema),
    TaskTemplate: mongoose.model('TaskTemplate', taskTemplateSchema),
    TaskAssignment: mongoose.model('TaskAssignment', taskAssignmentSchema),
    Responsibility: mongoose.model('Responsibility', responsibilitySchema),
    Attendance: mongoose.model('Attendance', attendanceSchema),
    Note: mongoose.model('Note', noteSchema),
    AdminSettings: mongoose.model('AdminSettings', adminSettingsSchema),
    DeductionRule: mongoose.model('DeductionRule', deductionRuleSchema),
    Announcement: mongoose.model('Announcement', announcementSchema)
};
