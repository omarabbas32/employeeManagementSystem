require('dotenv').config();
const bcrypt = require('bcryptjs');
const { initDatabase, runAsync, getAsync } = require('./source/Data/database');

async function createAdminUser() {
    try {
        await initDatabase();

        // Check if admin already exists
        const existingAdmin = await getAsync(
            `SELECT * FROM employees WHERE employeeType = 'Admin' LIMIT 1`
        );

        if (existingAdmin) {
            console.log('✅ Admin user already exists:');
            console.log(`   Username: ${existingAdmin.username}`);
            console.log(`   Email: ${existingAdmin.email}`);
            console.log(`   Name: ${existingAdmin.name}`);
            console.log('\n💡 Use these credentials to login at: http://localhost:3000/public/index.html');
            process.exit(0);
        }

        // Create new admin user
        const adminData = {
            name: 'System Admin',
            username: 'admin',
            email: 'admin@example.com',
            password: 'admin123', // Change this after first login!
            employeeType: 'Admin',
            baseSalary: 0,
            monthlyFactor: 1,
            overtimeFactor: 1,
            requiredMonthlyHours: 160,
            normalHourRate: 15,
            overtimeHourRate: 22.5
        };

        const passwordHash = await bcrypt.hash(adminData.password, 10);

        await runAsync(
            `INSERT INTO employees (name, username, email, passwordHash, employeeType, baseSalary, monthlyFactor, overtimeFactor, requiredMonthlyHours, normalHourRate, overtimeHourRate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                adminData.name,
                adminData.username,
                adminData.email,
                passwordHash,
                adminData.employeeType,
                adminData.baseSalary,
                adminData.monthlyFactor,
                adminData.overtimeFactor,
                adminData.requiredMonthlyHours,
                adminData.normalHourRate,
                adminData.overtimeHourRate
            ]
        );

        console.log('✅ Admin user created successfully!');
        console.log('\n📋 Login Credentials:');
        console.log(`   Username: ${adminData.username}`);
        console.log(`   Password: ${adminData.password}`);
        console.log('\n🌐 Login URL: http://localhost:3000/public/index.html');
        console.log('\n⚠️  IMPORTANT: Change the password after first login!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating admin user:', error);
        process.exit(1);
    }
}

createAdminUser();
