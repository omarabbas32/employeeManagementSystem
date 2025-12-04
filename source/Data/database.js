const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDir = process.env.VERCEL ? '/tmp' : __dirname;
const dbPath = path.join(dbDir, 'employees.db');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

const runAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function runCallback(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });

const getAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });

const allAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });

const ensureColumn = async (table, column, definition) => {
  const columns = await allAsync(`PRAGMA table_info(${table})`);
  const exists = columns.some((col) => col.name === column);
  if (!exists) {
    await runAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
};

const initDatabase = async () => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS employee_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      privileges TEXT DEFAULT 'employee'
    )
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE,
      email TEXT UNIQUE,
      passwordHash TEXT,
      employeeType TEXT NOT NULL,
      baseSalary REAL DEFAULT 0,
      monthlyFactor REAL DEFAULT 1,
      overtimeFactor REAL DEFAULT 1,
      notes TEXT DEFAULT ''
    )
  `);

  await ensureColumn('employees', 'username', 'TEXT');
  await ensureColumn('employees', 'email', 'TEXT');
  await ensureColumn('employees', 'passwordHash', 'TEXT');
  await ensureColumn('employees', 'normalHourRate', 'REAL DEFAULT 10');
  await ensureColumn('employees', 'overtimeHourRate', 'REAL DEFAULT 15');
  await ensureColumn('employees', 'requiredMonthlyHours', 'REAL DEFAULT 160');
  await ensureColumn('employees', 'hourlyRate', 'REAL DEFAULT 15');
  await runAsync(`CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_username ON employees(username)`);
  await runAsync(`CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_email ON employees(email)`);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL DEFAULT 0,
      assignedEmployeeId INTEGER NOT NULL,
      assignedBy TEXT,
      status TEXT DEFAULT 'Pending',
      startDate TEXT,
      dueDate TEXT,
      factor REAL DEFAULT 1,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assignedEmployeeId) REFERENCES employees(id)
    )
  `);

  // NEW: Task Templates - reusable task definitions created by admins
  await runAsync(`
    CREATE TABLE IF NOT EXISTS task_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL DEFAULT 0,
      factor REAL DEFAULT 1,
      type TEXT DEFAULT 'task',
      createdBy TEXT DEFAULT 'Admin',
      isActive INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // NEW: Task Assignments - actual task assignments linking templates to employees
  await runAsync(`
    CREATE TABLE IF NOT EXISTS task_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      templateId INTEGER NOT NULL,
      assignedEmployeeId INTEGER NOT NULL,
      assignedBy TEXT NOT NULL,
      type TEXT DEFAULT 'task',
      status TEXT DEFAULT 'Pending',
      startDate TEXT,
      dueDate TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      completedAt TEXT,
      FOREIGN KEY (templateId) REFERENCES task_templates(id),
      FOREIGN KEY (assignedEmployeeId) REFERENCES employees(id)
    )
  `);


  // Create indexes for better performance
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_task_assignments_template ON task_assignments(templateId)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_task_assignments_employee ON task_assignments(assignedEmployeeId)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_task_assignments_status ON task_assignments(status)`);

  // Add type column to existing tables (for migration)
  await ensureColumn('task_templates', 'type', "TEXT DEFAULT 'task'");
  await ensureColumn('task_assignments', 'type', "TEXT DEFAULT 'task'");

  await runAsync(`
    CREATE TABLE IF NOT EXISTS responsibilities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      monthlyPrice REAL DEFAULT 0,
      assignedEmployeeId INTEGER NOT NULL,
    assignedBy TEXT,
      status TEXT DEFAULT 'Active',
        factor REAL DEFAULT 1,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(assignedEmployeeId) REFERENCES employees(id)
    )
`);

  // NEW: kkkAttendance table WITHOUT unique constraint - allows multiple check-ins per day
  await runAsync(`
    CREATE TABLE IF NOT EXISTS attendance(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employeeId INTEGER NOT NULL,
  date TEXT NOT NULL,
  checkInTime TEXT,
  checkOutTime TEXT,
  dailyHours REAL DEFAULT 0,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(employeeId) REFERENCES employees(id)
)
  `);

  // Create index for faster queries (but not unique)
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employeeId, date)`);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS notes(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employeeId INTEGER NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'Admin',
  visibility TEXT DEFAULT 'employee',
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(employeeId) REFERENCES employees(id)
)
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS admin_settings(
    id INTEGER PRIMARY KEY CHECK(id = 1),
    normalHourRate REAL DEFAULT 10,
    overtimeHourRate REAL DEFAULT 15,
    overtimeThresholdHours REAL DEFAULT 160,
    currentAttendanceCode TEXT,
    allowTaskOvertimeFactor INTEGER DEFAULT 0,
    allowResponsibilityDeduction INTEGER DEFAULT 0
  )
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS deduction_rules(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN('fixed', 'percentage')),
    amount REAL NOT NULL,
    applyToEmployeeId INTEGER,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(applyToEmployeeId) REFERENCES employees(id)
  )
  `);

  const existingSettings = await getAsync(`SELECT id FROM admin_settings WHERE id = 1`);
  if (!existingSettings) {
    await runAsync(
      `INSERT INTO admin_settings(id, normalHourRate, overtimeHourRate, overtimeThresholdHours) VALUES(1, 10, 15, 160)`
    );
  }

  const predefinedTypes = ['Admin', 'Managerial', 'Financial', 'Assistant'];
  for (const typeName of predefinedTypes) {
    await runAsync(
      `INSERT OR IGNORE INTO employee_types(name, privileges) VALUES(?, ?)`,
      [typeName, typeName.toLowerCase()]
    );
  }

  // Migration: Backfill completedAt for completed tasks that don't have it
  await runAsync(`
    UPDATE task_assignments 
    SET completedAt = COALESCE(dueDate, createdAt, datetime('now'))
    WHERE status = 'Completed' AND completedAt IS NULL
  `);

  // ========== MONTHLY PAYROLL SYSTEM MIGRATIONS ==========
  const dayjs = require('dayjs');
  const currentMonth = dayjs().format('YYYY-MM');

  // Add month tracking columns
  await ensureColumn('responsibilities', 'month', 'TEXT');
  await ensureColumn('deduction_rules', 'month', 'TEXT');
  await ensureColumn('task_assignments', 'completedMonth', 'TEXT');

  // Create indexes for month-based queries
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_responsibilities_month ON responsibilities(month, assignedEmployeeId)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_deductions_month ON deduction_rules(month, applyToEmployeeId)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_task_assignments_completed_month ON task_assignments(completedMonth)`);

  // Backfill existing data with current month
  await runAsync(`UPDATE responsibilities SET month = ? WHERE month IS NULL`, [currentMonth]);
  await runAsync(`UPDATE deduction_rules SET month = ? WHERE month IS NULL`, [currentMonth]);
  await runAsync(`
    UPDATE task_assignments 
    SET completedMonth = substr(completedAt, 1, 7)
    WHERE (status = 'Done' OR status = 'Completed') 
      AND completedAt IS NOT NULL 
      AND completedMonth IS NULL
  `);

  // ========== HOUR-BASED DEDUCTION FEATURE ==========
  // Add hours_deducted column to support hour-based deductions
  await ensureColumn('deduction_rules', 'hours_deducted', 'REAL DEFAULT NULL');

  // ========== ANNOUNCEMENTS FEATURE ==========
  await runAsync(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      authorId INTEGER NOT NULL,
      authorName TEXT NOT NULL,
      authorRole TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (authorId) REFERENCES employees(id) ON DELETE CASCADE
    )
  `);

  // ========== DEFAULT ADMIN CREATION (Critical for Vercel /tmp DB) ==========
  const existingAdmin = await getAsync(`SELECT id FROM employees WHERE employeeType = 'Admin' LIMIT 1`);
  if (!existingAdmin) {
    console.log('⚠️ No admin found. Creating default admin user...');
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('123456', 10);

    await runAsync(
      `INSERT INTO employees (name, username, email, passwordHash, employeeType, baseSalary, monthlyFactor, overtimeFactor, requiredMonthlyHours, normalHourRate, overtimeHourRate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['Default Admin', 'admin', 'admin@example.com', passwordHash, 'Admin', 0, 1, 1, 160, 15, 22.5]
    );
    console.log('✅ Default admin created: username=admin, password=123456');
  }

  console.log('✅ Database initialized successfully');
  console.log('✅ Multiple check-ins per day enabled');
  console.log('✅ Monthly payroll system enabled');
  console.log('✅ Hour-based deduction feature enabled');
};

module.exports = {
  db,
  initDatabase,
  runAsync,
  getAsync,
  allAsync,
};
