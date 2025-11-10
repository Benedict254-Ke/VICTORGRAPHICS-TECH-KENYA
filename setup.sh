#!/bin/bash

# VictorGraphics Tech Kenya - Quick Setup Script
# This script helps you set up the project for local development or deployment

echo "🚀 VictorGraphics Tech Kenya - Setup Script"
echo "=========================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Function to setup backend
setup_backend() {
    echo ""
    echo "📦 Setting up backend..."
    cd backend

    if [ ! -f package.json ]; then
        echo "❌ package.json not found in backend directory"
        exit 1
    fi

    echo "📥 Installing backend dependencies..."
    npm install

    if [ ! -f .env ]; then
        echo "📝 Creating environment file..."
        cp .env.example .env
        echo "⚠️  Please edit backend/.env with your configuration"
    fi

    echo "🗄️ Setting up database..."
    npm run setup

    echo "✅ Backend setup complete!"
    cd ..
}

# Function to setup frontend
setup_frontend() {
    echo ""
    echo "🎨 Setting up frontend..."
    cd frontend

    if [ ! -f package.json ]; then
        echo "❌ package.json not found in frontend directory"
        exit 1
    fi

    echo "📥 Installing frontend dependencies..."
    npm install

    echo "🏗️ Building frontend for production..."
    npm run build

    echo "✅ Frontend setup complete!"
    cd ..
}

# Function to start development servers
start_dev() {
    echo ""
    echo "🔧 Starting development servers..."
    echo "Backend will start on http://localhost:5000"
    echo "Frontend will start on http://localhost:3000"
    echo ""
    echo "Press Ctrl+C to stop the servers"
    echo ""

    # Start backend in background
    cd backend
    npm run dev &
    BACKEND_PID=$!
    cd ..

    # Start frontend in background
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..

    # Wait for both processes
    wait $BACKEND_PID $FRONTEND_PID
}

# Function to show deployment info
show_deployment_info() {
    echo ""
    echo "🌍 Deployment Information"
    echo "========================="
    echo ""
    echo "Default Admin Login:"
    echo "Email: admin@victorgraphics.com"
    echo "Password: admin123"
    echo ""
    echo "⚠️  IMPORTANT: Change the default admin password after first login!"
    echo ""
    echo "Email Configuration:"
    echo "1. Enable 2FA on your Gmail account"
    echo "2. Generate an App Password at https://myaccount.google.com/apppasswords"
    echo "3. Update EMAIL_PASS in backend/.env with the app password"
    echo ""
    echo "Quick Start Commands:"
    echo "Backend: cd backend && npm run dev"
    echo "Frontend: cd frontend && npm run dev"
    echo ""
    echo "For detailed deployment guide, see: DEPLOYMENT.md"
}

# Main menu
echo ""
echo "What would you like to do?"
echo "1) Setup Backend Only"
echo "2) Setup Frontend Only"
echo "3) Setup Both Backend & Frontend"
echo "4) Start Development Servers"
echo "5) Show Deployment Information"
echo "6) Exit"
echo ""
read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        setup_backend
        ;;
    2)
        setup_frontend
        ;;
    3)
        setup_backend
        setup_frontend
        ;;
    4)
        start_dev
        ;;
    5)
        show_deployment_info
        ;;
    6)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "🎉 Setup completed!"
echo ""
echo "Next Steps:"
echo "1. Edit backend/.env with your email configuration"
echo "2. Start the development servers"
echo "3. Test the application"
echo "4. Deploy to your preferred hosting platform"
echo ""
show_deployment_info