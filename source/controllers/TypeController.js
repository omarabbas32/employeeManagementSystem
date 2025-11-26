const { allAsync, runAsync } = require('../Data/database');

const listTypes = () => allAsync(`SELECT * FROM employee_types ORDER BY name ASC`);

const createType = async ({ name, description = '', privileges = 'employee' }) => {
  if (!name) {
    throw new Error('name is required');
  }

  await runAsync(`INSERT INTO employee_types (name, description, privileges) VALUES (?, ?, ?)`, [
    name,
    description,
    privileges,
  ]);

  return listTypes();
};

const deleteType = async (id) => {
  await runAsync(`DELETE FROM employee_types WHERE id = ?`, [id]);
  return { success: true };
};

module.exports = {
  listTypes,
  createType,
  deleteType,
};

