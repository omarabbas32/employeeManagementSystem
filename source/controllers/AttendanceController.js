const dayjs = require('dayjs');
const { Attendance, AdminSettings } = require('../Data/database');

const formatDate = (inputDate) => (inputDate ? dayjs(inputDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'));

const checkAttendanceCode = async (code) => {
  const settings = await AdminSettings.findOne({ _id: 1 }).lean();

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
  const record = await Attendance.create({
    employeeId,
    date: day,
    checkInTime,
    checkOutTime: null,
    dailyHours: 0
  });

  return formatAttendanceRecord(record.toObject());
};

const checkOut = async ({ employeeId, code, timestamp, date }) => {
  if (!employeeId) {
    throw new Error('employeeId is required');
  }

  // Attendance code validation removed - no code required

  const day = formatDate(date);

  // Find ALL active check-ins for this employee today
  const activeSessions = await Attendance.find({
    employeeId,
    date: day,
    checkOutTime: null
  }).lean();

  if (!activeSessions || activeSessions.length === 0) {
    const error = new Error('No active check-in found. Please check in first.');
    error.status = 404;
    throw error;
  }

  const checkOutTime = timestamp || dayjs().toISOString();

  // Close ALL active sessions
  for (const session of activeSessions) {
    const duration = dayjs(checkOutTime).diff(dayjs(session.checkInTime), 'minute') / 60;
    const dailyHours = Math.max(0, Number(duration.toFixed(2)));

    await Attendance.updateOne(
      { id: session.id },
      { $set: { checkOutTime, dailyHours } }
    );
  }

  // Return the last updated record
  const updated = await Attendance.findOne({ id: activeSessions[0].id }).lean();
  return formatAttendanceRecord(updated);
};

const getAttendance = async (employeeId, month) => {
  if (!employeeId) {
    throw new Error('employeeId is required');
  }

  const monthFilter = month || dayjs().format('YYYY-MM');
  const records = await Attendance.find({
    employeeId,
    date: new RegExp(`^${monthFilter}`)
  }).sort({ date: -1, checkInTime: -1 }).lean();

  return records.map(formatAttendanceRecord);
};

const getTodaySessions = async (employeeId) => {
  const today = formatDate();
  const sessions = await Attendance.find({
    employeeId,
    date: today
  }).sort({ checkInTime: -1 }).lean();

  return sessions.map(formatAttendanceRecord);
};

const getMonthlyTotal = async (employeeId, month) => {
  const monthFilter = month || dayjs().format('YYYY-MM');

  const records = await Attendance.find({
    employeeId,
    date: new RegExp(`^${monthFilter}`),
    checkOutTime: { $ne: null }
  }).lean();

  const totalSessions = records.length;
  const totalHours = records.reduce((sum, r) => sum + (r.dailyHours || 0), 0);
  const uniqueDates = [...new Set(records.map(r => r.date))];
  const daysWorked = uniqueDates.length;

  return {
    totalSessions,
    totalHours,
    daysWorked,
    avgHoursPerDay: daysWorked > 0 ? (totalHours / daysWorked).toFixed(2) : 0
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
