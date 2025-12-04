const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'source', 'Data', 'employees.db');
const db = new sqlite3.Database(dbPath);

const runQuery = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const runUpdate = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

async function main() {
    console.log('🗑️  DELETING ALL TASK TEMPLATES\n');

    // Show current templates
    const templates = await runQuery('SELECT * FROM task_templates');
    console.log('📋 Current templates:', templates.length);

    if (templates.length === 0) {
        console.log('   No templates to delete.\n');
        db.close();
        return;
    }

    templates.forEach(t => {
        console.log(`   ID: ${t.id} | Name: ${t.name || '(empty)'} | Price: ${t.price}`);
    });

    console.log('\n🔥 Deleting ALL templates...\n');

    // Delete all templates
    const result = await runUpdate('DELETE FROM task_templates');

    console.log(`✅ Successfully deleted ${templates.length} templates!\n`);

    // Verify deletion
    const remaining = await runQuery('SELECT * FROM task_templates');
    console.log('📊 Remaining templates:', remaining.length);

    if (remaining.length === 0) {
        console.log('✅ All templates have been deleted from the database.\n');
    }

    db.close();
}

main().catch(err => {
    console.error('❌ Error:', err.message);
    db.close();
    process.exit(1);
});
