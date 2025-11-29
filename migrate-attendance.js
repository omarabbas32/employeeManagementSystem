// Migration script to remove UNIQUE constraint from attendance table
// This allows multiple check-in/check-out sessions per day

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'source', 'Data', 'employees.db');
const db = new sqlite3.Database(dbPath);

const runAsync = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });

const allAsync = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });

async function migrate() {
    try {
        console.log('🔄 Starting migration: Remove UNIQUE constraint from attendance table...');

        // Step 1: Get all existing attendance data
        const existingData = await allAsync('SELECT * FROM attendance');
        console.log(`📊 Found ${existingData.length} existing attendance records`);

        // Step 2: Drop the old table
        await runAsync('DROP TABLE IF EXISTS attendance_old');
        await runAsync('ALTER TABLE attendance RENAME TO attendance_old');
        console.log('✅ Renamed old table to attendance_old');

        // Step 3: Create new table WITHOUT unique constraint
        await runAsync(`
      CREATE TABLE attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employeeId INTEGER NOT NULL,
        date TEXT NOT NULL,
        checkInTime TEXT,
        checkOutTime TEXT,
        dailyHours REAL DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(employeeId) REFERENCES employees(id)
      )
    `);
        console.log('✅ Created new attendance table without UNIQUE constraint');

        // Step 4: Create index (non-unique) for performance
        await runAsync('CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employeeId, date)');
        console.log('✅ Created non-unique index');

        // Step 5: Copy data from old table to new table
        if (existingData.length > 0) {
            for (const record of existingData) {
                await runAsync(
                    `INSERT INTO attendance (id, employeeId, date, checkInTime, checkOutTime, dailyHours, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        record.id,
                        record.employeeId,
                        record.date,
                        record.checkInTime,
                        record.checkOutTime,
                        record.dailyHours || 0,
                        record.createdAt
                    ]
                );
            }
            console.log(`✅ Migrated ${existingData.length} records to new table`);
        }

        // Step 6: Drop old table
        await runAsync('DROP TABLE attendance_old');
        console.log('✅ Dropped old table');

        console.log('');
        console.log('✅ Migration completed successfully!');
        console.log('✅ Multiple check-ins per day are now enabled');
        console.log('✅ Attendance code requirement has been removed');

        db.close();
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        db.close();
        process.exit(1);
    }
}

migrate();
