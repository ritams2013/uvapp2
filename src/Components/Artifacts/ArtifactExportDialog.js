import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ArtifactExportDialog({ artifacts, onClose }) {
  const [selectedArtifacts, setSelectedArtifacts] = useState(artifacts.map(a => a.id));
  const [includePhotos, setIncludePhotos] = useState(true);
  const [includeAudio, setIncludeAudio] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const toggleArtifact = (id) => {
    if (selectedArtifacts.includes(id)) {
      setSelectedArtifacts(selectedArtifacts.filter(a => a !== id));
    } else {
      setSelectedArtifacts([...selectedArtifacts, id]);
    }
  };

  const handleExport = async (format) => {
    if (selectedArtifacts.length === 0) {
      toast.error("Please select at least one artifact");
      return;
    }

    setIsExporting(true);
    try {
      const toExport = artifacts.filter(a => selectedArtifacts.includes(a.id));

      if (format === 'pdf') {
        await exportPDF(toExport);
      } else if (format === 'json') {
        await exportJSON(toExport);
      } else if (format === 'csv') {
        await exportCSV(toExport);
      }

      toast.success(`Exported ${toExport.length} artifact(s)`);
      onClose();
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export artifacts");
    } finally {
      setIsExporting(false);
    }
  };

  const exportJSON = async (toExport) => {
    const data = await Promise.all(toExport.map(async (a) => {
      const artifact = {
        artifact_code: a.artifact_code || '',
        type: a.artifact_type || 'uncategorized',
        created_by: a.created_by || '',
        created_date: a.created_date || '',
        location_lat: a.location_lat || '',
        location_lng: a.location_lng || '',
        reviewed: a.admin_reviewed || false,
        interesting: a.is_interesting || false,
        user_notes: a.user_notes || '',
        admin_notes: a.admin_notes || ''
      };

      if (includePhotos && a.photo_url) {
        artifact.photo_url = a.photo_url;
      }
      if (includeAudio && a.audio_url) {
        artifact.audio_url = a.audio_url;
      }

      return artifact;
    }));

    const content = JSON.stringify(data, null, 2);
    const filename = `artifacts-export-${new Date().toISOString().split('T')[0]}.json`;
    downloadFile(content, filename, 'application/json');
  };

  const exportCSV = async (toExport) => {
    const data = toExport.map(a => ({
      'Artifact Code': a.artifact_code || '',
      'Type': a.artifact_type || 'uncategorized',
      'Created By': a.created_by || '',
      'Created Date': a.created_date || '',
      'Location Lat': a.location_lat || '',
      'Location Lng': a.location_lng || '',
      'Reviewed': a.admin_reviewed ? 'Yes' : 'No',
      'Interesting': a.is_interesting ? 'Yes' : 'No',
      'User Notes': (a.user_notes || '').replace(/"/g, '""'),
      'Admin Notes': (a.admin_notes || '').replace(/"/g, '""'),
      ...(includePhotos && { 'Photo URL': a.photo_url || '' }),
      ...(includeAudio && { 'Audio URL': a.audio_url || '' })
    }));

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(v => `"${v}"`).join(',')
    );
    const content = [headers, ...rows].join('\n');
    
    const filename = `artifacts-export-${new Date().toISOString().split('T')[0]}.csv`;
    downloadFile(content, filename, 'text/csv');
  };

  const exportPDF = async (toExport) => {
    const htmlContent = `
      <html>
        <head>
          <title>Artifact Export</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; }
            h1 { color: #9333EA; border-bottom: 3px solid #9333EA; padding-bottom: 10px; }
            .artifact { page-break-inside: avoid; margin: 30px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
            .artifact h2 { color: #4b5563; margin: 0 0 15px 0; }
            .photo { max-width: 300px; height: auto; margin: 15px 0; border-radius: 4px; }
            .field { margin: 8px 0; }
            .field strong { color: #6b7280; }
            .meta { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; margin: 0 5px 5px 0; }
            .badge-interesting { background: #fbbf24; color: #78350f; }
            .badge-reviewed { background: #10b981; color: #065f46; }
          </style>
        </head>
        <body>
          <h1>Artifact Export Report</h1>
          <div class="meta">
            <strong>Export Date:</strong> ${new Date().toLocaleString()}<br>
            <strong>Total Artifacts:</strong> ${toExport.length}<br>
            <strong>System:</strong> Ultraviolet-61949
          </div>
          ${toExport.map(a => `
            <div class="artifact">
              <h2>${a.artifact_code || 'Unnamed Artifact'}</h2>
              ${includePhotos && a.photo_url ? `<img src="${a.photo_url}" class="photo" />` : ''}
              <div class="field"><strong>Type:</strong> ${a.artifact_type || 'uncategorized'}</div>
              <div class="field"><strong>Created By:</strong> ${a.created_by || 'N/A'}</div>
              <div class="field"><strong>Created Date:</strong> ${a.created_date ? new Date(a.created_date).toLocaleString() : 'N/A'}</div>
              ${a.location_lat && a.location_lng ? `<div class="field"><strong>Location:</strong> ${a.location_lat.toFixed(6)}, ${a.location_lng.toFixed(6)}</div>` : ''}
              ${a.user_notes ? `<div class="field"><strong>Field Notes:</strong> ${a.user_notes}</div>` : ''}
              ${a.admin_notes ? `<div class="field"><strong>Admin Notes:</strong> ${a.admin_notes}</div>` : ''}
              <div style="margin-top: 10px;">
                ${a.is_interesting ? '<span class="badge badge-interesting">Interesting</span>' : ''}
                ${a.admin_reviewed ? '<span class="badge badge-reviewed">Reviewed</span>' : ''}
              </div>
              ${includeAudio && a.audio_url ? `<div class="field"><strong>Audio:</strong> ${a.audio_url}</div>` : ''}
            </div>
          `).join('')}
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Export Artifacts</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Export Options</h3>
            <div className="flex items-center gap-3">
              <Checkbox
                id="photos"
                checked={includePhotos}
                onCheckedChange={setIncludePhotos}
              />
              <label htmlFor="photos" className="text-sm cursor-pointer">
                Include photos
              </label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="audio"
                checked={includeAudio}
                onCheckedChange={setIncludeAudio}
              />
              <label htmlFor="audio" className="text-sm cursor-pointer">
                Include audio recordings
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Select Artifacts ({selectedArtifacts.length}/{artifacts.length})</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setSelectedArtifacts(artifacts.map(a => a.id))}>
                  All
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedArtifacts([])}>
                  None
                </Button>
              </div>
            </div>
            <div className="border rounded-lg p-2 max-h-60 overflow-y-auto space-y-2">
              {artifacts.map(artifact => (
                <div key={artifact.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                  <Checkbox
                    checked={selectedArtifacts.includes(artifact.id)}
                    onCheckedChange={() => toggleArtifact(artifact.id)}
                  />
                  {artifact.photo_url && (
                    <img src={artifact.photo_url} alt="" className="w-12 h-12 rounded object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{artifact.artifact_code || 'Unnamed'}</p>
                    <p className="text-xs text-gray-500">{artifact.artifact_type || 'uncategorized'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={() => handleExport('json')} disabled={isExporting || selectedArtifacts.length === 0}>
            {isExporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
            JSON
          </Button>
          <Button onClick={() => handleExport('csv')} disabled={isExporting || selectedArtifacts.length === 0}>
            {isExporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
            CSV
          </Button>
          <Button onClick={() => handleExport('pdf')} disabled={isExporting || selectedArtifacts.length === 0}>
            {isExporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
            PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}