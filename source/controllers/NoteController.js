const { Note } = require('../Data/database');

const addNote = async ({ employeeId, content, author = 'admin', visibility = 'admin' }) => {
  if (!employeeId || !content) {
    throw new Error('employeeId and content are required');
  }

  const note = await Note.create({
    employeeId,
    content,
    author,
    visibility
  });

  return note.toObject();
};

const listNotes = async (employeeId) => {
  if (!employeeId) {
    throw new Error('employeeId is required');
  }
  return Note.find({ employeeId }).sort({ createdAt: -1 }).lean();
};

const deleteNote = async (id) => {
  await Note.deleteOne({ id });
  return { success: true };
};

module.exports = {
  addNote,
  listNotes,
  deleteNote,
};
