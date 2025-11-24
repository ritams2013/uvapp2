import React, { useState, useEffect } from "react";
import { Message } from "@/entities/Message";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Mail, Send, Inbox, SendHorizonal, Bell, Plus, Calendar, User as UserIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function Messages() {
  const [receivedMessages, setReceivedMessages] = useState([]);
  const [sentMessages, setSentMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showCompose, setShowCompose] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [newMessage, setNewMessage] = useState({
    to_email: "",
    subject: "",
    content: ""
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);

      const users = await User.list();
      setAllUsers(users);

      const allMessages = await Message.list("-created_date");
      
      const received = allMessages.filter(m => m.to_email === user.email);
      const sent = allMessages.filter(m => m.created_by === user.email);

      setReceivedMessages(received);
      setSentMessages(sent);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.to_email || !newMessage.content) {
      toast.error("Please fill in recipient and message");
      return;
    }

    try {
      await Message.create({
        ...newMessage,
        message_type: "direct"
      });
      toast.success("Message sent!");
      setNewMessage({ to_email: "", subject: "", content: "" });
      setShowCompose(false);
      loadData();
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };

  const handleMarkAsRead = async (message) => {
    if (!message.is_read) {
      try {
        await Message.update(message.id, { is_read: true });
        loadData();
      } catch (error) {
        console.error("Error marking as read:", error);
      }
    }
  };

  const unreadCount = receivedMessages.filter(m => !m.is_read).length;
  const notificationCount = receivedMessages.filter(m => !m.is_read && m.message_type === "notification").length;

  return (
    <div className="min-h-screen bg-[#FAFAF9] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Mail className="w-8 h-8 text-purple-600" />
              Messages
            </h1>
            <p className="text-gray-600 mt-2">
              Communicate with team members and receive notifications
            </p>
          </div>
          <Dialog open={showCompose} onOpenChange={setShowCompose}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                New Message
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Compose Message</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">To</label>
                  <select
                    value={newMessage.to_email}
                    onChange={(e) => setNewMessage({ ...newMessage, to_email: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="">Select recipient...</option>
                    {allUsers
                      .filter(u => u.email !== currentUser?.email)
                      .map(user => (
                        <option key={user.id} value={user.email}>
                          {user.full_name} ({user.email})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Subject</label>
                  <Input
                    value={newMessage.subject}
                    onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                    placeholder="Message subject..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Message</label>
                  <Textarea
                    value={newMessage.content}
                    onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                    placeholder="Write your message..."
                    className="h-32"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowCompose(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSendMessage} className="bg-purple-600 hover:bg-purple-700">
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="inbox" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="inbox" className="relative">
              <Inbox className="w-4 h-4 mr-2" />
              Inbox
              {unreadCount > 0 && (
                <Badge className="ml-2 bg-red-500 text-white">{unreadCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="relative">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
              {notificationCount > 0 && (
                <Badge className="ml-2 bg-amber-500 text-white">{notificationCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent">
              <SendHorizonal className="w-4 h-4 mr-2" />
              Sent
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inbox" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Inbox</CardTitle>
              </CardHeader>
              <CardContent>
                {receivedMessages.filter(m => m.message_type === "direct").length === 0 ? (
                  <div className="text-center py-12">
                    <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No messages yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {receivedMessages
                      .filter(m => m.message_type === "direct")
                      .map(message => (
                        <div
                          key={message.id}
                          onClick={() => {
                            setSelectedMessage(message);
                            handleMarkAsRead(message);
                          }}
                          className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                            !message.is_read ? "bg-purple-50 border-purple-200" : "bg-white border-gray-200"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <UserIcon className="w-4 h-4 text-gray-400" />
                              <span className="font-medium">{message.created_by}</span>
                              {!message.is_read && (
                                <Badge className="bg-purple-600 text-white text-xs">New</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(message.created_date), "MMM d, h:mm a")}
                            </div>
                          </div>
                          {message.subject && (
                            <p className="font-medium mb-1">{message.subject}</p>
                          )}
                          <p className="text-sm text-gray-600 line-clamp-2">{message.content}</p>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                {receivedMessages.filter(m => m.message_type === "notification").length === 0 ? (
                  <div className="text-center py-12">
                    <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No notifications</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {receivedMessages
                      .filter(m => m.message_type === "notification")
                      .map(message => (
                        <div
                          key={message.id}
                          onClick={() => {
                            setSelectedMessage(message);
                            handleMarkAsRead(message);
                          }}
                          className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                            !message.is_read ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Bell className="w-4 h-4 text-amber-600" />
                              <span className="font-medium text-amber-900">System Notification</span>
                              {!message.is_read && (
                                <Badge className="bg-amber-600 text-white text-xs">New</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(message.created_date), "MMM d, h:mm a")}
                            </div>
                          </div>
                          {message.subject && (
                            <p className="font-medium mb-1">{message.subject}</p>
                          )}
                          <p className="text-sm text-gray-600 line-clamp-2">{message.content}</p>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sent" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sent Messages</CardTitle>
              </CardHeader>
              <CardContent>
                {sentMessages.filter(m => m.message_type === "direct").length === 0 ? (
                  <div className="text-center py-12">
                    <SendHorizonal className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No sent messages</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sentMessages
                      .filter(m => m.message_type === "direct")
                      .map(message => (
                        <div
                          key={message.id}
                          onClick={() => setSelectedMessage(message)}
                          className="p-4 rounded-lg border border-gray-200 bg-white cursor-pointer transition-all hover:shadow-md"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">To:</span>
                              <span className="font-medium">{message.to_email}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(message.created_date), "MMM d, h:mm a")}
                            </div>
                          </div>
                          {message.subject && (
                            <p className="font-medium mb-1">{message.subject}</p>
                          )}
                          <p className="text-sm text-gray-600 line-clamp-2">{message.content}</p>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {selectedMessage && (
          <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedMessage.message_type === "notification" ? (
                    <Bell className="w-5 h-5 text-amber-600" />
                  ) : (
                    <Mail className="w-5 h-5 text-purple-600" />
                  )}
                  {selectedMessage.subject || "Message"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-gray-600 pb-4 border-b">
                  <div>
                    <p><strong>From:</strong> {selectedMessage.created_by}</p>
                    {selectedMessage.created_by !== currentUser?.email && (
                      <p><strong>To:</strong> {selectedMessage.to_email}</p>
                    )}
                  </div>
                  <p>{format(new Date(selectedMessage.created_date), "MMM d, yyyy 'at' h:mm a")}</p>
                </div>
                <div className="whitespace-pre-wrap text-gray-700">
                  {selectedMessage.content}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}