const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, '..', 'db.sqlite');
const db = new sqlite3.Database(dbPath);

async function seedDatabase() {
  console.log('Seeding database...');

  try {
    // Create admin user with hashed password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    db.run(`INSERT OR IGNORE INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`,
      ['Admin User', 'admin@victorgraphics.com', hashedPassword, 'admin']);

    // Insert all required services
    const services = [
      // Government & Digital Services
      { title: 'NISA', slug: 'nisa', category: 'Government Services', description: 'National Intelligence and Security Agency services' },
      { title: 'KUCCPS', slug: 'kuccps', category: 'Education Services', description: 'Kenya Universities and Colleges Central Placement Service' },
      { title: 'ECitizen Services', slug: 'ecitizen-services', category: 'Government Services', description: 'Complete eCitizen portal assistance and application support' },
      { title: 'KRA Services', slug: 'kra-services', category: 'Government Services', description: 'Kenya Revenue Authority tax services and compliance' },
      { title: 'NTSA Services', slug: 'ntsa-services', category: 'Government Services', description: 'National Transport and Safety Authority services' },
      { title: 'SHA Services', slug: 'sha-services', category: 'Government Services', description: 'Social Health Authority services and registration' },
      { title: 'GHRIS Payslips', slug: 'ghris-payslips', category: 'Government Services', description: 'Government Human Resource Information System payslip access' },
      { title: 'Good Conduct', slug: 'good-conduct', category: 'Government Services', description: 'Certificate of Good Conduct application' },
      { title: 'Driving License', slug: 'driving-license', category: 'Government Services', description: 'Driving license application and renewal services' },
      { title: 'EACC Forms', slug: 'eacc-forms', category: 'Government Services', description: 'Ethics and Anti-Corruption Commission forms' },
      { title: 'Green Card Applications', slug: 'green-card-applications', category: 'Immigration Services', description: 'Permanent residency application assistance' },
      { title: 'Logbook Transfer', slug: 'logbook-transfer', category: 'Vehicle Services', description: 'Vehicle ownership transfer services' },
      { title: 'NHIF Services', slug: 'nhif-services', category: 'Health Insurance', description: 'National Hospital Insurance Fund registration and services' },
      { title: 'NSSF Services', slug: 'nssf-services', category: 'Social Security', description: 'National Social Security Fund registration and contributions' },
      { title: 'CR12 Application', slug: 'cr12-application', category: 'Business Services', description: 'Company registration and CR12 certificate application' },
      { title: 'TSC Number', slug: 'tsc-number', category: 'Education Services', description: 'Teachers Service Commission registration and number application' },
      { title: 'Passport Application', slug: 'passport-application', category: 'Immigration Services', description: 'Passport application and renewal assistance' },
      { title: 'Visa Application', slug: 'visa-application', category: 'Immigration Services', description: 'Visa application assistance for various countries' },
      { title: 'Work Permit Application', slug: 'work-permit-application', category: 'Immigration Services', description: 'Work permit application for foreign nationals' },
      { title: 'KRA Tax Returns Filing', slug: 'kra-tax-returns', category: 'Tax Services', description: 'Annual tax returns filing and compliance' },
      { title: 'GHRIS & TSC Payalipa', slug: 'ghris-tsc-payalipa', category: 'Government Services', description: 'GHRIS and TSC payslip access and management' },
      { title: 'Pay Land Rates', slug: 'pay-land-rates', category: 'Government Services', description: 'Land rates payment assistance and processing' },
      { title: 'HELB Application', slug: 'helb-application', category: 'Education Services', description: 'Higher Education Loans Board application services' },
      { title: 'Vehicle Search', slug: 'vehicle-search', category: 'Vehicle Services', description: 'Vehicle ownership verification and search services' },

      // Printing & Design Services
      { title: 'Printing', slug: 'printing', category: 'Printing Services', description: 'High-quality digital and offset printing services', price_ksh: 50 },
      { title: 'Photocopy', slug: 'photocopy', category: 'Printing Services', description: 'Black and white and color photocopying services', price_ksh: 5 },
      { title: 'Lamination', slug: 'lamination', category: 'Printing Services', description: 'Document lamination and protection services', price_ksh: 20 },
      { title: 'Typesetting', slug: 'typesetting', category: 'Design Services', description: 'Professional typesetting and document formatting', price_ksh: 100 },
      { title: 'Binding', slug: 'binding', category: 'Printing Services', description: 'Document binding and finishing services', price_ksh: 80 },
      { title: 'Scanning', slug: 'scanning', category: 'Digital Services', description: 'Document scanning and digital conversion', price_ksh: 10 },
      { title: 'Resume & CV', slug: 'resume-cv', category: 'Design Services', description: 'Professional resume and CV writing services', price_ksh: 500 },
      { title: 'Letterheads & Receipt Books', slug: 'letterheads-receipt-books', category: 'Printing Services', description: 'Custom letterheads and receipt book printing', price_ksh: 1000 },
      { title: 'Wedding Design & Printing', slug: 'wedding-design-printing', category: 'Design Services', description: 'Wedding card design and printing services', price_ksh: 2000 },
      { title: 'Poster Design', slug: 'poster-design', category: 'Design Services', description: 'Professional poster design and printing', price_ksh: 500 },
      { title: 'Online Printing', slug: 'online-printing', category: 'Printing Services', description: 'Online printing services with delivery' },
      { title: 'Tender Documents', slug: 'tender-documents', category: 'Business Services', description: 'Tender document preparation and printing', price_ksh: 1500 },
      { title: 'Student Project Help', slug: 'student-project-help', category: 'Education Services', description: 'Academic project assistance and printing', price_ksh: 800 }
    ];

    const insertService = db.prepare(`INSERT OR IGNORE INTO services (title, slug, category, description, price_ksh) VALUES (?, ?, ?, ?, ?)`);

    services.forEach(service => {
      insertService.run([service.title, service.slug, service.category, service.description, service.price_ksh]);
    });
    insertService.finalize();

    // Insert course packages
    const courses = [
      {
        title: 'Basic Computer Package',
        duration: '1 month + 2 weeks',
        fee_ksh: 2500,
        description: 'Introduction to computers, Microsoft Office basics, internet fundamentals, and email communication.',
        level: 'basic'
      },
      {
        title: 'Advanced Computer Package',
        duration: '3 months',
        fee_ksh: 3500,
        description: 'Advanced Microsoft Office, desktop publishing, basic graphic design, and computer maintenance.',
        level: 'advanced'
      },
      {
        title: 'Professional Computer Package',
        duration: '6 months',
        fee_ksh: 6000,
        description: 'Complete computer training including programming, web design, advanced graphics, and IT support.',
        level: 'professional'
      }
    ];

    const insertCourse = db.prepare(`INSERT OR IGNORE INTO courses (title, duration, fee_ksh, description, level) VALUES (?, ?, ?, ?, ?)`);

    courses.forEach(course => {
      insertCourse.run([course.title, course.duration, course.fee_ksh, course.description, course.level]);
    });
    insertCourse.finalize();

    // Mark some services as featured
    const featuredServices = ['Printing', 'ECitizen Services', 'Passport Application', 'Computer Packages & Training'];
    const updateFeatured = db.prepare(`UPDATE services SET featured = 1 WHERE title = ?`);

    featuredServices.forEach(title => {
      updateFeatured.run([title]);
    });
    updateFeatured.finalize();

    console.log('Database seeded successfully!');
    console.log(`Services: ${services.length}`);
    console.log(`Courses: ${courses.length}`);
    console.log('Default admin user: admin@victorgraphics.com / admin123');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    db.close();
  }
}

// Run the seeding
seedDatabase();