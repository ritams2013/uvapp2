import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Sparkles, FileText } from "lucide-react";
import { base44 } from "../api/base44Client";

import { toast } from "sonner";

export default function AISettingsDialog({ onClose }) {
  const [settings, setSettings] = useState({
    preferred_model: 'default',
    analysis_depth: 'detailed',
    custom_instructions: '',
    report_templates: {
      summary: true,
      detailed: true,
      brief: true
    }
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const user = await base44.auth.me();
      if (user?.ai_settings) {
        setSettings({ ...settings, ...user.ai_settings });
      }
    } catch (error) {
      console.error("Error loading AI settings:", error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await base44.auth.updateMe({
        ai_settings: settings
      });
      toast.success("AI settings saved successfully!");
      onClose();
    } catch (error) {
      console.error("Error saving AI settings:", error);
      toast.error("Failed to save AI settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            AI Tool Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="general" className="space-y-4 p-4">
              <div className="space-y-2">
                <Label htmlFor="model">Preferred AI Model</Label>
                <Select
                  value={settings.preferred_model}
                  onValueChange={(value) => setSettings({ ...settings, preferred_model: value })}
                >
                  <SelectTrigger id="model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default (Balanced)</SelectItem>
                    <SelectItem value="fast">Fast (Quick responses)</SelectItem>
                    <SelectItem value="detailed">Detailed (Comprehensive)</SelectItem>
                    <SelectItem value="creative">Creative (Exploratory)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Choose the AI model that best fits your research needs
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="depth">Analysis Depth</Label>
                <Select
                  value={settings.analysis_depth}
                  onValueChange={(value) => setSettings({ ...settings, analysis_depth: value })}
                >
                  <SelectTrigger id="depth">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brief">Brief (Quick overview)</SelectItem>
                    <SelectItem value="standard">Standard (Balanced)</SelectItem>
                    <SelectItem value="detailed">Detailed (Comprehensive)</SelectItem>
                    <SelectItem value="exhaustive">Exhaustive (Maximum depth)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Control how thorough the AI analysis should be
                </p>
              </div>
            </TabsContent>

            <TabsContent value="analysis" className="space-y-4 p-4">
              <div className="space-y-2">
                <Label htmlFor="instructions">Custom Analysis Instructions</Label>
                <Textarea
                  id="instructions"
                  placeholder="Enter specific instructions for the AI when analyzing artifacts..."
                  value={settings.custom_instructions}
                  onChange={(e) => setSettings({ ...settings, custom_instructions: e.target.value })}
                  rows={8}
                />
                <p className="text-xs text-gray-500">
                  Provide custom instructions to guide AI analysis. For example: "Focus on ceramic dating techniques" or "Prioritize conservation concerns"
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Pro Tips
                </h4>
                <ul className="text-xs text-gray-700 space-y-1">
                  <li>- Be specific about artifact types you work with most</li>
                  <li>- Mention any regional or cultural focus areas</li>
                  <li>- Specify preferred terminology or classification systems</li>
                  <li>- Note any special analytical methodologies</li>
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="templates" className="space-y-4 p-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Report Template Preferences
                </h3>
                <p className="text-xs text-gray-500">
                  Choose which report templates are available for your analyses
                </p>

                <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Summary Reports</p>
                      <p className="text-xs text-gray-500">Quick overview with key findings</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.report_templates.summary}
                      onChange={(e) => setSettings({
                        ...settings,
                        report_templates: { ...settings.report_templates, summary: e.target.checked }
                      })}
                      className="h-4 w-4"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Detailed Reports</p>
                      <p className="text-xs text-gray-500">Comprehensive analysis with references</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.report_templates.detailed}
                      onChange={(e) => setSettings({
                        ...settings,
                        report_templates: { ...settings.report_templates, detailed: e.target.checked }
                      })}
                      className="h-4 w-4"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Brief Reports</p>
                      <p className="text-xs text-gray-500">Concise findings for quick review</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.report_templates.brief}
                      onChange={(e) => setSettings({
                        ...settings,
                        report_templates: { ...settings.report_templates, brief: e.target.checked }
                      })}
                      className="h-4 w-4"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700">
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}