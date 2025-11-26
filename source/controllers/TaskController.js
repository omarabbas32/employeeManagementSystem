const { allAsync, getAsync, runAsync } = require('../Data/database');

const listTasks = (filters = {}) => {
  const conditions = [];
  const params = [];

  if (filters.employeeId) {
    conditions.push('assignedEmployeeId = ?');
    params.push(filters.employeeId);
  }

  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return allAsync(`SELECT * FROM tasks ${whereClause} ORDER BY id DESC`, params);
};

const createTask = async (payload) => {
  const { name, description = '', price = 0, assignedEmployeeId, assignedBy, status = 'Not Done', startDate, dueDate, factor } =
    payload;

  if (!name || !assignedEmployeeId) {
    throw new Error('name and assignedEmployeeId are required');
  }

  const result = await runAsync(
    `INSERT INTO tasks (name, description, price, assignedEmployeeId, assignedBy, status, startDate, dueDate, factor)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, description, price, assignedEmployeeId, assignedBy || 'managerial', status, startDate, dueDate, factor]
  );

  return getAsync(`SELECT * FROM tasks WHERE id = ?`, [result.lastID]);
};

const updateTask = async (id, payload) => {
  const task = await getAsync(`SELECT * FROM tasks WHERE id = ?`, [id]);
  if (!task) {
    const error = new Error('Task not found');
    error.status = 404;
    throw error;
  }

  const updatedTask = {
    name: payload.name ?? task.name,
    description: payload.description ?? task.description,
    price: payload.price ?? task.price,
    assignedEmployeeId: payload.assignedEmployeeId ?? task.assignedEmployeeId,
    assignedBy: payload.assignedBy ?? task.assignedBy,
    status: payload.status ?? task.status,
    startDate: payload.startDate ?? task.startDate,
    dueDate: payload.dueDate ?? task.dueDate,
    factor: payload.factor ?? task.factor,
  };

  await runAsync(
    `UPDATE tasks SET
      name = ?, description = ?, price = ?, assignedEmployeeId = ?, assignedBy = ?, status = ?,
      startDate = ?, dueDate = ?, factor = ?
     WHERE id = ?`,
    [
      updatedTask.name,
      updatedTask.description,
      updatedTask.price,
      updatedTask.assignedEmployeeId,
      updatedTask.assignedBy,
      updatedTask.status,
      updatedTask.startDate,
      updatedTask.dueDate,
      updatedTask.factor,
      id,
    ]
  );

  return getAsync(`SELECT * FROM tasks WHERE id = ?`, [id]);
};

const deleteTask = async (id) => {
  await runAsync(`DELETE FROM tasks WHERE id = ?`, [id]);
  return { success: true };
};

module.exports = {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
};

