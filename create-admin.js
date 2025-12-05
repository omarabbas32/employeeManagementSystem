require('dotenv').config();
const bcrypt = require('bcryptjs');
const { initDatabase, Employee } = require('./source/Data/database');

async function createAdminUser() {
    try {
        await initDatabase();

        // Check if admin already exists
        const existingAdmin = await Employee.findOne({ employeeType: 'Admin' }).lean();

        if (existingAdmin) {
            console.log('✅ Admin user already exists:');
            console.log(`   Username: ${existingAdmin.username}`);
            console.log(`   Email: ${existingAdmin.email}`);
            console.log(`   Name: ${existingAdmin.name}`);
            console.log('\n💡 Use these credentials to login at: http://localhost:3000');
            process.exit(0);
        }

        // Create new admin user
        const adminData = {
            name: ' Administrator',
            username: 'admin1',
            email: 'admin1@example.com',
            password: '123456', // Change this after first login!
            employeeType: 'Admin',
            baseSalary: 0,
            monthlyFactor: 1,
            overtimeFactor: 1,
            requiredMonthlyHours: 160,
            normalHourRate: 15,
            overtimeHourRate: 22.5
        };

        const passwordHash = await bcrypt.hash(adminData.password, 10);

        await Employee.create({
            name: adminData.name,
            username: adminData.username,
            email: adminData.email,
            passwordHash,
            employeeType: adminData.employeeType,
            baseSalary: adminData.baseSalary,
            monthlyFactor: adminData.monthlyFactor,
            overtimeFactor: adminData.overtimeFactor,
            requiredMonthlyHours: adminData.requiredMonthlyHours,
            normalHourRate: adminData.normalHourRate,
            overtimeHourRate: adminData.overtimeHourRate
        });

        console.log('✅ Admin user created successfully!');
        console.log('\n📋 Login Credentials:');
        console.log(`   Username: ${adminData.username}`);
        console.log(`   Password: ${adminData.password}`);
        console.log('\n🌐 Login URL: http://localhost:3000');
        console.log('\n⚠️  IMPORTANT: Change the password after first login!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating admin user:', error);
        process.exit(1);
    }
}

createAdminUser();
