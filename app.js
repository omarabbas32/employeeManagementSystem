require('dotenv').config();
const express = require('express');
const path = require('path');
const { initDatabase } = require('./source/Data/database');

const authRoutes = require('./source/Routes/auth');
const { authenticateUser } = require('./source/middleware/auth');
const employeeRoutes = require('./source/Routes/employees');
const taskRoutes = require('./source/Routes/tasks');
const responsibilityRoutes = require('./source/Routes/responsibilities');
const attendanceRoutes = require('./source/Routes/attendance');
const salaryRoutes = require('./source/Routes/salary');
const noteRoutes = require('./source/Routes/notes');
const settingsRoutes = require('./source/Routes/settings');
const typeRoutes = require('./source/Routes/types');
const deductionRoutes = require('./source/Routes/deductions');

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

// Serve login page at root (before authentication)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Auth routes don't need authentication
app.use('/auth', authRoutes);

// Apply authentication to all other routes
app.use(authenticateUser);

app.use('/employees', employeeRoutes);
app.use('/tasks', taskRoutes);
app.use('/responsibilities', responsibilityRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/salary', salaryRoutes);
app.use('/notes', noteRoutes);
app.use('/settings', settingsRoutes);
app.use('/types', typeRoutes);

app.use('/deductions', deductionRoutes);


app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 3000;

initDatabase()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 Employee Management System API is running!`);
      console.log(`📍 Local:   http://localhost:${PORT}`);
      console.log(`📍 Network: http://YOUR_LOCAL_IP:${PORT}`);
      console.log(`\nTo find your local IP, run: ipconfig (Windows) or ifconfig (Mac/Linux)\n`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database', err);
    process.exit(1);
  });

module.exports = app;

