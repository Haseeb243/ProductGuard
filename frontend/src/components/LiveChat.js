import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Avatar,
  Divider,
  IconButton,
  Badge
} from '@mui/material';
import {
  Send as SendIcon,
  PersonOutline as PersonIcon,
  AdminPanelSettings as AdminIcon,
  Support as SupportIcon
} from '@mui/icons-material';
import { format } from 'date-fns';

const LiveChat = ({ user, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initialize Socket.IO connection
    const initSocket = async () => {
      try {
        // Dynamic import for socket.io-client
        const { io } = await import('socket.io-client');
        const newSocket = io('http://localhost:5000', {
          transports: ['websocket']
        });

        newSocket.on('connect', () => {
          console.log('Connected to chat server');
          setIsConnected(true);
          
          // Authenticate user
          newSocket.emit('authenticate', {
            username: user.username,
            role: user.role
          });
          
          // Join support chat room
          newSocket.emit('joinSupportChat');
        });

        newSocket.on('disconnect', () => {
          console.log('Disconnected from chat server');
          setIsConnected(false);
        });

        newSocket.on('newMessage', (message) => {
          setMessages(prev => [...prev, message]);
        });

        newSocket.on('onlineUsers', (users) => {
          setOnlineUsers(users);
        });

        newSocket.on('userOnline', (userData) => {
          setOnlineUsers(prev => [...prev, userData]);
        });

        newSocket.on('userOffline', (userData) => {
          setOnlineUsers(prev => prev.filter(u => u.username !== userData.username));
        });

        setSocket(newSocket);

        // Load chat history
        loadChatHistory();

        return () => {
          newSocket.close();
        };
      } catch (error) {
        console.error('Socket.io not available:', error);
        // Fallback: Load chat history only
        loadChatHistory();
      }
    };

    initSocket();
  }, [user]);

  const loadChatHistory = async () => {
    try {
      const response = await fetch('/support/chat-history?limit=50');
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    if (socket && isConnected) {
      socket.emit('sendMessage', {
        message: newMessage,
        isPublic: true
      });
    } else {
      // Fallback: Add message locally
      const message = {
        id: Date.now(),
        username: user.username,
        role: user.role,
        message: newMessage,
        timestamp: new Date(),
        isPublic: true
      };
      setMessages(prev => [...prev, message]);
    }

    setNewMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getUserIcon = (role) => {
    switch (role) {
      case 'admin':
        return <AdminIcon color="error" />;
      case 'manufacturer':
        return <SupportIcon color="primary" />;
      default:
        return <PersonIcon color="action" />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'manufacturer':
        return 'primary';
      case 'supplier':
        return 'secondary';
      case 'retailer':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Paper elevation={3} sx={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SupportIcon color="primary" />
          <Typography variant="h6">Live Support Chat</Typography>
          <Badge color={isConnected ? 'success' : 'error'} variant="dot">
            <Typography variant="body2" color="textSecondary">
              {isConnected ? 'Connected' : 'Offline'}
            </Typography>
          </Badge>
        </Box>
        <Button onClick={onClose} size="small">Close</Button>
      </Box>

      {/* Online Users */}
      {onlineUsers.length > 0 && (
        <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="textSecondary">
            Online: {onlineUsers.length}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
            {onlineUsers.map((user, index) => (
              <Chip
                key={index}
                size="small"
                label={user.username}
                color={getRoleColor(user.role)}
                variant="outlined"
                avatar={<Avatar sx={{ width: 16, height: 16 }}>{getUserIcon(user.role)}</Avatar>}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Messages */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        <List dense>
          {messages.map((message, index) => (
            <ListItem key={message.id || index} alignItems="flex-start">
              <Avatar sx={{ width: 32, height: 32, mr: 1 }}>
                {getUserIcon(message.role)}
              </Avatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2" color="textPrimary">
                      {message.username}
                    </Typography>
                    <Chip 
                      size="small" 
                      label={message.role} 
                      color={getRoleColor(message.role)}
                      variant="outlined"
                      sx={{ height: 16, fontSize: '0.7rem' }}
                    />
                    <Typography variant="caption" color="textSecondary">
                      {format(new Date(message.timestamp || message.created_at), 'HH:mm')}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Typography variant="body2" color="textPrimary" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                    {message.message}
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>
        <div ref={messagesEndRef} />
      </Box>

      <Divider />

      {/* Message Input */}
      <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          multiline
          maxRows={3}
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          size="small"
        />
        <IconButton 
          color="primary" 
          onClick={sendMessage}
          disabled={!newMessage.trim()}
          sx={{ alignSelf: 'flex-end' }}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Paper>
  );
};

export default LiveChat;