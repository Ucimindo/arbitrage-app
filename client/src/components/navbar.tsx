import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Settings, LogOut, User } from "lucide-react";
import { useArbitrage } from "@/hooks/use-arbitrage";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface NavbarProps {
  isConnected: boolean;
  onOpenSettings: () => void;
  onRefresh?: () => void;
}

export default function Navbar({ isConnected, onOpenSettings, onRefresh }: NavbarProps) {
  const { refetchAll } = useArbitrage();
  const { user, logout } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    if (onRefresh) {
      onRefresh(); // Use dashboard's full refresh if provided
    } else {
      await refetchAll(); // Fallback to hook's refetch
    }
    
    // Brief loading feedback
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <nav className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-foreground">Dual Wallet Arbitrage</h1>
          <div className="flex items-center space-x-2">
            <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button variant="outline" size="sm" onClick={onOpenSettings}>
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          
          {user && (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{user.username}</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={logout}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          )}
          
          <Badge variant={isConnected ? "default" : "secondary"} className={`${
            isConnected ? "bg-green-600 text-white" : "bg-red-600 text-white"
          } px-3 py-1`}>
            {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
          </Badge>
        </div>
      </div>
    </nav>
  );
}
