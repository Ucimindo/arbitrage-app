import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Settings {
  minProfitThreshold: string;
  slippageTolerance: string;
  maxPositionSize: string;
  autoExecute: string;
  soundAlerts: string;
}

export default function SettingsPanel() {
  const { toast } = useToast();
  
  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const [formData, setFormData] = useState<Settings>({
    minProfitThreshold: '',
    slippageTolerance: '',
    maxPositionSize: '',
    autoExecute: 'false',
    soundAlerts: 'false',
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Settings) => {
      const response = await apiRequest("POST", "/api/settings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings Updated",
        description: "Your settings have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  // Initialize form data when settings are loaded
  useState(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Trading Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Trading Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="minProfitThreshold" className="text-sm text-muted-foreground">
              Minimum Profit Threshold
            </Label>
            <div className="flex items-center space-x-2">
              <Input
                id="minProfitThreshold"
                type="number"
                value={formData.minProfitThreshold}
                onChange={(e) => setFormData({ ...formData, minProfitThreshold: e.target.value })}
                className="flex-1 bg-muted border-border font-mono"
                placeholder="50"
              />
              <span className="text-muted-foreground">USDT</span>
            </div>
          </div>
          
          <div>
            <Label htmlFor="slippageTolerance" className="text-sm text-muted-foreground">
              Slippage Tolerance
            </Label>
            <div className="flex items-center space-x-2">
              <Input
                id="slippageTolerance"
                type="number"
                step="0.1"
                value={formData.slippageTolerance}
                onChange={(e) => setFormData({ ...formData, slippageTolerance: e.target.value })}
                className="flex-1 bg-muted border-border font-mono"
                placeholder="0.5"
              />
              <span className="text-muted-foreground">%</span>
            </div>
          </div>
          
          <div>
            <Label htmlFor="maxPositionSize" className="text-sm text-muted-foreground">
              Max Position Size
            </Label>
            <div className="flex items-center space-x-2">
              <Input
                id="maxPositionSize"
                type="number"
                value={formData.maxPositionSize}
                onChange={(e) => setFormData({ ...formData, maxPositionSize: e.target.value })}
                className="flex-1 bg-muted border-border font-mono"
                placeholder="1000"
              />
              <span className="text-muted-foreground">USDT</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="autoExecute" className="text-sm text-muted-foreground">
              Auto-Execute
            </Label>
            <Switch
              id="autoExecute"
              checked={formData.autoExecute === 'true'}
              onCheckedChange={(checked) => setFormData({ ...formData, autoExecute: String(checked) })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="soundAlerts" className="text-sm text-muted-foreground">
              Sound Alerts
            </Label>
            <Switch
              id="soundAlerts"
              checked={formData.soundAlerts === 'true'}
              onCheckedChange={(checked) => setFormData({ ...formData, soundAlerts: String(checked) })}
            />
          </div>
          
          <Button 
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 mt-4"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Updating...' : 'Update Settings'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
