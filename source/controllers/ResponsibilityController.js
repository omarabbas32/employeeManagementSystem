const { Responsibility, Employee } = require('../Data/database');

const listResponsibilities = async (filters = {}) => {
  const query = {};

  if (filters.employeeId) {
    query.assignedEmployeeId = parseInt(filters.employeeId);
  }

  if (filters.month) {
    query.month = filters.month;
  }

  const responsibilities = await Responsibility.find(query).sort({ id: -1 }).lean();

  // Get employee names for each responsibility
  const employeeIds = [...new Set(responsibilities.map(r => r.assignedEmployeeId))];
  const employees = await Employee.find({ id: { $in: employeeIds } }).lean();
  const employeeMap = {};
  employees.forEach(e => { employeeMap[e.id] = e.name; });

  return responsibilities.map(resp => ({
    ...resp,
    title: resp.name,
    employeeName: employeeMap[resp.assignedEmployeeId] || null
  }));
};

const createResponsibility = async (payload) => {
  const dayjs = require('dayjs');
  const { name, description = '', monthlyPrice = 0, assignedEmployeeId, assignedBy, status = 'Active', factor = 1 } = payload;
  const month = payload.month || dayjs().format('YYYY-MM');

  if (!name || !assignedEmployeeId) {
    throw new Error('name and assignedEmployeeId are required');
  }

  const responsibility = await Responsibility.create({
    name,
    description,
    monthlyPrice,
    assignedEmployeeId,
    assignedBy: assignedBy || 'Admin',
    status,
    factor,
    month
  });

  return { ...responsibility.toObject(), title: responsibility.name };
};

const updateResponsibility = async (id, payload) => {
  const responsibility = await Responsibility.findOne({ id }).lean();
  if (!responsibility) {
    const error = new Error('Responsibility not found');
    error.status = 404;
    throw error;
  }

  const name = payload.title || payload.name;
  const updated = {
    name: name ?? responsibility.name,
    description: payload.description ?? responsibility.description,
    monthlyPrice: payload.monthlyPrice ?? responsibility.monthlyPrice,
    assignedEmployeeId: payload.assignedEmployeeId ?? responsibility.assignedEmployeeId,
    assignedBy: payload.assignedBy ?? responsibility.assignedBy,
    status: payload.status ?? responsibility.status,
    factor: payload.factor ?? responsibility.factor,
  };

  await Responsibility.updateOne({ id }, { $set: updated });

  const updatedResp = await Responsibility.findOne({ id }).lean();
  return { ...updatedResp, title: updatedResp.name };
};

const deleteResponsibility = async (id) => {
  await Responsibility.deleteOne({ id });
  return { success: true };
};

module.exports = {
  listResponsibilities,
  createResponsibility,
  updateResponsibility,
  deleteResponsibility,
};
