const { Announcement } = require('../Data/database');

// Get all announcements
const getAllAnnouncements = async () => {
    return await Announcement.find().sort({ createdAt: -1 }).lean();
};

// Create announcement
const createAnnouncement = async (payload) => {
    const { title, content, authorId, authorName, authorRole } = payload;

    if (!title || !content || !authorId || !authorName || !authorRole) {
        throw new Error('Title, content, and author information are required');
    }

    const announcement = await Announcement.create({
        title,
        content,
        authorId,
        authorName,
        authorRole
    });

    return announcement.toObject();
};

// Delete announcement
const deleteAnnouncement = async (id, userId, userRole) => {
    console.log('DELETE DEBUG: id=', id, 'userId=', userId, 'userRole=', userRole);

    // Try to find announcement by numeric id first, then by _id
    let announcement = await Announcement.findOne({ id }).lean();

    if (!announcement && typeof id === 'string' && id.length === 24) {
        // Try finding by MongoDB _id
        announcement = await Announcement.findById(id).lean();
    }

    console.log('DELETE DEBUG: Found announcement=', announcement);

    if (!announcement) {
        const error = new Error('Announcement not found');
        error.status = 404;
        throw error;
    }

    // Admin can delete any announcement
    // Manager can only delete their own
    if (userRole !== 'Admin' && announcement.authorId !== userId) {
        console.log('DELETE DEBUG: Permission denied. userRole=', userRole, 'authorId=', announcement.authorId, 'userId=', userId);
        const error = new Error('You can only delete your own announcements');
        error.status = 403;
        throw error;
    }

    console.log('DELETE DEBUG: Deleting announcement with id=', id);

    // Delete by numeric id if it exists, otherwise by _id
    if (announcement.id) {
        await Announcement.deleteOne({ id: announcement.id });
    } else {
        await Announcement.deleteOne({ _id: announcement._id });
    }

    return { success: true };
};

module.exports = {
    getAllAnnouncements,
    createAnnouncement,
    deleteAnnouncement,
};
