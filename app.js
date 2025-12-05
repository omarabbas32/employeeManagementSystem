require('dotenv').config();
const express = require('express');
const path = require('path');
const { initDatabase } = require('./source/Data/database');

const authRoutes = require('./source/Routes/auth');
const { authenticateUser } = require('./source/middleware/auth');
const employeeRoutes = require('./source/Routes/employees');
const employeeLookupRoutes = require('./source/Routes/employee-lookup');
const taskRoutes = require('./source/Routes/tasks');
const responsibilityRoutes = require('./source/Routes/responsibilities');
const attendanceRoutes = require('./source/Routes/attendance');
const salaryRoutes = require('./source/Routes/salary');
const noteRoutes = require('./source/Routes/notes');
const settingsRoutes = require('./source/Routes/settings');
const typeRoutes = require('./source/Routes/types');
const deductionRoutes = require('./source/Routes/deductions');
const dailyReportRoutes = require('./source/Routes/daily-report');
const announcementRoutes = require('./source/Routes/announcements');

const app = express();

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-admin-secret, x-user-id');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());

// Serve static files before authentication
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/favicon.ico', express.static(path.join(__dirname, 'public', 'favicon.ico')));
app.use('/admin/assets', express.static(path.join(__dirname, 'public', 'admin', 'assets')));

// DB Initialization Middleware for Cold Start
let dbInitialized = false;
app.use(async (req, res, next) => {
  if (!dbInitialized) {
    try {
      await initDatabase();
      dbInitialized = true;
      console.log('✅ Database initialized on cold start');
    } catch (err) {
      console.error('❌ Failed to initialize database:', err);
      return res.status(500).json({ error: 'Database initialization failed' });
    }
  }
  next();
});

// Serve login page at root (before authentication)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Auth routes (no authentication needed)
app.use('/auth', authRoutes);

// Apply authentication for all other routes
app.use(authenticateUser);

// Mount main routes (order matters - more specific routes first)
app.use('/employees/lookup', employeeLookupRoutes); // Must be before /employees
app.use('/employees', employeeRoutes);
app.use('/tasks', taskRoutes);
app.use('/responsibilities', responsibilityRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/salary', salaryRoutes);
app.use('/notes', noteRoutes);
app.use('/settings', settingsRoutes);
app.use('/types', typeRoutes);
app.use('/deductions', deductionRoutes);
app.use('/reports/daily', dailyReportRoutes);
app.use('/announcements', announcementRoutes);


// Initialize database for Vercel (serverless)
let dbInitialized = false;
const ensureDbInitialized = async (req, res, next) => {
  if (!dbInitialized) {
    try {
      await initDatabase();
      dbInitialized = true;
    } catch (err) {
      console.error('Database initialization failed:', err);
      return res.status(500).json({ message: 'Database initialization failed' });
    }
  }
  next();
};

// Apply database initialization middleware to all routes
app.use(ensureDbInitialized);

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

// Export for Vercel
module.exports = app;

// Local development listener
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  initDatabase()
    .then(() => {
      dbInitialized = true;
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Failed to initialize database', err);
      process.exit(1);
    });
}

