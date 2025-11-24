import React, { useState, useEffect } from "react";
import { base44 } from "../api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, FileText, Download, CheckCircle2, TrendingUp, Sparkles, BarChart3, MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function ArtifactReporting() {
  const [allArtifacts, setAllArtifacts] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState(null);
  const [reportOptions, setReportOptions] = useState({
    summary: true,
    trends: true,
    rare_items: true,
    stylistic_evolution: true,
    location_analysis: true,
    type_distribution: true,
    review_status: true
  });
  const [savedReports, setSavedReports] = useState([]);
  const [deletingReport, setDeletingReport] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadData();
    loadSavedReports();
  }, []);

  const loadData = async () => {
    try {
      const artifacts = await base44.entities.Artifact.list("-created_date");
      setAllArtifacts(artifacts);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load artifacts");
    }
  };

  const loadSavedReports = () => {
    const saved = localStorage.getItem('artifact_reports');
    if (saved) {
      setSavedReports(JSON.parse(saved));
    }
  };

  const saveReport = (reportData) => {
    const newReport = {
      id: Date.now(),
      date: new Date().toISOString(),
      artifact_count: allArtifacts.length,
      options: {...reportOptions},
      content: reportData.content
    };
    const updated = [newReport, ...savedReports];
    localStorage.setItem('artifact_reports', JSON.stringify(updated));
    setSavedReports(updated);
  };

  const deleteReport = () => {
    if (!deletingReport) return;
    const updated = savedReports.filter(r => r.id !== deletingReport.id);
    localStorage.setItem('artifact_reports', JSON.stringify(updated));
    setSavedReports(updated);
    setDeletingReport(null);
    toast.success("Report deleted");
  };

  const loadSavedReport = (savedReport) => {
    setReport({
      content: savedReport.content,
      generated_at: savedReport.date,
      artifact_count: savedReport.artifact_count,
      sections: Object.keys(savedReport.options).filter(k => savedReport.options[k])
    });
    setReportOptions(savedReport.options);
    setShowHistory(false);
  };

  const handleGenerateReport = async () => {
    if (!Object.values(reportOptions).some(v => v)) {
      toast.error("Please select at least one report section");
      return;
    }

    setIsGenerating(true);
    try {
      const artifactsByType = {};
      const artifactsByLocation = {};
      const reviewStats = { reviewed: 0, pending: 0, interesting: 0 };

      allArtifacts.forEach(artifact => {
        const type = artifact.artifact_type || "uncategorized";
        artifactsByType[type] = (artifactsByType[type] || 0) + 1;

        if (artifact.location_lat && artifact.location_lng) {
          const locationKey = `${artifact.location_lat.toFixed(2)},${artifact.location_lng.toFixed(2)}`;
          artifactsByLocation[locationKey] = (artifactsByLocation[locationKey] || 0) + 1;
        }

        if (artifact.admin_reviewed) reviewStats.reviewed++;
        else reviewStats.pending++;
        if (artifact.is_interesting) reviewStats.interesting++;
      });

      const sections = [];
      if (reportOptions.summary) sections.push("comprehensive summary of the collection");
      if (reportOptions.trends) sections.push("temporal and spatial trends");
      if (reportOptions.rare_items) sections.push("identification of rare or unique items");
      if (reportOptions.stylistic_evolution) sections.push("stylistic evolution analysis");
      if (reportOptions.location_analysis) sections.push("geographic distribution patterns");
      if (reportOptions.type_distribution) sections.push("artifact type distribution analysis");
      if (reportOptions.review_status) sections.push("review status and quality assessment");

      const prompt = `You are a senior archaeological curator preparing a comprehensive report. Generate a detailed professional report on this artifact collection:

**Collection Statistics:**
- Total Artifacts: ${allArtifacts.length}
- Types: ${JSON.stringify(artifactsByType)}
- Locations: ${Object.keys(artifactsByLocation).length} distinct locations
- Review Status: ${reviewStats.reviewed} reviewed, ${reviewStats.pending} pending
- Interesting Finds: ${reviewStats.interesting}

**Recent Artifacts Sample (last 10):**
${JSON.stringify(allArtifacts.slice(0, 10).map(a => ({
  id: a.id,
  code: a.artifact_code,
  type: a.artifact_type,
  date: a.created_date,
  is_interesting: a.is_interesting,
  notes: a.user_notes || a.admin_notes
})), null, 2)}

**Report Sections Requested:**
${sections.map((s, i) => `${i + 1}. ${s}`).join('\n')}

IMPORTANT: Format your response using dashed bullet points (- ) and **bold headers** instead of hashtags.

Generate a formal archaeological report with clear sections. Reference specific artifacts using [ARTIFACT_ID: {id}] format for clickable links. Use the artifact IDs from the sample data above.

Structure with:
- **Executive Summary** at the top
- Detailed findings for each requested section using dashed lists
- Key insights and patterns
- **Recommendations** for future research
- Statistical insights (describe what charts would be appropriate)

Use professional archaeological language and cite specific artifacts by their IDs.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false
      });

      const reportData = {
        content: response,
        generated_at: new Date().toISOString(),
        artifact_count: allArtifacts.length,
        sections: sections
      };

      setReport(reportData);
      saveReport(reportData);
      toast.success("Report generated successfully!");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = (format) => {
    if (!report) return;

    const exportData = {
      date: report.generated_at,
      artifact_count: report.artifact_count,
      sections: report.sections,
      report: report.content
    };

    let content, filename, mimeType;

    if (format === 'txt') {
      content = `ARCHAEOLOGICAL ARTIFACT COLLECTION REPORT\nGenerated: ${new Date(exportData.date).toLocaleString()}\nTotal Artifacts: ${exportData.artifact_count}\n\n${exportData.report}`;
      filename = `report-${new Date().toISOString().split('T')[0]}.txt`;
      mimeType = 'text/plain';
    } else if (format === 'json') {
      content = JSON.stringify(exportData, null, 2);
      filename = `report-${new Date().toISOString().split('T')[0]}.json`;
      mimeType = 'application/json';
    } else if (format === 'csv') {
      const csvData = allArtifacts.map(a => ({
        'Artifact Code': a.artifact_code || '',
        'Type': a.artifact_type || 'uncategorized',
        'Created By': a.created_by || '',
        'Created Date': a.created_date || '',
        'Location Lat': a.location_lat || '',
        'Location Lng': a.location_lng || '',
        'Reviewed': a.admin_reviewed ? 'Yes' : 'No',
        'Interesting': a.is_interesting ? 'Yes' : 'No',
        'User Notes': (a.user_notes || '').replace(/"/g, '""'),
        'Admin Notes': (a.admin_notes || '').replace(/"/g, '""')
      }));
      
      const headers = Object.keys(csvData[0]).join(',');
      const rows = csvData.map(row => Object.values(row).map(v => `"${v}"`).join(','));
      content = [headers, ...rows].join('\n');
      
      filename = `artifacts-data-${new Date().toISOString().split('T')[0]}.csv`;
      mimeType = 'text/csv';
    } else if (format === 'pdf') {
      const htmlContent = `
        <html>
          <head>
            <title>Artifact Report</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
              h1 { color: #16a34a; border-bottom: 2px solid #16a34a; padding-bottom: 10px; }
              h2 { color: #4b5563; margin-top: 30px; }
              .meta { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .content { white-space: pre-wrap; }
              .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px; }
            </style>
          </head>
          <body>
            <h1>Archaeological Artifact Collection Report</h1>
            <div class="meta">
              <strong>Generated:</strong> ${new Date(exportData.date).toLocaleString()}<br>
              <strong>Total Artifacts Analyzed:</strong> ${exportData.artifact_count}<br>
              <strong>Report Sections:</strong> ${exportData.sections.join(', ')}
            </div>
            <div class="content">${exportData.report}</div>
            <div class="footer">
              Ultraviolet-61949 Artifact Database System<br>
              Archaeological Analysis Report
            </div>
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
    toast.success(`Report exported as ${format.toUpperCase()}`);
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
      <div className="lg:w-1/3 flex flex-col min-h-0">
        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Configuration
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                History ({savedReports.length})
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto min-h-0 space-y-6">
            {showHistory ? (
              <div className="space-y-2">
                {savedReports.length === 0 ? (
                  <p className="text-gray-500 text-center py-8 text-sm">No saved reports</p>
                ) : (
                  savedReports.map((rep) => (
                    <div key={rep.id} className="p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium mb-1">
                            Report - {rep.artifact_count} artifacts
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(rep.date).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => loadSavedReport(rep)}
                            className="h-8 w-8"
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeletingReport(rep)}
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
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold">Collection Overview</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600">Total Artifacts</p>
                      <p className="text-2xl font-bold text-purple-600">{allArtifacts.length}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Reviewed</p>
                      <p className="text-2xl font-bold text-green-600">
                        {allArtifacts.filter(a => a.admin_reviewed).length}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Interesting</p>
                      <p className="text-2xl font-bold text-amber-600">
                        {allArtifacts.filter(a => a.is_interesting).length}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">With Location</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {allArtifacts.filter(a => a.location_lat && a.location_lng).length}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Select Report Sections:</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="summary"
                        checked={reportOptions.summary}
                        onCheckedChange={(checked) => 
                          setReportOptions({...reportOptions, summary: checked})
                        }
                      />
                      <label htmlFor="summary" className="text-sm cursor-pointer">
                        Executive Summary
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="trends"
                        checked={reportOptions.trends}
                        onCheckedChange={(checked) => 
                          setReportOptions({...reportOptions, trends: checked})
                        }
                      />
                      <label htmlFor="trends" className="text-sm cursor-pointer">
                        Temporal & Spatial Trends
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="rare"
                        checked={reportOptions.rare_items}
                        onCheckedChange={(checked) => 
                          setReportOptions({...reportOptions, rare_items: checked})
                        }
                      />
                      <label htmlFor="rare" className="text-sm cursor-pointer">
                        Rare & Unique Items
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="style"
                        checked={reportOptions.stylistic_evolution}
                        onCheckedChange={(checked) => 
                          setReportOptions({...reportOptions, stylistic_evolution: checked})
                        }
                      />
                      <label htmlFor="style" className="text-sm cursor-pointer">
                        Stylistic Evolution
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="location"
                        checked={reportOptions.location_analysis}
                        onCheckedChange={(checked) => 
                          setReportOptions({...reportOptions, location_analysis: checked})
                        }
                      />
                      <label htmlFor="location" className="text-sm cursor-pointer">
                        Location Analysis
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="distribution"
                        checked={reportOptions.type_distribution}
                        onCheckedChange={(checked) => 
                          setReportOptions({...reportOptions, type_distribution: checked})
                        }
                      />
                      <label htmlFor="distribution" className="text-sm cursor-pointer">
                        Type Distribution
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="review"
                        checked={reportOptions.review_status}
                        onCheckedChange={(checked) => 
                          setReportOptions({...reportOptions, review_status: checked})
                        }
                      />
                      <label htmlFor="review" className="text-sm cursor-pointer">
                        Review Status
                      </label>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={handleGenerateReport}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Report...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:w-2/3 flex flex-col min-h-0">
        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Generated Report
              </CardTitle>
              {report && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExport('txt')}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    TXT
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExport('json')}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    JSON
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExport('csv')}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExport('pdf')}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    PDF
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto min-h-0">
            {!report && !isGenerating && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md px-4">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Report Generated</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Configure your report sections and click "Generate Report" to create a comprehensive analysis
                  </p>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
                    <h4 className="font-semibold text-sm mb-2">Reports Include:</h4>
                    <ul className="text-xs text-gray-700 space-y-1">
                      <li>- Comprehensive collection summaries</li>
                      <li>- Trend identification and analysis</li>
                      <li>- Rare item detection</li>
                      <li>- Stylistic evolution tracking</li>
                      <li>- Geographic distribution patterns</li>
                      <li>- Professional recommendations</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {isGenerating && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="w-16 h-16 text-green-600 mx-auto mb-4 animate-spin" />
                  <h3 className="text-lg font-semibold mb-2">Generating Report...</h3>
                  <p className="text-gray-600 text-sm">
                    Analyzing {allArtifacts.length} artifacts and compiling insights
                  </p>
                </div>
              </div>
            )}

            {report && !isGenerating && (
              <div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-900">Report Generated</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {new Date(report.generated_at).toLocaleString()}
                    </Badge>
                  </div>
                  <p className="text-xs text-green-700 mt-1">
                    Analyzed {report.artifact_count} artifacts
                  </p>
                </div>

                <div className="prose prose-sm max-w-none bg-white rounded-lg border p-6">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {report.content}
                  </div>
                </div>

                <div className="mt-4 flex gap-3">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={handleGenerateReport}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Regenerate
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deletingReport} onOpenChange={() => setDeletingReport(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this report from your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteReport} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}