import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowLeft, GitCompare, FileText, Settings } from "lucide-react";
import ArtifactAnalyzer from "../components/ai/ArtifactAnalyzer";
import ArtifactComparison from "../components/ai/ArtifactComparison";
import ArtifactReporting from "../components/ai/ArtifactReporting";
import AISettingsDialog from "../components/ai/AISettingsDialog";

export default function AITools() {
  const [selectedTool, setSelectedTool] = useState(null);
  const [artifactCount, setArtifactCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadArtifactCount();
  }, []);

  const loadArtifactCount = async () => {
    try {
      const artifacts = await base44.entities.Artifact.list();
      setArtifactCount(artifacts.length);
    } catch (error) {
      console.error("Error loading artifacts:", error);
    }
  };

  const tools = [
    {
      id: "analyzer",
      name: "Artifact Analyzer",
      description: "AI-powered artifact analysis with conversation history",
      icon: Sparkles,
      color: "bg-purple-500",
      component: ArtifactAnalyzer,
    },
    {
      id: "comparison",
      name: "Artifact Comparison",
      description: "Compare multiple artifacts and identify patterns",
      icon: GitCompare,
      color: "bg-blue-500",
      component: ArtifactComparison,
    },
    {
      id: "reporting",
      name: "Advanced Reporting",
      description: "Generate comprehensive collection reports",
      icon: FileText,
      color: "bg-green-500",
      component: ArtifactReporting,
    },
  ];

  if (selectedTool) {
    const Tool = tools.find(t => t.id === selectedTool)?.component;
    return (
      <div className="h-screen flex flex-col bg-[#FAFAF9]">
        <div className="p-4 md:p-6 bg-white border-b flex-shrink-0">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedTool(null)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                  {tools.find(t => t.id === selectedTool)?.name}
                </h1>
                <p className="text-xs md:text-sm text-gray-600">
                  {tools.find(t => t.id === selectedTool)?.description}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowSettings(true);
              }}
            >
              <Settings className="w-4 h-4 mr-1" />
              Settings
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {Tool && <Tool />}
        </div>

        {showSettings && (
          <AISettingsDialog onClose={() => setShowSettings(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Tools</h1>
            <p className="text-gray-600 mt-2">
              Advanced AI-powered artifact analysis and insights
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setShowSettings(true);
            }}
          >
            <Settings className="w-4 h-4 mr-1" />
            Settings
          </Button>
        </div>

        <Card className="p-6 mb-8 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-1">Database Overview</h2>
              <p className="text-gray-600">
                {artifactCount} artifacts available for AI analysis
              </p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Card
                key={tool.id}
                className="p-6 cursor-pointer hover:shadow-xl transition-all duration-300 group"
                onClick={() => setSelectedTool(tool.id)}
              >
                <div className="flex flex-col items-center text-center">
                  <div
                    className={`w-16 h-16 ${tool.color} rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{tool.name}</h3>
                  <p className="text-gray-600 text-sm">{tool.description}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {showSettings && (
        <AISettingsDialog onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}