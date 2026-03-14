import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LocaleProvider } from "@/contexts/LocaleContext";

import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import UsernameGuard from "./components/UsernameGuard";
import Dashboard from "./pages/Dashboard";
import CreateChallenge from "./pages/CreateChallenge";
import OnboardingChallenge from "./pages/OnboardingChallenge";
import PhotoVerify from "./pages/PhotoVerify";
import PaymentSuccess from "./pages/PaymentSuccess";
import Shop from "./pages/Shop";
import ShopifyProductDetail from "./pages/ShopifyProductDetail";
import Orders from "./pages/Orders";
import Friends from "./pages/Friends";
import CreateSocialChallenge from "./pages/CreateSocialChallenge";
import CreateGroup from "./pages/CreateGroup";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import PrePermissionDialog from "@/components/PrePermissionDialog";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  return <UsernameGuard>{children}</UsernameGuard>;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  usePushNotifications();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
      <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <Auth />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/onboarding-challenge" element={<ProtectedRoute><OnboardingChallenge /></ProtectedRoute>} />
      <Route path="/create" element={<ProtectedRoute><CreateChallenge /></ProtectedRoute>} />
      <Route path="/verify" element={<ProtectedRoute><PhotoVerify /></ProtectedRoute>} />
      <Route path="/shop" element={<ProtectedRoute><Shop /></ProtectedRoute>} />
      <Route path="/shopify/:handle" element={<ProtectedRoute><ShopifyProductDetail /></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
      <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
      <Route path="/friends/create-social" element={<ProtectedRoute><CreateSocialChallenge /></ProtectedRoute>} />
      <Route path="/friends/create-group" element={<ProtectedRoute><CreateGroup /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};


const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <LocaleProvider>
            <AuthProvider>
              <div className="fixed top-0 left-0 right-0 z-[100] bg-background" style={{ height: 'max(env(safe-area-inset-top, 0px), 1.5rem)' }} />
              <div className="h-screen flex flex-col overflow-hidden bg-background max-w-md mx-auto relative" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 1.5rem)' }}>
                <div className="flex-1 overflow-y-auto">
                  <AppRoutes />
                </div>
              </div>
            </AuthProvider>
          </LocaleProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
