import { Routes, Route } from 'react-router'
import { lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import SessionGuard from '@/components/SessionGuard'
import { PWAInstallBanner } from '@/components/PWAInstallBanner'
import { QueryProvider } from '@/providers/QueryProvider'

// Public pages
const Welcome = lazy(() => import('./pages/customer/Welcome'))
const Register = lazy(() => import('./pages/customer/Register'))
const CustomerLogin = lazy(() => import('./pages/customer/CustomerLogin'))
const CustomerHome = lazy(() => import('./pages/customer/Home'))
const CustomerSearch = lazy(() => import('./pages/customer/Search'))
const CommerceDetail = lazy(() => import('./pages/customer/CommerceDetail'))
const Cart = lazy(() => import('./pages/customer/Cart'))
const OrderTracking = lazy(() => import('./pages/customer/OrderTracking'))
const Chat = lazy(() => import('./pages/customer/Chat'))
const CustomerProfile = lazy(() => import('./pages/customer/Profile'))

// Driver app
const DriverHome = lazy(() => import('./pages/driver/DriverHome'))
const DriverOrder = lazy(() => import('./pages/driver/DriverOrder'))
const DriverEarnings = lazy(() => import('./pages/driver/DriverEarnings'))
const DriverProfile = lazy(() => import('./pages/driver/DriverProfile'))

// Commerce dashboard
const CommerceDashboard = lazy(() => import('./pages/commerce/Dashboard'))
const CommerceOrders = lazy(() => import('./pages/commerce/Orders'))
const CommerceProducts = lazy(() => import('./pages/commerce/Products'))
const CommerceStats = lazy(() => import('./pages/commerce/Stats'))
const CommerceProfile = lazy(() => import('./pages/commerce/Profile'))

// Admin dashboard
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'))
const AdminCommerces = lazy(() => import('./pages/admin/Commerces'))
const AdminDrivers = lazy(() => import('./pages/admin/Drivers'))
const AdminOrders = lazy(() => import('./pages/admin/Orders'))
const AdminProducts = lazy(() => import('./pages/admin/Products'))
const AdminSettings = lazy(() => import('./pages/admin/Settings'))

// Auth
const Login = lazy(() => import('./pages/Login'))
const NotFound = lazy(() => import('./pages/NotFound'))



function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-[#2E7D32]" />
    </div>
  )
}

export default function App() {
  return (
    <QueryProvider>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
        {/* Customer App Routes */}
        <Route path="/" element={<Welcome />} />
        <Route path="/register" element={<Register />} />
        <Route path="/customer-login" element={<CustomerLogin />} />
        <Route path="/home" element={<SessionGuard role="customer"><CustomerHome /></SessionGuard>} />
        <Route path="/search" element={<SessionGuard role="customer"><CustomerSearch /></SessionGuard>} />
        <Route path="/commerce/:id" element={<SessionGuard role="customer"><CommerceDetail /></SessionGuard>} />
        <Route path="/cart" element={<SessionGuard role="customer"><Cart /></SessionGuard>} />
        <Route path="/order/:id" element={<SessionGuard role="customer"><OrderTracking /></SessionGuard>} />
        <Route path="/chat/:orderId" element={<SessionGuard role="customer"><Chat /></SessionGuard>} />
        <Route path="/profile" element={<SessionGuard role="customer"><CustomerProfile /></SessionGuard>} />

        {/* Driver App Routes */}
        <Route path="/driver" element={<SessionGuard role="driver"><DriverHome /></SessionGuard>} />
        <Route path="/driver/order/:id" element={<SessionGuard role="driver"><DriverOrder /></SessionGuard>} />
        <Route path="/driver/earnings" element={<SessionGuard role="driver"><DriverEarnings /></SessionGuard>} />
        <Route path="/driver/profile" element={<SessionGuard role="driver"><DriverProfile /></SessionGuard>} />

        {/* Commerce Dashboard Routes */}
        <Route path="/commerce" element={<SessionGuard role="merchant"><CommerceDashboard /></SessionGuard>} />
        <Route path="/commerce/orders" element={<SessionGuard role="merchant"><CommerceOrders /></SessionGuard>} />
        <Route path="/commerce/products" element={<SessionGuard role="merchant"><CommerceProducts /></SessionGuard>} />
        <Route path="/commerce/stats" element={<SessionGuard role="merchant"><CommerceStats /></SessionGuard>} />
        <Route path="/commerce/profile" element={<SessionGuard role="merchant"><CommerceProfile /></SessionGuard>} />

        {/* Admin Dashboard Routes */}
        <Route path="/admin" element={<SessionGuard role="admin"><AdminDashboard /></SessionGuard>} />
        <Route path="/admin/commerces" element={<SessionGuard role="admin"><AdminCommerces /></SessionGuard>} />
        <Route path="/admin/drivers" element={<SessionGuard role="admin"><AdminDrivers /></SessionGuard>} />
        <Route path="/admin/orders" element={<SessionGuard role="admin"><AdminOrders /></SessionGuard>} />
        <Route path="/admin/products" element={<SessionGuard role="admin"><AdminProducts /></SessionGuard>} />
        <Route path="/admin/settings" element={<SessionGuard role="admin"><AdminSettings /></SessionGuard>} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <PWAInstallBanner />
    </Suspense>
  </QueryProvider>
)
}
