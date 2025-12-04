const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'source', 'Data', 'employees.db');
const db = new sqlite3.Database(dbPath);

// Helper function to run queries
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
    console.log('🔍 Task Templates Database Manager\n');

    // Show all templates
    console.log('📋 Current Task Templates:');
    const templates = await runQuery('SELECT * FROM task_templates');

    if (templates.length === 0) {
        console.log('   No templates found.');
    } else {
        templates.forEach(t => {
            console.log(`   ID: ${t.id} | Name: ${t.name} | Price: ${t.price} | Active: ${t.isActive ? 'Yes' : 'No'}`);
        });
    }

    console.log('\n📊 Total templates:', templates.length);

    // Check for assignments
    const assignments = await runQuery('SELECT templateId, COUNT(*) as count FROM task_assignments GROUP BY templateId');
    if (assignments.length > 0) {
        console.log('\n⚠️  Templates with assignments:');
        assignments.forEach(a => {
            const template = templates.find(t => t.id === a.templateId);
            console.log(`   ID: ${a.templateId} | Name: ${template?.name || 'Unknown'} | Assignments: ${a.count}`);
        });
    }

    console.log('\n' + '='.repeat(60));
    console.log('💡 HOW TO DELETE TEMPLATES:');
    console.log('='.repeat(60));
    console.log('\n1. Delete a specific template by ID:');
    console.log('   Uncomment line 60 and set the ID, then run: node delete_templates.js\n');
    console.log('2. Delete all inactive templates:');
    console.log('   Uncomment line 63, then run: node delete_templates.js\n');
    console.log('3. Delete ALL templates (DANGEROUS):');
    console.log('   Uncomment line 66, then run: node delete_templates.js\n');

    // UNCOMMENT ONE OF THESE LINES TO DELETE:

    // Delete specific template by ID (change the ID number)
    // await runUpdate('DELETE FROM task_templates WHERE id = ?', [1]);

    // Delete all inactive templates
    // await runUpdate('DELETE FROM task_templates WHERE isActive = 0');

    // Delete ALL templates (WARNING: This deletes everything!)
    // await runUpdate('DELETE FROM task_templates');

    console.log('✅ Done! Re-run this script to see updated templates.\n');

    db.close();
}

main().catch(err => {
    console.error('❌ Error:', err.message);
    db.close();
    process.exit(1);
});
