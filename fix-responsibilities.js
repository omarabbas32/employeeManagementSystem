const fs = require('fs');

// Fix 1: Update ResponsibilityController to return employeeName
const controllerPath = './source/controllers/ResponsibilityController.js';
let controllerContent = fs.readFileSync(controllerPath, 'utf8');

// Update listResponsibilities to include employee name via JOIN
controllerContent = controllerContent.replace(
    /const whereClause = conditions\.length \? `WHERE \$\{conditions\.join\(' AND '\)\}` : '';[\r\n\s]+const responsibilities = await allAsync\(`SELECT \* FROM responsibilities \$\{whereClause\} ORDER BY id DESC`, params\);/,
    `const whereClause = conditions.length ? \`WHERE \${conditions.join(' AND ')}\` : '';
  const responsibilities = await allAsync(
    \`SELECT r.*, e.name as employeeName 
     FROM responsibilities r
     LEFT JOIN employees e ON r.assignedEmployeeId = e.id
     \${whereClause} 
     ORDER BY r.id DESC\`,
    params
  );`
);

fs.writeFileSync(controllerPath, controllerContent, 'utf8');
console.log('✅ Fixed ResponsibilityController.js - now returns employeeName');

// Fix 2: Update responsibilities.html to use employeeName
const htmlPath = './public/admin/responsibilities.html';
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Replace employee lookup with direct use of employeeName
htmlContent = htmlContent.replace(
    /const employee = employees\.find\(e => e\.id === resp\.assignedEmployeeId\);[\r\n\s]+return \{[\r\n\s]+data: \[[\r\n\s]+utils\.escapeHtml\(resp\.title\),[\r\n\s]+utils\.escapeHtml\(resp\.description \|\| '-'\),[\r\n\s]+employee \? utils\.escapeHtml\(employee\.name\) : 'Unknown',/,
    `return {
                    data: [
                        utils.escapeHtml(resp.title),
                        utils.escapeHtml(resp.description || '-'),
                        resp.employeeName ? utils.escapeHtml(resp.employeeName) : 'Unknown',`
);

fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('✅ Fixed responsibilities.html - now uses employeeName from API');

console.log('\n📝 Summary:');
console.log('   - ResponsibilityController now includes employee name via SQL JOIN');
console.log('   - responsibilities.html now displays employee names correctly');
