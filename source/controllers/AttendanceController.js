const dayjs = require('dayjs');
const { getAsync, runAsync, allAsync } = require('../Data/database');

const formatDate = (inputDate) => (inputDate ? dayjs(inputDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'));

const checkAttendanceCode = async (code) => {
  const settings = await getAsync(`SELECT currentAttendanceCode FROM admin_settings WHERE id = 1`);
  if (!settings || !settings.currentAttendanceCode) {
    const error = new Error('Attendance code not configured by admin');
    error.status = 400;
    throw error;
  }
  if (settings.currentAttendanceCode !== code) {
    const error = new Error('Invalid attendance code');
    error.status = 401;
    throw error;
  }
};

const checkIn = async ({ employeeId, code, timestamp, date }) => {
  if (!employeeId || !code) {
    throw new Error('employeeId and code are required');
  }

  await checkAttendanceCode(code);

  const day = formatDate(date);
  const existing = await getAsync(`SELECT * FROM attendance WHERE employeeId = ? AND date = ?`, [employeeId, day]);
  if (existing && existing.checkInTime) {
    const error = new Error('Employee already checked in for the day');
    error.status = 400;
    throw error;
  }

  const checkInTime = timestamp || dayjs().toISOString();

  if (existing) {
    await runAsync(`UPDATE attendance SET checkInTime = ? WHERE id = ?`, [checkInTime, existing.id]);
    return getAsync(`SELECT * FROM attendance WHERE id = ?`, [existing.id]);
  }

  await runAsync(
    `INSERT INTO attendance (employeeId, date, checkInTime, checkOutTime, dailyHours) VALUES (?, ?, ?, NULL, 0)`,
    [employeeId, day, checkInTime]
  );

  return getAsync(`SELECT * FROM attendance WHERE employeeId = ? AND date = ?`, [employeeId, day]);
};

const checkOut = async ({ employeeId, code, timestamp, date }) => {
  if (!employeeId || !code) {
    throw new Error('employeeId and code are required');
  }

  await checkAttendanceCode(code);

  const day = formatDate(date);
  const attendance = await getAsync(`SELECT * FROM attendance WHERE employeeId = ? AND date = ?`, [employeeId, day]);
  if (!attendance || !attendance.checkInTime) {
    const error = new Error('Check-in record not found for checkout');
    error.status = 404;
    throw error;
  }

  if (attendance.checkOutTime) {
    const error = new Error('Employee already checked out');
    error.status = 400;
    throw error;
  }

  const checkOutTime = timestamp || dayjs().toISOString();
  const duration = dayjs(checkOutTime).diff(dayjs(attendance.checkInTime), 'minute') / 60;
  const dailyHours = Math.max(0, Number(duration.toFixed(2)));

  await runAsync(`UPDATE attendance SET checkOutTime = ?, dailyHours = ? WHERE id = ?`, [
    checkOutTime,
    dailyHours,
    attendance.id,
  ]);

  return getAsync(`SELECT * FROM attendance WHERE id = ?`, [attendance.id]);
};

const getAttendance = async (employeeId, month) => {
  if (!employeeId) {
    throw new Error('employeeId is required');
  }
  const monthFilter = month ? `${month}%` : dayjs().format('YYYY-MM%');
  return allAsync(`SELECT * FROM attendance WHERE employeeId = ? AND date LIKE ? ORDER BY date ASC`, [
    employeeId,
    monthFilter,
  ]);
};

module.exports = {
  checkIn,
  checkOut,
  getAttendance,
};

