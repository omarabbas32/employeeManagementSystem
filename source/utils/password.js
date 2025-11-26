const bcrypt = require('bcryptjs');

const SALT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10);

const hashPassword = async (plain) => {
  if (!plain) {
    return null;
  }
  return bcrypt.hash(plain, SALT_ROUNDS);
};

const comparePassword = async (plain, hash) => {
  if (!hash) {
    return false;
  }
  return bcrypt.compare(plain, hash);
};

module.exports = {
  hashPassword,
  comparePassword,
};

