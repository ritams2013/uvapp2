
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Upload, Grid3x3, Map, LogOut, Database, Sparkles, Users, MessageSquare, Settings } from "lucide-react";
import { base44 } from "./api/base44Client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "./components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [showNotificationSettings, setShowNotificationSettings] = React.useState(false);
  const [notificationPrefs, setNotificationPrefs] = React.useState({
    chat_messages: true,
    artifact_reviews: true,
    desktop_notifications_enabled: true
  });
  const [isSaving, setIsSaving] = React.useState(false);
  const [isLoadingUser, setIsLoadingUser] = React.useState(true);

  React.useEffect(() => {
    loadUser();
  }, []);

  React.useEffect(() => {
    if (user && !isLoadingUser) {
      checkUnreadMessages();
      
      const interval = setInterval(() => {
        checkUnreadMessages();
      }, 30000); 
      
      return () => clearInterval(interval);
    }
  }, [user, isLoadingUser]);

  const loadUser = async () => {
    try {
      setIsLoadingUser(true);
      const userData = await base44.auth.me();
      setUser(userData);
      
      if (userData?.notification_preferences) {
        setNotificationPrefs(userData.notification_preferences);
      }
    } catch (error) {
      console.error("User not authenticated:", error);
      setUser(null);
      
      // If user is not authenticated and not on PublicMap, redirect to PublicMap
      if (!isLoadingUser && currentPageName !== "PublicMap") {
        const publicMapUrl = createPageUrl("PublicMap");
        window.location.href = publicMapUrl;
      }
    } finally {
      setIsLoadingUser(false);
    }
  };

  const saveNotificationPreferences = async () => {
    setIsSaving(true);
    try {
      await base44.auth.updateMe({
        notification_preferences: notificationPrefs
      });
      toast.success("Notification preferences updated!");
      setShowNotificationSettings(false);
      await loadUser(); 
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save preferences");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleDesktopNotifications = async (checked) => {
    if (checked) {
      if ("Notification" in window) {
        try {
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            setNotificationPrefs(prev => ({ ...prev, desktop_notifications_enabled: true }));
            toast.success("Desktop notifications enabled!");
          } else {
            toast.error("Notification permission denied. Please enable in browser settings.");
            setNotificationPrefs(prev => ({ ...prev, desktop_notifications_enabled: false }));
          }
        } catch (error) {
          console.error("Error requesting notification permission:", error);
          toast.error("Could not enable notifications");
        }
      } else {
        toast.error("Browser does not support notifications");
        setNotificationPrefs(prev => ({ ...prev, desktop_notifications_enabled: false }));
      }
    } else {
      setNotificationPrefs(prev => ({ ...prev, desktop_notifications_enabled: false }));
    }
  };

  const checkUnreadMessages = async () => {
    if (!user?.email) return;
    
    try {
      const allConvos = await base44.entities.Conversation.list();
      
      if (!Array.isArray(allConvos) || allConvos.length === 0) {
        setUnreadCount(0);
        return;
      }
      
      const userConvos = allConvos.filter(c => 
        c?.participants && Array.isArray(c.participants) && c.participants.includes(user.email)
      );

      if (userConvos.length === 0) {
        setUnreadCount(0);
        return;
      }

      let totalUnread = 0;

      for (const convo of userConvos) {
        if (!convo?.id) continue;
        
        try {
          const messages = await base44.entities.ChatMessage.filter(
            { conversation_id: convo.id },
            "created_date"
          );

          if (Array.isArray(messages) && messages.length > 0) {
            const unreadMessages = messages.filter(
              m => m?.created_by && m.created_by !== user.email && 
                   (!m.read_by || !Array.isArray(m.read_by) || !m.read_by.includes(user.email))
            );

            totalUnread += unreadMessages.length;
          }
        } catch (msgError) {
          console.error("Error fetching messages for conversation:", convo.id, msgError);
          continue;
        }
      }

      setUnreadCount(totalUnread);
    } catch (error) {
      console.error("Error checking unread messages:", error);
    }
  };

  const handleLogout = async () => {
    try {
      const publicMapUrl = createPageUrl("PublicMap");
      // Clear any local storage or session data if needed
      localStorage.removeItem('auth_token'); // Clear any cached auth tokens
      sessionStorage.clear();
      
      // Redirect to public map after logout
      await base44.auth.logout();
      
      // Force redirect to public map
      window.location.href = publicMapUrl;
    } catch (error) {
      console.error("Logout error:", error);
      // Even if logout fails, redirect to public map
      window.location.href = createPageUrl("PublicMap");
    }
  };

  const isAdmin = user?.role === "admin";

  // If user is not authenticated, don't show sidebar layout
  if (!user) {
    return <>{children}</>;
  }

  const navigationItems = [
    {
      title: "Submit Artifact",
      url: createPageUrl("SubmitArtifact"),
      icon: Upload,
    },
    {
      title: "My Artifacts",
      url: createPageUrl("MyArtifacts"),
      icon: Grid3x3,
    },
    {
      title: "Map",
      url: createPageUrl("AdminMap"),
      icon: Map,
    },
    {
      title: "Chat",
      url: createPageUrl("Chat"),
      icon: MessageSquare,
      badge: unreadCount > 0 ? unreadCount : null,
    },
  ];

  const adminItems = [
    {
      title: "Dashboard",
      url: createPageUrl("AdminDashboard"),
      icon: Database,
    },
    {
      title: "All Artifacts",
      url: createPageUrl("AdminArtifacts"),
      icon: Database,
    },
    {
      title: "User Management",
      url: createPageUrl("UserManagement"),
      icon: Users,
    },
    {
      title: "AI Tools",
      url: createPageUrl("AITools"),
      icon: Sparkles,
    },
  ];

  return (
    <SidebarProvider>
      <style>{`
        :root {
          --primary-50: #FAF5FF;
          --primary-100: #F3E8FF;
          --primary-500: #A855F7;
          --primary-600: #9333EA;
          --primary-700: #7E22CE;
        }
      `}</style>
      <div className="min-h-screen flex w-full bg-[#FAFAF9]">
        <Sidebar className="border-r border-gray-200">
          <SidebarHeader className="border-b border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e312345774f0a395ea5912/0aff2f04c_Ultraviolatelogo.png" 
                alt="Ultraviolet Logo"
                className="w-10 h-10 rounded-lg object-contain"
              />
              <div>
                <h2 className="font-bold text-gray-900 text-sm">Ultraviolet-61949</h2>
                <p className="text-xs text-gray-500">Artifact Database</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-2">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-2">
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-purple-50 hover:text-purple-700 transition-colors duration-200 rounded-lg mb-1 ${
                          location.pathname === item.url ? 'bg-purple-50 text-purple-700' : ''
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-2 relative">
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.title}</span>
                          {item.badge && (
                            <span className="ml-auto flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full">
                              {item.badge > 9 ? '9+' : item.badge}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {isAdmin && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-2">
                  Admin
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {adminItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          className={`hover:bg-purple-50 hover:text-purple-700 transition-colors duration-200 rounded-lg mb-1 ${
                            location.pathname === item.url ? 'bg-purple-50 text-purple-700' : ''
                          }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-3 py-2">
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          <SidebarFooter className="border-t border-gray-200 p-4">
            {isLoadingUser ? (
              <div className="flex items-center justify-center p-2">
                <p className="text-sm text-gray-500">Loading...</p>
              </div>
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 w-full hover:bg-gray-100 rounded-lg p-2 transition-colors">
                    <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center">
                      <span className="text-purple-700 font-semibold text-sm">
                        {user?.full_name?.charAt(0) || "U"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {user?.full_name || "User"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {isAdmin ? "Admin" : "Field Researcher"}
                      </p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setShowNotificationSettings(true)}>
                    <Settings className="w-4 h-4 mr-2" />
                    Notification Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white border-b border-gray-200 px-6 py-4 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200" />
              <h1 className="text-xl font-semibold">Ultraviolet-61949</h1>
              {unreadCount > 0 && (
                <span className="ml-auto flex items-center justify-center w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>

      <Dialog open={showNotificationSettings} onOpenChange={setShowNotificationSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-600" />
              Notification Preferences
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="space-y-0.5">
                  <p className="font-semibold">Desktop Notifications</p>
                  <p className="text-sm text-gray-600">
                    Master switch for all browser notifications
                  </p>
                </div>
                <Switch
                  checked={notificationPrefs.desktop_notifications_enabled}
                  onCheckedChange={handleToggleDesktopNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium">Chat Messages</p>
                  <p className="text-sm text-gray-500">
                    Get notified when you receive new chat messages
                  </p>
                </div>
                <Switch
                  checked={notificationPrefs.chat_messages}
                  onCheckedChange={(checked) => 
                    setNotificationPrefs(prev => ({ ...prev, chat_messages: checked }))
                  }
                  disabled={!notificationPrefs.desktop_notifications_enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium">Artifact Reviews</p>
                  <p className="text-sm text-gray-500">
                    Get notified when admins review your artifacts
                  </p>
                </div>
                <Switch
                  checked={notificationPrefs.artifact_reviews}
                  onCheckedChange={(checked) => 
                    setNotificationPrefs(prev => ({ ...prev, artifact_reviews: checked }))
                  }
                  disabled={!notificationPrefs.desktop_notifications_enabled}
                />
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 Tip: Toggling desktop notifications on will request browser permission. Make sure to allow notifications when prompted.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowNotificationSettings(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button 
                onClick={saveNotificationPreferences}
                disabled={isSaving}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isSaving ? "Saving..." : "Save Preferences"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
