import React, { useState, useEffect, useRef } from "react";
import { base44 } from "../api/base44Client";
import ReactDOM from "react-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "./components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Calendar, User as UserIcon, Star, Volume2, MessageSquare, Trash2, Hash, Edit2, X, Download } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import ArtifactCatalogAI from "./ArtifactCatalogAI.js";

export default function ArtifactDetailModal({ artifact, onClose, onUpdate, isAdmin }) {
  const [isInteresting, setIsInteresting] = useState(artifact.is_interesting);
  const [adminNotes, setAdminNotes] = useState(artifact.admin_notes || "");
  const [artifactCode, setArtifactCode] = useState(artifact.artifact_code || "");
  const [priority, setPriority] = useState(artifact.priority || "none");
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('json');
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const mapInitializedRef = useRef(false);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (artifact.location_lat && artifact.location_lng && !mapInitializedRef.current) {
      const timer = setTimeout(() => {
        if (mapRef.current && !mapInstanceRef.current) {
          initializeMap();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
    
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.log("Error removing map:", e);
        }
        mapInstanceRef.current = null;
        mapInitializedRef.current = false;
      }
    };
  }, [artifact.location_lat, artifact.location_lng]);

  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape' && showImageViewer) {
        closeImageViewer();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [showImageViewer]);

  const loadUser = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
    } catch (error) {
      console.error("Error loading user:", error);
      setCurrentUser(null);
    }
  };

  const initializeMap = async () => {
    if (!mapRef.current || mapInstanceRef.current || mapInitializedRef.current) return;

    try {
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');

      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current, {
        center: [artifact.location_lat, artifact.location_lng],
        zoom: 13,
        scrollWheelZoom: true,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
        minZoom: 3
      }).addTo(map);

      L.marker([artifact.location_lat, artifact.location_lng]).addTo(map);

      mapInstanceRef.current = map;
      mapInitializedRef.current = true;

      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 300);
    } catch (error) {
      console.error("Error initializing map:", error);
    }
  };

  const closeImageViewer = () => {
    setShowImageViewer(false);
  };

  const canDelete = isAdmin || (currentUser && currentUser.email === artifact.created_by);

  const handleSave = async () => {
    setIsSaving(true);
    const updatedData = {
      artifact_code: artifactCode
    };

    if (isAdmin) {
      updatedData.admin_notes = adminNotes;
      updatedData.is_interesting = isInteresting;
      updatedData.priority = priority;
      updatedData.admin_reviewed = true;
      
      const shouldNotify = (isInteresting && !artifact.is_interesting) || 
                          (adminNotes && adminNotes !== artifact.admin_notes);
      
      if (shouldNotify && artifact.created_by !== currentUser?.email) {
        try {
          const users = await base44.entities.User.list();
          const artifactCreator = users.find(u => u.email === artifact.created_by);
          
          const notificationsEnabled = artifactCreator?.notification_preferences?.desktop_notifications_enabled !== false &&
                                       artifactCreator?.notification_preferences?.artifact_reviews !== false;
          
          if (notificationsEnabled) {
            const allConvos = await base44.entities.Conversation.list();
            let conversation = allConvos.find(c => 
              c.participants && 
              Array.isArray(c.participants) &&
              c.participants.includes(currentUser.email) &&
              c.participants.includes(artifact.created_by) &&
              c.participants.length === 2
            );

            if (!conversation) {
              conversation = await base44.entities.Conversation.create({
                name: "",
                participants: [currentUser.email, artifact.created_by],
                is_group: false,
                last_message_at: new Date().toISOString()
              });
            }

            let messageContent = '';
            if (isInteresting && !artifact.is_interesting) {
              messageContent = `🌟 Great news! Your artifact ${artifactCode} has been marked as interesting!\n\n`;
            } else {
              messageContent = `📝 Your artifact ${artifactCode} has been reviewed.\n\n`;
            }
            
            if (adminNotes) {
              messageContent += `Admin notes: ${adminNotes}`;
            }

            await base44.entities.ChatMessage.create({
              conversation_id: conversation.id,
              content: messageContent,
              read_by: [currentUser.email],
              artifact_references: [artifact.id]
            });

            await base44.entities.Conversation.update(conversation.id, {
              last_message_at: new Date().toISOString()
            });

            toast.success("Notification sent via chat!");
          } else {
            toast.success("Artifact updated (user has notifications disabled)");
          }
        } catch (error) {
          console.error("Failed to send chat notification:", error);
          toast.error("Artifact updated but chat notification failed to send");
        }
      }
    }

    try {
      await base44.entities.Artifact.update(artifact.id, updatedData);
      toast.success("Artifact updated successfully.");
      
      if (onUpdate) {
        await onUpdate({ ...artifact, ...updatedData });
      }
      onClose();
    } catch (error) {
      console.error("Failed to save artifact:", error);
      toast.error("Failed to save artifact.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await base44.entities.Artifact.delete(artifact.id);
      toast.success("Artifact deleted successfully.");
      setShowDeleteDialog(false);
      if (onUpdate) await onUpdate();
      onClose();
    } catch (error) {
      console.error("Failed to delete artifact:", error);
      toast.error("Failed to delete artifact.");
    } finally {
      setIsDeleting(false);
    }
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

  const handleExport = async (formatType) => {
    setIsExporting(true);
    try {
      const exportData = {
        artifact_code: artifact.artifact_code || '',
        type: artifact.artifact_type || 'uncategorized',
        created_by: artifact.created_by || '',
        created_date: artifact.created_date || '',
        location_lat: artifact.location_lat || '',
        location_lng: artifact.location_lng || '',
        reviewed: artifact.admin_reviewed || false,
        interesting: artifact.is_interesting || false,
        priority: artifact.priority || 'none', // Add priority to export data
        user_notes: artifact.user_notes || '',
        admin_notes: artifact.admin_notes || '',
        photo_url: artifact.photo_url || '',
        audio_url: artifact.audio_url || ''
      };

      if (formatType === 'json') {
        const content = JSON.stringify(exportData, null, 2);
        const filename = `artifact-${artifact.artifact_code || artifact.id}-${new Date().toISOString().split('T')[0]}.json`;
        downloadFile(content, filename, 'application/json');
        toast.success("Artifact exported as JSON.");
      } else if (formatType === 'csv') {
        const headers = Object.keys(exportData).join(',');
        const values = Object.values(exportData).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
        const content = `${headers}\n${values}`;
        const filename = `artifact-${artifact.artifact_code || artifact.id}-${new Date().toISOString().split('T')[0]}.csv`;
        downloadFile(content, filename, 'text/csv');
        toast.success("Artifact exported as CSV.");
      } else if (formatType === 'pdf') {
        const htmlContent = `
          <html>
            <head>
              <title>Artifact Export</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
                h1 { color: #9333EA; border-bottom: 3px solid #9333EA; padding-bottom: 10px; margin-bottom: 20px; }
                h2 { color: #555; margin-top: 30px; margin-bottom: 15px; }
                .photo { max-width: 100%; max-height: 400px; object-fit: contain; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                .field { margin: 12px 0; padding: 10px; background: #f9fafb; border-radius: 6px; display: flex; align-items: baseline; }
                .field strong { color: #6b7280; display: inline-block; min-width: 150px; font-weight: 600; flex-shrink: 0; }
                .field span { flex-grow: 1; }
                .meta { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; font-size: 0.9em; line-height: 1.5; }
                .badge { display: inline-block; padding: 6px 14px; border-radius: 18px; font-size: 13px; margin: 0 8px 8px 0; font-weight: 600; text-transform: capitalize; }
                .badge-interesting { background: #fbbf24; color: #78350f; }
                .badge-reviewed { background: #10b981; color: #065f46; }
                .notes { background: white; padding: 15px; border: 1px solid #e5e7eb; border-radius: 6px; margin: 10px 0; white-space: pre-wrap; font-size: 0.9em; line-height: 1.6; }
                .audio-link { display: block; word-break: break-all; font-size: 0.9em; color: #9333EA; text-decoration: none; margin-top: 5px; }
              </style>
            </head>
            <body>
              <h1>Artifact Details Export</h1>
              <div class="meta">
                <strong>Export Date:</strong> ${new Date().toLocaleString()}<br>
                <strong>System:</strong> Ultraviolet-61949
              </div>
              
              <h2>${artifact.artifact_code || 'Unnamed Artifact'}</h2>
              
              ${artifact.photo_url ? `<img src="${artifact.photo_url}" class="photo" alt="Artifact Photo" />` : ''}
              
              <div class="field"><strong>Artifact ID:</strong> <span>${artifact.artifact_code || 'N/A'}</span></div>
              <div class="field"><strong>Type:</strong> <span>${artifact.artifact_type ? artifact.artifact_type.charAt(0).toUpperCase() + artifact.artifact_type.slice(1) : 'Uncategorized'}</span></div>
              <div class="field"><strong>Documented By:</strong> <span>${artifact.created_by || 'N/A'}</span></div>
              <div class="field"><strong>Date:</strong> <span>${artifact.created_date ? format(new Date(artifact.created_date), "MMM d, yyyy 'at' h:mm a") : 'N/A'}</span></div>
              
              ${artifact.location_lat && artifact.location_lng ? 
                `<div class="field"><strong>Location:</strong> <span>${artifact.location_lat.toFixed(6)}, ${artifact.location_lng.toFixed(6)}</span></div>` 
                : ''}

              <div class="field"><strong>Priority:</strong> <span>${artifact.priority ? artifact.priority.charAt(0).toUpperCase() + artifact.priority.slice(1) : 'None'}</span></div>
              
              ${artifact.user_notes ? `
                <div class="field">
                  <strong>Field Notes:</strong>
                  <div class="notes">${artifact.user_notes}</div>
                </div>` : ''}
              
              ${artifact.admin_notes ? `
                <div class="field">
                  <strong>Admin Notes:</strong>
                  <div class="notes">${artifact.admin_notes}</div>
                </div>` : ''}
              
              <div style="margin-top: 20px;">
                ${artifact.is_interesting ? '<span class="badge badge-interesting">Interesting</span>' : ''}
                ${artifact.admin_reviewed ? '<span class="badge badge-reviewed">Reviewed</span>' : ''}
              </div>
              
              ${artifact.audio_url ? `<div class="field"><strong>Audio Recording:</strong> <a href="${artifact.audio_url}" class="audio-link" target="_blank">${artifact.audio_url}</a></div>` : ''}
            </body>
          </html>
        `;
        
        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.print();
        toast.success("PDF print dialog opened.");
        // For PDF, we consider it "exported" once the print dialog is open,
        // as we can't programmatically know if the user actually printed.
      } else {
        toast.error("Unsupported export format.");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export artifact.");
    } finally {
      setIsExporting(false);
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      pottery: "bg-orange-100 text-orange-800 border-orange-200",
      glass: "bg-cyan-100 text-cyan-800 border-cyan-200",
      metal: "bg-gray-100 text-gray-800 border-gray-200",
      stone: "bg-slate-100 text-slate-800 border-slate-200",
      bone: "bg-amber-100 text-amber-800 border-amber-200",
      textile: "bg-pink-100 text-pink-800 border-pink-200",
      wood: "bg-green-100 text-green-800 border-green-200",
      other: "bg-blue-100 text-blue-800 border-blue-200",
      uncategorized: "bg-gray-50 text-gray-600 border-gray-200"
    };
    return colors[type] || colors.uncategorized;
  };

  // Render image viewer using portal to escape Dialog stacking context
  const ImageViewerPortal = () => {
    if (!showImageViewer) return null;
    
    return ReactDOM.createPortal(
      <div 
        className="fixed inset-0 bg-black/95 flex items-center justify-center cursor-pointer"
        style={{ zIndex: 2147483647 }}
        onClick={closeImageViewer}
        onTouchEnd={closeImageViewer}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            closeImageViewer();
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            closeImageViewer();
          }}
          className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-full p-3 md:p-2 transition-colors z-50 touch-manipulation"
          type="button"
        >
          <X className="w-8 h-8 md:w-6 md:h-6" />
        </button>

        <div className="w-full h-full flex items-center justify-center p-4 pointer-events-none">
          <img
            src={artifact.photo_url}
            alt="Artifact"
            className="max-w-full max-h-full object-contain pointer-events-none"
          />
        </div>

        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-xs md:text-sm bg-black/50 px-4 py-2 rounded-full pointer-events-none z-10">
          Tap anywhere or press ESC to close
        </div>
      </div>,
      document.body
    );
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-[10000]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#9333EA]" />
                Artifact Details
              </DialogTitle>
              <div className="flex gap-2 items-center">
                {!isExporting && (
                  <>
                    <select 
                      value={exportFormat} 
                      onChange={(e) => setExportFormat(e.target.value)}
                      className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                    >
                      <option value="json">JSON</option>
                      <option value="csv">CSV</option>
                      <option value="pdf">PDF</option>
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport(exportFormat)}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Export
                    </Button>
                  </>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            <div className="relative group cursor-pointer" onClick={() => setShowImageViewer(true)}>
              <img
                src={artifact.photo_url}
                alt="Artifact"
                className="w-full h-80 object-cover rounded-lg transition-all duration-300 group-hover:brightness-90"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded-lg">
                <div className="bg-white rounded-full p-4 shadow-lg transform group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </div>
              <div className="absolute top-4 right-4 flex gap-2">
                {artifact.is_interesting && (
                  <Badge className="bg-amber-500 text-white border-none">
                    <Star className="w-4 h-4 mr-1" />
                    Interesting
                  </Badge>
                )}
                {artifact.artifact_type && artifact.artifact_type !== "uncategorized" && (
                  <Badge className={getTypeColor(artifact.artifact_type)}>
                    {artifact.artifact_type.charAt(0).toUpperCase() + artifact.artifact_type.slice(1)}
                  </Badge>
                )}
              </div>
              {!artifact.admin_reviewed && isAdmin && (
                <Badge className="absolute top-4 left-4 bg-red-500 text-white border-none">
                  Needs Review
                </Badge>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="col-span-2">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Hash className="w-4 h-4" />
                  Artifact ID
                </div>
                {currentUser && isEditingCode ? (
                  <div className="flex gap-2">
                    <Input
                      value={artifactCode}
                      onChange={(e) => setArtifactCode(e.target.value)}
                      className="font-mono"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsEditingCode(false);
                        setArtifactCode(artifact.artifact_code || "");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="font-medium font-mono">{artifactCode || "Not set"}</p>
                    {currentUser && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setIsEditingCode(true)}
                        className="h-6 w-6"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <UserIcon className="w-4 h-4" />
                  Documented by
                </div>
                <p className="font-medium">{artifact.created_by}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Calendar className="w-4 h-4" />
                  Date
                </div>
                <p className="font-medium">
                  {artifact.created_date ? format(new Date(artifact.created_date), "MMM d, yyyy 'at' h:mm a") : 'N/A'}
                </p>
              </div>
            </div>

            {artifact.location_lat && artifact.location_lng && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-[#9333EA]" />
                  <h3 className="font-semibold">Discovery Location</h3>
                </div>
                <div className="space-y-2">
                  <div 
                    ref={mapRef} 
                    style={{ height: '400px', width: '100%' }}
                    className="rounded-lg border-2 border-gray-300 bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 font-mono">
                    Coordinates: {artifact.location_lat.toFixed(6)}, {artifact.location_lng.toFixed(6)}
                  </p>
                  <p className="text-xs text-gray-500">
                    💡 Use mouse wheel or +/- buttons to zoom. Click and drag to pan.
                  </p>
                </div>
              </div>
            )}

            {artifact.audio_url && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Volume2 className="w-4 h-4 text-[#9333EA]" />
                  <h3 className="font-semibold">Voice Description</h3>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <audio controls className="w-full" preload="metadata">
                    <source src={artifact.audio_url} type="audio/webm" />
                    <source src={artifact.audio_url} type="audio/ogg" />
                    <source src={artifact.audio_url} type="audio/mpeg" />
                    <source src={artifact.audio_url} type="audio/mp4" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              </div>
            )}

            {artifact.user_notes && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-[#9333EA]" />
                  <h3 className="font-semibold">Field Notes</h3>
                </div>
                <p className="text-gray-700 p-4 bg-gray-50 rounded-lg">
                  {artifact.user_notes}
                </p>
              </div>
            )}

            {artifact.admin_notes && !isAdmin && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  <h3 className="font-semibold">Admin Review</h3>
                </div>
                <p className="text-gray-700 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  {artifact.admin_notes}
                </p>
              </div>
            )}

            {isAdmin && (
              <ArtifactCatalogAI 
                artifact={artifact} 
                onUpdate={async (updatedArtifact) => {
                  if (onUpdate) await onUpdate(updatedArtifact);
                }}
              />
            )}

            {isAdmin && (
              <div className="border-t pt-6 space-y-4">
                <h3 className="font-semibold text-lg">Admin Assessment</h3>
                
                <div className="flex items-center gap-3 flex-wrap">
                  <Button
                    variant={isInteresting ? "default" : "outline"}
                    onClick={() => setIsInteresting(!isInteresting)}
                    className={isInteresting ? "bg-amber-500 hover:bg-amber-600" : ""}
                  >
                    <Star className="w-4 h-4 mr-2" />
                    {isInteresting ? "Marked as Interesting" : "Mark as Interesting"}
                  </Button>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="none">None</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Admin Notes</label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add your professional assessment..."
                    className="h-32"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-[#9333EA] hover:bg-[#7E22CE]"
                  >
                    {isSaving ? "Saving..." : "Save Assessment"}
                  </Button>
                </div>
              </div>
            )}

            {!isAdmin && currentUser && (
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-[#9333EA] hover:bg-[#7E22CE]"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}

            {!currentUser && (
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ImageViewerPortal />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="z-[10001]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Artifact?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the artifact record,
              including the photo and any audio recordings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}