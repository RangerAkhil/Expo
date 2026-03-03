import { Map, Zap } from "lucide-react";
import { useRole } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";

export function Header() {
  const { role, setRole } = useRole();

  return (
    <header className="sticky top-0 z-50 w-full glass">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          <div className="bg-primary/10 p-2 rounded-xl">
            <Map className="w-6 h-6" />
          </div>
          <span className="font-display font-bold text-xl text-foreground tracking-tight">
            EventScout
          </span>
        </div>

        <nav className="flex items-center gap-2 bg-secondary/50 p-1.5 rounded-2xl border border-border/50">
          <Button
            variant={role === "organizer" ? "default" : "ghost"}
            size="sm"
            onClick={() => setRole("organizer")}
            className="rounded-xl transition-all duration-300"
          >
            Organizer
          </Button>
          <Button
            variant={role === "user" ? "default" : "ghost"}
            size="sm"
            onClick={() => setRole("user")}
            className="rounded-xl transition-all duration-300"
          >
            User
          </Button>
          <Button
            variant={role === "demo" ? "default" : "ghost"}
            size="sm"
            onClick={() => setRole("demo")}
            className="rounded-xl transition-all duration-300"
          >
            <Zap className="w-4 h-4 mr-1.5" />
            Demo Mode
          </Button>
        </nav>
      </div>
    </header>
  );
}
