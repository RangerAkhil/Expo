import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { RoleProvider } from "@/hooks/use-role";
import { Header } from "@/components/Header";
import Dashboard from "@/pages/Dashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <TooltipProvider>
      <RoleProvider>
        <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20">
          <Header />
          <main className="flex-1">
            <Router />
          </main>
        </div>
      </RoleProvider>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
