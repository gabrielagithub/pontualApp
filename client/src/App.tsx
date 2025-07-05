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
import LoginPage from "@/pages/login";         // <= importe
import { useAuth } from "@/hooks/useAuth";     // <= importe

function Router() {
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

function App() {
  const { user, loading } = useAuth();

  if (loading) return <div>Carregando...</div>;

  if (!user) return <LoginPage />;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;