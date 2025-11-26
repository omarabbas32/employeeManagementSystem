// Migration script to set type='task' for existing records
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'employees.db');
const db = new sqlite3.Database(dbPath);

console.log('Starting migration...');

db.serialize(() => {
    // Update task_templates
    db.run(`UPDATE task_templates SET type = 'task' WHERE type IS NULL OR type = ''`, function (err) {
        if (err) {
            console.error('Error updating task_templates:', err);
        } else {
            console.log(`✅ Updated ${this.changes} task templates`);
        }
    });

    // Update task_assignments
    db.run(`UPDATE task_assignments SET type = 'task' WHERE type IS NULL OR type = ''`, function (err) {
        if (err) {
            console.error('Error updating task_assignments:', err);
        } else {
            console.log(`✅ Updated ${this.changes} task assignments`);
        }
    });

    // Verify the changes
    db.all(`SELECT type, COUNT(*) as count FROM task_templates GROUP BY type`, (err, rows) => {
        if (!err) {
            console.log('\nTask Templates by type:');
            rows.forEach(row => console.log(`  ${row.type || 'NULL'}: ${row.count}`));
        }
    });

    db.all(`SELECT type, COUNT(*) as count FROM task_assignments GROUP BY type`, (err, rows) => {
        if (!err) {
            console.log('\nTask Assignments by type:');
            rows.forEach(row => console.log(`  ${row.type || 'NULL'}: ${row.count}`));
        }

        console.log('\n✅ Migration completed!');
        db.close();
    });
});
