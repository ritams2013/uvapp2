import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { MessageCircle, Send, Plus, Users as UsersIcon, User as UserIcon, Search, Edit2, Menu, X, UserPlus, Bell, BellOff, Megaphone, Trash2, Paperclip, Download, FileText, ImageIcon, File, Loader2, Package, ExternalLink } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { toast } from "sonner";
import ArtifactDetailModal from "../components/artifacts/ArtifactDetailModal";

export default function Chat() {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [chatName, setChatName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingConversation, setEditingConversation] = useState(null);
  const [editName, setEditName] = useState("");
  const [editingParticipants, setEditingParticipants] = useState(null);
  const [editParticipantsList, setEditParticipantsList] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false);
  const [announcementName, setAnnouncementName] = useState("");
  const [announcementParticipants, setAnnouncementParticipants] = useState([]);
  const [announcementSenders, setAnnouncementSenders] = useState([]);
  const [deletingConversation, setDeletingConversation] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [editingSenders, setEditingSenders] = useState(null);
  const [editSendersList, setEditSendersList] = useState([]);
  const messagesEndRef = useRef(null);
  const notificationPermission = useRef(false);
  const lastNotifiedMessageRef = useRef(null);
  const initialLoadDone = useRef(false);
  const lastCheckedMessagesRef = useRef({});
  const fileInputRef = useRef(null);
  const [showArtifactPicker, setShowArtifactPicker] = useState(false);
  const [allArtifacts, setAllArtifacts] = useState([]);
  const [selectedArtifacts, setSelectedArtifacts] = useState([]);
  const [artifactSearchTerm, setArtifactSearchTerm] = useState("");
  const [viewingArtifact, setViewingArtifact] = useState(null);

  useEffect(() => {
    loadInitialData();
    requestNotificationPermission();
    checkNotificationSupport();
  }, []);

  useEffect(() => {
    if (!currentUser || !initialLoadDone.current) return;
    
    const interval = setInterval(() => {
      loadConversations();
      checkForNewMessages(); // Check for new messages in all conversations
    }, 20000); // Changed from 5000 to 20000 (20 seconds)
    
    return () => clearInterval(interval);
  }, [currentUser, selectedConversation?.id]);

  useEffect(() => {
    if (!selectedConversation || !currentUser || !initialLoadDone.current) return;
    
    loadMessages(selectedConversation.id);
    
    const interval = setInterval(() => {
      loadMessages(selectedConversation.id);
    }, 15000); // Changed from 3000 to 15000 (15 seconds)
    
    return () => clearInterval(interval);
  }, [selectedConversation?.id, currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkNotificationSupport = () => {
    if ("Notification" in window && Notification.permission === "default") {
      setShowNotificationPrompt(true);
    }
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      try {
        if (Notification.permission === "default") {
          const permission = await Notification.requestPermission();
          notificationPermission.current = permission === "granted";
          setShowNotificationPrompt(false);
          if (permission === "granted") {
            toast.success("Desktop notifications enabled!");
          }
        } else if (Notification.permission === "granted") {
          notificationPermission.current = true;
        }
      } catch (error) {
        console.log("Notification permission error:", error);
      }
    }
  };

  const showNotification = (title, body, messageId) => {
    if (lastNotifiedMessageRef.current === messageId) {
      return;
    }
    
    // Check user's notification preferences
    if (currentUser?.notification_preferences?.desktop_notifications_enabled === false ||
        currentUser?.notification_preferences?.chat_messages === false) {
      return;
    }
    
    if (notificationPermission.current) {
      try {
        const notification = new Notification(title, {
          body: body,
          icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e312345774f0a395ea5912/0aff2f04c_Ultraviolatelogo.png",
          tag: messageId,
          requireInteraction: false
        });
        
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
        
        lastNotifiedMessageRef.current = messageId;
      } catch (error) {
        console.log("Error showing notification:", error);
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getConversationName = (conversation) => {
    if (!currentUser) return "";
    if (conversation.name) return conversation.name;
    
    const otherParticipants = conversation.participants.filter(
      p => p !== currentUser.email
    );
    
    if (otherParticipants.length === 0) return "Me";
    if (otherParticipants.length === 1) {
      const user = allUsers.find(u => u.email === otherParticipants[0]);
      return user?.full_name || otherParticipants[0];
    }
    
    const otherParticipantNames = otherParticipants.slice(0, 2).map(email => {
      const user = allUsers.find(u => u.email === email);
      return user?.full_name || email;
    });
    
    if (otherParticipants.length > 2) {
      return `${otherParticipantNames.join(", ")} +${otherParticipants.length - 2}`;
    }
    
    return otherParticipantNames.join(", ");
  };

  const checkForNewMessages = async () => {
    if (!currentUser) return;

    try {
      const allConvos = await base44.entities.Conversation.list("-last_message_at");
      const userConvos = allConvos.filter(c => 
        c.participants && Array.isArray(c.participants) && c.participants.includes(currentUser.email)
      );

      for (const convo of userConvos) {
        // Skip notification for the currently selected conversation
        if (selectedConversation?.id === convo.id) {
          continue; 
        }

        const msgs = await base44.entities.ChatMessage.filter(
          { conversation_id: convo.id },
          "-created_date", // Order by created_date descending
          10 // Limit to last 10 messages for efficiency
        );
        
        // Filter messages that are from others and unread by current user
        const unreadMessages = msgs.filter(
          m => m.created_by !== currentUser.email && !m.read_by?.includes(currentUser.email)
        );

        if (unreadMessages.length > 0) {
          // Get the latest unread message. If messages are sorted descending, this is [0].
          // The outline specifies [unreadMessages.length - 1], which implies ascending sort, 
          // so we will follow the outline's index.
          const latestUnread = unreadMessages[unreadMessages.length - 1]; 
          const lastCheckedId = lastCheckedMessagesRef.current[convo.id];
          
          // Only notify if this is a new message we haven't notified about
          if (latestUnread.id !== lastCheckedId) {
            const sender = allUsers.find(u => u.email === latestUnread.created_by);
            const conversationName = getConversationName(convo);
            
            showNotification(
              sender?.full_name || latestUnread.created_by,
              `${conversationName}: ${latestUnread.content.substring(0, 100)}${latestUnread.content.length > 100 ? '...' : ''}`,
              latestUnread.id
            );
            
            lastCheckedMessagesRef.current[convo.id] = latestUnread.id;
          }
        }
      }
    } catch (error) {
      console.error("Error checking for new messages:", error);
    }
  };


  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const user = await base44.auth.me();
      setCurrentUser(user);
      console.log("Current user loaded:", user.email);

      let fetchedUsers = [];
      
      try {
        // Try to fetch all users (admin privilege)
        fetchedUsers = await base44.entities.User.list();
        console.log("✅ User list loaded successfully:", fetchedUsers);
        console.log("Total users from API:", fetchedUsers.length);
        
        if (fetchedUsers.length === 0) {
          console.warn("⚠️ User list is empty - no users in system?");
        }
        
        // Always use the fetched list if the API call succeeded (even if empty)
        setAllUsers(fetchedUsers);
        console.log("Set allUsers with", fetchedUsers.length, "users");
        
      } catch (userListError) {
        console.error("❌ Failed to load users from API:", userListError);
        console.error("Error details:", userListError.message);
        
        // Fallback: build user list from conversation participants
        console.log("📋 Building fallback user list from conversations");
        
        const allConvos = await base44.entities.Conversation.list("-last_message_at");
        const userConvos = allConvos.filter(c => 
          c.participants && Array.isArray(c.participants) && c.participants.includes(user.email)
        );
        
        const uniqueParticipantEmails = new Set();
        userConvos.forEach(convo => {
          convo.participants?.forEach(email => {
            uniqueParticipantEmails.add(email);
          });
        });
        
        const participantUsers = Array.from(uniqueParticipantEmails).map(email => ({
          id: email,
          email: email,
          full_name: email.split('@')[0],
          role: 'user'
        }));
        
        setAllUsers(participantUsers);
        console.log("Fallback user list created with", participantUsers.length, "users");
      }

      const allConvos = await base44.entities.Conversation.list("-last_message_at");
      const userConvos = allConvos.filter(c => 
        c.participants && Array.isArray(c.participants) && c.participants.includes(user.email)
      );
      setConversations(userConvos);
      
      const artifacts = await base44.entities.Artifact.list("-created_date");
      setAllArtifacts(artifacts);
      
      initialLoadDone.current = true;
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading initial data:", error);
      setError("Failed to load chat data. Please refresh the page.");
      setIsLoading(false);
    }
  };

  const loadConversations = async () => {
    if (!currentUser) return;
    
    try {
      const allConvos = await base44.entities.Conversation.list("-last_message_at");
      const userConvos = allConvos.filter(c => 
        c.participants && Array.isArray(c.participants) && c.participants.includes(currentUser.email)
      );
      setConversations(userConvos);
      
      // Calculate unread counts for each conversation
      const counts = {};
      for (const convo of userConvos) {
        const msgs = await base44.entities.ChatMessage.filter(
          { conversation_id: convo.id },
          "created_date"
        );
        const unreadMessages = msgs.filter(
          m => m.created_by !== currentUser.email && !m.read_by?.includes(currentUser.email)
        );
        counts[convo.id] = unreadMessages.length;
      }
      setUnreadCounts(counts);
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  };

  const loadMessages = async (conversationId) => {
    if (!currentUser || !conversationId) return;
    
    try {
      const msgs = await base44.entities.ChatMessage.filter(
        { conversation_id: conversationId },
        "created_date"
      );
      setMessages(msgs);

      const unreadMessages = msgs.filter(
        m => m.created_by !== currentUser.email && !m.read_by?.includes(currentUser.email)
      );
      
      // Mark messages as read when viewing the conversation
      if (unreadMessages.length > 0) {
        for (const msg of unreadMessages) {
          await base44.entities.ChatMessage.update(msg.id, {
            read_by: [...(msg.read_by || []), currentUser.email]
          });
        }
        // After marking as read, refresh conversations to update unread counts
        loadConversations();
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate file types by MIME type and extension
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
      toast.error(`Unsupported file type: ${unsupportedFiles[0].name}. Supported formats: Images (JPG, PNG, GIF, WEBP), PDF, TXT, Audio (MP3, WAV), Video (MP4)`, {
        duration: 5000
      });
      e.target.value = null;
      return;
    }
    
    setSelectedFiles(files);
    e.target.value = null;
  };

  const removeFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && selectedFiles.length === 0 && selectedArtifacts.length === 0) || !selectedConversation || !currentUser) return;

    // Check if user is allowed to send messages in announcement chats
    if (selectedConversation.is_announcement && 
        selectedConversation.allowed_senders && 
        selectedConversation.allowed_senders.length > 0) {
      if (!selectedConversation.allowed_senders.includes(currentUser.email)) {
        toast.error("Only designated senders can post in this information chat");
        return;
      }
    }

    setUploadingFiles(true);
    try {
      let fileUrls = [];
      let fileNames = [];

      // Upload files if any
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          fileUrls.push(file_url);
          fileNames.push(file.name);
        }
      }

      const messageContent = newMessage || 
        (fileUrls.length > 0 ? "(File attachment)" : "") ||
        (selectedArtifacts.length > 0 ? `(${selectedArtifacts.length} artifact${selectedArtifacts.length > 1 ? 's' : ''} attached)` : "");

      await base44.entities.ChatMessage.create({
        conversation_id: selectedConversation.id,
        content: messageContent,
        read_by: [currentUser.email],
        file_urls: fileUrls,
        file_names: fileNames,
        artifact_references: selectedArtifacts.map(a => a.id)
      });

      await base44.entities.Conversation.update(selectedConversation.id, {
        last_message_at: new Date().toISOString()
      });

      setNewMessage("");
      setSelectedFiles([]);
      setSelectedArtifacts([]);
      await loadMessages(selectedConversation.id);
      await loadConversations();
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleCreateConversation = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Please select at least one person");
      return;
    }
    if (!currentUser) {
      toast.error("Current user not loaded. Please try again.");
      return;
    }

    try {
      const participants = [...new Set([...selectedUsers, currentUser.email])];
      const isGroup = selectedUsers.length > 1;

      const newConvo = await base44.entities.Conversation.create({
        name: isGroup ? chatName || "Group Chat" : "",
        participants: participants,
        is_group: isGroup,
        last_message_at: new Date().toISOString()
      });

      setConversations([newConvo, ...conversations]);
      setSelectedConversation(newConvo);
      setShowNewChat(false);
      setSelectedUsers([]);
      setChatName("");
      setSearchTerm("");
      setSidebarOpen(false);
      toast.success("Chat created!");
      await loadConversations();
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to create chat");
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!announcementName.trim()) {
      toast.error("Information chat name is required");
      return;
    }
    if (announcementParticipants.length === 0) {
      toast.error("Please select at least one participant");
      return;
    }
    if (!currentUser) {
      toast.error("Current user not loaded. Please try again.");
      return;
    }

    try {
      const participants = [...new Set([...announcementParticipants, currentUser.email])];
      // If no senders selected, only creator can send
      const allowedSenders = announcementSenders.length > 0 
        ? [...new Set([...announcementSenders, currentUser.email])]
        : [currentUser.email];

      const newConvo = await base44.entities.Conversation.create({
        name: announcementName,
        participants: participants,
        is_group: true,
        is_announcement: true,
        allowed_senders: allowedSenders,
        last_message_at: new Date().toISOString()
      });

      setConversations([newConvo, ...conversations]);
      setSelectedConversation(newConvo);
      setShowNewAnnouncement(false);
      setAnnouncementName("");
      setAnnouncementParticipants([]);
      setAnnouncementSenders([]);
      setSearchTerm("");
      setSidebarOpen(false);
      toast.success("Information chat created!");
      await loadConversations();
    } catch (error) {
      console.error("Error creating announcement:", error);
      toast.error("Failed to create information chat");
    }
  };

  const handleEditConversationName = async () => {
    if (!editingConversation || !editName.trim()) {
      toast.error("Please enter a name");
      return;
    }

    try {
      await base44.entities.Conversation.update(editingConversation.id, {
        name: editName
      });
      
      toast.success("Chat name updated!");
      setEditingConversation(null);
      setEditName("");
      await loadConversations();
      if (selectedConversation?.id === editingConversation.id) {
        setSelectedConversation(prev => ({ ...prev, name: editName }));
      }
    } catch (error) {
      console.error("Error updating conversation name:", error);
      toast.error("Failed to update chat name");
    }
  };

  const handleEditParticipants = async () => {
    if (!editingParticipants || !currentUser) return;

    const finalParticipants = [...new Set([...editParticipantsList, currentUser.email])];

    if (finalParticipants.length < 2 && editingParticipants.is_group) {
        toast.error("Group chats must have at least two participants.");
        return;
    }
    if (finalParticipants.length === 0) {
        toast.error("Chat must have at least one participant.");
        return;
    }

    try {
      await base44.entities.Conversation.update(editingParticipants.id, {
        participants: finalParticipants
      });
      
      toast.success("Participants updated!");
      setEditingParticipants(null);
      setEditParticipantsList([]);
      await loadConversations();
      
      if (selectedConversation?.id === editingParticipants.id) {
        const updatedConvos = await base44.entities.Conversation.list();
        const updated = updatedConvos.find(c => c.id === editingParticipants.id);
        if (updated) {
          setSelectedConversation(updated);
        }
      }
    } catch (error) {
      console.error("Error updating participants:", error);
      toast.error("Failed to update participants");
    }
  };

  const handleEditSenders = async () => {
    if (!editingSenders || !currentUser) return;

    const finalSenders = [...new Set([...editSendersList, currentUser.email])];

    try {
      await base44.entities.Conversation.update(editingSenders.id, {
        allowed_senders: finalSenders
      });
      
      toast.success("Message permissions updated!");
      setEditingSenders(null);
      setEditSendersList([]);
      await loadConversations();
      
      if (selectedConversation?.id === editingSenders.id) {
        const updatedConvos = await base44.entities.Conversation.list();
        const updated = updatedConvos.find(c => c.id === editingSenders.id);
        if (updated) {
          setSelectedConversation(updated);
        }
      }
    } catch (error) {
      console.error("Error updating senders:", error);
      toast.error("Failed to update message permissions");
    }
  };

  const handleDeleteConversation = async () => {
    if (!deletingConversation) return;
    
    setIsDeleting(true);
    try {
      // Delete all messages in the conversation first
      const msgs = await base44.entities.ChatMessage.filter(
        { conversation_id: deletingConversation.id },
        "created_date"
      );
      
      for (const msg of msgs) {
        await base44.entities.ChatMessage.delete(msg.id);
      }
      
      // Delete the conversation
      await base44.entities.Conversation.delete(deletingConversation.id);
      
      toast.success("Chat deleted successfully");
      
      // Clear selection if this was the selected conversation
      if (selectedConversation?.id === deletingConversation.id) {
        setSelectedConversation(null);
        setMessages([]);
      }
      
      // Reload conversations
      await loadConversations();
      setDeletingConversation(null);
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast.error("Failed to delete chat");
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleUserSelection = (email) => {
    // For regular chat
    if (!showNewAnnouncement) {
      if (selectedUsers.includes(email)) {
        setSelectedUsers(selectedUsers.filter(e => e !== email));
      } else {
        setSelectedUsers([...selectedUsers, email]);
      }
    } else {
      // For announcement chat
      if (announcementParticipants.includes(email)) {
        setAnnouncementParticipants(announcementParticipants.filter(e => e !== email));
        // Also remove from senders if they were selected
        setAnnouncementSenders(announcementSenders.filter(e => e !== email));
      } else {
        setAnnouncementParticipants([...announcementParticipants, email]);
      }
    }
  };

  const toggleParticipant = (email) => {
    // Prevent current user from being removed from their own active chat if they are the last one
    if (email === currentUser?.email && editParticipantsList.includes(email) && editParticipantsList.length === 1) {
      toast.info("You must be a participant in your own chat.");
      return;
    }
    if (editParticipantsList.includes(email)) {
      setEditParticipantsList(editParticipantsList.filter(e => e !== email));
    } else {
      setEditParticipantsList([...editParticipantsList, email]);
    }
  };

  const toggleSender = (email) => {
    if (email === currentUser?.email && editSendersList.includes(email) && editSendersList.length === 1) {
      toast.info("You must be able to send messages in your own chat.");
      return;
    }
    if (editSendersList.includes(email)) {
      setEditSendersList(editSendersList.filter(e => e !== email));
    } else {
      setEditSendersList([...editSendersList, email]);
    }
  };

  const canSendMessage = () => {
    if (!selectedConversation || !currentUser) return false;
    
    // If it's an announcement chat with specific senders
    if (selectedConversation.is_announcement && 
        selectedConversation.allowed_senders && 
        selectedConversation.allowed_senders.length > 0) {
      return selectedConversation.allowed_senders.includes(currentUser.email);
    }
    
    // Otherwise, all participants can send
    return true;
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      return <ImageIcon className="w-4 h-4" />;
    } else if (['pdf', 'txt'].includes(ext)) {
      return <FileText className="w-4 h-4" />;
    }
    return <File className="w-4 h-4" />;
  };

  const getFileName = (url, originalName) => {
    if (originalName) return originalName;
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return pathname.substring(pathname.lastIndexOf('/') + 1);
    } catch (e) {
      return url.split('/').pop();
    }
  };

  const toggleArtifactSelection = (artifact) => {
    if (selectedArtifacts.some(a => a.id === artifact.id)) {
      setSelectedArtifacts(selectedArtifacts.filter(a => a.id !== artifact.id));
    } else {
      setSelectedArtifacts([...selectedArtifacts, artifact]);
    }
  };

  const isAdmin = currentUser?.role === "admin";

  const filteredUsers = allUsers
    .filter(u => u.email !== currentUser?.email)
    .filter(u => 
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const filteredParticipantsForEdit = allUsers
    .filter(u => 
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const filteredArtifactsForPicker = allArtifacts.filter(a =>
    a.artifact_code?.toLowerCase().includes(artifactSearchTerm.toLowerCase()) ||
    a.user_notes?.toLowerCase().includes(artifactSearchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#FAFAF9]">
        <div className="text-center">
          <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#FAFAF9] p-6">
        <div className="text-center max-w-md">
          <MessageCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
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
    <div className="h-screen flex flex-col md:flex-row bg-[#FAFAF9]">
      {/* Notification Permission Banner */}
      {showNotificationPrompt && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-purple-600 text-white p-3 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5" />
              <p className="text-sm font-medium">
                Enable desktop notifications to get notified of new messages even when this tab is in the background
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="bg-white text-purple-600 hover:bg-gray-100"
                onClick={requestNotificationPermission}
              >
                Enable
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-purple-700"
                onClick={() => setShowNotificationPrompt(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <h2 className="font-bold flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-purple-600" />
            Chats
          </h2>
        </div>
        {notificationPermission.current && (
          <Bell className="w-5 h-5 text-green-600" title="Notifications enabled" />
        )}
      </div>

      {/* Conversations List */}
      <div className={`${sidebarOpen ? 'block' : 'hidden'} md:block w-full md:w-80 border-r bg-white flex flex-col absolute md:relative z-10 h-full md:h-auto`}>
        <div className="p-4 border-b hidden md:block">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-purple-600" />
              Chats
            </h2>
            <div className="flex items-center gap-2">
              {notificationPermission.current ? (
                <Bell className="w-5 h-5 text-green-600" title="Notifications enabled" />
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={requestNotificationPermission}
                  title="Enable notifications"
                >
                  <BellOff className="w-5 h-5 text-gray-400" />
                </Button>
              )}
              {isAdmin && (
                <Dialog open={showNewAnnouncement} onOpenChange={setShowNewAnnouncement}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
                      <Megaphone className="w-4 h-4 mr-1" />
                      Info
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle>Create Information Chat</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 flex-1 overflow-y-auto">
                      <div>
                        <label className="block text-sm font-medium mb-2">Information Chat Name *</label>
                        <Input
                          value={announcementName}
                          onChange={(e) => setAnnouncementName(e.target.value)}
                          placeholder="e.g., Site Updates, Important Notices"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Who Can Read ({announcementParticipants.length} selected)
                        </label>
                        <div className="relative mb-3">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <Input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search users..."
                            className="pl-10"
                          />
                        </div>
                        <div className="max-h-[200px] overflow-y-auto space-y-2">
                          {filteredUsers.map(user => (
                            <div
                              key={user.id}
                              onClick={() => toggleUserSelection(user.email)}
                              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                announcementParticipants.includes(user.email)
                                  ? "bg-purple-50 border-purple-300"
                                  : "hover:bg-gray-50 border-gray-200"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="bg-purple-200 text-purple-700 text-sm font-semibold">
                                    {user.full_name?.charAt(0) || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{user.full_name}</p>
                                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                </div>
                                {announcementParticipants.includes(user.email) && (
                                  <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-xs">✓</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Who Can Send Messages ({announcementSenders.length} selected)
                        </label>
                        <p className="text-xs text-gray-500 mb-3">
                          Select users who can post. Leave empty to only allow yourself to post.
                        </p>
                        <div className="max-h-[200px] overflow-y-auto space-y-2">
                          {announcementParticipants.map(email => {
                            const user = allUsers.find(u => u.email === email);
                            if (!user) return null;
                            return (
                              <div
                                key={user.id}
                                onClick={() => {
                                  if (announcementSenders.includes(email)) {
                                    setAnnouncementSenders(announcementSenders.filter(e => e !== email));
                                  } else {
                                    setAnnouncementSenders([...announcementSenders, email]);
                                  }
                                }}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                  announcementSenders.includes(email)
                                    ? "bg-amber-50 border-amber-300"
                                    : "hover:bg-gray-50 border-gray-200"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-8 h-8">
                                    <AvatarFallback className="bg-purple-200 text-purple-700 text-sm font-semibold">
                                      {user.full_name?.charAt(0) || "U"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{user.full_name}</p>
                                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                  </div>
                                  {announcementSenders.includes(email) && (
                                    <div className="w-5 h-5 bg-amber-600 rounded-full flex items-center justify-center flex-shrink-0">
                                      <span className="text-white text-xs">✓</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <Button variant="outline" onClick={() => {
                        setShowNewAnnouncement(false);
                        setSearchTerm("");
                        setAnnouncementParticipants([]);
                        setAnnouncementSenders([]);
                        setAnnouncementName("");
                      }}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateAnnouncement} className="bg-purple-600 hover:bg-purple-700">
                        Create Information Chat
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-1" />
                    New
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>New Chat</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 flex-1 overflow-y-auto">
                    {selectedUsers.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Group Name (optional)</label>
                        <Input
                          value={chatName}
                          onChange={(e) => setChatName(e.target.value)}
                          placeholder="Enter group name..."
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Select People ({selectedUsers.length} selected)
                      </label>
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Search users..."
                          className="pl-10"
                        />
                      </div>
                      <div className="max-h-[300px] overflow-y-auto space-y-2">
                        {filteredUsers.map(user => (
                          <div
                            key={user.id}
                            onClick={() => toggleUserSelection(user.email)}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                              selectedUsers.includes(user.email)
                                ? "bg-purple-50 border-purple-300"
                                : "hover:bg-gray-50 border-gray-200"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-purple-200 text-purple-700 text-sm font-semibold">
                                  {user.full_name?.charAt(0) || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{user.full_name}</p>
                                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                </div>
                                {selectedUsers.includes(user.email) && (
                                <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                                  <span className="text-white text-xs">✓</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={() => {
                      setShowNewChat(false);
                      setSearchTerm("");
                      setSelectedUsers([]);
                      setChatName("");
                    }}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateConversation} className="bg-purple-600 hover:bg-purple-700">
                      Create Chat
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Mobile New Chat Button */}
        <div className="p-4 border-b md:hidden">
          <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
            <DialogTrigger asChild>
              <Button className="w-full bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[92vw] max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>New Chat</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 flex-1 overflow-y-auto">
                {selectedUsers.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Group Name (optional)</label>
                    <Input
                      value={chatName}
                      onChange={(e) => setChatName(e.target.value)}
                      placeholder="Enter group name..."
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select People ({selectedUsers.length} selected)
                  </label>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search users..."
                      className="pl-10"
                    />
                  </div>
                  <div className="max-h-[300px] overflow-y-auto space-y-2">
                    {filteredUsers.map(user => (
                      <div
                        key={user.id}
                        onClick={() => toggleUserSelection(user.email)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedUsers.includes(user.email)
                            ? "bg-purple-50 border-purple-300"
                            : "hover:bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-purple-200 text-purple-700 text-sm font-semibold">
                              {user.full_name?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{user.full_name}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          </div>
                          {selectedUsers.includes(user.email) && (
                            <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => {
                  setShowNewChat(false);
                  setSearchTerm("");
                  setSelectedUsers([]);
                  setChatName("");
                }}>
                  Cancel
                </Button>
                <Button onClick={handleCreateConversation} className="bg-purple-600 hover:bg-purple-700">
                  Create Chat
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Start a new chat to get started</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {conversations.map(conversation => (
                <button
                  key={conversation.id}
                  onClick={() => {
                    setSelectedConversation(conversation);
                    setSidebarOpen(false);
                  }}
                  className={`w-full p-3 rounded-lg text-left transition-all relative ${
                    selectedConversation?.id === conversation.id
                      ? "bg-purple-50 border border-purple-200"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarFallback className={conversation.is_announcement ? "bg-amber-200 text-amber-700" : "bg-purple-200 text-purple-700"}>
                          {conversation.is_announcement ? (
                            <Megaphone className="w-5 h-5" />
                          ) : conversation.is_group ? (
                            <UsersIcon className="w-5 h-5" />
                          ) : (
                            <UserIcon className="w-5 h-5" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      {unreadCounts[conversation.id] > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            {unreadCounts[conversation.id] > 9 ? '9+' : unreadCounts[conversation.id]}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {getConversationName(conversation)}
                        </p>
                        {unreadCounts[conversation.id] > 0 && (
                          <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {conversation.last_message_at
                          ? format(new Date(conversation.last_message_at), "MMM d, h:mm a")
                          : "No messages"}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-3 md:p-4 border-b bg-white flex-shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarFallback className={selectedConversation.is_announcement ? "bg-amber-200 text-amber-700" : "bg-purple-200 text-purple-700"}>
                      {selectedConversation.is_announcement ? (
                        <Megaphone className="w-5 h-5" />
                      ) : selectedConversation.is_group ? (
                        <UsersIcon className="w-5 h-5" />
                      ) : (
                        <UserIcon className="w-5 h-5" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate flex items-center gap-2">
                      {selectedConversation.is_announcement && (
                        <Megaphone className="w-4 h-4 text-amber-600" />
                      )}
                      {getConversationName(selectedConversation)}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {selectedConversation.is_announcement
                        ? "Information Chat"
                        : selectedConversation.is_group
                        ? `${selectedConversation.participants.length} participants`
                        : "Direct message"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {selectedConversation.is_group && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingConversation(selectedConversation);
                        setEditName(selectedConversation.name || "");
                      }}
                      className="flex-shrink-0"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingParticipants(selectedConversation);
                      setEditParticipantsList([...selectedConversation.participants]);
                    }}
                    className="flex-shrink-0"
                    title="Manage participants"
                  >
                    <UserPlus className="w-4 h-4" />
                  </Button>
                  {selectedConversation.is_announcement && isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingSenders(selectedConversation);
                        setEditSendersList([...selectedConversation.allowed_senders]);
                      }}
                      className="flex-shrink-0"
                      title="Manage who can send messages"
                    >
                      <Megaphone className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingConversation(selectedConversation)}
                    className="flex-shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-3 md:space-y-4 bg-gray-50 min-h-0">
              {messages.map((message) => {
                const isOwn = message.created_by === currentUser?.email;
                const sender = allUsers.find(u => u.email === message.created_by);
                const referencedArtifacts = message.artifact_references?.map(id => 
                  allArtifacts.find(a => a.id === id)
                ).filter(Boolean) || [];
                
                return (
                  <div
                    key={message.id}
                    className={`flex gap-2 md:gap-3 ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    {!isOwn && (
                      <Avatar className="w-7 h-7 md:w-8 md:h-8 flex-shrink-0">
                        <AvatarFallback className="bg-gray-200 text-gray-700 text-xs font-semibold">
                          {sender?.full_name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className={`max-w-[75%] md:max-w-[70%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
                      {!isOwn && selectedConversation.is_group && (
                        <p className="text-xs text-gray-600 mb-1 ml-2">
                          {sender?.full_name || message.created_by}
                        </p>
                      )}
                      <div
                        className={`rounded-2xl px-3 py-2 md:px-4 ${
                          isOwn
                            ? "bg-purple-600 text-white"
                            : "bg-white border border-gray-200 text-gray-900"
                        }`}
                      >
                        {message.content && message.content !== "(File attachment)" && !message.content.startsWith("(") && (
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        )}
                        
                        {referencedArtifacts.length > 0 && (
                          <div className={`space-y-2 ${message.content && !message.content.startsWith("(") ? "mt-2" : ""}`}>
                            {referencedArtifacts.map((artifact) => (
                              <div 
                                key={artifact.id} 
                                onClick={() => setViewingArtifact(artifact)}
                                className={`rounded-lg overflow-hidden cursor-pointer transition-opacity hover:opacity-80 ${isOwn ? "bg-purple-700" : "bg-gray-50"} p-2`}
                              >
                                <div className="flex items-center gap-2">
                                  <Package className="w-4 h-4 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm flex items-center gap-1">
                                      {artifact.artifact_code || "Artifact"}
                                      <ExternalLink className="w-3 h-3" />
                                    </p>
                                    {artifact.user_notes && (
                                      <p className={`text-xs ${isOwn ? "text-purple-200" : "text-gray-500"} truncate`}>
                                        {artifact.user_notes.substring(0, 50)}{artifact.user_notes.length > 50 ? '...' : ''}
                                      </p>
                                    )}
                                  </div>
                                  {artifact.photo_url && (
                                    <img src={artifact.photo_url} alt="Artifact" className="w-10 h-10 rounded object-cover" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {message.file_urls && message.file_urls.length > 0 && (
                          <div className={`space-y-2 ${(message.content && message.content !== "(File attachment)" && !message.content.startsWith("(")) || referencedArtifacts.length > 0 ? "mt-2" : ""}`}>
                            {message.file_urls.map((fileUrl, index) => {
                              const fileName = getFileName(fileUrl, message.file_names?.[index]);
                              const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileName.split('.').pop().toLowerCase());
                              
                              return (
                                <div key={index} className={`rounded-lg overflow-hidden ${isOwn ? "bg-purple-700" : "bg-gray-50"}`}>
                                  {isImage ? (
                                    <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                                      <img 
                                        src={fileUrl} 
                                        alt={fileName}
                                        className="max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90"
                                      />
                                    </a>
                                  ) : (
                                    <a 
                                      href={fileUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className={`flex items-center gap-3 p-3 ${isOwn ? "hover:bg-purple-800" : "hover:bg-gray-100"} transition-colors`}
                                    >
                                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isOwn ? "bg-purple-800 text-white" : "bg-gray-200 text-gray-700"}`}>
                                        {getFileIcon(fileName)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{fileName}</p>
                                        <p className={`text-xs ${isOwn ? "text-purple-200" : "text-gray-500"}`}>Click to view</p>
                                      </div>
                                      <Download className="w-4 h-4 flex-shrink-0" />
                                    </a>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    {isOwn && (
                      <Avatar className="w-7 h-7 md:w-8 md:h-8 flex-shrink-0">
                        <AvatarFallback className="bg-purple-200 text-purple-700 text-xs font-semibold">
                          {currentUser?.full_name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-3 md:p-4 border-t bg-white flex-shrink-0">
              {!canSendMessage() ? (
                <div className="text-center py-4">
                  <Megaphone className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    This is an information chat. Only designated senders can post messages.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(selectedFiles.length > 0 || selectedArtifacts.length > 0) && (
                    <div className="flex flex-wrap gap-2">
                      {selectedFiles.map((file, index) => (
                        <div key={`file-${index}`} className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 text-sm">
                          {getFileIcon(file.name)}
                          <span className="truncate max-w-[150px]">{file.name}</span>
                          <button
                            onClick={() => removeFile(index)}
                            className="text-gray-500 hover:text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {selectedArtifacts.map((artifact) => (
                        <div key={`artifact-${artifact.id}`} className="flex items-center gap-2 bg-purple-100 rounded-lg px-3 py-2 text-sm">
                          <Package className="w-4 h-4 text-purple-700" />
                          <span className="truncate max-w-[150px]">{artifact.artifact_code || "Artifact"}</span>
                          <button
                            onClick={() => setSelectedArtifacts(selectedArtifacts.filter(a => a.id !== artifact.id))}
                            className="text-purple-500 hover:text-red-600"
                          >
                            <X className="w-4 h-4" />
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
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFiles}
                      className="flex-shrink-0"
                      title="Attach files"
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowArtifactPicker(true)}
                      disabled={uploadingFiles}
                      className="flex-shrink-0"
                      title="Attach artifacts"
                    >
                      <Package className="w-4 h-4" />
                    </Button>
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type a message..."
                      className="resize-none text-sm md:text-base min-h-[60px]"
                      rows={2}
                      disabled={uploadingFiles}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={(!newMessage.trim() && selectedFiles.length === 0 && selectedArtifacts.length === 0) || uploadingFiles}
                      className="bg-purple-600 hover:bg-purple-700 flex-shrink-0"
                      size="icon"
                    >
                      {uploadingFiles ? (
                        <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 md:w-5 md:h-5" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50 p-6">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg md:text-xl font-semibold mb-2">Select a conversation</h3>
              <p className="text-sm md:text-base text-gray-500">Choose a chat from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Edit Conversation Name Dialog */}
      <Dialog open={!!editingConversation} onOpenChange={() => setEditingConversation(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Chat Name</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Chat Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter chat name..."
              />
            </div>
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

      {/* Edit Participants Dialog */}
      <Dialog open={!!editingParticipants} onOpenChange={() => setEditingParticipants(null)}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Participants</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div>
              <label className="block text-sm font-medium mb-2">
                Participants ({editParticipantsList.length})
              </label>
              <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search users..."
                      className="pl-10"
                  />
              </div>
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {filteredParticipantsForEdit.map(user => (
                  <div
                    key={user.id}
                    onClick={() => toggleParticipant(user.email)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      editParticipantsList.includes(user.email)
                        ? "bg-purple-50 border-purple-300"
                        : "hover:bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-purple-200 text-purple-700 text-sm font-semibold">
                          {user.full_name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{user.full_name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      {editParticipantsList.includes(user.email) && (
                        <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => {
              setEditingParticipants(null);
              setEditParticipantsList([]);
              setSearchTerm("");
            }}>
              Cancel
            </Button>
            <Button onClick={handleEditParticipants} className="bg-purple-600 hover:bg-purple-700">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Senders Dialog */}
      <Dialog open={!!editingSenders} onOpenChange={() => setEditingSenders(null)}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Message Permissions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-y-auto">
            <p className="text-sm text-gray-600">
              Select who can send messages in this information chat. You will always be able to send messages.
            </p>
            <div>
              <label className="block text-sm font-medium mb-2">
                Can Send Messages ({editSendersList.length})
              </label>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search users..."
                  className="pl-10"
                />
              </div>
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {editingSenders && editingSenders.participants
                  .filter(email => {
                    const user = allUsers.find(u => u.email === email);
                    if (!user) return false;
                    if (!searchTerm) return true;
                    return user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email?.toLowerCase().includes(searchTerm.toLowerCase());
                  })
                  .map(email => {
                    const user = allUsers.find(u => u.email === email);
                    if (!user) return null;
                    return (
                      <div
                        key={user.id}
                        onClick={() => toggleSender(email)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          editSendersList.includes(email)
                            ? "bg-amber-50 border-amber-300"
                            : "hover:bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-purple-200 text-purple-700 text-sm font-semibold">
                              {user.full_name?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{user.full_name}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          </div>
                          {editSendersList.includes(email) && (
                            <div className="w-5 h-5 bg-amber-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => {
              setEditingSenders(null);
              setEditSendersList([]);
              setSearchTerm("");
            }}>
              Cancel
            </Button>
            <Button onClick={handleEditSenders} className="bg-purple-600 hover:bg-purple-700">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Conversation Dialog */}
      <AlertDialog open={!!deletingConversation} onOpenChange={() => !isDeleting && setDeletingConversation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this chat and all its messages. This action cannot be undone.
              {deletingConversation?.is_announcement && (
                <span className="block mt-2 text-amber-700 font-medium">
                  ⚠️ This is an information chat. All participants will lose access to the messages.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConversation}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete Chat"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Artifact Picker Dialog */}
      <Dialog open={showArtifactPicker} onOpenChange={setShowArtifactPicker}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Attach Artifacts</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                value={artifactSearchTerm}
                onChange={(e) => setArtifactSearchTerm(e.target.value)}
                placeholder="Search artifacts..."
                className="pl-10"
              />
            </div>
            <div className="grid grid-cols-1 gap-2 max-h-[500px] overflow-y-auto">
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
                      <img src={artifact.photo_url} alt="Artifact" className="w-16 h-16 rounded object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{artifact.artifact_code || "Unnamed Artifact"}</p>
                      {artifact.user_notes && (
                        <p className="text-xs text-gray-500 truncate mt-1">{artifact.user_notes}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">by {artifact.created_by}</p>
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
            <Button onClick={() => setShowArtifactPicker(false)} className="bg-purple-600 hover:bg-purple-700">
              Attach {selectedArtifacts.length} Artifact{selectedArtifacts.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Artifact Viewer Modal */}
      {viewingArtifact && (
        <ArtifactDetailModal
          artifact={viewingArtifact}
          onClose={() => setViewingArtifact(null)}
          onUpdate={async () => {
            await loadInitialData();
            setViewingArtifact(null);
          }}
          isAdmin={currentUser?.role === "admin"}
        />
      )}
    </div>
  );
}