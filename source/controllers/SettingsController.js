const { AdminSettings } = require('../Data/database');

const getSettings = () => AdminSettings.findOne({ _id: 1 }).lean();

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

  await AdminSettings.updateOne(
    { _id: 1 },
    {
      $set: {
        normalHourRate,
        overtimeHourRate,
        overtimeThresholdHours,
        currentAttendanceCode,
        allowTaskOvertimeFactor: allowTaskOvertimeFactor ? 1 : 0,
        allowResponsibilityDeduction: allowResponsibilityDeduction ? 1 : 0
      }
    }
  );

  return getSettings();
};

const updateAttendanceCode = async (code) => {
  if (!code) {
    throw new Error('Attendance code is required');
  }
  await AdminSettings.updateOne({ _id: 1 }, { $set: { currentAttendanceCode: code } });
  return getSettings();
};

module.exports = {
  getSettings,
  updateSettings,
  updateAttendanceCode,
};
