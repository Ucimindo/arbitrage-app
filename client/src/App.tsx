import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/useAuth";

function ProtectedRoute({ component: Component, ...props }: any) {
  const { isAuthenticated, isLoading, user } = useAuth();

  console.log('ProtectedRoute - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated, 'user:', user);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('User not authenticated, showing login');
    return <Login />;
  }

  console.log('User authenticated, showing dashboard');
  return <Component {...props} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/test" component={Home} />
      <Route path="/" component={(props) => <ProtectedRoute component={Home} {...props} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background text-foreground">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
