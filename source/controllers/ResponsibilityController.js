const { allAsync, getAsync, runAsync } = require('../Data/database');

const listResponsibilities = async (filters = {}) => {
  const conditions = [];
  const params = [];

  if (filters.employeeId) {
    conditions.push('assignedEmployeeId = ?');
    params.push(filters.employeeId);
  }

  if (filters.month) {
    conditions.push('month = ?');
    params.push(filters.month);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const responsibilities = await allAsync(
    `SELECT r.*, e.name as employeeName 
     FROM responsibilities r
     LEFT JOIN employees e ON r.assignedEmployeeId = e.id
     ${whereClause} 
     ORDER BY r.id DESC`,
    params
  );

  return responsibilities.map(resp => ({ ...resp, title: resp.name }));
};

const createResponsibility = async (payload) => {
  const dayjs = require('dayjs');
  const { name, description = '', monthlyPrice = 0, assignedEmployeeId, assignedBy, status = 'Active', factor = 1 } = payload;
  const month = payload.month || dayjs().format('YYYY-MM');

  if (!name || !assignedEmployeeId) {
    throw new Error('name and assignedEmployeeId are required');
  }

  const result = await runAsync(
    `INSERT INTO responsibilities (name, description, monthlyPrice, assignedEmployeeId, assignedBy, status, factor, month)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, description, monthlyPrice, assignedEmployeeId, assignedBy || 'Admin', status, factor, month]
  );

  const responsibility = await getAsync(`SELECT * FROM responsibilities WHERE id = ?`, [result.lastID]);
  return { ...responsibility, title: responsibility.name };
};

const updateResponsibility = async (id, payload) => {
  const responsibility = await getAsync(`SELECT * FROM responsibilities WHERE id = ?`, [id]);
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

  await runAsync(
    `UPDATE responsibilities
     SET name = ?, description = ?, monthlyPrice = ?, assignedEmployeeId = ?, assignedBy = ?, status = ?, factor = ?
     WHERE id = ?`,
    [updated.name, updated.description, updated.monthlyPrice, updated.assignedEmployeeId, updated.assignedBy, updated.status, updated.factor, id]
  );

  const updatedResp = await getAsync(`SELECT * FROM responsibilities WHERE id = ?`, [id]);
  return { ...updatedResp, title: updatedResp.name };
};

const deleteResponsibility = async (id) => {
  await runAsync(`DELETE FROM responsibilities WHERE id = ?`, [id]);
  return { success: true };
};

module.exports = {
  listResponsibilities,
  createResponsibility,
  updateResponsibility,
  deleteResponsibility,
};
