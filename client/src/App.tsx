import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout/layout";
import Dashboard from "@/pages/dashboard";
import Tasks from "@/pages/tasks";
import Timer from "@/pages/timer";
import Reports from "@/pages/reports";
import History from "@/pages/history";
import WhatsAppPage from "@/pages/whatsapp";
import ManagerPage from "@/pages/manager-page";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login-page";
import InitializePage from "@/pages/initialize-page";
import { useAuth } from "@/hooks/useAuth";
import { useSystemInitialized } from "@/hooks/useSystemInitialized";

function AuthenticatedRoutes() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/timer" component={Timer} />
        <Route path="/reports" component={Reports} />
        <Route path="/history" component={History} />
        <Route path="/whatsapp" component={WhatsAppPage} />
        <Route path="/manager" component={ManagerPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function UnauthenticatedRoutes() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route component={LoginPage} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function AppContent() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { isInitialized, isLoading: initLoading } = useSystemInitialized();

  const handleInitialized = (token: string) => {
    // Invalidar cache para recarregar dados do usuário
    queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    queryClient.invalidateQueries({ queryKey: ['/api/auth/is-initialized'] });
  };

  if (initLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se o sistema não foi inicializado, mostrar página de inicialização
  if (!isInitialized) {
    return <InitializePage onInitialized={handleInitialized} />;
  }

  return isAuthenticated ? <AuthenticatedRoutes /> : <UnauthenticatedRoutes />;
}

export default App;