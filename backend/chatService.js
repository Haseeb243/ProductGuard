const { Server } = require('socket.io');

let io;
const connectedUsers = new Map(); // Store connected users

// Initialize Socket.IO
function initializeChat(server, corsOrigins) {
  io = new Server(server, {
    cors: {
      origin: corsOrigins.includes("*") ? true : corsOrigins,
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle user authentication
    socket.on('authenticate', (userData) => {
      const { username, role } = userData;
      socket.username = username;
      socket.role = role;
      connectedUsers.set(socket.id, { username, role, socketId: socket.id });
      
      console.log(`${username} (${role}) authenticated`);
      
      // Notify about online status
      socket.broadcast.emit('userOnline', { username, role });
      
      // Send list of online users
      socket.emit('onlineUsers', Array.from(connectedUsers.values()));
    });

    // Handle joining support chat
    socket.on('joinSupportChat', () => {
      socket.join('support');
      console.log(`${socket.username} joined support chat`);
    });

    // Handle sending messages
    socket.on('sendMessage', async (messageData) => {
      const { message, isPublic = false } = messageData;
      
      if (!socket.username) {
        socket.emit('error', 'Not authenticated');
        return;
      }

      const chatMessage = {
        id: Date.now(),
        username: socket.username,
        role: socket.role,
        message: message,
        timestamp: new Date(),
        isPublic: isPublic
      };

      try {
        // Save message to database
        const client = socket.client;
        if (client) {
          await client.query(
            'INSERT INTO support_chats (username, role, message) VALUES ($1, $2, $3)',
            [socket.username, socket.role, message]
          );
        }

        // Emit message to appropriate recipients
        if (isPublic) {
          // Send to all users in support room
          io.to('support').emit('newMessage', chatMessage);
        } else {
          // Send to admins only (private support message)
          const adminSockets = Array.from(connectedUsers.values())
            .filter(user => user.role === 'admin')
            .map(user => user.socketId);
          
          adminSockets.forEach(socketId => {
            io.to(socketId).emit('newMessage', chatMessage);
          });
          
          // Also send back to sender
          socket.emit('newMessage', chatMessage);
        }

        console.log(`Message from ${socket.username}: ${message}`);
      } catch (error) {
        console.error('Error saving message:', error);
        socket.emit('error', 'Failed to send message');
      }
    });

    // Handle typing indicators
    socket.on('typing', () => {
      socket.broadcast.to('support').emit('userTyping', {
        username: socket.username,
        role: socket.role
      });
    });

    socket.on('stopTyping', () => {
      socket.broadcast.to('support').emit('userStoppedTyping', {
        username: socket.username,
        role: socket.role
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      
      if (socket.username) {
        connectedUsers.delete(socket.id);
        socket.broadcast.emit('userOffline', {
          username: socket.username,
          role: socket.role
        });
      }
    });
  });

  return io;
}

// Get chat history from database
async function getChatHistory(client, limit = 50) {
  try {
    const result = await client.query(
      'SELECT * FROM support_chats ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    
    return result.rows.reverse(); // Return in chronological order
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return [];
  }
}

// Send system message
function sendSystemMessage(message, room = 'support') {
  if (io) {
    const systemMessage = {
      id: Date.now(),
      username: 'System',
      role: 'system',
      message: message,
      timestamp: new Date(),
      isPublic: true
    };
    
    io.to(room).emit('newMessage', systemMessage);
  }
}

// Get online users
function getOnlineUsers() {
  return Array.from(connectedUsers.values());
}

module.exports = {
  initializeChat,
  getChatHistory,
  sendSystemMessage,
  getOnlineUsers
};