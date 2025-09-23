import React, { useState, useEffect, useContext, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  TextField,
  Tab,
  Tabs,
  Alert,
  Snackbar,
  CircularProgress,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import {
  Email as EmailIcon,
  Chat as ChatIcon,
  Notifications as NotificationsIcon,
  Send as SendIcon,
} from "@mui/icons-material";
import AuthContext from "../context/AuthProvider";
import LiveChat from "./LiveChat";
import { Link } from "react-router-dom";
import { useConfig } from "../context/ConfigContext";
import logoImg from "../img/logo.png";
import profilePic from "../img/profile.jpeg";

// Sidebar icons (same as Admin)
const DashboardIcon = () => (
  <svg
    className="w-5 h-5 mr-2"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 13h2v-2H3v2zm4 0h2v-6H7v6zm4 0h2V7h-2v6zm4 0h2v-4h-2v4zm4 0h2v-2h-2v2z"
    />
  </svg>
);
const FactoryIcon = () => (
  <svg
    className="w-5 h-5 mr-2"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 21V9l7-4v4l7-4v16H3z"
    />
  </svg>
);
const TruckIcon = () => (
  <svg
    className="w-5 h-5 mr-2"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 17V5a1 1 0 011-1h5a1 1 0 011 1v12m-7 0a2 2 0 104 0m-4 0H5a2 2 0 00-2 2v1a1 1 0 001 1h1a1 1 0 001-1v-1m10 0a2 2 0 104 0m-4 0h2a2 2 0 002-2v-5a1 1 0 00-1-1h-5a1 1 0 00-1 1v5z"
    />
  </svg>
);
const StoreIcon = () => (
  <svg
    className="w-5 h-5 mr-2"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 21v-2a4 4 0 014-4h8a4 4 0 014 4v2M16 3a4 4 0 00-8 0v1a4 4 0 01-4 4v2a4 4 0 004 4h8a4 4 0 004-4V8a4 4 0 00-4-4V3z"
    />
  </svg>
);
const BellIcon = () => (
  <span className="inline-block w-5 h-5 bg-gray-400 rounded-full" />
);

const SidebarLink = ({ icon, label, to, active }) => (
  <Link
    to={to}
    className={`flex items-center px-4 py-2 rounded-lg text-gray-200 hover:bg-gray-800 hover:text-white transition ${
      active ? "bg-gray-800" : ""
    }`}
  >
    {icon}
    <span className="ml-2">{label}</span>
  </Link>
);

const SIDEBAR_LINKS = [
  { icon: <DashboardIcon />, label: "Dashboard", to: "/admin" },
  {
    icon: <FactoryIcon />,
    label: "Manufacturers",
    to: "/manage-account?role=manufacturer",
  },
  {
    icon: <TruckIcon />,
    label: "Suppliers",
    to: "/manage-account?role=supplier",
  },
  {
    icon: <StoreIcon />,
    label: "Retailers",
    to: "/manage-account?role=retailer",
  },
  { icon: <DashboardIcon />, label: "Support", to: "/support-dashboard" },
];

const SupportDashboard = () => {
  const { auth } = useContext(AuthContext);
  const { apiBaseUrl } = useConfig();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [testEmail, setTestEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [showChat, setShowChat] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null); // conversation_key
  const [targetUsername, setTargetUsername] = useState("");

  const darkTheme = useMemo(
    () => createTheme({ palette: { mode: "dark" } }),
    []
  );

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    loadChatHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversation]);

  useEffect(() => {
    if (auth?.role === "admin") loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await fetch(
        `${apiBaseUrl}/support/notifications?limit=100`
      );
      const data = await response.json();
      if (data.success) setNotifications(data.notifications);
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  };

  const loadChatHistory = async () => {
    try {
      const params = activeConversation
        ? `?limit=100&conversationKey=${encodeURIComponent(activeConversation)}`
        : "?limit=100";
      const response = await fetch(
        `${apiBaseUrl}/support/chat-history${params}`
      );
      const data = await response.json();
      if (data.success) setChatHistory(data.messages);
    } catch (error) {
      console.error("Error loading chat history:", error);
    }
  };

  const loadConversations = async () => {
    try {
      const response = await fetch(
        `${apiBaseUrl}/support/conversations?limit=100`
      );
      const data = await response.json();
      if (data.success) setConversations(data.conversations);
    } catch (e) {
      console.error("Error loading conversations:", e);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      setSnackbar({
        open: true,
        message: "Please enter an email address",
        severity: "warning",
      });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/support/test-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail }),
      });
      const data = await response.json();
      setSnackbar({
        open: true,
        message: data.message,
        severity: data.success ? "success" : "error",
      });
      if (data.success) {
        setTestEmail("");
        loadNotifications();
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error sending test email",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendSystemMessage = async (message) => {
    try {
      const response = await fetch(`${apiBaseUrl}/support/system-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await response.json();
      setSnackbar({
        open: true,
        message: data.message,
        severity: data.success ? "success" : "error",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error sending system message",
        severity: "error",
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "sent":
        return "success";
      case "failed":
        return "error";
      case "queued":
        return "warning";
      default:
        return "default";
    }
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleString();

  const renderEmailNotifications = () => (
    <Box>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card
            elevation={0}
            sx={{
              background: "rgba(17,25,40,0.6)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 3,
            }}
          >
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <EmailIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Test Email</Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  fullWidth
                  label="Email Address"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  type="email"
                  size="small"
                />
                <Button
                  variant="contained"
                  onClick={sendTestEmail}
                  disabled={loading}
                  startIcon={
                    loading ? <CircularProgress size={16} /> : <SendIcon />
                  }
                >
                  Send
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card
            elevation={0}
            sx={{
              background: "rgba(17,25,40,0.6)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 3,
            }}
          >
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <NotificationsIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Email Statistics</Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="h4" color="success.main">
                    {notifications.filter((n) => n.status === "sent").length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Sent
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="h4" color="error.main">
                    {notifications.filter((n) => n.status === "failed").length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Failed
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="h4" color="warning.main">
                    {notifications.filter((n) => n.status === "queued").length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Queued
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper
        elevation={0}
        sx={{
          background: "rgba(17,25,40,0.6)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 3,
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, color: "#fff" }}>
            Notification History
          </Typography>
          <TableContainer>
            <Table
              size="small"
              sx={{
                "& thead th": {
                  backgroundColor: "rgba(255,255,255,0.04)",
                  color: "#e5e7eb",
                },
                "& tbody tr:hover": {
                  backgroundColor: "rgba(255,255,255,0.03)",
                },
                "& td, & th": {
                  borderColor: "rgba(255,255,255,0.08)",
                  color: "#e5e7eb",
                },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Recipient</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Sent</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {notifications.map((notification) => (
                  <TableRow key={notification.id}>
                    <TableCell>
                      <Chip
                        label={notification.type || "—"}
                        size="small"
                        color="info"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{notification.recipient || "—"}</TableCell>
                    <TableCell>{notification.subject || "—"}</TableCell>
                    <TableCell>
                      <Chip
                        label={notification.status}
                        color={getStatusColor(notification.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {notification.created_at
                        ? formatDate(notification.created_at)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {notification.sent_at
                        ? formatDate(notification.sent_at)
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>
    </Box>
  );

  const renderChatSupport = () => (
    <Box>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          {auth?.role === "admin" && (
            <Card
              elevation={0}
              sx={{
                background: "rgba(17,25,40,0.6)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 3,
              }}
            >
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 2,
                  }}
                >
                  <Typography variant="h6">Conversations</Typography>
                  <Button size="small" onClick={loadConversations}>
                    Refresh
                  </Button>
                </Box>
                <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Start with username"
                    value={targetUsername}
                    onChange={(e) => setTargetUsername(e.target.value)}
                  />
                  <Button
                    variant="contained"
                    size="small"
                    disabled={!targetUsername}
                    onClick={() => {
                      const key = `conv:user:${targetUsername}`;
                      setActiveConversation(key);
                      setShowChat(true);
                    }}
                  >
                    Open
                  </Button>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Last Message</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {conversations.map((c) => {
                        const user = c.conversation_key.replace(
                          "conv:user:",
                          ""
                        );
                        return (
                          <TableRow
                            key={c.conversation_key}
                            hover
                            selected={activeConversation === c.conversation_key}
                            onClick={() => {
                              setActiveConversation(c.conversation_key);
                              setTargetUsername(user);
                              setShowChat(true);
                            }}
                            style={{ cursor: "pointer" }}
                          >
                            <TableCell>{user}</TableCell>
                            <TableCell>
                              {new Date(c.last_message_at).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}
        </Grid>
        <Grid item xs={12} md={8}>
          <Card
            elevation={0}
            sx={{
              background: "rgba(17,25,40,0.6)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 3,
            }}
          >
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <ChatIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Live Chat Support</Typography>
                </Box>
                <Button
                  variant="contained"
                  onClick={() => setShowChat(!showChat)}
                >
                  {showChat ? "Hide Chat" : "Open Chat"}
                </Button>
              </Box>
              {showChat && (
                <Box sx={{ mt: 2 }}>
                  <LiveChat
                    user={auth}
                    targetUsername={
                      auth?.role === "admin"
                        ? targetUsername ||
                          (activeConversation
                            ? activeConversation.replace("conv:user:", "")
                            : "")
                        : undefined
                    }
                    onClose={() => setShowChat(false)}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper
        elevation={0}
        sx={{
          background: "rgba(17,25,40,0.6)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 3,
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Chat History{" "}
            {activeConversation
              ? `(${activeConversation.replace("conv:user:", "")})`
              : ""}
          </Typography>
          <TableContainer>
            <Table
              size="small"
              sx={{
                "& thead th": {
                  backgroundColor: "rgba(255,255,255,0.04)",
                  color: "#e5e7eb",
                },
                "& tbody tr:hover": {
                  backgroundColor: "rgba(255,255,255,0.03)",
                },
                "& td, & th": {
                  borderColor: "rgba(255,255,255,0.08)",
                  color: "#e5e7eb",
                },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Message</TableCell>
                  <TableCell>Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {chatHistory.map((message) => (
                  <TableRow key={message.id}>
                    <TableCell>{message.username}</TableCell>
                    <TableCell>
                      <Chip
                        label={message.role}
                        size="small"
                        color={message.role === "admin" ? "error" : "primary"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 300, wordBreak: "break-word" }}>
                      {message.message}
                    </TableCell>
                    <TableCell>{formatDate(message.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>
    </Box>
  );

  return (
    <div className="min-h-screen flex bg-gray-950 text-white">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-gray-900 border-r border-gray-800 sticky top-0 min-h-screen">
        <div className="flex items-center justify-center h-16 border-b border-gray-800">
          <img src={logoImg} alt="ProductGuard" className="h-10" />
        </div>
        <nav className="flex-1 px-2 py-4 space-y-2">
          {SIDEBAR_LINKS.map((link) => (
            <SidebarLink
              key={link.label}
              {...link}
              active={link.to === "/support-dashboard"}
            />
          ))}
        </nav>
      </aside>

      {/* Mobile Sidebar Toggle */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 bg-gray-900 p-2 rounded"
        onClick={() => setSidebarOpen((v) => !v)}
      >
        <span className="text-white">☰</span>
      </button>

      {/* Mobile Sidebar Drawer */}
      {sidebarOpen && (
        <aside className="fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 border-r border-gray-800 flex flex-col md:hidden">
          <div className="flex items-center justify-between h-16 border-b border-gray-800 px-4">
            <img src={logoImg} alt="ProductGuard" className="h-10" />
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-white"
            >
              ✕
            </button>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-2">
            {SIDEBAR_LINKS.map((link) => (
              <SidebarLink
                key={link.label}
                {...link}
                active={link.to === "/support-dashboard"}
              />
            ))}
          </nav>
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <div className="sticky top-0 z-10 bg-gray-900 bg-opacity-80 backdrop-blur-lg flex items-center justify-between px-6 py-3 border-b border-gray-800">
          <h1 className="text-2xl font-bold tracking-tight">
            Support Dashboard
          </h1>
          <div className="flex items-center space-x-3">
            <button className="text-gray-400 hover:text-white">
              <BellIcon />
            </button>
            <img
              src={profilePic}
              className="h-8 w-8 rounded-full border-2 border-gray-700"
              alt="Profile"
            />
            <Link
              to="/login"
              className="text-gray-400 hover:text-red-400 transition ml-2"
            >
              Logout
            </Link>
          </div>
        </div>

        {/* Content */}
        <ThemeProvider theme={darkTheme}>
          <CssBaseline />
          <Box sx={{ p: 3 }}>
            <Paper
              className="border border-white/10 bg-white/10 backdrop-blur-xl rounded-2xl"
              sx={{ mb: 3 }}
              elevation={0}
            >
              <Tabs
                value={activeTab}
                onChange={(e, v) => setActiveTab(v)}
                sx={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
              >
                <Tab label="Email Notifications" />
                <Tab label="Chat Support" />
              </Tabs>
            </Paper>

            <div className="space-y-4">
              {activeTab === 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-3">
                  {renderEmailNotifications()}
                </div>
              )}
              {activeTab === 1 && (
                <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-3">
                  {renderChatSupport()}
                </div>
              )}
            </div>

            <Snackbar
              open={snackbar.open}
              autoHideDuration={6000}
              onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
              <Alert
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                severity={snackbar.severity}
              >
                {snackbar.message}
              </Alert>
            </Snackbar>
          </Box>
        </ThemeProvider>
      </div>
    </div>
  );
};

export default SupportDashboard;
