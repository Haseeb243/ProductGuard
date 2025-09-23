import React, { useState, useEffect, useContext } from 'react';
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
  CircularProgress
} from '@mui/material';
import {
  Email as EmailIcon,
  Chat as ChatIcon,
  Notifications as NotificationsIcon,
  Send as SendIcon
} from '@mui/icons-material';
import AuthContext from '../context/AuthProvider';
import LiveChat from './LiveChat';

const SupportDashboard = () => {
  const { auth } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    loadNotifications();
    loadChatHistory();
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await fetch('/support/notifications?limit=100');
      const data = await response.json();
      
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const loadChatHistory = async () => {
    try {
      const response = await fetch('/support/chat-history?limit=100');
      const data = await response.json();
      
      if (data.success) {
        setChatHistory(data.messages);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      setSnackbar({
        open: true,
        message: 'Please enter an email address',
        severity: 'warning'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/support/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: testEmail }),
      });

      const data = await response.json();
      
      setSnackbar({
        open: true,
        message: data.message,
        severity: data.success ? 'success' : 'error'
      });

      if (data.success) {
        setTestEmail('');
        loadNotifications(); // Refresh notifications
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error sending test email',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const sendSystemMessage = async (message) => {
    try {
      const response = await fetch('/support/system-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();
      
      setSnackbar({
        open: true,
        message: data.message,
        severity: data.success ? 'success' : 'error'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error sending system message',
        severity: 'error'
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent':
        return 'success';
      case 'failed':
        return 'error';
      case 'queued':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const renderEmailNotifications = () => (
    <Box>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <EmailIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Test Email</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
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
                  startIcon={loading ? <CircularProgress size={16} /> : <SendIcon />}
                >
                  Send
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <NotificationsIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Email Statistics</Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="h4" color="success.main">
                    {notifications.filter(n => n.status === 'sent').length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">Sent</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="h4" color="error.main">
                    {notifications.filter(n => n.status === 'failed').length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">Failed</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="h4" color="warning.main">
                    {notifications.filter(n => n.status === 'queued').length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">Queued</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Notification History</Typography>
          <TableContainer>
            <Table>
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
                        label={notification.type} 
                        size="small" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{notification.recipient}</TableCell>
                    <TableCell>{notification.subject}</TableCell>
                    <TableCell>
                      <Chip 
                        label={notification.status} 
                        color={getStatusColor(notification.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatDate(notification.created_at)}</TableCell>
                    <TableCell>
                      {notification.sent_at ? formatDate(notification.sent_at) : '-'}
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
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <ChatIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Live Chat Support</Typography>
                </Box>
                <Button
                  variant="contained"
                  onClick={() => setShowChat(!showChat)}
                >
                  {showChat ? 'Hide Chat' : 'Open Chat'}
                </Button>
              </Box>
              
              {showChat && (
                <Box sx={{ mt: 2 }}>
                  <LiveChat user={auth} onClose={() => setShowChat(false)} />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Chat History</Typography>
          <TableContainer>
            <Table>
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
                        color={message.role === 'admin' ? 'error' : 'primary'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 300, wordBreak: 'break-word' }}>
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
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Support Dashboard</Typography>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Email Notifications" />
          <Tab label="Chat Support" />
        </Tabs>
      </Paper>

      {activeTab === 0 && renderEmailNotifications()}
      {activeTab === 1 && renderChatSupport()}

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
  );
};

export default SupportDashboard;