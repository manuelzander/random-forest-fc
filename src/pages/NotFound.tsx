import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center page-container p-4">
      <div className="glass-card text-center max-w-md mx-auto p-8 sm:p-12">
        <h1 className="font-display text-6xl sm:text-8xl text-foreground mb-2">404</h1>
        <p className="text-lg sm:text-xl text-muted-foreground mb-6">Oops! Page not found</p>
        <Button asChild>
          <a 
            href="/" 
            className="inline-block"
          >
            Return to Home
          </a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
