import React, { useState, useEffect } from "react";
import { base44 } from "../api/base44Client";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X, Loader2, GitCompare, CheckCircle2, AlertCircle, Package, Download, Trash2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import ArtifactDetailModal from "../artifacts/ArtifactDetailModal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function ArtifactComparison() {
  const [allArtifacts, setAllArtifacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedArtifacts, setSelectedArtifacts] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [viewingArtifact, setViewingArtifact] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [savedComparisons, setSavedComparisons] = useState([]);
  const [deletingComparison, setDeletingComparison] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadData();
    loadSavedComparisons();
  }, []);

  const loadData = async () => {
    try {
      const artifacts = await base44.entities.Artifact.list("-created_date");
      setAllArtifacts(artifacts);
      const user = await base44.auth.me();
      setCurrentUser(user);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load artifacts");
    }
  };

  const loadSavedComparisons = () => {
    const saved = localStorage.getItem('artifact_comparisons');
    if (saved) {
      setSavedComparisons(JSON.parse(saved));
    }
  };

  const saveComparison = (comparison) => {
    const newComparison = {
      id: Date.now(),
      date: new Date().toISOString(),
      artifacts: selectedArtifacts.map(a => ({ id: a.id, code: a.artifact_code })),
      result: comparison
    };
    const updated = [newComparison, ...savedComparisons];
    localStorage.setItem('artifact_comparisons', JSON.stringify(updated));
    setSavedComparisons(updated);
  };

  const deleteComparison = () => {
    if (!deletingComparison) return;
    const updated = savedComparisons.filter(c => c.id !== deletingComparison.id);
    localStorage.setItem('artifact_comparisons', JSON.stringify(updated));
    setSavedComparisons(updated);
    setDeletingComparison(null);
    toast.success("Comparison deleted");
  };

  const loadSavedComparison = async (comparison) => {
    const artifactIds = comparison.artifacts.map(a => a.id);
    const artifacts = allArtifacts.filter(a => artifactIds.includes(a.id));
    setSelectedArtifacts(artifacts);
    setComparisonResult(comparison.result);
    setShowHistory(false);
  };

  const handleExport = (format) => {
    if (!comparisonResult) return;

    const exportData = {
      date: new Date().toISOString(),
      artifacts: selectedArtifacts.map(a => ({
        code: a.artifact_code,
        type: a.artifact_type,
        notes: a.user_notes
      })),
      analysis: comparisonResult
    };

    let content, filename, mimeType;

    if (format === 'json') {
      content = JSON.stringify(exportData, null, 2);
      filename = `comparison-${new Date().toISOString().split('T')[0]}.json`;
      mimeType = 'application/json';
    } else if (format === 'txt') {
      content = `ARTIFACT COMPARISON REPORT\nDate: ${new Date(exportData.date).toLocaleString()}\n\nARTIFACTS COMPARED:\n${exportData.artifacts.map(a => `- ${a.code}: ${a.type}`).join('\n')}\n\nANALYSIS:\n${exportData.analysis}`;
      filename = `comparison-${new Date().toISOString().split('T')[0]}.txt`;
      mimeType = 'text/plain';
    } else if (format === 'pdf') {
      // For PDF, we'll create a simple HTML and use print to PDF
      const htmlContent = `
        <html>
          <head>
            <title>Artifact Comparison</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; }
              h1 { color: #2563eb; }
              h2 { color: #4b5563; margin-top: 30px; }
              .artifact { background: #f3f4f6; padding: 10px; margin: 10px 0; border-radius: 5px; }
              .analysis { white-space: pre-wrap; line-height: 1.6; }
            </style>
          </head>
          <body>
            <h1>Artifact Comparison Report</h1>
            <p><strong>Date:</strong> ${new Date(exportData.date).toLocaleString()}</p>
            <h2>Artifacts Compared:</h2>
            ${exportData.artifacts.map(a => `<div class="artifact"><strong>${a.code}</strong> - ${a.type}</div>`).join('')}
            <h2>Analysis:</h2>
            <div class="analysis">${exportData.analysis}</div>
          </body>
        </html>
      `;
      
      const printWindow = window.open('', '', 'height=600,width=800');
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
      toast.success("PDF print dialog opened");
      return;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported as ${format.toUpperCase()}`);
  };

  const toggleArtifactSelection = (artifact) => {
    if (selectedArtifacts.some(a => a.id === artifact.id)) {
      setSelectedArtifacts(selectedArtifacts.filter(a => a.id !== artifact.id));
      setComparisonResult(null);
    } else {
      if (selectedArtifacts.length >= 5) {
        toast.error("Maximum 5 artifacts can be compared at once");
        return;
      }
      setSelectedArtifacts([...selectedArtifacts, artifact]);
      setComparisonResult(null);
    }
  };

  const handleCompare = async () => {
    if (selectedArtifacts.length < 2) {
      toast.error("Please select at least 2 artifacts to compare");
      return;
    }

    setIsAnalyzing(true);
    try {
      const artifactDetails = selectedArtifacts.map(a => ({
        id: a.id,
        code: a.artifact_code,
        type: a.artifact_type,
        user_notes: a.user_notes,
        admin_notes: a.admin_notes,
        location: { lat: a.location_lat, lng: a.location_lng },
        is_interesting: a.is_interesting
      }));

      const prompt = `You are an expert archaeologist. Compare these ${selectedArtifacts.length} artifacts in detail:

${JSON.stringify(artifactDetails, null, 2)}

Provide a comprehensive comparison analysis. IMPORTANT: Format your response using dashed bullet points (- ) and **bold headers** instead of hashtags.

Structure your analysis as follows:

**Similarities**
- What materials, features, or patterns do these artifacts share?
- Are there common manufacturing techniques?
- Do they share stylistic elements?

**Differences**
- How do they differ in size, condition, or features?
- Are there variations in provenance or context?
- What typological differences exist?

**Relationships**
- Are they likely from the same period or culture?
- Could they have been used together or served related purposes?
- What does their spatial distribution tell us?

**Significance**
- What does this comparison reveal about the collection?
- Are there unexpected patterns or connections?
- What insights can we gain about the archaeological context?

**Recommendations**
- Should these artifacts be displayed together?
- What further analysis or research is recommended?
- Are there conservation considerations?

Reference artifacts using [ARTIFACT_ID: {id}] format for clickable links.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false
      });

      setComparisonResult(response);
      saveComparison(response);
      toast.success("Comparison analysis complete!");
    } catch (error) {
      console.error("Error analyzing artifacts:", error);
      toast.error("Failed to analyze artifacts");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredArtifacts = allArtifacts.filter(a =>
    a.artifact_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.user_notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.artifact_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeColor = (type) => {
    const colors = {
      pottery: "bg-orange-100 text-orange-800",
      glass: "bg-cyan-100 text-cyan-800",
      metal: "bg-gray-100 text-gray-800",
      stone: "bg-slate-100 text-slate-800",
      bone: "bg-amber-100 text-amber-800",
      textile: "bg-pink-100 text-pink-800",
      wood: "bg-green-100 text-green-800",
      other: "bg-blue-100 text-blue-800"
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
      <div className="lg:w-1/2 flex flex-col min-h-0">
        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Select Artifacts ({selectedArtifacts.length}/5)
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                History ({savedComparisons.length})
              </Button>
            </div>
            {!showHistory && (
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search artifacts..."
                  className="pl-10"
                />
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto min-h-0">
            {showHistory ? (
              <div className="space-y-2">
                {savedComparisons.length === 0 ? (
                  <p className="text-gray-500 text-center py-8 text-sm">No saved comparisons</p>
                ) : (
                  savedComparisons.map((comp) => (
                    <div key={comp.id} className="p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium mb-1">
                            {comp.artifacts.map(a => a.code).join(', ')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(comp.date).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => loadSavedComparison(comp)}
                            className="h-8 w-8"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeletingComparison(comp)}
                            className="h-8 w-8 text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <>
                {selectedArtifacts.length > 0 && (
                  <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm">Selected for Comparison:</h3>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedArtifacts([]);
                          setComparisonResult(null);
                        }}
                        variant="ghost"
                      >
                        Clear All
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {selectedArtifacts.map((artifact) => (
                        <div key={artifact.id} className="flex items-center gap-2 bg-white rounded-lg p-2 border">
                          {artifact.photo_url && (
                            <img src={artifact.photo_url} alt="Artifact" className="w-12 h-12 rounded object-cover" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{artifact.artifact_code || "Unnamed"}</p>
                            <Badge className={`${getTypeColor(artifact.artifact_type)} text-xs`}>
                              {artifact.artifact_type || "uncategorized"}
                            </Badge>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => toggleArtifactSelection(artifact)}
                            className="h-8 w-8"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      className="w-full mt-3 bg-blue-600 hover:bg-blue-700"
                      onClick={handleCompare}
                      disabled={selectedArtifacts.length < 2 || isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <GitCompare className="w-4 h-4 mr-2" />
                          Compare {selectedArtifacts.length} Artifacts
                        </>
                      )}
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
                  {filteredArtifacts.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No artifacts found</p>
                  ) : (
                    filteredArtifacts.map((artifact) => (
                      <div
                        key={artifact.id}
                        onClick={() => toggleArtifactSelection(artifact)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedArtifacts.some(a => a.id === artifact.id)
                            ? "bg-purple-50 border-purple-300 ring-2 ring-purple-200"
                            : "hover:bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {artifact.photo_url && (
                            <img src={artifact.photo_url} alt="Artifact" className="w-16 h-16 rounded object-cover flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{artifact.artifact_code || "Unnamed"}</p>
                            {artifact.artifact_type && artifact.artifact_type !== "uncategorized" && (
                              <Badge className={`${getTypeColor(artifact.artifact_type)} text-xs mt-1`}>
                                {artifact.artifact_type}
                              </Badge>
                            )}
                            {artifact.user_notes && (
                              <p className="text-xs text-gray-500 truncate mt-1">{artifact.user_notes}</p>
                            )}
                          </div>
                          {selectedArtifacts.some(a => a.id === artifact.id) && (
                            <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:w-1/2 flex flex-col min-h-0">
        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <GitCompare className="w-5 h-5" />
                Comparison Analysis
              </CardTitle>
              {comparisonResult && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleExport('json')}>
                    <Download className="w-4 h-4 mr-1" />
                    JSON
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleExport('txt')}>
                    <Download className="w-4 h-4 mr-1" />
                    TXT
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleExport('pdf')}>
                    <Download className="w-4 h-4 mr-1" />
                    PDF
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto min-h-0">
            {!comparisonResult && !isAnalyzing && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md px-4">
                  <GitCompare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Comparison Yet</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Select 2-5 artifacts from the left panel and click "Compare" to get an AI-powered analysis
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                    <h4 className="font-semibold text-sm mb-2">The AI will analyze:</h4>
                    <ul className="text-xs text-gray-700 space-y-1">
                      <li>- Similarities in materials and features</li>
                      <li>- Differences in type and condition</li>
                      <li>- Potential relationships and context</li>
                      <li>- Archaeological significance</li>
                      <li>- Recommendations for research</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {isAnalyzing && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
                  <h3 className="text-lg font-semibold mb-2">Analyzing Artifacts...</h3>
                  <p className="text-gray-600 text-sm">
                    The AI is examining {selectedArtifacts.length} artifacts and identifying patterns
                  </p>
                </div>
              </div>
            )}

            {comparisonResult && !isAnalyzing && (
              <div className="prose prose-sm max-w-none">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-900">Analysis Complete</span>
                  </div>
                  <p className="text-xs text-green-700 mt-1">
                    Compared {selectedArtifacts.length} artifacts
                  </p>
                </div>
                <div className="bg-white rounded-lg border p-4 whitespace-pre-wrap text-sm leading-relaxed">
                  {comparisonResult}
                </div>
                <Button
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                  onClick={handleCompare}
                >
                  <GitCompare className="w-4 h-4 mr-2" />
                  Re-analyze
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {viewingArtifact && (
        <ArtifactDetailModal
          artifact={viewingArtifact}
          onClose={() => setViewingArtifact(null)}
          onUpdate={async () => {
            await loadData();
            setViewingArtifact(null);
          }}
          isAdmin={currentUser?.role === "admin"}
        />
      )}

      <AlertDialog open={!!deletingComparison} onOpenChange={() => setDeletingComparison(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comparison?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this comparison from your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteComparison} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}