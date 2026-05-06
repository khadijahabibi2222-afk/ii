/**
 * seeds/seed.js
 * Run standalone: npm run seed
 * Also called by server.js on startup when DB has no users.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User     = require('../models/User');

const DEFAULT_USERS = [
  { username: 'admin',  password: 'admin123',  fullName: 'مدیر سیستم',   role: 'admin'  },
  { username: 'editor', password: 'edit123',   fullName: 'ویرایشگر',     role: 'editor' },
  { username: 'viewer', password: 'view123',   fullName: 'مشاهده‌گر',    role: 'viewer' },
];

async function seedUsers() {
  let created = 0;
  for (const u of DEFAULT_USERS) {
    // findOne uses the 'username' index — very fast
    const exists = await User.findOne({ username: u.username }).lean();
    if (!exists) {
      await User.create(u);  // pre-save hook hashes password with cost 10
      console.log(`  ✚ Created: ${u.username} (${u.role})`);
      created++;
    } else {
      console.log(`  ✓ Exists: ${u.username}`);
    }
  }
  console.log(`✅ Seed done — ${created} user(s) created`);
  return created;
}

// Standalone CLI
if (require.main === module) {
  (async () => {
    try {
      await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
      console.log('✅ MongoDB connected');
      await seedUsers();
    } catch (err) {
      console.error('❌ Seed failed:', err.message);
      process.exit(1);
    } finally {
      await mongoose.disconnect();
    }
  })();
}

module.exports = { seedUsers };
