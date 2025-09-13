import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingIndicatorProps {
  isLoading: boolean;
  message?: string;
  className?: string;
}

export default function LoadingIndicator({ 
  isLoading, 
  message = "Updating availability...", 
  className 
}: LoadingIndicatorProps) {
  if (!isLoading) return null;

  return (
    <div 
      className={cn(
        "fixed top-4 right-4 bg-card border border-border rounded-lg p-3 shadow-lg z-50",
        className
      )}
      data-testid="loading-indicator"
    >
      <div className="flex items-center space-x-2">
        <Loader2 className="animate-spin w-4 h-4 text-primary" />
        <span className="text-sm text-foreground" data-testid="text-loading-message">
          {message}
        </span>
      </div>
    </div>
  );
}
