import { useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import ArbitrageDashboard from "@/components/arbitrage-dashboard";

export default function Home() {
  useEffect(() => {
    // Initialize the app
    apiRequest("POST", "/api/init");
  }, []);

  return <ArbitrageDashboard />;
}
