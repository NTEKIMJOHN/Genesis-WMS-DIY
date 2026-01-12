import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store';
import { ToastContainer } from './components/ui';
import { LoadingOverlay } from './components/ui/Loading';

// Layouts
import { DashboardLayout } from './layouts/DashboardLayout';
import { AuthLayout } from './layouts/AuthLayout';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

// Dashboard Pages
import { DashboardPage } from './pages/dashboard/DashboardPage';

// ASN Pages
import { ASNListPage } from './pages/asn/ASNListPage';
import { ASNDetailPage } from './pages/asn/ASNDetailPage';
import { ASNReceivingPage } from './pages/asn/ASNReceivingPage';

// Blind Receipt Pages
import { BlindReceiptListPage } from './pages/blindReceipt/BlindReceiptListPage';
import { BlindReceiptCreatePage } from './pages/blindReceipt/BlindReceiptCreatePage';

// Variance Pages
import { VarianceListPage } from './pages/variance/VarianceListPage';

// Putaway Pages
import { PutawayListPage } from './pages/putaway/PutawayListPage';

// LPN Pages
import { LPNListPage } from './pages/lpn/LPNListPage';

// ==========================================
// PROTECTED ROUTE
// ==========================================

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// ==========================================
// APP COMPONENT
// ==========================================

function App() {
  const initialize = useAuthStore((state) => state.initialize);
  const globalLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    // Initialize auth state from localStorage
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      {globalLoading && <LoadingOverlay />}
      <ToastContainer />

      <Routes>
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Dashboard Routes */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />

          {/* ASN Routes */}
          <Route path="/asn" element={<ASNListPage />} />
          <Route path="/asn/:id" element={<ASNDetailPage />} />
          <Route path="/asn/:id/receive" element={<ASNReceivingPage />} />

          {/* Blind Receipt Routes */}
          <Route path="/blind-receipts" element={<BlindReceiptListPage />} />
          <Route path="/blind-receipts/create" element={<BlindReceiptCreatePage />} />

          {/* Variance Routes */}
          <Route path="/variances" element={<VarianceListPage />} />

          {/* Putaway Routes */}
          <Route path="/putaway" element={<PutawayListPage />} />

          {/* LPN Routes */}
          <Route path="/lpn" element={<LPNListPage />} />
        </Route>

        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
