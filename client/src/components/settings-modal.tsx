import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Settings {
  minProfitThreshold: string;
  slippageTolerance: string;
  maxPositionSize: string;
  autoExecute: string;
  soundAlerts: string;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/settings"],
    enabled: isOpen,
  });

  const [formData, setFormData] = useState<Settings>({
    minProfitThreshold: "",
    slippageTolerance: "",
    maxPositionSize: "",
    autoExecute: "",
    soundAlerts: "",
  });

  // Update form when settings load
  useState(() => {
    if (settings) {
      setFormData({
        minProfitThreshold: settings.minProfitThreshold || "50",
        slippageTolerance: settings.slippageTolerance || "0.5",
        maxPositionSize: settings.maxPositionSize || "1000",
        autoExecute: settings.autoExecute || "false",
        soundAlerts: settings.soundAlerts || "false",
      });
    }
  });

  // Sync form data when settings change
  if (settings && formData.minProfitThreshold === "") {
    setFormData({
      minProfitThreshold: settings.minProfitThreshold || "50",
      slippageTolerance: settings.slippageTolerance || "0.5",
      maxPositionSize: settings.maxPositionSize || "1000",
      autoExecute: settings.autoExecute || "false",
      soundAlerts: settings.soundAlerts || "false",
    });
  }

  const updateMutation = useMutation({
    mutationFn: async (data: Settings) => {
      const promises = Object.entries(data).map(([key, value]) =>
        apiRequest("POST", "/api/settings", { key, value })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Your trading settings have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      onClose();
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleInputChange = (key: keyof Settings, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSwitchChange = (key: keyof Settings, checked: boolean) => {
    setFormData(prev => ({ ...prev, [key]: checked.toString() }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>⚙️</span>
            <span>Trading Settings</span>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading settings...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Risk Management */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Risk Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minProfit">Minimum Profit Threshold</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="minProfit"
                        type="number"
                        step="0.01"
                        value={formData.minProfitThreshold}
                        onChange={(e) => handleInputChange('minProfitThreshold', e.target.value)}
                        placeholder="50.00"
                      />
                      <span className="text-sm text-muted-foreground">USDT</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Minimum profit required to execute arbitrage
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slippage">Slippage Tolerance</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="slippage"
                        type="number"
                        step="0.1"
                        value={formData.slippageTolerance}
                        onChange={(e) => handleInputChange('slippageTolerance', e.target.value)}
                        placeholder="0.5"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Maximum acceptable price slippage
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxPosition">Maximum Position Size</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="maxPosition"
                      type="number"
                      step="0.01"
                      value={formData.maxPositionSize}
                      onChange={(e) => handleInputChange('maxPositionSize', e.target.value)}
                      placeholder="1000.00"
                    />
                    <span className="text-sm text-muted-foreground">USDT</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Maximum amount to trade in a single arbitrage
                  </p>
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Automation Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Automation & Alerts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="autoExecute">Auto-Execute Trades</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically execute profitable arbitrage opportunities
                    </p>
                  </div>
                  <Switch
                    id="autoExecute"
                    checked={formData.autoExecute === "true"}
                    onCheckedChange={(checked) => handleSwitchChange('autoExecute', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="soundAlerts">Sound Alerts</Label>
                    <p className="text-xs text-muted-foreground">
                      Play sound notifications for profitable opportunities
                    </p>
                  </div>
                  <Switch
                    id="soundAlerts"
                    checked={formData.soundAlerts === "true"}
                    onCheckedChange={(checked) => handleSwitchChange('soundAlerts', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {updateMutation.isPending ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </div>
                ) : (
                  "Save Settings"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}