const { allAsync } = require('./source/Data/database');

async function checkActiveSessions() {
    try {
        const activeSessions = await allAsync(`
            SELECT * FROM attendance 
            WHERE checkOutTime IS NULL
            ORDER BY date DESC, checkInTime DESC
        `);

        console.log('Active Sessions:', JSON.stringify(activeSessions, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

checkActiveSessions();
