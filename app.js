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

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

app.use(express.json());

// Serve static files from public directory (before authentication)
app.use('/public', express.static('public'));

// DB Initialization Middleware for Vercel (Cold Start)
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

// Auth routes don't need authentication
app.use('/auth', authRoutes);

// Explicitly bypass auth for static assets in case Vercel rewrite falls through
app.use(['/favicon.ico', '/admin/assets/*', '/public/*'], (req, res, next) => {
  next();
});

// Apply authentication to all other routes
app.use(authenticateUser);

app.use('/employees', employeeRoutes);
app.use('/employees', employeeLookupRoutes);
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


app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

// Export the app for Vercel serverless functions
module.exports = app;

// Only listen if run directly (local development)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  initDatabase()
    .then(() => {
      module.exports = app;

    })
    .catch((err) => {
      console.error('Failed to initialize database', err);
      process.exit(1);
    });
}

