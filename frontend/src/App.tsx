import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "./contexts/CartContext";
import { AuthProvider } from "./components/customer/AuthContext";
import { AlertProvider } from "./contexts/AlertContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Unauthorized from "./components/auth/Unauthorized";
import AdminLanding from "./components/admin/AdminLanding";
import CustomerLanding from "./components/customer/CustomerLanding";
import CustomerLogin from "./components/customer/CustomerLogin";
import CustomerSignup from "./components/customer/CustomerSignup";
import CustomerDasboard from "./components/customer/CustomerDasboard";
import CustomerLayout from "./components/customer/CustomerLayout";
import CustomerMenu from "./components/customer/CustomerMenu";
import CustomerOrders from "./components/customer/CustomerOrders";
import CustomerEventsPage from "./components/customer/CustomerEvents";
import CustomerLoyalty from "./components/customer/CustomerLoyalty";
import CustomerSettings from "./components/customer/CustomerSettings";
import CustomerFeedback from "./components/customer/CustomerFeedback";
import CustomerForgotPassword from "./components/customer/CustomerForgotPassword";
import CustomerResetPassword from "./components/customer/CustomerResetPassword";
import CustomerPayment from "./components/customer/CustomerPayment";
import CustomerPaymentQR from "./components/customer/CustomerPaymentQR";
import GuestMenu from "./components/customer/GuestMenu";
import GuestOrderTracking from "./components/customer/GuestOrderTracking";
import GuestOrderSuccess from "./components/customer/GuestOrderSuccess";
import QRCodeGenerator from "./components/customer/QRCodeGenerator";
import VisitMauricio from "./components/customer/VisitMauricio";
import AdminForgotPassword from "./components/admin/AdminForgotPassword";
import AdminResetPassword from "./components/admin/AdminResetPassword";
import { AdminAuthForm } from "./components/admin/AdminAuthForm";
import AdminDashboard from "./components/admin/AdminDashboard";
import AdminLayout from "./components/admin/AdminLayout";
import AdminOrders from "./components/admin/AdminOrders";
import AdminEvents from "./components/admin/AdminEvents";
import AdminLoyalty from "./components/admin/AdminLoyalty";
import AdminSales from "./components/admin/AdminSales";
import AdminFeedback from "./components/admin/AdminFeedback";
import AdminActivityLogs from "./components/admin/AdminActivityLogs";
import AdminStaff from "./components/admin/AdminStaff";
import AdminSettings from "./components/admin/AdminSettings";
import AdminMenu from "./components/admin/AdminMenu";
import EnhancedInventory from "./components/admin/EnhancedInventory";
import AdminTransactionHistory from "./components/admin/AdminTransactionHistory";
import POSPage from "./pages/POSPage";
import PaymentSuccess from "./pages/PaymentSuccess";
import StaffLanding from "./components/staff/StaffLanding";
import StaffDashboard from "./components/staff/StaffDashboard";
import StaffInventory from "./components/staff/StaffInventory";
import StaffOrders from "./components/staff/StaffOrders";
import StaffLoyalty from "./components/staff/StaffLoyalty";
import StaffRewardProcessing from "./components/staff/StaffRewardProcessing";
import StaffSales from "./components/staff/StaffSales";
import StaffActivityLogs from "./components/staff/StaffActivityLogs";
import StaffSettings from "./components/staff/StaffSettings";
import AdminEmailVerification from "./pages/AdminEmailVerification";
import AdminUsernameVerification from "./pages/AdminUsernameVerification";
import CustomerEmailVerification from "./pages/CustomerEmailVerification";
import CustomerPasswordVerification from "./pages/CustomerPasswordVerification";
import StaffPasswordVerification from "./pages/StaffPasswordVerification";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Accessibility from "./pages/Accessibility";
import AdminPasswordVerification from "./pages/AdminPasswordVerification";
import { StaffAuthForm } from "./components/staff/StaffAuthForm";
import { StaffForgotPassword } from "./components/staff/StaffForgotPassword";
import { StaffResetPassword } from "./components/staff/StaffResetPassword";

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AlertProvider>
          <Router>
      <Routes>
        <Route path="/admin" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminLanding />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="events" element={<AdminEvents />} />
          <Route path="loyalty" element={<AdminLoyalty />} />
          <Route path="sales" element={<AdminSales />} />
          <Route path="feedback" element={<AdminFeedback />} />
          <Route path="activity-logs" element={<AdminActivityLogs />} />
          <Route path="staff" element={<AdminStaff />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="inventory" element={<EnhancedInventory />} />
          <Route path="menu" element={<AdminMenu />} />
          <Route path="pos" element={<POSPage />} />
          <Route path="transaction-history" element={<AdminTransactionHistory />} />
        </Route>
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/admin/login" element={<AdminAuthForm />} />
        <Route path="/staff/login" element={<StaffAuthForm />} />
        <Route path="/staff/forgot-password" element={<StaffForgotPassword />} />
        <Route path="/staff/reset-password/:token" element={<StaffResetPassword />} />
        <Route path="/admin/forgot-password" element={<AdminForgotPassword />} />
        <Route path="/admin/reset-password/:token" element={<AdminResetPassword />} />
        <Route path="/admin/verify-email" element={<AdminEmailVerification />} />
        <Route path="/admin/verify-username" element={<AdminUsernameVerification />} />
        <Route path="/admin/verify-password" element={<AdminPasswordVerification />} />
        <Route path="/customer/verify-email" element={<CustomerEmailVerification />} />
        <Route path="/customer/verify-password" element={<CustomerPasswordVerification />} />
        <Route path="/staff/verify-password" element={<StaffPasswordVerification />} />
        <Route
          path="/reset-password/:token"
          element={<Navigate to={(window.location.pathname.replace('/reset-password', '/customer/reset-password'))} replace />}
        />
        <Route path="/" element={<CustomerLanding />} />
        <Route path="/login" element={<CustomerLogin />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/customer-signup" element={<CustomerSignup />} />
        <Route path="/customer-login" element={<CustomerLogin />} />
        <Route path="/customer/forgot-password" element={<CustomerForgotPassword />} />
        <Route path="/customer/reset-password/:token" element={<CustomerResetPassword />} />
        <Route path="/customer/payment" element={<CustomerPayment />} />
        <Route
          path="/customer/payment-qr/:orderId"
          element={<CustomerPaymentQR orderId="" onScanned={() => {}} />}
        />
        {/* Guest routes */}
        <Route path="/guest/menu" element={<GuestMenu />} />
        <Route path="/guest/order-tracking" element={<GuestOrderTracking />} />
        <Route
          path="/guest/order-tracking/:orderId"
          element={<GuestOrderTracking />}
        />
        <Route path="/guest/order-success/:orderId" element={<GuestOrderSuccess />} />
        <Route path="/qr-codes" element={<QRCodeGenerator />} />
        <Route path="/visit-mauricio" element={<VisitMauricio />} />
        {/* Public policy pages */}
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/accessibility" element={<Accessibility />} />
        <Route path="/customer" element={<CustomerLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<CustomerDasboard />} />
          <Route path="menu" element={<CustomerMenu />} />
          <Route path="orders" element={<CustomerOrders />} />
          <Route path="events" element={<CustomerEventsPage />} />
          <Route path="loyalty" element={<CustomerLoyalty />} />
          <Route path="feedback" element={<CustomerFeedback />} />
          <Route path="settings" element={<CustomerSettings />} />
        </Route>
        <Route path="/staff" element={
          <ProtectedRoute requiredRole="staff">
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<StaffLanding />} />
          <Route path="dashboard" element={<StaffDashboard />} />
          <Route path="inventory" element={<StaffInventory />} />
          <Route path="orders" element={<StaffOrders />} />
          <Route path="pos" element={<POSPage />} />
          <Route path="loyalty" element={<StaffLoyalty />} />
          <Route path="reward-processing" element={<StaffRewardProcessing />} />
          <Route path="sales" element={<StaffSales />} />
          <Route path="activity-logs" element={<StaffActivityLogs />} />
          <Route path="settings" element={<StaffSettings />} />
        </Route>
      </Routes>
        </Router>
        </AlertProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
