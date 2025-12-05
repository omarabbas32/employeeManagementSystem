const { Employee, Task, TaskTemplate, TaskAssignment, Responsibility, Attendance, Note } = require('../Data/database');
const { hashPassword } = require('../utils/password');

// Helper to safely find employee by ID (handles both numeric id and MongoDB _id)
const findEmployeeById = async (id) => {
  // Try numeric ID first
  const numericId = parseInt(id);
  if (!isNaN(numericId)) {
    const employee = await Employee.findOne({ id: numericId }).lean();
    if (employee) return employee;
  }

  // Try MongoDB ObjectId if valid (must be 24 char hex string)
  if (typeof id === 'string' && id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)) {
    try {
      return await Employee.findById(id).lean();
    } catch (err) {
      // Invalid ObjectId, return null
      return null;
    }
  }

  return null;
};

const mapEmployeeDetails = async (employee) => {
  if (!employee) {
    return null;
  }

  const employeeId = employee.id || employee._id;

  const [tasks, assignments, responsibilities, attendance, notes] = await Promise.all([
    Task.find({ assignedEmployeeId: employeeId }).lean(),
    TaskAssignment.aggregate([
      { $match: { assignedEmployeeId: employeeId } },
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
        $project: {
          id: 1,
          templateId: 1,
          assignedEmployeeId: 1,
          assignedBy: 1,
          type: 1,
          status: 1,
          startDate: 1,
          dueDate: 1,
          createdAt: 1,
          completedAt: 1,
          completedMonth: 1,
          name: '$template.name',
          description: '$template.description',
          price: '$template.price',
          factor: '$template.factor',
          templateType: '$template.type'
        }
      }
    ]),
    Responsibility.find({ assignedEmployeeId: employeeId }).lean(),
    Attendance.find({ employeeId: employeeId }).sort({ date: -1 }).lean(),
    Note.find({ employeeId: employeeId }).sort({ createdAt: -1 }).lean(),
  ]);

  // Map database fields to frontend expected fields
  const mappedLegacyTasks = tasks.map(task => ({
    ...task,
    source: 'legacy',
    title: task.name,
    checkIn: task.checkInTime,
    checkOut: task.checkOutTime,
    totalHours: task.dailyHours
  }));

  const mappedAssignments = assignments.map(task => ({
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
    id: employee.id || employee._id,
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
  const employee = await findEmployeeById(id);
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
  const employee = await findEmployeeById(id);
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

  const updateData = {
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
  };

  // Update using the numeric id field
  await Employee.updateOne({ id: employee.id }, { $set: updateData });

  return getEmployeeDetails(id);
};

const deleteEmployee = async (id) => {
  const employee = await findEmployeeById(id);
  if (!employee) {
    const error = new Error('Employee not found');
    error.status = 404;
    throw error;
  }

  const employeeIdNum = employee.id;

  await Task.deleteMany({ assignedEmployeeId: employeeIdNum });
  await TaskAssignment.deleteMany({ assignedEmployeeId: employeeIdNum });
  await Responsibility.deleteMany({ assignedEmployeeId: employeeIdNum });
  await Attendance.deleteMany({ employeeId: employeeIdNum });
  await Note.deleteMany({ employeeId: employeeIdNum });
  await Employee.deleteOne({ id: employeeIdNum });

  return { success: true };
};

module.exports = {
  listEmployees,
  getEmployeeDetails,
  createEmployee,
  updateEmployee,
  deleteEmployee,
};
