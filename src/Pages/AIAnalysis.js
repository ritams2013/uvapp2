
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "../api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Loader2, MessageSquare, Paperclip, X, Package, FileText, Image as ImageIcon, File, Search, ExternalLink, Download, Edit2, Trash2, Menu } from "lucide-react";
import MessageBubble from "../components/ai/MessageBubble";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import ArtifactDetailModal from "../components/artifacts/ArtifactDetailModal";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function AIAnalysis() {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [artifactCount, setArtifactCount] = useState(0);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

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
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportFormat, setExportFormat] = useState('json');
  const unsubscribeRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    // Cleanup previous subscription
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
        toast.error("Failed to connect to live updates");
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
      setIsLoading(true);
      setError(null);

      const user = await base44.auth.me();
      setCurrentUser(user);

      const artifacts = await base44.entities.Artifact.list("-created_date");
      setAllArtifacts(artifacts);
      setArtifactCount(artifacts.length);

      await loadConversations();
    } catch (error) {
      console.error("Error loading initial data:", error);
      setError("Failed to load AI Analysis. Please refresh the page.");
    } finally {
      setIsLoading(false);
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
      toast.error("Failed to load analyses");
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
      setShowMobileSidebar(false);
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
      setShowMobileSidebar(false);
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
    
    const supportedTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/gif', 
      'image/webp', 
      'application/pdf', 
      'text/plain', 
      'audio/mpeg', 
      'audio/wav', 
      'video/mp4'
    ];
    
    const supportedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt', '.mp3', '.wav', '.mp4'];
    
    const unsupportedFiles = files.filter(file => {
      const hasValidMimeType = supportedTypes.includes(file.type);
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const hasValidExtension = supportedExtensions.includes(fileExtension);
      
      return !hasValidMimeType && !hasValidExtension;
    });
    
    if (unsupportedFiles.length > 0) {
      toast.error(`Unsupported file type: ${unsupportedFiles[0].name}. Supported formats: Images, PDF, TXT, Audio, Video`);
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

  const getFileName = (url) => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return decodeURIComponent(pathname.substring(pathname.lastIndexOf('/') + 1));
    } catch (e) {
      return url.split('/').pop();
    }
  };

  const handleSend = async () => {
    if ((!inputMessage.trim() && selectedFiles.length === 0 && selectedArtifacts.length === 0) || !currentConversation) return;

    const messageText = inputMessage;
    const filesToUpload = [...selectedFiles];
    const artifactsToSend = [...selectedArtifacts];

    // Clear inputs immediately for better UX
    setInputMessage("");
    setSelectedFiles([]);
    setSelectedArtifacts([]);
    setIsSending(true);
    setUploadingFiles(true);
    
    try {
      let fileUrls = [];
      
      if (filesToUpload.length > 0) {
        for (const file of filesToUpload) {
          try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            fileUrls.push(file_url);
          } catch (uploadError) {
            console.error("Error uploading file:", uploadError);
            toast.error(`Failed to upload ${file.name}`);
            setIsSending(false);
            setUploadingFiles(false);
            return;
          }
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
      toast.error("Failed to send message. Please try again.");
      // Restore inputs on error
      setInputMessage(messageText);
      setSelectedFiles(filesToUpload);
      setSelectedArtifacts(artifactsToSend);
    } finally {
      setIsSending(false);
      setUploadingFiles(false);
    }
  };

  const handleExportConversation = async (format) => {
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
    } else if (format === 'pdf') {
      const htmlContent = `
        <html>
          <head>
            <title>AI Analysis</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
              h1 { color: #9333EA; border-bottom: 3px solid #9333EA; padding-bottom: 10px; margin-bottom: 20px; }
              .meta { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .message { margin: 25px 0; padding: 20px; border-radius: 8px; page-break-inside: avoid; }
              .user { background: #1e293b; color: white; }
              .assistant { background: #f9fafb; border: 1px solid #e5e7eb; }
              .role { font-weight: bold; margin-bottom: 8px; font-size: 14px; text-transform: uppercase; }
              .timestamp { font-size: 11px; color: #6b7280; margin-bottom: 10px; }
              .content { white-space: pre-wrap; line-height: 1.8; }
              .user .timestamp { color: #cbd5e1; }
            </style>
          </head>
          <body>
            <h1>AI Analysis Conversation</h1>
            <div class="meta">
              <strong>Analysis Name:</strong> ${exportData.name}<br>
              <strong>Date:</strong> ${new Date(exportData.date).toLocaleString()}<br>
              <strong>Total Messages:</strong> ${exportData.messages.length}
            </div>
            ${exportData.messages.map(m => `
              <div class="message ${m.role}">
                <div class="role">${m.role === 'user' ? '👤 User' : '🤖 AI Assistant'}</div>
                <div class="timestamp">${new Date(m.timestamp).toLocaleString()}</div>
                <div class="content">${m.content}</div>
              </div>
            `).join('')}
          </body>
        </html>
      `;
      
      const printWindow = window.open('', '', 'height=600,width=800');
      if (printWindow) { // Keep the check for printWindow
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 250);
        
        toast.success("PDF print dialog opened");
      } else {
        toast.error("Failed to open print window. Please allow pop-ups.");
      }
      return;
    }

    if (format !== 'pdf') { // This check is redundant now as `return` is called for PDF, but harmless.
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
    }
  };

  const filteredArtifactsForPicker = allArtifacts.filter(a =>
    (a.artifact_code?.toLowerCase().includes(artifactSearchTerm.toLowerCase()) ||
    a.user_notes?.toLowerCase().includes(artifactSearchTerm.toLowerCase()))
  );

  const SidebarContent = () => (
    <>
      <Button
        onClick={createNewConversation}
        className="w-full mb-4 bg-purple-600 hover:bg-purple-700"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        New Analysis
      </Button>

      {currentConversation && (
        <div className="mb-4">
          <div className="flex gap-2">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-sm"
            >
              <option value="json">JSON</option>
              <option value="txt">TXT</option>
              <option value="pdf">PDF</option>
            </select>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleExportConversation(exportFormat)}
              className="flex-shrink-0"
            >
              <Download className="w-3 h-3 mr-1" />
              Export
            </Button>
          </div>
        </div>
      )}

      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Database Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{artifactCount}</div>
          <p className="text-xs text-gray-500">Total artifacts</p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-600 mb-2">
          Recent Analyses
        </h3>
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
    </>
  );

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#FAFAF9]">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-purple-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading AI Analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#FAFAF9] p-6">
        <div className="text-center max-w-md">
          <Sparkles className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-gray-900">Connection Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button 
            onClick={() => {
              setError(null);
              loadInitialData();
            }}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#FAFAF9]">
      {/* Header */}
      <div className="p-4 md:p-6 bg-white border-b flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sheet open={showMobileSidebar} onOpenChange={setShowMobileSidebar}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-4">
                <SheetHeader className="mb-4">
                  <SheetTitle>Analyses</SheetTitle>
                </SheetHeader>
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-purple-600" />
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-gray-900">AI Analysis</h1>
              <p className="text-xs md:text-sm text-gray-600 hidden sm:block">
                Analyze artifacts using AI
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:block w-80 border-r bg-white p-4 overflow-y-auto">
          <SidebarContent />
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {currentConversation ? (
            <>
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center max-w-md px-4">
                      <Sparkles className="w-12 h-12 md:w-16 md:h-16 text-purple-400 mx-auto mb-4" />
                      <h3 className="text-lg md:text-xl font-semibold mb-2">
                        Start Your Analysis
                      </h3>
                      <p className="text-sm md:text-base text-gray-600 mb-4">
                        Ask questions, analyze patterns, and discover connections
                      </p>
                      <div className="grid gap-2 text-sm text-left">
                        <Badge
                          variant="outline"
                          className="justify-start p-3 cursor-pointer hover:bg-purple-50 text-xs md:text-sm"
                          onClick={() =>
                            setInputMessage(
                              "Show me all the pottery artifacts and find patterns between them"
                            )
                          }
                        >
                          Find artifact patterns
                        </Badge>
                        <Badge
                          variant="outline"
                          className="justify-start p-3 cursor-pointer hover:bg-purple-50 text-xs md:text-sm"
                          onClick={() =>
                            setInputMessage(
                              "Which artifacts need review by the admin?"
                            )
                          }
                        >
                          Check review status
                        </Badge>
                        <Badge
                          variant="outline"
                          className="justify-start p-3 cursor-pointer hover:bg-purple-50 text-xs md:text-sm"
                          onClick={() =>
                            setInputMessage(
                              "Analyze artifacts from the same location"
                            )
                          }
                        >
                          Group by location
                        </Badge>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message, idx) => {
                      const artifactIds = [];
                      const fileUrls = message.file_urls || [];
                      
                      if (message.role === 'user' && message.content) {
                        const artifactMatches = message.content.match(/\[ARTIFACT_ID: ([a-zA-Z0-9-]+)\]/g);
                        if (artifactMatches) {
                          artifactMatches.forEach(match => {
                            const id = match.replace('[ARTIFACT_ID: ', '').replace(']', '');
                            const artifact = allArtifacts.find(a => a.id === id);
                            if (artifact) artifactIds.push(artifact);
                          });
                        }
                      }
                      
                      // Also check AI responses for artifact references
                      if (message.role === 'assistant' && message.content) {
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
                          
                          {(artifactIds.length > 0 || fileUrls.length > 0) && (
                            <div className={`mt-2 flex flex-wrap gap-2 ${message.role === 'user' ? 'justify-end mr-10' : 'ml-10'}`}>
                              {artifactIds.map((artifact) => (
                                <div 
                                  key={artifact.id}
                                  onClick={() => setViewingArtifact(artifact)}
                                  className="inline-flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm cursor-pointer hover:bg-purple-100 transition-colors"
                                >
                                  <Package className="w-3 h-3 md:w-4 md:h-4 text-purple-700" />
                                  <span className="font-medium truncate max-w-[100px] md:max-w-none">{artifact.artifact_code || "Artifact"}</span>
                                  <ExternalLink className="w-2 h-2 md:w-3 md:h-3 text-purple-600" />
                                </div>
                              ))}
                              {fileUrls.map((fileUrl, fileIdx) => {
                                const fileName = getFileName(fileUrl);
                                const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileName.split('.').pop()?.toLowerCase());
                                
                                return (
                                  <a
                                    key={fileIdx}
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm hover:bg-gray-100 transition-colors"
                                  >
                                    {isImage ? <ImageIcon className="w-3 h-3 md:w-4 md:h-4" /> : <FileText className="w-3 h-3 md:w-4 md:h-4" />}
                                    <span className="truncate max-w-[100px] md:max-w-[200px]">{fileName}</span>
                                    <Download className="w-2 h-2 md:w-3 md:h-3" />
                                  </a>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              <div className="border-t p-3 md:p-4 bg-white flex-shrink-0">
                <div className="max-w-4xl mx-auto">
                  {(selectedFiles.length > 0 || selectedArtifacts.length > 0) && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {selectedFiles.map((file, index) => (
                        <div key={`file-${index}`} className="flex items-center gap-2 bg-gray-100 rounded-lg px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm">
                          {getFileIcon(file.name)}
                          <span className="truncate max-w-[80px] md:max-w-[150px]">{file.name}</span>
                          <button
                            onClick={() => removeFile(index)}
                            className="text-gray-500 hover:text-red-600"
                          >
                            <X className="w-3 h-3 md:w-4 md:h-4" />
                          </button>
                        </div>
                      ))}
                      {selectedArtifacts.map((artifact) => (
                        <div key={`artifact-${artifact.id}`} className="flex items-center gap-2 bg-purple-100 rounded-lg px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm">
                          <Package className="w-3 h-3 md:w-4 md:h-4 text-purple-700" />
                          <span className="truncate max-w-[80px] md:max-w-[150px]">{artifact.artifact_code || "Artifact"}</span>
                          <button
                            onClick={() => setSelectedArtifacts(selectedArtifacts.filter(a => a.id !== artifact.id))}
                            className="text-purple-500 hover:text-red-600"
                          >
                            <X className="w-3 h-3 md:w-4 md:h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 md:gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      accept="image/*,.pdf,.txt,.mp3,.wav,.mp4"
                      className="hidden"
                      disabled={uploadingFiles || isSending}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFiles || isSending}
                      title="Attach files"
                      className="flex-shrink-0"
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowArtifactPicker(true)}
                      disabled={uploadingFiles || isSending}
                      title="Reference artifacts"
                      className="flex-shrink-0"
                    >
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
                      className="resize-none text-sm md:text-base"
                      rows={2}
                      disabled={uploadingFiles || isSending}
                    />
                    <Button
                      onClick={handleSend}
                      disabled={(!inputMessage.trim() && selectedFiles.length === 0 && selectedArtifacts.length === 0) || isSending || uploadingFiles}
                      className="bg-purple-600 hover:bg-purple-700 flex-shrink-0"
                      size="icon"
                    >
                      {isSending || uploadingFiles ? (
                        <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 md:w-5 md:h-5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full p-4">
              <div className="text-center">
                <Sparkles className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg md:text-xl font-semibold mb-2">
                  No Analysis Selected
                </h3>
                <p className="text-sm md:text-base text-gray-600 mb-4">
                  Create a new analysis or select an existing one
                </p>
                <Button onClick={createNewConversation} className="bg-purple-600 hover:bg-purple-700">
                  <Sparkles className="w-4 h-4 mr-2" />
                  New Analysis
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Artifact Picker Dialog */}
      <Dialog open={showArtifactPicker} onOpenChange={setShowArtifactPicker}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col mx-4">
          <DialogHeader>
            <DialogTitle>Reference Artifacts</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-y-auto pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                value={artifactSearchTerm}
                onChange={(e) => setArtifactSearchTerm(e.target.value)}
                placeholder="Search artifacts..."
                className="pl-10"
              />
            </div>
            <div className="grid grid-cols-1 gap-2 max-h-[500px] overflow-y-auto pr-2">
              {filteredArtifactsForPicker.length === 0 && (
                <p className="text-gray-500 text-center text-sm">No artifacts found</p>
              )}
              {filteredArtifactsForPicker.map(artifact => (
                <div
                  key={artifact.id}
                  onClick={() => toggleArtifactSelection(artifact)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedArtifacts.some(a => a.id === artifact.id)
                      ? "bg-purple-50 border-purple-300"
                      : "hover:bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {artifact.photo_url && (
                      <img src={artifact.photo_url} alt="Artifact" className="w-12 h-12 md:w-16 md:h-16 rounded object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{artifact.artifact_code || "Unnamed"}</p>
                      {artifact.user_notes && (
                        <p className="text-xs text-gray-500 truncate mt-1">{artifact.user_notes}</p>
                      )}
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
            <Button variant="outline" onClick={() => {
              setShowArtifactPicker(false);
              setArtifactSearchTerm("");
            }}>
              Cancel
            </Button>
            <Button onClick={() => {
              setShowArtifactPicker(false);
              setArtifactSearchTerm("");
            }} className="bg-purple-600 hover:bg-purple-700">
              Add {selectedArtifacts.length} Artifact{selectedArtifacts.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingConversation} onOpenChange={() => setEditingConversation(null)}>
        <DialogContent className="mx-4">
          <DialogHeader>
            <DialogTitle>Edit Analysis Name</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Enter analysis name..."
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditingConversation(null)}>
                Cancel
              </Button>
              <Button onClick={handleEditConversationName} className="bg-purple-600 hover:bg-purple-700">
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deletingConversation} onOpenChange={() => !isDeleting && setDeletingConversation(null)}>
        <AlertDialogContent className="mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Analysis?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this analysis and all messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConversation}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Artifact Viewer */}
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
