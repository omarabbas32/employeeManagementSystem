// Fix script for analytics.html and payroll.html
// This script will fix the undefined property access errors

const fs = require('fs');
const path = require('path');

// Fix analytics.html
const analyticsPath = path.join(__dirname, 'public', 'admin', 'analytics.html');
let analyticsContent = fs.readFileSync(analyticsPath, 'utf8');

// Replace the problematic monthly stats section
const analyticsOld = `              <p><strong>Total Hours:</strong> \${salaryData.attendance.totalHours}</p>
              <p><strong>Normal Hours:</strong> \${salaryData.attendance.normalHours}</p>
              <p><strong>Overtime Hours:</strong> \${salaryData.attendance.overtimeHours}</p>
            </div>
            <div>
              <h4>Tasks</h4>
              <p><strong>Completed:</strong> \${salaryData.tasks.completed}</p>
              <p><strong>Earnings:</strong> \${utils.formatCurrency(salaryData.tasks.totalEarnings)}</p>
            </div>
            <div>
              <h4>Responsibilities</h4>
              <p><strong>Count:</strong> \${salaryData.responsibilities.count}</p>
              <p><strong>Earnings:</strong> \${utils.formatCurrency(salaryData.responsibilities.totalEarnings)}</p>`;

const analyticsNew = `              <p><strong>Total Hours:</strong> \${salaryData.attendance?.totalHours || 0}</p>
              <p><strong>Hourly Rate:</strong> $\${salaryData.attendance?.hourlyRate || 0}</p>
              <p><strong>Working Hours Pay:</strong> \${utils.formatCurrency(salaryData.attendance?.workingHoursPay || 0)}</p>`;

analyticsContent = analyticsContent.replace(analyticsOld, analyticsNew);
fs.writeFileSync(analyticsPath, analyticsContent, 'utf8');

console.log('✅ Fixed analytics.html');

// Fix payroll.html  
const payrollPath = path.join(__dirname, 'public', 'admin', 'payroll.html');
let payrollContent = fs.readFileSync(payrollPath, 'utf8');

const payrollOld = `                // Get detailed salary info for each employee to get task counts and attendance data
                const detailedData = await Promise.all(
                    payrollData.map(emp => api.getSalary(emp.employeeId, { month: selectedMonth }))
                );

                // Merge task and attendance data
                payrollData = payrollData.map((emp, index) => ({
                    ...emp,
                    tasksCompleted: detailedData[index].tasks.completed,
                    deductionsTotal: detailedData[index].deductions.total,
                    attendance: detailedData[index].attendance  // Include full attendance data
                }));`;

const payrollNew = `                // Get detailed salary info for each employee
                const detailedData = await Promise.all(
                    payrollData.map(async emp => {
                        const salaryData = await api.getSalary(emp.employeeId, { month: selectedMonth });
                        const tasks = await api.getTaskAssignments({ employeeId: emp.employeeId });
                        const completedTasks = tasks.filter(t => t.status === 'Completed' || t.status === 'Done').length;
                        return { salaryData, tasksCompleted: completedTasks };
                    })
                );

                // Merge task and attendance data
                payrollData = payrollData.map((emp, index) => ({
                    ...emp,
                    tasksCompleted: detailedData[index].tasksCompleted || 0,
                    deductionsTotal: detailedData[index].salaryData.deductions?.total || 0,
                    attendance: detailedData[index].salaryData.attendance || { totalHours: 0, overtimeHours: 0 }
                }));`;

payrollContent = payrollContent.replace(payrollOld, payrollNew);
fs.writeFileSync(payrollPath, payrollContent, 'utf8');

console.log('✅ Fixed payroll.html');
console.log('✅ All fixes applied successfully!');
