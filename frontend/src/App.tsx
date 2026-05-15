import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { ProtectedRoute, AdminRoute, StudentRoute } from './components/RouteGuard';
import AppLayout from './components/Layout';
import LoginPage from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import StudentsPage from './pages/admin/Students';
import StudentDetailPage from './pages/admin/StudentDetail';
import OrdersPage from './pages/admin/Orders';
import UploadPage from './pages/admin/Upload';
import BatchesPage from './pages/admin/Batches';
import StudentDashboard from './pages/student/Dashboard';
import StudentOrders from './pages/student/Orders';
import BillingPage from './pages/student/Billing';

function AppContent() {
  const { theme: currentTheme } = useTheme();

  return (
    <ConfigProvider
      key={currentTheme}
      locale={zhCN}
      theme={{
        algorithm: currentTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 8,
        },
      }}
    >
      <AntApp>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin" element={<ProtectedRoute><AdminRoute><AppLayout /></AdminRoute></ProtectedRoute>}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="students" element={<StudentsPage />} />
                <Route path="students/:id" element={<StudentDetailPage />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="upload" element={<UploadPage />} />
                <Route path="batches" element={<BatchesPage />} />
              </Route>
              <Route path="/student" element={<ProtectedRoute><StudentRoute><AppLayout /></StudentRoute></ProtectedRoute>}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<StudentDashboard />} />
                <Route path="orders" element={<StudentOrders />} />
                <Route path="billing" element={<BillingPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}