const { allAsync, getAsync, runAsync } = require('../Data/database');

const listResponsibilities = async (filters = {}) => {
  const conditions = [];
  const params = [];

  if (filters.employeeId) {
    conditions.push('assignedEmployeeId = ?');
    params.push(filters.employeeId);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const responsibilities = await allAsync(`SELECT * FROM responsibilities ${whereClause} ORDER BY id DESC`, params);
  // Map 'name' to 'title' for frontend compatibility
  return responsibilities.map(resp => ({ ...resp, title: resp.name }));
};

const createResponsibility = async (payload) => {
  // Accept both 'title' and 'name' for compatibility
  const name = payload.title || payload.name;
  const { description = '', monthlyPrice = 0, assignedEmployeeId, assignedBy = 'admin', status = 'Active', factor = 1 } =
    payload;

  if (!name || !assignedEmployeeId) {
    throw new Error('title and assignedEmployeeId are required');
  }

  const result = await runAsync(
    `INSERT INTO responsibilities (name, description, monthlyPrice, assignedEmployeeId, assignedBy, status, factor)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, description, monthlyPrice, assignedEmployeeId, assignedBy, status, factor]
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
