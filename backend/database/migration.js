const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, '..', 'db.sqlite');
const db = new sqlite3.Database(dbPath);

async function migrateDatabase() {
  console.log('Starting database migration...');

  try {
    // Enable foreign key constraints
    db.run('PRAGMA foreign_keys = ON');

    // Backup existing data before migration
    console.log('Backing up existing data...');

    // Read existing data
    const existingBookings = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM bookings', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const existingServices = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM services', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const existingNewsletter = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM newsletter', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const existingAdmins = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM admins', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Drop old tables and create new schema
    console.log('Creating new database schema...');

    const schema = require('./schema.sql');
    const statements = schema.split(';').filter(stmt => stmt.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        await new Promise((resolve, reject) => {
          db.run(statement.trim(), (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
    }

    // Migrate existing data
    console.log('Migrating existing data...');

    // Migrate services
    for (const service of existingServices) {
      const slug = service.title ? service.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : 'unknown-service';
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO services (title, slug, description, category, active, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
          [service.title || 'Unknown Service', slug, service.description, 'General', true, service.created_at || new Date().toISOString()],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    // Migrate newsletter subscribers
    for (const subscriber of existingNewsletter) {
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT OR IGNORE INTO newsletter (email, active, subscribed_at) VALUES (?, ?, ?)`,
          [subscriber.email, true, subscriber.subscribed_at || new Date().toISOString()],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    // Migrate admins to users table with password hashing
    for (const admin of existingAdmins) {
      if (admin.password && !admin.password.includes('$2b$')) {
        // Password is not hashed, hash it now
        const hashedPassword = await bcrypt.hash(admin.password, 10);
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT OR IGNORE INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)`,
            [admin.username || 'Admin', admin.username ? `${admin.username}@victorgraphics.com` : 'admin@victorgraphics.com', hashedPassword, 'admin', new Date().toISOString()],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
    }

    // Migrate bookings to enhanced structure
    for (const booking of existingBookings) {
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO bookings (name, email, phone, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            booking.name || 'Unknown',
            booking.email || 'no-email@example.com',
            booking.phone || '',
            booking.message || '',
            'pending',
            booking.created_at || new Date().toISOString()
          ],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    console.log('Migration completed successfully!');
    console.log(`Migrated ${existingServices.length} services`);
    console.log(`Migrated ${existingNewsletter.length} newsletter subscribers`);
    console.log(`Migrated ${existingAdmins.length} admin users`);
    console.log(`Migrated ${existingBookings.length} bookings`);

  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateDatabase()
    .then(() => {
      console.log('Migration completed. You can now run the seed script to add default data.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateDatabase };