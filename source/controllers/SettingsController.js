const { getAsync, runAsync } = require('../Data/database');

const getSettings = () => getAsync(`SELECT * FROM admin_settings WHERE id = 1`);

const updateSettings = async (payload) => {
  const current = await getSettings();
  if (!current) {
    throw new Error('Admin settings not initialized');
  }

  const {
    normalHourRate = current.normalHourRate,
    overtimeHourRate = current.overtimeHourRate,
    overtimeThresholdHours = current.overtimeThresholdHours,
    currentAttendanceCode = current.currentAttendanceCode,
    allowTaskOvertimeFactor = current.allowTaskOvertimeFactor,
    allowResponsibilityDeduction = current.allowResponsibilityDeduction,
  } = payload;

  await runAsync(
    `UPDATE admin_settings
     SET normalHourRate = ?, overtimeHourRate = ?, overtimeThresholdHours = ?, currentAttendanceCode = ?,
         allowTaskOvertimeFactor = ?, allowResponsibilityDeduction = ?
     WHERE id = 1`,
    [
      normalHourRate,
      overtimeHourRate,
      overtimeThresholdHours,
      currentAttendanceCode,
      allowTaskOvertimeFactor ? 1 : 0,
      allowResponsibilityDeduction ? 1 : 0,
    ]
  );

  return getSettings();
};

const updateAttendanceCode = async (code) => {
  if (!code) {
    throw new Error('Attendance code is required');
  }
  await runAsync(`UPDATE admin_settings SET currentAttendanceCode = ? WHERE id = 1`, [code]);
  return getSettings();
};

module.exports = {
  getSettings,
  updateSettings,
  updateAttendanceCode,
};

