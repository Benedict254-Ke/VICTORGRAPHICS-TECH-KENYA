# Victor and Sons Computers & Tech Solutions Kenya

A production-ready, responsive website with admin backend for VictorGraphics - providing comprehensive cyber and digital services in Kenya.

## 🌟 Features

### For Customers
- **Responsive Design**: Mobile-first design that works on all devices
- **Multilingual Support**: English and Kiswahili language toggle
- **Service Catalog**: 40+ services with search and filtering
- **Computer Courses**: Three-tier training packages (Basic, Advanced, Professional)
- **Gallery**: Portfolio with carousel and lightbox
- **Contact Forms**: Multiple contact methods including WhatsApp integration
- **Newsletter**: Email subscription with welcome emails

### For Administrators
- **Secure Authentication**: JWT-based admin authentication with role-based access
- **Dashboard**: Analytics and statistics overview
- **Service Management**: Full CRUD operations for services
- **Booking Management**: Customer booking system with status tracking
- **Gallery Management**: Image upload and management
- **Newsletter Management**: Subscriber management with CSV export
- **Email Notifications**: Automated email system for contacts and bookings

### Technical Features
- **Security**: Password hashing, rate limiting, XSS protection, input validation
- **API**: RESTful API with comprehensive endpoints
- **Database**: SQLite with migration and seeding scripts
- **File Upload**: Secure image upload with validation
- **Email**: Nodemailer integration with HTML templates
- **Performance**: Image optimization, compression, caching
- **SEO**: Meta tags, structured data, sitemap generation

## 🚀 Quick Start

### Prerequisites
- Node.js 16.0.0 or higher
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/VICTORGRAPHICS-TECH-KENYA.git
   cd VICTORGRAPHICS-TECH-KENYA
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Set up environment variables**
   ```bash
   cd ../backend
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Set up database**
   ```bash
   npm run setup
   # This runs: migrate && seed
   ```

6. **Start development servers**

   Terminal 1 - Backend:
   ```bash
   cd backend
   npm run dev
   ```

   Terminal 2 - Frontend:
   ```bash
   cd frontend
   npm run dev
   ```

7. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Health Check: http://localhost:5000/api/health

### Default Admin Login
- Email: `admin@victorgraphics.com`
- Password: `admin123`

⚠️ **Important**: Change the default admin password in production!

## 📁 Project Structure

```
VICTORGRAPHICS-TECH-KENYA/
├── backend/                    # Express.js API server
│   ├── config/                 # Configuration files
│   │   └── email.js           # Email service configuration
│   ├── database/              # Database files and scripts
│   │   ├── schema.sql         # Database schema
│   │   ├── migration.js       # Migration script
│   │   └── seed.js           # Seed data script
│   ├── middleware/            # Express middleware
│   │   ├── auth.js           # Authentication middleware
│   │   ├── security.js       # Security middleware
│   │   └── upload.js         # File upload middleware
│   ├── routes/               # API routes
│   │   ├── auth.js           # Authentication routes
│   │   ├── services.js       # Service management
│   │   ├── courses.js        # Course management
│   │   ├── contact.js        # Contact form handling
│   │   ├── bookings.js       # Booking management
│   │   ├── gallery.js        # Gallery management
│   │   └── newsletter.js     # Newsletter management
│   ├── utils/                # Utility functions
│   │   ├── auth.js           # Authentication utilities
│   │   └── validation.js     # Input validation
│   ├── uploads/              # File upload directory
│   ├── package.json          # Backend dependencies
│   ├── server.js             # Main server file
│   └── db.sqlite             # SQLite database file
├── frontend/                 # React.js frontend
│   ├── public/               # Static assets
│   ├── src/                  # Source code
│   │   ├── components/       # React components
│   │   │   ├── Layout/       # Layout components
│   │   │   ├── Common/       # Common components
│   │   │   └── Forms/        # Form components
│   │   ├── pages/            # Page components
│   │   │   ├── Home.jsx      # Homepage
│   │   │   ├── Services.jsx  # Services page
│   │   │   ├── Courses.jsx   # Courses page
│   │   │   ├── Gallery.jsx   # Gallery page
│   │   │   ├── Contact.jsx   # Contact page
│   │   │   └── Admin/        # Admin pages
│   │   ├── locales/          # Translation files
│   │   │   ├── en.json       # English translations
│   │   │   └── sw.json       # Kiswahili translations
│   │   ├── hooks/            # Custom React hooks
│   │   ├── utils/            # Utility functions
│   │   ├── App.jsx           # Main App component
│   │   ├── main.jsx          # App entry point
│   │   └── i18n.js           # Internationalization setup
│   ├── dist/                 # Build output
│   ├── package.json          # Frontend dependencies
│   ├── vite.config.js        # Vite configuration
│   └── tailwind.config.js    # Tailwind CSS config
├── README.md                 # This file
├── .env.example             # Environment variables template
└── .gitignore              # Git ignore file
```

## 🛠️ Available Scripts

### Backend Scripts
```bash
npm install           # Install dependencies
npm start            # Start production server
npm run dev          # Start development server with nodemon
npm run migrate      # Run database migration
npm run seed          # Seed database with initial data
npm run setup        # Install, migrate, and seed in one command
```

### Frontend Scripts
```bash
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues automatically
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRY=24h

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=VictorGraphics Kenya <your-gmail@gmail.com>

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
```

### Email Setup (Gmail)

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account → Security → App Passwords
   - Create a new app password for "VictorGraphics"
3. Use the app password in the `EMAIL_PASS` environment variable

## 📱 Android/Termux Support

For development on Android devices using Termux:

```bash
# Install required packages
pkg install nodejs npm git

# Clone and setup
git clone https://github.com/your-username/VICTORGRAPHICS-TECH-KENYA.git
cd VICTORGRAPHICS-TECH-KENYA

# Setup backend
cd backend
npm install
cp .env.example .env
# Edit .env as needed
npm run setup

# Start development server
npm run dev

# The server will be available on your device's local network
# Access from other devices using your device's IP address
```

## 🚀 Deployment

### Frontend Deployment (Netlify/Vercel)

1. **Build the frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to Netlify**
   - Connect your repository to Netlify
   - Build command: `cd frontend && npm run build`
   - Publish directory: `frontend/dist`
   - Add environment variables for API endpoints

3. **Deploy to Vercel**
   - Install Vercel CLI: `npm i -g vercel`
   - Run: `vercel --prod`
   - Configure environment variables in Vercel dashboard

### Backend Deployment (Render/Railway)

#### Render Deployment
1. **Connect your repository to Render**
2. **Service Configuration**:
   - Build Command: `npm install && npm run migrate`
   - Start Command: `npm start`
   - Environment Variables: Add all required variables from `.env.example`

#### Railway Deployment
1. **Install Railway CLI**: `npm install -g @railway/cli`
2. **Login**: `railway login`
3. **Deploy**: `railway up`

### Manual Server Deployment

```bash
# Install dependencies
cd backend
npm ci --production

# Set up environment
export NODE_ENV=production
export PORT=5000
# ... other environment variables

# Run migration and seeding
npm run migrate
npm run seed

# Start server
npm start

# Or use PM2 for process management
npm install -g pm2
pm2 start server.js --name "victorgraphics-backend"
pm2 startup
pm2 save
```

## 📊 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Admin login |
| POST | `/api/auth/register` | Register new admin (admin only) |
| GET | `/api/auth/me` | Get current user info |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/change-password` | Change password |

### Service Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/services` | Get all services (with search/filter) |
| GET | `/api/services/:id` | Get service by ID |
| GET | `/api/services/slug/:slug` | Get service by slug |
| POST | `/api/services` | Create service (admin only) |
| PUT | `/api/services/:id` | Update service (admin only) |
| DELETE | `/api/services/:id` | Delete service (admin only) |
| GET | `/api/services/categories` | Get service categories |

### Booking Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bookings` | Create booking |
| GET | `/api/admin/bookings` | Get all bookings (admin only) |
| GET | `/api/admin/bookings/:id` | Get booking by ID (admin only) |
| PUT | `/api/admin/bookings/:id/status` | Update booking status (admin only) |
| DELETE | `/api/admin/bookings/:id` | Delete booking (admin only) |

For a complete API documentation, see the Postman collection in the repository.

## 🔒 Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Prevent abuse of API endpoints
- **Input Validation**: Comprehensive input sanitization
- **XSS Protection**: Content Security Policy and XSS headers
- **CORS Configuration**: Secure cross-origin requests
- **File Upload Security**: File type and size validation
- **SQL Injection Prevention**: Parameterized queries

## 🌍 Internationalization

The application supports English and Kiswahili languages:

- **Language Toggle**: Switch between languages in the header
- **Persistent Choice**: Language preference saved in localStorage
- **Complete Translations**: All UI text translated
- **Dynamic Loading**: Translations load dynamically

## 📧 Email Templates

The system includes professional email templates:

- **Contact Form Notifications**: HTML emails for contact submissions
- **Booking Confirmations**: Automatic booking confirmation emails
- **Newsletter Welcome**: Welcome emails for new subscribers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support, please contact:

- **Email**: victorcomputerservices254@gmail.com
- **Phone**: +254 717 379 145 / +254 732 928 67
- **Address**: California next to Oasis Korumba shop

## 🙏 Acknowledgments

- [React](https://reactjs.org/) - Frontend framework
- [Express.js](https://expressjs.com/) - Backend framework
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [SQLite](https://www.sqlite.org/) - Database
- [Node.js](https://nodejs.org/) - Runtime environment

---

**Built with ❤️ for VictorGraphics Tech Kenya**