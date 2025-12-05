const { Task } = require('../Data/database');

const listTasks = async (filters = {}) => {
  const query = {};

  if (filters.employeeId) {
    query.assignedEmployeeId = parseInt(filters.employeeId);
  }

  if (filters.status) {
    query.status = filters.status;
  }

  const tasks = await Task.find(query).sort({ id: -1 }).lean();
  // Map 'name' to 'title' for frontend compatibility
  return tasks.map(task => ({ ...task, title: task.name }));
};

const createTask = async (payload) => {
  // Accept both 'title' and 'name' for compatibility
  const name = payload.title || payload.name;
  const { description = '', price = 0, assignedEmployeeId, assignedBy, status = 'Pending', startDate, dueDate, factor = 1 } =
    payload;

  if (!name || !assignedEmployeeId) {
    throw new Error('title and assignedEmployeeId are required');
  }

  const task = await Task.create({
    name,
    description,
    price,
    assignedEmployeeId,
    assignedBy: assignedBy || 'managerial',
    status,
    startDate,
    dueDate,
    factor
  });

  // Return with 'title' field for frontend compatibility
  return { ...task.toObject(), title: task.name };
};

const updateTask = async (id, payload) => {
  const task = await Task.findOne({ id }).lean();
  if (!task) {
    const error = new Error('Task not found');
    error.status = 404;
    throw error;
  }

  const name = payload.title || payload.name;
  const updatedTask = {
    name: name ?? task.name,
    description: payload.description ?? task.description,
    price: payload.price ?? task.price,
    assignedEmployeeId: payload.assignedEmployeeId ?? task.assignedEmployeeId,
    assignedBy: payload.assignedBy ?? task.assignedBy,
    status: payload.status ?? task.status,
    startDate: payload.startDate ?? task.startDate,
    dueDate: payload.dueDate ?? task.dueDate,
    factor: payload.factor ?? task.factor,
  };

  await Task.updateOne({ id }, { $set: updatedTask });

  const updated = await Task.findOne({ id }).lean();
  return { ...updated, title: updated.name };
};

const deleteTask = async (id) => {
  await Task.deleteOne({ id });
  return { success: true };
};

module.exports = {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
};
