const { EmployeeType } = require('../Data/database');

const listTypes = () => EmployeeType.find().sort({ name: 1 }).lean();

const createType = async ({ name, description = '', privileges = 'employee' }) => {
  if (!name) {
    throw new Error('name is required');
  }

  await EmployeeType.create({
    name,
    description,
    privileges
  });

  return listTypes();
};

const deleteType = async (id) => {
  await EmployeeType.deleteOne({ id });
  return { success: true };
};

module.exports = {
  listTypes,
  createType,
  deleteType,
};
