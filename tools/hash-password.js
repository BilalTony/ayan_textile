/**
 * Makes the value for ADMIN_PASSWORD_HASH.
 *
 *   node tools/hash-password.js "your admin password"
 *
 * Paste the line it prints into Vercel → Settings → Environment Variables.
 * The plain password is never stored anywhere.
 */
import crypto from 'node:crypto';

const password = process.argv[2];

if (!password) {
  console.error('Usage: node tools/hash-password.js "your admin password"');
  process.exit(1);
}
if (password.length < 10) {
  console.error('Use at least 10 characters — this is the only door to your data.');
  process.exit(1);
}

const salt = crypto.randomBytes(16).toString('hex');
const key = crypto.scryptSync(password, salt, 32).toString('hex');

console.log('\nADMIN_PASSWORD_HASH=' + `scrypt:${salt}:${key}`);
console.log('SESSION_SECRET=' + crypto.randomBytes(32).toString('base64url') + '\n');
