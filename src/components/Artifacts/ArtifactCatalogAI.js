import React, { useState } from "react";
import { base44 } from "../api/base44Client";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function ArtifactCatalogAI({ artifact, onUpdate }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  const analyzeArtifact = async () => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      const prompt = `You are an expert archaeological AI cataloger. Analyze this artifact and provide structured data.

**Current Artifact Data:**
- Photo: ${artifact.photo_url}
- User Notes: ${artifact.user_notes || 'None'}
- Material: ${artifact.material || 'Not provided'}
- Country: ${artifact.country || 'Not provided'}
- Functional Type: ${artifact.functional_type || 'unknown'}
- Time Period: ${artifact.time_period || 'unknown'}
- Estimated Date: ${artifact.estimated_date || 'Not provided'}
- Location: ${artifact.location_lat && artifact.location_lng ? `${artifact.location_lat}, ${artifact.location_lng}` : 'Not provided'}

**Your Task:**
1. Analyze the artifact image carefully
2. Based on visual analysis and provided metadata, determine:
   - Material composition (if not provided or uncertain)
   - Artifact type (pottery, glass, metal, stone, bone, textile, wood, other)
   - Functional classification (weapon, tool, ornament, vessel, building_material, religious_object, coin, inscription, other)
   - Time period (paleolithic, mesolithic, neolithic, bronze_age, iron_age, classical_antiquity, medieval, renaissance, modern)
   - Estimated date or date range
   - Country/region of origin (if not provided)
3. Provide confidence scores (0-100) for each classification
4. Identify if this might be a duplicate of other artifacts in the database

Return ONLY a JSON object with this exact structure:
{
  "artifact_type": "pottery|glass|metal|stone|bone|textile|wood|other",
  "functional_type": "weapon|tool|ornament|vessel|building_material|religious_object|coin|inscription|other",
  "time_period": "paleolithic|mesolithic|neolithic|bronze_age|iron_age|classical_antiquity|medieval|renaissance|modern",
  "material": "suggested material if not provided",
  "country": "suggested country if not provided",
  "estimated_date": "suggested date range",
  "confidence_scores": {
    "artifact_type": 85,
    "functional_type": 90,
    "time_period": 75,
    "material": 80,
    "overall": 82
  },
  "reasoning": "Brief explanation of classification reasoning",
  "potential_duplicate": false,
  "duplicate_reasoning": "Why this might be a duplicate or not"
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false,
        file_urls: [artifact.photo_url],
        response_json_schema: {
          type: "object",
          properties: {
            artifact_type: { type: "string" },
            functional_type: { type: "string" },
            time_period: { type: "string" },
            material: { type: "string" },
            country: { type: "string" },
            estimated_date: { type: "string" },
            confidence_scores: {
              type: "object",
              properties: {
                artifact_type: { type: "number" },
                functional_type: { type: "number" },
                time_period: { type: "number" },
                material: { type: "number" },
                overall: { type: "number" }
              }
            },
            reasoning: { type: "string" },
            potential_duplicate: { type: "boolean" },
            duplicate_reasoning: { type: "string" }
          }
        }
      });

      setAnalysis(result);
    } catch (error) {
      console.error("AI cataloging error:", error);
      setError(error.message || "Failed to analyze artifact");
      toast.error("AI analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyAnalysis = async () => {
    if (!analysis) return;

    try {
      const updates = {
        artifact_type: analysis.artifact_type || artifact.artifact_type,
        functional_type: analysis.functional_type || artifact.functional_type,
        time_period: analysis.time_period || artifact.time_period,
      };

      // Only update fields that weren't provided by user
      if (!artifact.material && analysis.material) {
        updates.material = analysis.material;
      }
      if (!artifact.country && analysis.country) {
        updates.country = analysis.country;
      }
      if (!artifact.estimated_date && analysis.estimated_date) {
        updates.estimated_date = analysis.estimated_date;
      }

      await base44.entities.Artifact.update(artifact.id, updates);
      toast.success("Artifact cataloged successfully!");
      
      if (onUpdate) {
        await onUpdate({ ...artifact, ...updates });
      }
      
      setAnalysis(null);
    } catch (error) {
      console.error("Error applying analysis:", error);
      toast.error("Failed to update artifact");
    }
  };

  const getConfidenceColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card className="border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="w-5 h-5 text-purple-600" />
          AI Cataloging
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!analysis && !error && (
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Use AI to automatically catalog this artifact based on image and metadata analysis.
            </p>
            <Button
              onClick={analyzeArtifact}
              disabled={isAnalyzing}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze with AI
                </>
              )}
            </Button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="font-semibold text-red-900">Analysis Failed</p>
            </div>
            <p className="text-sm text-red-700">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={analyzeArtifact}
              className="mt-3"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry
            </Button>
          </div>
        )}

        {analysis && (
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-purple-600" />
                <p className="font-semibold text-purple-900">AI Analysis Complete</p>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Artifact Type</p>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-100 text-purple-800">
                      {analysis.artifact_type}
                    </Badge>
                    <span className={`text-sm font-medium ${getConfidenceColor(analysis.confidence_scores?.artifact_type || 0)}`}>
                      {analysis.confidence_scores?.artifact_type || 0}% confident
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Functional Type</p>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-800">
                      {analysis.functional_type}
                    </Badge>
                    <span className={`text-sm font-medium ${getConfidenceColor(analysis.confidence_scores?.functional_type || 0)}`}>
                      {analysis.confidence_scores?.functional_type || 0}% confident
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Time Period</p>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-100 text-amber-800">
                      {analysis.time_period?.replace(/_/g, ' ')}
                    </Badge>
                    <span className={`text-sm font-medium ${getConfidenceColor(analysis.confidence_scores?.time_period || 0)}`}>
                      {analysis.confidence_scores?.time_period || 0}% confident
                    </span>
                  </div>
                </div>

                {analysis.material && !artifact.material && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Suggested Material</p>
                    <Badge variant="outline">{analysis.material}</Badge>
                  </div>
                )}

                {analysis.country && !artifact.country && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Suggested Country</p>
                    <Badge variant="outline">{analysis.country}</Badge>
                  </div>
                )}

                {analysis.estimated_date && !artifact.estimated_date && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Suggested Date</p>
                    <Badge variant="outline">{analysis.estimated_date}</Badge>
                  </div>
                )}

                {analysis.reasoning && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Reasoning</p>
                    <div className="text-sm text-gray-700 prose prose-sm max-w-none">
                      <p>{analysis.reasoning}</p>
                    </div>
                  </div>
                )}

                {analysis.potential_duplicate && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <p className="text-xs font-semibold text-yellow-900 mb-1">⚠️ Potential Duplicate</p>
                    <p className="text-xs text-yellow-800">{analysis.duplicate_reasoning}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={applyAnalysis}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                    size="sm"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Apply Catalog Data
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setAnalysis(null)}
                    size="sm"
                  >
                    Discard
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}