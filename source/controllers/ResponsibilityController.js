const { allAsync, getAsync, runAsync } = require('../Data/database');

const listResponsibilities = (filters = {}) => {
  const conditions = [];
  const params = [];

  if (filters.employeeId) {
    conditions.push('assignedEmployeeId = ?');
    params.push(filters.employeeId);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return allAsync(`SELECT * FROM responsibilities ${whereClause} ORDER BY id DESC`, params);
};

const createResponsibility = async (payload) => {
  const { name, description = '', monthlyPrice = 0, assignedEmployeeId, assignedBy = 'admin', status = 'Not Done', factor } =
    payload;

  if (!name || !assignedEmployeeId) {
    throw new Error('name and assignedEmployeeId are required');
  }

  const result = await runAsync(
    `INSERT INTO responsibilities (name, description, monthlyPrice, assignedEmployeeId, assignedBy, status, factor)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, description, monthlyPrice, assignedEmployeeId, assignedBy, status, factor]
  );

  return getAsync(`SELECT * FROM responsibilities WHERE id = ?`, [result.lastID]);
};

const updateResponsibility = async (id, payload) => {
  const responsibility = await getAsync(`SELECT * FROM responsibilities WHERE id = ?`, [id]);
  if (!responsibility) {
    const error = new Error('Responsibility not found');
    error.status = 404;
    throw error;
  }

  const updated = {
    name: payload.name ?? responsibility.name,
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

  return getAsync(`SELECT * FROM responsibilities WHERE id = ?`, [id]);
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

