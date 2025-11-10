# 🚀 Deployment Guide

## Quick Deployment Steps

### 1. Backend Setup & Deployment

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env

# Set up database
npm run setup

# Start in production mode
npm start
```

### 2. Frontend Build & Deployment

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Build for production
npm run build
```

## Production Environment Variables

Create `.env` file in backend directory:

```env
NODE_ENV=production
PORT=5000

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRY=24h

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=victorcomputerservices254@gmail.com
EMAIL_PASS=your-app-password-here
EMAIL_FROM=VictorGraphics Kenya <victorcomputerservices254@gmail.com>
EMAIL_TO=victorcomputerservices254@gmail.com

# CORS Configuration
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Security
API_KEY=your-secure-api-key-here
```

## 🌐 Deployment Options

### Option 1: Netlify (Frontend) + Render (Backend)

**Backend on Render:**
1. Push code to GitHub
2. Go to [render.com](https://render.com)
3. Connect your GitHub repository
4. Create new "Web Service"
5. Set build command: `npm install && npm run setup`
6. Set start command: `npm start`
7. Add all environment variables
8. Deploy!

**Frontend on Netlify:**
1. Build frontend: `cd frontend && npm run build`
2. Go to [netlify.com](https://netlify.com)
3. Drag and drop the `frontend/dist` folder
4. Or connect to GitHub repository
5. Set build command: `cd frontend && npm run build`
6. Set publish directory: `frontend/dist`

### Option 2: Vercel (Full Stack)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Vercel will automatically detect both frontend and backend
5. Configure environment variables in Vercel dashboard
6. Deploy!

### Option 3: Railway (Full Stack)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Deploy
cd backend
railway up

# Set environment variables in Railway dashboard
```

### Option 4: Traditional VPS/Server

```bash
# On your server
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup
git clone <your-repo-url>
cd VICTORGRAPHICS-TECH-KENYA

# Setup backend
cd backend
npm install
cp .env.example .env
# Edit .env with production values
npm run setup

# Setup PM2 for process management
npm install -g pm2
pm2 start server.js --name "victorgraphics-backend"
pm2 startup
pm2 save

# Setup Nginx proxy (recommended)
sudo apt install nginx
# Configure Nginx to proxy to localhost:5000

# Build frontend
cd ../frontend
npm install
npm run build

# Serve frontend with Nginx or Apache
```

## 🔧 Required Services Setup

### Gmail SMTP Setup (for emails)

1. Enable 2-Factor Authentication on Gmail
2. Go to: https://myaccount.google.com/apppasswords
3. Generate new app password for "VictorGraphics"
4. Use the app password in `EMAIL_PASS` environment variable

### Database Setup

The application uses SQLite, so no external database is needed. The migration and seeding scripts handle everything automatically.

### File Uploads

The application stores uploads in the `backend/uploads/` directory. Ensure this directory is writable by the web server user.

## 📱 Mobile App Development

For Android development with Termux:

```bash
# Install Termux from F-Droid (not Play Store)
pkg update && pkg upgrade
pkg install nodejs npm git

# Clone and setup
git clone <your-repo-url>
cd VICTORGRAPHICS-TECH-KENYA/backend
npm install
cp .env.example .env
npm run setup

# Start development server
npm run dev
```

## 🔍 Production Checklist

Before going live, ensure:

- [ ] Environment variables are properly configured
- [ ] Default admin password is changed
- [ ] Email configuration is tested
- [ ] SSL certificates are installed
- [ ] Backups are configured
- [ ] Rate limiting is working
- [ ] All security headers are active
- [ ] File upload permissions are correct
- [ ] Database is properly seeded with all services

## 🚨 Important Security Notes

1. **Change the default admin password** immediately after deployment
2. **Use strong, unique secrets** in your environment variables
3. **Enable SSL/TLS** on your domain
4. **Regular backups** of the SQLite database
5. **Monitor logs** for suspicious activity
6. **Keep dependencies updated**

## 📞 Support Contact Information

Make sure to update these in the database and environment:

- Email: victorcomputerservices254@gmail.com
- Phone: +254 717 379 145 / +254 732 928 67
- Address: California next to Oasis Korumba shop

## 🎯 Post-Deployment Tasks

1. **Test all contact forms** to ensure emails are sending
2. **Verify WhatsApp integration** links work correctly
3. **Test image uploads** in admin panel
4. **Verify all 40+ services** are displayed correctly
5. **Test language toggle** functionality
6. **Check responsive design** on mobile devices

## 🔧 Customization

### Adding Your Logo

1. Replace `frontend/public/vite.svg` with your logo
2. Update `frontend/index.html` with your favicon paths
3. Update the business name and details in the database settings

### Custom Styling

The application uses Tailwind CSS. Customize colors and styles in `frontend/tailwind.config.js`.

### Adding Custom Services

Use the admin panel to add/edit services, or modify the seed data in `backend/database/seed.js`.

---

**Your VictorGraphics website is now ready for production! 🎉**