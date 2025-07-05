import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import { ProviderProvider } from "@/contexts/ProviderContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import LoginPage from "@/pages/login";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Calendar from "@/pages/calendar";
import Tasks from "@/pages/tasks";
import Analytics from "@/pages/analytics";
import Health from "@/pages/health";
import Finance from "@/pages/finance";
import Journal from "@/pages/journal";
import Preferences from "@/pages/preferences";
import Admin from "@/pages/admin";

function Router() {
  const { isAuthenticated, isLoading, error } = useAuth();

  // Eğer yükleniyorsa loading göster
  if (isLoading) {
    return <div>Yükleniyor...</div>;
  }

  // Error varsa (403/401) veya kullanıcı giriş yapmamışsa login göster
  if (error || !isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={LoginPage} />
        <Route path="/login" component={LoginPage} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <TenantProvider>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/calendar" component={Calendar} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/health" component={Health} />
        <Route path="/finance" component={Finance} />
        <Route path="/journal" component={Journal} />
        <Route path="/preferences" component={Preferences} />
        <Route path="/admin" component={Admin} />
        <Route component={NotFound} />
      </Switch>
    </TenantProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ProviderProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ProviderProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
