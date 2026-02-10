import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, createContext, useContext } from "react";
import MainPage from "@/pages/MainPage";
import HistoryPage from "@/pages/HistoryPage";
import ReceiptPage from "@/pages/ReceiptPage";
import SettingsPage from "@/pages/SettingsPage";
import LoginPage from "@/pages/LoginPage";
import CustomerPage from "@/pages/CustomerPage";
import CustomerDetailPage from "@/pages/CustomerDetailPage";
import api from "@/lib/api";

// Background Context
const BackgroundContext = createContext({ darkMode: false, setDarkMode: () => { } });
export const useBackground = () => useContext(BackgroundContext);

function BackgroundProvider({ children }) {
  const [darkMode, setDarkMode] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const loadSettings = async () => {
      try {
        const settings = await api.getSettings();
        if (settings?.darkMode !== undefined) {
          setDarkMode(settings.darkMode);
        }
      } catch (e) {
        // Ignore - use default
      }
    };
    loadSettings();
  }, [user]);

  return (
    <BackgroundContext.Provider value={{ darkMode, setDarkMode }}>
      {children}
    </BackgroundContext.Provider>
  );
}

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><MainPage /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
      <Route path="/receipt/:id" element={<ReceiptPage />} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute><CustomerPage /></ProtectedRoute>} />
      <Route path="/customers/:id" element={<ProtectedRoute><CustomerDetailPage /></ProtectedRoute>} />
    </Routes>
  );
}

function AppContent() {
  const { darkMode } = useBackground();

  const bgClass = darkMode ? 'dark-mode' : 'light-mode';

  return (
    <div className={`App min-h-screen ${bgClass}`}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BackgroundProvider>
        <AppContent />
      </BackgroundProvider>
    </AuthProvider>
  );
}

export default App;
