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
    console.log('🗑️  Deleting Templates WITHOUT Assignments\n');

    // Get templates that have NO assignments
    const templatesWithAssignments = await runQuery(
        'SELECT DISTINCT templateId FROM task_assignments'
    );
    const assignedIds = templatesWithAssignments.map(t => t.templateId);

    // Get all templates
    const allTemplates = await runQuery('SELECT * FROM task_templates');

    // Find templates without assignments
    const safeToDelete = allTemplates.filter(t => !assignedIds.includes(t.id));

    if (safeToDelete.length === 0) {
        console.log('❌ No templates found that can be safely deleted.');
        console.log('   All templates have assignments linked to them.\n');
    } else {
        console.log('✅ Found', safeToDelete.length, 'templates that can be safely deleted:\n');
        safeToDelete.forEach(t => {
            console.log(`   ID: ${t.id} | Name: ${t.name || '(empty)'} | Price: ${t.price}`);
        });

        console.log('\n🔥 Deleting these templates...\n');

        for (const template of safeToDelete) {
            await runUpdate('DELETE FROM task_templates WHERE id = ?', [template.id]);
            console.log(`   ✓ Deleted template ID ${template.id}`);
        }

        console.log('\n✅ Successfully deleted', safeToDelete.length, 'templates!\n');
    }

    // Show remaining templates
    const remaining = await runQuery('SELECT * FROM task_templates');
    console.log('📊 Remaining templates:', remaining.length);
    if (remaining.length > 0) {
        remaining.forEach(t => {
            console.log(`   ID: ${t.id} | Name: ${t.name || '(empty)'} | Price: ${t.price}`);
        });
    }

    db.close();
}

main().catch(err => {
    console.error('❌ Error:', err.message);
    db.close();
    process.exit(1);
});
