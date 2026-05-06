require('dotenv').config();
const express     = require('express');
const mongoose    = require('mongoose');
const cors        = require('cors');
const path        = require('path');
const compression = require('compression');

const app = express();

app.use(compression());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d', etag: true }));

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/orphans',  require('./routes/orphans'));
app.use('/api/schools',  require('./routes/schools'));
app.use('/api/sponsors', require('./routes/sponsors'));
app.use('/api/users',    require('./routes/users'));
app.use('/api/kv',       require('./routes/kv'));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    mongo:  mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize:              50,
  minPoolSize:               5,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS:         45000,
  compressors:           'zlib',
})
.then(async () => {
  console.log('✅ MongoDB connected (pool:50)');

  const Orphan = require('./models/Orphan');
  await Orphan.syncIndexes();
  console.log('✅ Indexes synced');

  // Always auto-seed if no users — works in dev AND production
  const User  = require('./models/User');
  const count = await User.countDocuments();
  if (count === 0) {
    console.log('⚙️  No users found — seeding defaults...');
    try {
      const { seedUsers } = require('./seeds/seed');
      await seedUsers();
      console.log('✅ Default users created. Login: admin / admin123');
    } catch (e) {
      console.error('❌ Auto-seed failed — run: npm run seed', e.message);
    }
  }

  app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
})
.catch(err => {
  console.error('❌ MongoDB failed:', err.message);
  process.exit(1);
});
