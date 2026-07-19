import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { useState, useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Feedback from "./pages/Feedback";
import Analytics from "./pages/Analytics";
import Themes from "./pages/Themes";
import Features from "./pages/Features";
import Prioritization from "./pages/Prioritization";
import PRD from "./pages/PRD";
import Roadmap from "./pages/Roadmap";
import Chat from "./pages/Chat";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import SignUp from "./pages/SignUp";
import ResetPasswordConfirm from "./pages/ResetPasswordConfirm";
import TwoFactorAuth from "./pages/TwoFactorAuth";

function Router({ isAuthenticated, onLogout }: { isAuthenticated: boolean; onLogout: () => void }) {
  // make sure to consider if you need authentication for certain routes
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/signup" component={SignUp} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPasswordConfirm} />
        <Route path="/two-factor-auth" component={TwoFactorAuth} />
        <Route component={Login} />
      </Switch>
    );
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 overflow-auto" data-logout={onLogout}>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/feedback" component={Feedback} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/themes" component={Themes} />
          <Route path="/features" component={Features} />
          <Route path="/prioritization" component={Prioritization} />
          <Route path="/prd" component={PRD} />
          <Route path="/roadmap" component={Roadmap} />
          <Route path="/chat" component={Chat} />
          <Route path="/404" component={NotFound} />
          {/* Final fallback route */}
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const user = localStorage.getItem('user');
    const twoFactorVerified = localStorage.getItem('twoFactorVerified');
    
    // Only authenticate if both user exists AND 2FA is verified
    if (user && twoFactorVerified === 'true') {
      setIsAuthenticated(true);
    } else {
      // Clear any incomplete auth data
      localStorage.removeItem('user');
      localStorage.removeItem('twoFactorVerified');
      localStorage.removeItem('pendingUser');
      setIsAuthenticated(false);
    }
    setIsLoading(false);
  }, []);

  // Function to logout
  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('twoFactorVerified');
    localStorage.removeItem('pendingUser');
    localStorage.removeItem('authStep');
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router isAuthenticated={isAuthenticated} onLogout={handleLogout} />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
