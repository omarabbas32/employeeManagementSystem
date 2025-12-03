const { allAsync, runAsync, getAsync } = require('../Data/database');

// Initialize announcements table
async function initializeAnnouncementsTable() {
    await runAsync(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      authorId INTEGER NOT NULL,
      authorName TEXT NOT NULL,
      authorRole TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (authorId) REFERENCES employees(id) ON DELETE CASCADE
    )
  `);
}

// Get all announcements
const getAllAnnouncements = async () => {
    return await allAsync(
        `SELECT * FROM announcements ORDER BY createdAt DESC`
    );
};

// Create announcement
const createAnnouncement = async (payload) => {
    const { title, content, authorId, authorName, authorRole } = payload;

    if (!title || !content || !authorId || !authorName || !authorRole) {
        throw new Error('Title, content, and author information are required');
    }

    const result = await runAsync(
        `INSERT INTO announcements (title, content, authorId, authorName, authorRole)
     VALUES (?, ?, ?, ?, ?)`,
        [title, content, authorId, authorName, authorRole]
    );

    return await getAsync(
        `SELECT * FROM announcements WHERE id = ?`,
        [result.lastID]
    );
};

// Delete announcement
const deleteAnnouncement = async (id, userId, userRole) => {
    // Get the announcement to check ownership
    const announcement = await getAsync(
        `SELECT * FROM announcements WHERE id = ?`,
        [id]
    );

    if (!announcement) {
        const error = new Error('Announcement not found');
        error.status = 404;
        throw error;
    }

    // Admin can delete any announcement
    // Manager can only delete their own
    if (userRole !== 'Admin' && announcement.authorId !== userId) {
        const error = new Error('You can only delete your own announcements');
        error.status = 403;
        throw error;
    }

    await runAsync(`DELETE FROM announcements WHERE id = ?`, [id]);
    return { success: true };
};

module.exports = {
    initializeAnnouncementsTable,
    getAllAnnouncements,
    createAnnouncement,
    deleteAnnouncement,
};
