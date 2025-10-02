import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Avatar,
  Divider,
  IconButton,
} from "@mui/material";
import {
  Send as SendIcon,
  PersonOutline as PersonIcon,
  AdminPanelSettings as AdminIcon,
  ChatBubbleOutline as ChatIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import { useConfig } from "../context/ConfigContext";

// If admin is chatting with a specific user, pass targetUsername.
const LiveChat = ({ user, onClose, targetUsername }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);
  const { apiBaseUrl } = useConfig();

  // Normalize auth object coming from context (can be {user, role} or {username, role})
  const username = user?.username || user?.user || user?.name || "unknown";
  const role = user?.role || "user";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChatHistory = useCallback(async () => {
    try {
      const conversationKey =
        role === "admin" && targetUsername
          ? `conv:user:${targetUsername}`
          : `conv:user:${username}`;
      const base = (apiBaseUrl || "").replace(/\/$/, "");
      const response = await fetch(
        `${base}/support/chat-history?limit=50&conversationKey=${encodeURIComponent(
          conversationKey
        )}`
      );
      const data = await response.json();

      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    }
  }, [apiBaseUrl, role, targetUsername, username]);

  useEffect(() => {
    // Initialize Socket.IO connection with proper cleanup
    let newSocket;
    let cancelled = false;

    const initSocket = async () => {
      try {
        const { io } = await import("socket.io-client");
        const baseUrl = (apiBaseUrl || window.location.origin).replace(
          /\/$/,
          ""
        );
        newSocket = io(baseUrl, {
          transports: ["websocket"],
        });

        newSocket.on("connect", () => {
          if (cancelled) return;
          console.log("Connected to chat server");
          setIsConnected(true);

          // Authenticate user
          newSocket.emit("authenticate", {
            username,
            role,
          });

          // Join appropriate room: for private conversations, join conv:user:<username>
          if (role === "admin" && targetUsername) {
            newSocket.emit("joinConversation", `conv:user:${targetUsername}`);
          } else {
            // Non-admins join their own conversation room by default
            newSocket.emit("joinConversation", `conv:user:${username}`);
          }
        });

        newSocket.on("disconnect", () => {
          if (cancelled) return;
          console.log("Disconnected from chat server");
          setIsConnected(false);
        });

        newSocket.on("newMessage", (message) => {
          setMessages((prev) => [...prev, message]);
        });

        // Deduplicate users by username+role
        const dedupeUsers = (users) => {
          const map = new Map();
          users.forEach((u) => {
            const key = `${u.username}|${u.role}`;
            if (!map.has(key)) map.set(key, u);
          });
          return Array.from(map.values());
        };

        newSocket.on("onlineUsers", (users) => {
          setOnlineUsers(dedupeUsers(users));
        });

        newSocket.on("userOnline", (userData) => {
          setOnlineUsers((prev) => dedupeUsers([...prev, userData]));
        });

        newSocket.on("userOffline", (userData) => {
          setOnlineUsers((prev) =>
            prev.filter(
              (u) =>
                !(u.username === userData.username && u.role === userData.role)
            )
          );
        });

        setSocket(newSocket);

        // Load chat history
        loadChatHistory();
      } catch (error) {
        console.error("Socket.io not available:", error);
        // Fallback: Load chat history only
        loadChatHistory();
      }
    };

    initSocket();

    return () => {
      cancelled = true;
      if (newSocket) {
        try {
          newSocket.close();
        } catch (e) {}
      }
      setSocket(null);
      setIsConnected(false);
      setOnlineUsers([]);
    };
  }, [apiBaseUrl, username, role, targetUsername, loadChatHistory]);

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    if (socket && isConnected) {
      const roomId =
        role === "admin" && targetUsername
          ? `conv:user:${targetUsername}`
          : `conv:user:${username}`;
      socket.emit("sendMessage", {
        message: newMessage,
        isPublic: false,
        roomId,
      });
    } else {
      // Fallback: Add message locally
      const message = {
        id: Date.now(),
        username,
        role,
        message: newMessage,
        timestamp: new Date(),
        isPublic: false,
      };
      setMessages((prev) => [...prev, message]);
    }

    setNewMessage("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getUserIcon = (role) => {
    switch (role) {
      case "admin":
        return <AdminIcon color="error" />;
      case "manufacturer":
        return <ChatIcon color="primary" />;
      default:
        return <PersonIcon color="action" />;
    }
  };

  return (
    <Paper
      elevation={0}
      className="rounded-2xl border border-white/20 backdrop-blur-xl shadow-2xl"
      sx={{
        height: "600px",
        display: "flex",
        flexDirection: "column",
        background: "rgba(17,25,40,0.9)",
        borderColor: "rgba(255,255,255,0.15)",
        color: "#e5e7eb",
      }}
    >
      {/* Header */}
      <Box
        className="px-4 py-2 border-b border-white/10"
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background:
            "linear-gradient(90deg, rgba(56,189,248,0.15), rgba(99,102,241,0.15))",
        }}
      >
        <Box className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center text-white">
            <ChatIcon fontSize="small" />
          </div>
          <div>
            <div className="text-white font-semibold tracking-wide">
              Live Support Chat
            </div>
            <div className="text-xs text-white/70">One-to-one conversation</div>
            <div className="mt-1 flex items-center gap-2 text-[0.65rem] text-white/60">
              <span
                className={`inline-flex h-2 w-2 rounded-full ${
                  isConnected ? "bg-emerald-400" : "bg-rose-400"
                }`}
              />
              <span>{isConnected ? "Connected" : "Offline"}</span>
            </div>
          </div>
        </Box>
        {typeof onClose === "function" ? (
          <Button
            onClick={onClose}
            size="small"
            className="rounded-lg !text-white !border-white/30"
            variant="outlined"
            sx={{
              textTransform: "none",
              borderColor: "rgba(255,255,255,0.3)",
              color: "#fff",
              "&:hover": { borderColor: "rgba(255,255,255,0.6)" },
            }}
          >
            Close
          </Button>
        ) : (
          <Typography variant="caption" className="text-white/60">
            Chat stays active while you manage products
          </Typography>
        )}
      </Box>

      {/* Online Users */}
      {onlineUsers.length > 0 && (
        <Box className="px-3 py-2 border-b border-white/10">
          <span className="text-xs text-white/70">
            Online: {onlineUsers.length}
          </span>
          <div className="flex gap-1 flex-wrap mt-1">
            {onlineUsers.map((user, index) => (
              <div
                key={index}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-white/20 bg-white/10 text-white text-xs"
              >
                <div className="w-4 h-4 rounded bg-white/20 flex items-center justify-center">
                  <Avatar sx={{ width: 16, height: 16 }}>
                    {getUserIcon(user.role)}
                  </Avatar>
                </div>
                <span>{user.username}</span>
              </div>
            ))}
          </div>
        </Box>
      )}

      {/* Messages */}
      <Box className="flex-1 overflow-auto p-3 space-y-2">
        {messages.map((message, index) => (
          <div key={message.id || index} className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center text-white">
              {getUserIcon(message.role)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-white font-semibold">
                  {message.username}
                </span>
                <span className="text-[10px] px-2 py-[2px] rounded-full border border-white/20 text-white/80">
                  {message.role}
                </span>
                <span className="text-[10px] text-white/60">
                  {format(
                    new Date(message.timestamp || message.created_at),
                    "HH:mm"
                  )}
                </span>
              </div>
              <div className="mt-1 text-white/90 text-sm whitespace-pre-wrap">
                {message.message}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

      {/* Message Input */}
      <Box className="p-3 flex gap-2">
        <TextField
          fullWidth
          multiline
          maxRows={3}
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          size="small"
          sx={{
            "& .MuiInputBase-root": {
              background: "rgba(255,255,255,0.08)",
              color: "#fff",
              borderRadius: "0.75rem",
            },
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "rgba(255,255,255,0.2)",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "rgba(255,255,255,0.4)",
            },
          }}
        />
        <IconButton
          onClick={sendMessage}
          disabled={!newMessage.trim()}
          className="!bg-gradient-to-tr from-sky-500 to-indigo-500 !text-white hover:from-sky-400 hover:to-indigo-400"
          sx={{
            alignSelf: "flex-end",
            width: 40,
            height: 40,
            "&.Mui-disabled": { opacity: 0.4 },
          }}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Paper>
  );
};

export default LiveChat;
