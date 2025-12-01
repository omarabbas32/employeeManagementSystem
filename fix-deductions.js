const fs = require('fs');

const filePath = './public/admin/deductions.html';
let content = fs.readFileSync(filePath, 'utf8');

// First apply the employee name fix
content = content.replace(
    /const employee = deduction\.employeeId \? employees\.find\(e => e\.id === deduction\.employeeId\) : null;\r?\n\s*/g,
    ''
);

content = content.replace(
    /employee \? utils\.escapeHtml\(employee\.name\)/g,
    'deduction.employeeName ? utils.escapeHtml(deduction.employeeName)'
);

// Remove the Edit button line
content = content.replace(
    /\s*<button class="btn btn-sm btn-secondary" onclick="openEditDeductionModal\(\$\{row\.id\}\)">Edit<\/button>\r?\n/g,
    ''
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Fixed deductions.html:');
console.log('   - Employee names will now display correctly');
console.log('   - Removed Edit button');
