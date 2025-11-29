const dayjs = require('dayjs');
const { getAsync, runAsync, allAsync } = require('../Data/database');

const formatDate = (inputDate) => (inputDate ? dayjs(inputDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'));

const checkAttendanceCode = async (code) => {
  const settings = await getAsync(`SELECT currentAttendanceCode FROM admin_settings WHERE id = 1`);

  if (!settings || !settings.currentAttendanceCode) {
    const error = new Error('Attendance code not configured. Please contact admin.');
    error.status = 400;
    throw error;
  }

  if (!code) {
    const error = new Error('Attendance code is required');
    error.status = 400;
    throw error;
  }

  if (settings.currentAttendanceCode !== code) {
    const error = new Error('Invalid attendance code');
    error.status = 401;
    throw error;
  }

  return true;
};

const checkIn = async ({ employeeId, code, timestamp, date }) => {
  if (!employeeId) {
    throw new Error('employeeId is required');
  }

  // Attendance code validation removed - no code required
  // Multiple check-ins per day are allowed

  const day = formatDate(date);
  const checkInTime = timestamp || dayjs().toISOString();

  // Create NEW attendance record (allow multiple check-ins per day)
  await runAsync(
    `INSERT INTO attendance (employeeId, date, checkInTime, checkOutTime, dailyHours) 
     VALUES (?, ?, ?, NULL, 0)`,
    [employeeId, day, checkInTime]
  );

  // Get the newly created record
  const record = await getAsync(
    `SELECT * FROM attendance WHERE employeeId = ? AND checkInTime = ? ORDER BY id DESC LIMIT 1`,
    [employeeId, checkInTime]
  );

  return formatAttendanceRecord(record);
};

const checkOut = async ({ employeeId, code, timestamp, date }) => {
  if (!employeeId) {
    throw new Error('employeeId is required');
  }

  // Attendance code validation removed - no code required

  const day = formatDate(date);

  // Find the LATEST check-in without a check-out for this employee today
  const attendance = await getAsync(
    `SELECT * FROM attendance 
     WHERE employeeId = ? AND date = ? AND checkOutTime IS NULL 
     ORDER BY checkInTime DESC LIMIT 1`,
    [employeeId, day]
  );

  if (!attendance || !attendance.checkInTime) {
    const error = new Error('No active check-in found. Please check in first.');
    error.status = 404;
    throw error;
  }

  const checkOutTime = timestamp || dayjs().toISOString();
  const duration = dayjs(checkOutTime).diff(dayjs(attendance.checkInTime), 'minute') / 60;
  const dailyHours = Math.max(0, Number(duration.toFixed(2)));

  await runAsync(
    `UPDATE attendance SET checkOutTime = ?, dailyHours = ? WHERE id = ?`,
    [checkOutTime, dailyHours, attendance.id]
  );

  const updated = await getAsync(`SELECT * FROM attendance WHERE id = ?`, [attendance.id]);
  return formatAttendanceRecord(updated);
};

const getAttendance = async (employeeId, month) => {
  if (!employeeId) {
    throw new Error('employeeId is required');
  }

  const monthFilter = month ? `${month}%` : dayjs().format('YYYY-MM%');
  const records = await allAsync(
    `SELECT * FROM attendance 
     WHERE employeeId = ? AND date LIKE ? 
     ORDER BY date DESC, checkInTime DESC`,
    [employeeId, monthFilter]
  );

  return records.map(formatAttendanceRecord);
};

const getTodaySessions = async (employeeId) => {
  const today = formatDate();
  const sessions = await allAsync(
    `SELECT * FROM attendance 
     WHERE employeeId = ? AND date = ? 
     ORDER BY checkInTime DESC`,
    [employeeId, today]
  );

  return sessions.map(formatAttendanceRecord);
};

const getMonthlyTotal = async (employeeId, month) => {
  const monthFilter = month ? `${month}%` : dayjs().format('YYYY-MM%');
  const result = await getAsync(
    `SELECT 
      COUNT(*) as totalSessions,
      SUM(dailyHours) as totalHours,
      COUNT(DISTINCT date) as daysWorked
     FROM attendance 
     WHERE employeeId = ? AND date LIKE ? AND checkOutTime IS NOT NULL`,
    [employeeId, monthFilter]
  );

  return {
    totalSessions: result?.totalSessions || 0,
    totalHours: result?.totalHours || 0,
    daysWorked: result?.daysWorked || 0,
    avgHoursPerDay: result?.daysWorked > 0 ? (result.totalHours / result.daysWorked).toFixed(2) : 0
  };
};

// Format attendance record to match frontend expectations
const formatAttendanceRecord = (record) => {
  if (!record) return null;

  return {
    id: record.id,
    employeeId: record.employeeId,
    date: record.date,
    checkIn: record.checkInTime,
    checkOut: record.checkOutTime,
    totalHours: record.dailyHours || 0,
    isActive: !record.checkOutTime, // True if not checked out yet
    createdAt: record.createdAt || record.date
  };
};

module.exports = {
  checkIn,
  checkOut,
  getAttendance,
  getTodaySessions,
  getMonthlyTotal,
};
