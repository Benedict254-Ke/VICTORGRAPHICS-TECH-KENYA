#!/bin/bash

# VictorGraphics Tech Kenya - Deployment Verification Script
# This script verifies that your deployment is working correctly

echo "🔍 VictorGraphics Tech Kenya - Deployment Verification"
echo "=================================================="

# Function to check if service is running
check_service() {
    local url=$1
    local name=$2
    local expected_code=$3

    echo "🔍 Checking $name..."

    if command -v curl &> /dev/null; then
        response=$(curl -s -o /dev/null -w "%{http_code}" "$url")

        if [ "$response" -eq "$expected_code" ]; then
            echo "✅ $name is responding (HTTP $response)"
            return 0
        else
            echo "❌ $name is not responding correctly (HTTP $response, expected $expected_code)"
            return 1
        fi
    else
        echo "⚠️  curl not found, skipping $name check"
        return 2
    fi
}

# Function to check database
check_database() {
    echo "🗄️ Checking database..."

    if [ -f "backend/db.sqlite" ]; then
        echo "✅ Database file exists"

        # Check if tables exist
        cd backend
        if sqlite3 db.sqlite ".tables" | grep -q "services"; then
            echo "✅ Database tables exist"

            # Check if services are populated
            service_count=$(sqlite3 db.sqlite "SELECT COUNT(*) FROM services;")
            if [ "$service_count" -gt 0 ]; then
                echo "✅ Database is seeded ($service_count services found)"
            else
                echo "⚠️  Database exists but no services found. Run npm run seed"
            fi
        else
            echo "❌ Database tables not found. Run npm run migrate"
        fi
        cd ..
    else
        echo "❌ Database file not found. Run npm run setup"
        return 1
    fi
}

# Function to check environment variables
check_env() {
    echo "📝 Checking environment configuration..."

    if [ -f "backend/.env" ]; then
        echo "✅ Environment file exists"

        # Check for critical variables
        critical_vars=("JWT_SECRET" "EMAIL_USER" "EMAIL_PASS")
        missing_vars=()

        for var in "${critical_vars[@]}"; do
            if ! grep -q "^${var}=" backend/.env || grep -q "^${var}=$" backend/.env; then
                missing_vars+=("$var")
            fi
        done

        if [ ${#missing_vars[@]} -eq 0 ]; then
            echo "✅ Critical environment variables are set"
        else
            echo "⚠️  Missing environment variables: ${missing_vars[*]}"
            echo "Please edit backend/.env with your values"
        fi
    else
        echo "❌ Environment file not found. Copy backend/.env.example to backend/.env"
        return 1
    fi
}

# Function to check frontend build
check_frontend_build() {
    echo "🏗️ Checking frontend build..."

    if [ -d "frontend/dist" ]; then
        echo "✅ Frontend build exists"

        if [ -f "frontend/dist/index.html" ]; then
            echo "✅ Frontend build files are complete"
        else
            echo "❌ Frontend build is incomplete"
            return 1
        fi
    else
        echo "⚠️  Frontend build not found. Run 'cd frontend && npm run build'"
        return 1
    fi
}

# Function to run comprehensive check
run_comprehensive_check() {
    echo ""
    echo "🚀 Running comprehensive deployment verification..."
    echo ""

    local overall_status=0

    # Check environment
    check_env
    env_status=$?

    # Check database
    check_database
    db_status=$?

    # Check frontend build
    check_frontend_build
    build_status=$?

    # Check services (adjust URLs as needed)
    echo ""
    echo "🌐 Checking services..."

    backend_status=0
    if check_service "http://localhost:5000/api/health" "Backend API" 200; then
        # Check specific endpoints
        check_service "http://localhost:5000/api/services" "Services API" 200
        check_service "http://localhost:5000/api/courses" "Courses API" 200
    else
        backend_status=1
    fi

    frontend_status=0
    if check_service "http://localhost:3000" "Frontend" 200; then
        echo "✅ Frontend is accessible"
    else
        frontend_status=1
    fi

    # Summary
    echo ""
    echo "📊 Verification Summary"
    echo "======================="

    [ $env_status -eq 0 ] && echo "✅ Environment Configuration" || echo "❌ Environment Configuration"
    [ $db_status -eq 0 ] && echo "✅ Database" || echo "❌ Database"
    [ $build_status -eq 0 ] && echo "✅ Frontend Build" || echo "❌ Frontend Build"
    [ $backend_status -eq 0 ] && echo "✅ Backend API" || echo "❌ Backend API"
    [ $frontend_status -eq 0 ] && echo "✅ Frontend" || echo "❌ Frontend"

    overall_status=$((env_status + db_status + build_status + backend_status + frontend_status))

    echo ""
    if [ $overall_status -eq 0 ]; then
        echo "🎉 All checks passed! Your deployment is ready!"
        echo ""
        echo "Next Steps:"
        echo "1. Login to admin panel at http://localhost:3000/admin"
        echo "2. Change default admin password"
        echo "3. Test email functionality"
        echo "4. Upload some gallery images"
        echo "5. Deploy to production when ready"
    else
        echo "⚠️  Some checks failed. Please review the issues above."
        echo ""
        echo "Common fixes:"
        echo "- Run './setup.sh' to setup the project"
        echo "- Check backend/.env configuration"
        echo "- Ensure services are running: 'npm run dev' in both directories"
        echo "- Check port conflicts (Backend: 5000, Frontend: 3000)"
    fi
}

# Quick test for API endpoints
test_api_endpoints() {
    echo ""
    echo "🔌 Testing API endpoints..."

    if command -v curl &> /dev/null; then
        echo "Testing: GET /api/health"
        curl -s http://localhost:5000/api/health | head -c 200
        echo ""

        echo "Testing: GET /api/services?limit=5"
        curl -s "http://localhost:5000/api/services?limit=5" | head -c 300
        echo ""

        echo "Testing: GET /api/courses"
        curl -s http://localhost:5000/api/courses | head -c 200
        echo ""
    else
        echo "curl not found, skipping API tests"
    fi
}

# Main menu
echo ""
echo "What would you like to verify?"
echo "1) Quick Health Check"
echo "2) Comprehensive Verification"
echo "3) Test API Endpoints Only"
echo "4) Exit"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        check_service "http://localhost:5000/api/health" "Backend API" 200
        check_service "http://localhost:3000" "Frontend" 200
        ;;
    2)
        run_comprehensive_check
        ;;
    3)
        test_api_endpoints
        ;;
    4)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✅ Verification complete!"