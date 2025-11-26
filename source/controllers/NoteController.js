const { runAsync, allAsync, getAsync } = require('../Data/database');

const addNote = async ({ employeeId, content, author = 'admin', visibility = 'admin' }) => {
  if (!employeeId || !content) {
    throw new Error('employeeId and content are required');
  }

  const result = await runAsync(
    `INSERT INTO notes (employeeId, content, author, visibility) VALUES (?, ?, ?, ?)`,
    [employeeId, content, author, visibility]
  );

  return getAsync(`SELECT * FROM notes WHERE id = ?`, [result.lastID]);
};

const listNotes = (employeeId) => {
  if (!employeeId) {
    throw new Error('employeeId is required');
  }
  return allAsync(`SELECT * FROM notes WHERE employeeId = ? ORDER BY createdAt DESC`, [employeeId]);
};

const deleteNote = async (id) => {
  await runAsync(`DELETE FROM notes WHERE id = ?`, [id]);
  return { success: true };
};

module.exports = {
  addNote,
  listNotes,
  deleteNote,
};

