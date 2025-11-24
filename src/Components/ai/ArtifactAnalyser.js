
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "../api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Loader2, MessageSquare, Paperclip, X, Package, FileText, Image as ImageIcon, File, Search, ExternalLink, Download, Edit2, Trash2 } from "lucide-react";
import MessageBubble from "./MessageBubble";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import ArtifactDetailModal from "../artifacts/ArtifactDetailModal";
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
import { toast } from "sonner";

export default function ArtifactAnalyzer({ onBack }) {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [showArtifactPicker, setShowArtifactPicker] = useState(false);
  const [allArtifacts, setAllArtifacts] = useState([]);
  const [selectedArtifacts, setSelectedArtifacts] = useState([]);
  const [artifactSearchTerm, setArtifactSearchTerm] = useState("");
  const [viewingArtifact, setViewingArtifact] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const fileInputRef = useRef(null);
  const [editingConversation, setEditingConversation] = useState(null);
  const [editName, setEditName] = useState("");
  const [deletingConversation, setDeletingConversation] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const unsubscribeRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (currentConversation) {
      try {
        const unsubscribe = base44.agents.subscribeToConversation(
          currentConversation.id,
          (data) => {
            setMessages([...data.messages]);
          }
        );
        unsubscribeRef.current = unsubscribe;
      } catch (error) {
        console.error("Error subscribing to conversation:", error);
      }
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [currentConversation?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadInitialData = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      const artifacts = await base44.entities.Artifact.list("-created_date");
      setAllArtifacts(artifacts);

      await loadConversations();
    } catch (error) {
      console.error("Error loading initial data:", error);
      toast.error("Failed to load data");
    }
  };

  const loadConversations = async () => {
    try {
      const convos = await base44.agents.listConversations({
        agent_name: "artifact_analyzer",
      });
      const sortedConvos = convos.sort((a, b) => {
        const dateA = new Date(a.updated_date || a.created_date);
        const dateB = new Date(b.updated_date || b.created_date);
        return dateB - dateA;
      });
      setConversations(sortedConvos);
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  };

  const createNewConversation = async () => {
    try {
      const convo = await base44.agents.createConversation({
        agent_name: "artifact_analyzer",
        metadata: {
          name: `Analysis ${new Date().toLocaleDateString()}`,
        },
      });
      setCurrentConversation(convo);
      setMessages(convo.messages || []);
      await loadConversations();
      toast.success("New analysis created!");
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to create new analysis");
    }
  };

  const selectConversation = async (convo) => {
    try {
      const fullConvo = await base44.agents.getConversation(convo.id);
      setCurrentConversation(fullConvo);
      setMessages([...(fullConvo.messages || [])]);
    } catch (error) {
      console.error("Error loading conversation:", error);
      toast.error("Failed to load analysis");
    }
  };

  const handleEditConversationName = async () => {
    if (!editingConversation || !editName.trim()) {
      toast.error("Please enter a name");
      return;
    }

    try {
      await base44.agents.updateConversation(editingConversation.id, {
        metadata: {
          ...editingConversation.metadata,
          name: editName
        }
      });
      
      toast.success("Analysis name updated!");
      setEditingConversation(null);
      setEditName("");
      await loadConversations();
      
      if (currentConversation?.id === editingConversation.id) {
        setCurrentConversation(prev => ({
          ...prev,
          metadata: { ...prev.metadata, name: editName }
        }));
      }
    } catch (error) {
      console.error("Error updating conversation name:", error);
      toast.error("Failed to update analysis name");
    }
  };

  const handleDeleteConversation = async () => {
    if (!deletingConversation) return;
    
    setIsDeleting(true);
    try {
      await base44.agents.deleteConversation(deletingConversation.id);
      
      toast.success("Analysis deleted successfully");
      
      if (currentConversation?.id === deletingConversation.id) {
        setCurrentConversation(null);
        setMessages([]);
      }
      
      await loadConversations();
      setDeletingConversation(null);
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast.error("Failed to delete analysis");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'audio/mpeg', 'audio/wav', 'video/mp4'];
    const supportedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt', '.mp3', '.wav', '.mp4'];
    
    const unsupportedFiles = files.filter(file => {
      const hasValidMimeType = supportedTypes.includes(file.type);
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const hasValidExtension = supportedExtensions.includes(fileExtension);
      return !hasValidMimeType && !hasValidExtension;
    });
    
    if (unsupportedFiles.length > 0) {
      toast.error(`Unsupported file type: ${unsupportedFiles[0].name}`);
      e.target.value = null;
      return;
    }
    
    setSelectedFiles(files);
    e.target.value = null;
  };

  const removeFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const toggleArtifactSelection = (artifact) => {
    if (selectedArtifacts.some(a => a.id === artifact.id)) {
      setSelectedArtifacts(selectedArtifacts.filter(a => a.id !== artifact.id));
    } else {
      setSelectedArtifacts([...selectedArtifacts, artifact]);
    }
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      return <ImageIcon className="w-4 h-4" />;
    } else if (['pdf', 'txt'].includes(ext)) {
      return <FileText className="w-4 h-4" />;
    }
    return <File className="w-4 h-4" />;
  };

  const handleSend = async () => {
    if ((!inputMessage.trim() && selectedFiles.length === 0 && selectedArtifacts.length === 0) || !currentConversation) return;

    const messageText = inputMessage;
    const filesToUpload = [...selectedFiles];
    const artifactsToSend = [...selectedArtifacts];

    setInputMessage("");
    setSelectedFiles([]);
    setSelectedArtifacts([]);
    setIsSending(true);
    setUploadingFiles(true);
    
    try {
      let fileUrls = [];
      
      if (filesToUpload.length > 0) {
        for (const file of filesToUpload) {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          fileUrls.push(file_url);
        }
      }

      let messageContent = messageText || "";
      
      if (artifactsToSend.length > 0) {
        const artifactRefs = artifactsToSend.map(a => `[ARTIFACT_ID: ${a.id}]`).join(" ");
        messageContent = messageContent 
          ? `${messageContent}\n\n${artifactRefs}`
          : artifactRefs;
      }

      await base44.agents.addMessage(currentConversation, {
        role: "user",
        content: messageContent,
        file_urls: fileUrls.length > 0 ? fileUrls : undefined
      });

    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
      setInputMessage(messageText);
      setSelectedFiles(filesToUpload);
      setSelectedArtifacts(artifactsToSend);
    } finally {
      setIsSending(false);
      setUploadingFiles(false);
    }
  };

  const handleExportConversation = (format) => {
    if (!currentConversation) return;

    const exportData = {
      name: currentConversation.metadata?.name || "Analysis",
      date: currentConversation.created_date,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.created_date
      }))
    };

    let content, filename, mimeType;

    if (format === 'json') {
      content = JSON.stringify(exportData, null, 2);
      filename = `analysis-${new Date().toISOString().split('T')[0]}.json`;
      mimeType = 'application/json';
    } else if (format === 'txt') {
      content = `ARTIFACT ANALYSIS CONVERSATION\nName: ${exportData.name}\nDate: ${new Date(exportData.date).toLocaleString()}\n\n`;
      content += exportData.messages.map(m => `[${m.role.toUpperCase()}] ${new Date(m.timestamp).toLocaleString()}\n${m.content}\n`).join('\n---\n\n');
      filename = `analysis-${new Date().toISOString().split('T')[0]}.txt`;
      mimeType = 'text/plain';
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

  const filteredArtifactsForPicker = allArtifacts.filter(a =>
    (a.artifact_code?.toLowerCase().includes(artifactSearchTerm.toLowerCase()) ||
    a.user_notes?.toLowerCase().includes(artifactSearchTerm.toLowerCase()))
  );

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <div className="hidden lg:block w-80 border-r bg-white p-4 overflow-y-auto">
        <Button
          onClick={createNewConversation}
          className="w-full mb-4 bg-purple-600 hover:bg-purple-700"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          New Analysis
        </Button>

        {currentConversation && (
          <div className="flex gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={() => handleExportConversation('json')} className="flex-1">
              <Download className="w-3 h-3 mr-1" />
              JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExportConversation('txt')} className="flex-1">
              <Download className="w-3 h-3 mr-1" />
              TXT
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Recent Analyses</h3>
          {conversations.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No analyses yet</p>
          ) : (
            conversations.map((convo) => (
              <div key={convo.id} className="relative group">
                <button
                  onClick={() => selectConversation(convo)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    currentConversation?.id === convo.id
                      ? "bg-purple-50 border border-purple-200"
                      : "hover:bg-gray-50 border border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm font-medium truncate flex-1">
                      {convo.metadata?.name || "Analysis"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {convo.messages?.length || 0} messages
                  </p>
                </button>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 bg-white hover:bg-gray-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingConversation(convo);
                      setEditName(convo.metadata?.name || "");
                    }}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 bg-white hover:bg-red-50 text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingConversation(convo);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {currentConversation ? (
          <>
            <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 min-h-0">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md px-4">
                    <Sparkles className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Start Your Analysis</h3>
                    <p className="text-gray-600 mb-4">Ask questions about your artifacts</p>
                    <div className="grid gap-2 text-sm text-left">
                      <Badge
                        variant="outline"
                        className="justify-start p-3 cursor-pointer hover:bg-purple-50"
                        onClick={() => setInputMessage("Show me all pottery artifacts and find patterns")}
                      >
                        Find artifact patterns
                      </Badge>
                      <Badge
                        variant="outline"
                        className="justify-start p-3 cursor-pointer hover:bg-purple-50"
                        onClick={() => setInputMessage("Which artifacts need admin review?")}
                      >
                        Check review status
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message, idx) => {
                    const artifactIds = [];
                    if (message.content) {
                      const artifactMatches = message.content.match(/\[ARTIFACT_ID: ([a-zA-Z0-9-]+)\]/g);
                      if (artifactMatches) {
                        artifactMatches.forEach(match => {
                          const id = match.replace('[ARTIFACT_ID: ', '').replace(']', '');
                          const artifact = allArtifacts.find(a => a.id === id);
                          if (artifact && !artifactIds.some(a => a.id === artifact.id)) {
                            artifactIds.push(artifact);
                          }
                        });
                      }
                    }
                    
                    return (
                      <div key={`${message.id || idx}-${idx}`}>
                        <MessageBubble message={message} />
                        {artifactIds.length > 0 && (
                          <div className={`mt-2 flex flex-wrap gap-2 ${message.role === 'user' ? 'justify-end mr-10' : 'ml-10'}`}>
                            {artifactIds.map((artifact) => (
                              <div 
                                key={artifact.id}
                                onClick={() => setViewingArtifact(artifact)}
                                className="inline-flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-purple-100 transition-colors"
                              >
                                <Package className="w-4 h-4 text-purple-700" />
                                <span className="font-medium truncate max-w-[150px]">{artifact.artifact_code || "Artifact"}</span>
                                <ExternalLink className="w-3 h-3 text-purple-600" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <div className="border-t p-4 bg-white flex-shrink-0">
              <div className="max-w-4xl mx-auto">
                {(selectedFiles.length > 0 || selectedArtifacts.length > 0) && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedFiles.map((file, index) => (
                      <div key={`file-${index}`} className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 text-sm">
                        {getFileIcon(file.name)}
                        <span className="truncate max-w-[150px]">{file.name}</span>
                        <button onClick={() => removeFile(index)} className="text-gray-500 hover:text-red-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {selectedArtifacts.map((artifact) => (
                      <div key={`artifact-${artifact.id}`} className="flex items-center gap-2 bg-purple-100 rounded-lg px-3 py-2 text-sm">
                        <Package className="w-4 h-4 text-purple-700" />
                        <span className="truncate max-w-[150px]">{artifact.artifact_code || "Artifact"}</span>
                        <button onClick={() => setSelectedArtifacts(selectedArtifacts.filter(a => a.id !== artifact.id))} className="text-purple-500 hover:text-red-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-3">
                  <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} accept="image/*,.pdf,.txt,.mp3,.wav,.mp4" className="hidden" disabled={uploadingFiles || isSending} />
                  <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={uploadingFiles || isSending} className="flex-shrink-0">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setShowArtifactPicker(true)} disabled={uploadingFiles || isSending} className="flex-shrink-0">
                    <Package className="w-4 h-4" />
                  </Button>
                  <Textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Ask about artifacts..."
                    className="resize-none flex-1 min-w-0"
                    rows={2}
                    disabled={uploadingFiles || isSending}
                  />
                  <Button onClick={handleSend} disabled={(!inputMessage.trim() && selectedFiles.length === 0 && selectedArtifacts.length === 0) || isSending || uploadingFiles} className="bg-purple-600 hover:bg-purple-700 flex-shrink-0" size="icon">
                    {isSending || uploadingFiles ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center">
              <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Analysis Selected</h3>
              <p className="text-gray-600 mb-4">Create a new analysis to get started</p>
              <Button onClick={createNewConversation} className="bg-purple-600 hover:bg-purple-700">
                <Sparkles className="w-4 h-4 mr-2" />
                New Analysis
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <Dialog open={showArtifactPicker} onOpenChange={setShowArtifactPicker}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Reference Artifacts</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input value={artifactSearchTerm} onChange={(e) => setArtifactSearchTerm(e.target.value)} placeholder="Search artifacts..." className="pl-10" />
            </div>
            <div className="grid gap-2 max-h-[500px] overflow-y-auto">
              {filteredArtifactsForPicker.map(artifact => (
                <div key={artifact.id} onClick={() => toggleArtifactSelection(artifact)} className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedArtifacts.some(a => a.id === artifact.id) ? "bg-purple-50 border-purple-300" : "hover:bg-gray-50 border-gray-200"}`}>
                  <div className="flex items-center gap-3">
                    {artifact.photo_url && <img src={artifact.photo_url} alt="Artifact" className="w-16 h-16 rounded object-cover flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{artifact.artifact_code || "Unnamed"}</p>
                      {artifact.user_notes && <p className="text-xs text-gray-500 truncate mt-1">{artifact.user_notes}</p>}
                    </div>
                    {selectedArtifacts.some(a => a.id === artifact.id) && (
                      <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => { setShowArtifactPicker(false); setArtifactSearchTerm(""); }}>Cancel</Button>
            <Button onClick={() => { setShowArtifactPicker(false); setArtifactSearchTerm(""); }} className="bg-purple-600 hover:bg-purple-700">Add {selectedArtifacts.length}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingConversation} onOpenChange={() => setEditingConversation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Analysis Name</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Enter analysis name..." />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditingConversation(null)}>Cancel</Button>
              <Button onClick={handleEditConversationName} className="bg-purple-600 hover:bg-purple-700">Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingConversation} onOpenChange={() => !isDeleting && setDeletingConversation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Analysis?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this analysis and all messages.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConversation} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {viewingArtifact && (
        <ArtifactDetailModal
          artifact={viewingArtifact}
          onClose={() => setViewingArtifact(null)}
          onUpdate={async () => {
            const artifacts = await base44.entities.Artifact.list("-created_date");
            setAllArtifacts(artifacts);
            setViewingArtifact(null);
          }}
          isAdmin={currentUser?.role === "admin"}
        />
      )}
    </div>
  );
}
