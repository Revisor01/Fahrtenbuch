const bcrypt = require('bcrypt');
const db = require('./config/database');

async function hashExistingPasswords() {
  try {
    const [users] = await db.execute('SELECT id, password FROM users');
    for (const user of users) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(user.password, salt);
      await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);
    }
    console.log('All passwords have been hashed successfully.');
  } catch (error) {
    console.error('Error hashing passwords:', error);
  } finally {
    process.exit();
  }
}

hashExistingPasswords();