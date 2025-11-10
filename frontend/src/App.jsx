import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

// Layout components
import Layout from '@components/Layout/Layout'
import LoadingSpinner from '@components/Common/LoadingSpinner'
import ErrorPage from '@components/Common/ErrorPage'

// Lazy load page components
const Home = lazy(() => import('@pages/Home'))
const Services = lazy(() => import('@pages/Services'))
const Courses = lazy(() => import('@pages/Courses'))
const Pricing = lazy(() => import('@pages/Pricing'))
const Gallery = lazy(() => import('@pages/Gallery'))
const Contact = lazy(() => import('@pages/Contact'))
const About = lazy(() => import('@pages/About'))

// Admin components
const AdminDashboard = lazy(() => import('@pages/Admin/Dashboard'))
const AdminLogin = lazy(() => import('@pages/Admin/Login'))
const ServicesManage = lazy(() => import('@pages/Admin/ServicesManage'))
const BookingsManage = lazy(() => import('@pages/Admin/BookingsManage'))
const GalleryManage = lazy(() => import('@pages/Admin/GalleryManage'))
const Settings = lazy(() => import('@pages/Admin/Settings'))

// Protected route component
const ProtectedRoute = ({ children, requiredRole = 'admin' }) => {
  const token = localStorage.getItem('authToken')

  if (!token) {
    return <Navigate to="/admin/login" replace />
  }

  // Here you would typically verify the token and check role
  // For now, we'll just check if token exists
  return children
}

// Page transition wrapper
const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
    className="min-h-screen"
  >
    {children}
  </motion.div>
)

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <LoadingSpinner size="lg" />
  </div>
)

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }) => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h2>
      <p className="text-gray-600 mb-6">We apologize for the inconvenience. Please try refreshing the page.</p>
      <button
        onClick={resetErrorBoundary}
        className="btn btn-primary"
      >
        Try again
      </button>
    </div>
  </div>
)

function App() {
  const { i18n } = useTranslation()

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className={`App ${i18n.language === 'ar' ? 'rtl' : 'ltr'}`} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Layout />}>
              <Route index element={
                <PageTransition>
                  <Home />
                </PageTransition>
              } />
              <Route path="services" element={
                <PageTransition>
                  <Services />
                </PageTransition>
              } />
              <Route path="services/:slug" element={
                <PageTransition>
                  <Services />
                </PageTransition>
              } />
              <Route path="courses" element={
                <PageTransition>
                  <Courses />
                </PageTransition>
              } />
              <Route path="pricing" element={
                <PageTransition>
                  <Pricing />
                </PageTransition>
              } />
              <Route path="gallery" element={
                <PageTransition>
                  <Gallery />
                </PageTransition>
              } />
              <Route path="contact" element={
                <PageTransition>
                  <Contact />
                </PageTransition>
              } />
              <Route path="about" element={
                <PageTransition>
                  <About />
                </PageTransition>
              } />
            </Route>

            {/* Admin routes */}
            <Route path="/admin" element={<PageTransition><AdminLogin /></PageTransition>} />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute>
                  <Layout noHeader noFooter>
                    <PageTransition>
                      <AdminDashboard />
                    </PageTransition>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/services"
              element={
                <ProtectedRoute>
                  <Layout noHeader noFooter>
                    <PageTransition>
                      <ServicesManage />
                    </PageTransition>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/bookings"
              element={
                <ProtectedRoute>
                  <Layout noHeader noFooter>
                    <PageTransition>
                      <BookingsManage />
                    </PageTransition>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/gallery"
              element={
                <ProtectedRoute>
                  <Layout noHeader noFooter>
                    <PageTransition>
                      <GalleryManage />
                    </PageTransition>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute>
                  <Layout noHeader noFooter>
                    <PageTransition>
                      <Settings />
                    </PageTransition>
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Catch-all route */}
            <Route path="*" element={<ErrorPage />} />
          </Routes>
        </Suspense>
      </div>
    </ErrorBoundary>
  )
}

export default App