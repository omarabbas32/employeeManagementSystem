const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDir = __dirname;
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
      status TEXT DEFAULT 'Not Done',
      startDate TEXT,
      dueDate TEXT,
      factor REAL,
      FOREIGN KEY (assignedEmployeeId) REFERENCES employees(id)
    )
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS responsibilities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      monthlyPrice REAL DEFAULT 0,
      assignedEmployeeId INTEGER NOT NULL,
      assignedBy TEXT,
      status TEXT DEFAULT 'Not Done',
      factor REAL,
      FOREIGN KEY (assignedEmployeeId) REFERENCES employees(id)
    )
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employeeId INTEGER NOT NULL,
      date TEXT NOT NULL,
      checkInTime TEXT,
      checkOutTime TEXT,
      dailyHours REAL DEFAULT 0,
      FOREIGN KEY (employeeId) REFERENCES employees(id),
      UNIQUE (employeeId, date)
    )
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employeeId INTEGER NOT NULL,
      content TEXT NOT NULL,
      author TEXT NOT NULL,
      visibility TEXT DEFAULT 'admin',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employeeId) REFERENCES employees(id)
    )
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS admin_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      normalHourRate REAL DEFAULT 10,
      overtimeHourRate REAL DEFAULT 15,
      overtimeThresholdHours REAL DEFAULT 160,
      currentAttendanceCode TEXT,
      allowTaskOvertimeFactor INTEGER DEFAULT 0,
      allowResponsibilityDeduction INTEGER DEFAULT 0
    )
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS deduction_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('fixed', 'percentage')),
      amount REAL NOT NULL,
      applyToEmployeeId INTEGER,
      isActive INTEGER DEFAULT 1,
      FOREIGN KEY (applyToEmployeeId) REFERENCES employees(id)
    )
  `);

  const existingSettings = await getAsync(`SELECT id FROM admin_settings WHERE id = 1`);
  if (!existingSettings) {
    await runAsync(
      `INSERT INTO admin_settings (id, normalHourRate, overtimeHourRate, overtimeThresholdHours) VALUES (1, 10, 15, 160)`
    );
  }

  const predefinedTypes = ['Admin', 'Managerial', 'Financial', 'Assistant'];
  for (const typeName of predefinedTypes) {
    await runAsync(
      `INSERT OR IGNORE INTO employee_types (name, privileges) VALUES (?, ?)`,
      [typeName, typeName.toLowerCase()]
    );
  }
};

module.exports = {
  db,
  initDatabase,
  runAsync,
  getAsync,
  allAsync,
};

