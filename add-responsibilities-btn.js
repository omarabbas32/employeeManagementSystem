const fs = require('fs');

const filePath = './public/employee/dashboard.html';
let content = fs.readFileSync(filePath, 'utf8');

// Change grid-3 to grid-4 to accommodate 4 buttons
content = content.replace(
    '<div class="grid grid-3 gap-2">',
    '<div class="grid grid-4 gap-2">'
);

// Add the Responsibilities button after My Tasks button
content = content.replace(
    /(<a href="tasks\.html" class="btn btn-primary">[\s\S]*?<\/a>)/,
    `$1
                        <a href="responsibilities.html" class="btn btn-primary">
                            <i class="fas fa-user-tie"></i> Responsibilities
                        </a>`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Added Responsibilities button to employee dashboard');
