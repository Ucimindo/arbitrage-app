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
  thresholdMode: string; // "fixed" | "percent"
  minProfitFixed: string;
  minProfitPercent: string;
  slippageTolerance: string;
  maxPositionSize: string;
  autoExecute: string;
  soundAlerts: string;
  scannerIntervalSec: string;
  sessionDurationSec: string;
  autoExecMaxPerSession: string;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/settings"],
    enabled: isOpen,
  });

  const [formData, setFormData] = useState<Settings>({
    thresholdMode: "",
    minProfitFixed: "",
    minProfitPercent: "",
    slippageTolerance: "",
    maxPositionSize: "",
    autoExecute: "",
    soundAlerts: "",
    scannerIntervalSec: "",
    sessionDurationSec: "",
    autoExecMaxPerSession: "",
  });

  // Update form when settings load
  useState(() => {
    if (settings) {
      setFormData({
        thresholdMode: settings.thresholdMode || "fixed",
        minProfitFixed: settings.minProfitFixed || "50",
        minProfitPercent: settings.minProfitPercent || "5",
        slippageTolerance: settings.slippageTolerance || "0.5",
        maxPositionSize: settings.maxPositionSize || "1000",
        autoExecute: settings.autoExecute || "false",
        soundAlerts: settings.soundAlerts || "false",
        scannerIntervalSec: settings.scannerIntervalSec || "5",
        sessionDurationSec: settings.sessionDurationSec || "600",
        autoExecMaxPerSession: settings.autoExecMaxPerSession || "5",
      });
    }
  });

  // Sync form data when settings change
  if (settings && formData.thresholdMode === "") {
    setFormData({
      thresholdMode: settings.thresholdMode || "fixed",
      minProfitFixed: settings.minProfitFixed || "50",
      minProfitPercent: settings.minProfitPercent || "5",
      slippageTolerance: settings.slippageTolerance || "0.5",
      maxPositionSize: settings.maxPositionSize || "1000",
      autoExecute: settings.autoExecute || "false",
      soundAlerts: settings.soundAlerts || "false",
      scannerIntervalSec: settings.scannerIntervalSec || "5",
      sessionDurationSec: settings.sessionDurationSec || "600",
      autoExecMaxPerSession: settings.autoExecMaxPerSession || "5",
    });
  }

  const updateMutation = useMutation({
    mutationFn: async (data: Settings) => {
      const response = await apiRequest("POST", "/api/settings", data);
      return response.json();
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

  // Calculate derived values for display
  const calculateMinProfitRequired = () => {
    const mode = formData.thresholdMode;
    const maxPosition = parseFloat(formData.maxPositionSize) || 1000;
    const fixedThreshold = parseFloat(formData.minProfitFixed) || 50;
    const percentThreshold = parseFloat(formData.minProfitPercent) || 5;
    
    // Estimated gas fees (BNB Chain + Polygon)
    const estimatedGasFee = 0.85 + 0.05; // ~$0.90 total
    
    let rawThreshold = 0;
    if (mode === "percent") {
      rawThreshold = (maxPosition * percentThreshold) / 100;
    } else {
      rawThreshold = fixedThreshold;
    }
    
    return {
      rawThreshold: rawThreshold.toFixed(2),
      gasEstimate: estimatedGasFee.toFixed(2),
      netRequired: (rawThreshold + estimatedGasFee).toFixed(2)
    };
  };

  const calculations = calculateMinProfitRequired();

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
                {/* Profit Threshold Mode Toggle */}
                <div className="space-y-3">
                  <Label>Profit Threshold Mode</Label>
                  <div className="flex items-center space-x-4 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="fixed-mode"
                        name="thresholdMode"
                        value="fixed"
                        checked={formData.thresholdMode === "fixed"}
                        onChange={(e) => handleInputChange('thresholdMode', e.target.value)}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="fixed-mode" className="text-sm font-medium">
                        Use Fixed Profit (USDT)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="percent-mode"
                        name="thresholdMode"
                        value="percent"
                        checked={formData.thresholdMode === "percent"}
                        onChange={(e) => handleInputChange('thresholdMode', e.target.value)}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="percent-mode" className="text-sm font-medium">
                        Use Percent Profit (%)
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Dynamic Profit Threshold Input */}
                  <div className="space-y-2">
                    <Label htmlFor="profitThreshold">
                      {formData.thresholdMode === "fixed" 
                        ? "Minimum Profit Threshold" 
                        : "Minimum Profit Percentage"}
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="profitThreshold"
                        type="number"
                        step={formData.thresholdMode === "fixed" ? "0.01" : "0.1"}
                        value={formData.thresholdMode === "fixed" 
                          ? formData.minProfitFixed 
                          : formData.minProfitPercent}
                        onChange={(e) => handleInputChange(
                          formData.thresholdMode === "fixed" ? 'minProfitFixed' : 'minProfitPercent', 
                          e.target.value
                        )}
                        placeholder={formData.thresholdMode === "fixed" ? "50.00" : "5.0"}
                      />
                      <span className="text-sm text-muted-foreground">
                        {formData.thresholdMode === "fixed" ? "USDT" : "%"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formData.thresholdMode === "fixed" 
                        ? "Fixed USDT amount required for execution"
                        : "Percentage of position size required as profit"}
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

                {/* Calculated Values Display */}
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-3">
                    Profit Calculations (including gas fees)
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Min Profit Required:</span>
                      <span className="font-medium">{calculations.rawThreshold} USDT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estimated Gas Fee:</span>
                      <span className="font-medium">{calculations.gasEstimate} USDT</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between text-base">
                      <span className="font-medium">Min Net Profit Required:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {calculations.netRequired} USDT
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Trades will only execute if estimated profit exceeds this net amount
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

            <Separator />

            {/* Auto Execution Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Auto Execution Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scannerInterval">Scanner Interval</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="scannerInterval"
                        type="number"
                        min="1"
                        max="60"
                        value={formData.scannerIntervalSec}
                        onChange={(e) => handleInputChange('scannerIntervalSec', e.target.value)}
                        placeholder="5"
                      />
                      <span className="text-sm text-muted-foreground">sec</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      How often to scan for opportunities
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sessionDuration">Session Duration</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="sessionDuration"
                        type="number"
                        min="60"
                        max="3600"
                        value={formData.sessionDurationSec}
                        onChange={(e) => handleInputChange('sessionDurationSec', e.target.value)}
                        placeholder="600"
                      />
                      <span className="text-sm text-muted-foreground">sec</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Auto execution session limit ({Math.floor(parseInt(formData.sessionDurationSec || "600") / 60)} min)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxAutoExec">Max Auto Executions</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="maxAutoExec"
                        type="number"
                        min="1"
                        max="20"
                        value={formData.autoExecMaxPerSession}
                        onChange={(e) => handleInputChange('autoExecMaxPerSession', e.target.value)}
                        placeholder="5"
                      />
                      <span className="text-sm text-muted-foreground">trades</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Maximum auto trades per session
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Session Protection:</strong> Auto execution will stop after {formData.autoExecMaxPerSession || "5"} trades 
                    or {Math.floor(parseInt(formData.sessionDurationSec || "600") / 60)} minutes, whichever comes first.
                  </p>
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