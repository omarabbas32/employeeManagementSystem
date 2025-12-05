const { Employee, Task, TaskAssignment, TaskTemplate, Responsibility, Attendance, Note } = require('../Data/database');
const { hashPassword } = require('../utils/password');

const mapEmployeeDetails = async (employee) => {
    if (!employee) {
        return null;
    }

    const [tasks, assignments, responsibilities, attendance, notes] = await Promise.all([
        Task.find({ assignedEmployeeId: employee.id }).lean(),
        TaskAssignment.find({ assignedEmployeeId: employee.id }).lean(),
        Responsibility.find({ assignedEmployeeId: employee.id }).lean(),
        Attendance.find({ employeeId: employee.id }).sort({ date: -1 }).lean(),
        Note.find({ employeeId: employee.id }).sort({ createdAt: -1 }).lean(),
    ]);

    // Get task templates for assignments
    const templateIds = assignments.map(a => a.templateId);
    const templates = await TaskTemplate.find({ id: { $in: templateIds } }).lean();
    const templateMap = {};
    templates.forEach(t => { templateMap[t.id] = t; });

    // Enrich assignments with template data
    const enrichedAssignments = assignments.map(a => ({
        ...a,
        name: templateMap[a.templateId]?.name,
        description: templateMap[a.templateId]?.description,
        price: templateMap[a.templateId]?.price,
        factor: templateMap[a.templateId]?.factor,
        templateType: templateMap[a.templateId]?.type
    }));

    // Map database fields to frontend expected fields
    const mappedLegacyTasks = tasks.map(task => ({
        ...task,
        source: 'legacy',
        title: task.name,
        checkIn: task.checkInTime,
        checkOut: task.checkOutTime,
        totalHours: task.dailyHours
    }));

    const mappedAssignments = enrichedAssignments.map(task => ({
        ...task,
        id: `assign-${task.id}`, // Avoid ID collision with legacy tasks
        originalId: task.id,
        source: 'assignment',
        title: task.name,
        checkIn: null,
        checkOut: null,
        totalHours: 0
    }));

    const allTasks = [...mappedLegacyTasks, ...mappedAssignments].sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    );

    const mappedResponsibilities = responsibilities.map(resp => ({
        ...resp,
        title: resp.name
    }));

    const mappedAttendance = attendance.map(att => ({
        ...att,
        checkIn: att.checkInTime,
        checkOut: att.checkOutTime,
        totalHours: att.dailyHours || 0
    }));

    return {
        ...employee,
        assignedTasks: allTasks,
        assignedResponsibilities: mappedResponsibilities,
        attendanceRecords: mappedAttendance,
        notes,
    };
};

const listEmployees = async () => {
    const employees = await Employee.find().lean();
    return Promise.all(employees.map((e) => mapEmployeeDetails(e)));
};

const getEmployeeDetails = async (id) => {
    const employee = await Employee.findOne({ id }).lean();
    return mapEmployeeDetails(employee);
};

const createEmployee = async (payload) => {
    const {
        name,
        employeeType,
        username,
        email,
        password,
        baseSalary,
        monthlyFactor,
        overtimeFactor,
        requiredMonthlyHours,
        notes,
    } = payload;

    if (!name || !employeeType) {
        throw new Error('name and employeeType are required');
    }
    if (!username && !email) {
        throw new Error('username or email is required');
    }
    if (!password) {
        throw new Error('password is required');
    }

    const passwordHash = await hashPassword(password);

    const employee = await Employee.create({
        name,
        username,
        email,
        passwordHash,
        employeeType,
        baseSalary,
        monthlyFactor,
        overtimeFactor,
        requiredMonthlyHours,
        notes
    });

    return getEmployeeDetails(employee.id);
};

const updateEmployee = async (id, payload) => {
    const employee = await Employee.findOne({ id }).lean();
    if (!employee) {
        const error = new Error('Employee not found');
        error.status = 404;
        throw error;
    }

    const {
        name = employee.name,
        username = employee.username,
        email = employee.email,
        employeeType = employee.employeeType,
        baseSalary = employee.baseSalary,
        monthlyFactor = employee.monthlyFactor,
        overtimeFactor = employee.overtimeFactor,
        requiredMonthlyHours = employee.requiredMonthlyHours,
        normalHourRate = employee.normalHourRate,
        overtimeHourRate = employee.overtimeHourRate,
        hourlyRate = employee.hourlyRate,
        password,
    } = payload;

    // Handle notes separately - allow empty string to clear notes
    const notes = payload.hasOwnProperty('notes') ? payload.notes : employee.notes;

    let passwordHash = employee.passwordHash;
    if (password) {
        passwordHash = await hashPassword(password);
    }

    await Employee.updateOne(
        { id },
        {
            $set: {
                name,
                username,
                email,
                passwordHash,
                employeeType,
                baseSalary,
                monthlyFactor,
                overtimeFactor,
                requiredMonthlyHours,
                normalHourRate,
                overtimeHourRate,
                hourlyRate,
                notes
            }
        }
    );

    return getEmployeeDetails(id);
};

const deleteEmployee = async (id) => {
    await Task.deleteMany({ assignedEmployeeId: id });
    await Responsibility.deleteMany({ assignedEmployeeId: id });
    await Attendance.deleteMany({ employeeId: id });
    await Note.deleteMany({ employeeId: id });
    await Employee.deleteOne({ id });
    return { success: true };
};

module.exports = {
    listEmployees,
    getEmployeeDetails,
    createEmployee,
    updateEmployee,
    deleteEmployee,
};
