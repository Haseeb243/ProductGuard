const { Server } = require("socket.io");

let io;
let dbClient; // Postgres client for persistence
const connectedUsers = new Map(); // Store connected users

// Initialize Socket.IO
function initializeChat(server, corsOrigins, pgClient) {
  // store db client
  dbClient = pgClient;
  io = new Server(server, {
    cors: {
      origin: corsOrigins.includes("*") ? true : corsOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Handle user authentication
    socket.on("authenticate", (userData) => {
      const { username, role } = userData || {};
      if (!username) return;

      socket.username = username;
      socket.role = role;
      connectedUsers.set(socket.id, { username, role, socketId: socket.id });

      console.log(`${username} (${role}) authenticated`);

      // Build a unique list by username+role to avoid duplicates in client
      const uniqueUsers = Array.from(connectedUsers.values()).reduce(
        (acc, u) => {
          const key = `${u.username}|${u.role}`;
          if (!acc.map.has(key)) {
            acc.map.set(key, true);
            acc.list.push(u);
          }
          return acc;
        },
        { map: new Map(), list: [] }
      ).list;

      // Notify about online status and provide current list
      socket.broadcast.emit("userOnline", { username, role });
      socket.emit("onlineUsers", uniqueUsers);
    });

    // Handle joining default support chat (legacy/public)
    socket.on("joinSupportChat", () => {
      socket.join("support");
      console.log(`${socket.username} joined support chat`);
    });

    // Join a private conversation room between a user and admin
    // roomId format: conv:user:<username>
    socket.on("joinConversation", (roomId) => {
      if (!socket.username || !roomId || !/^conv:user:.+/.test(roomId)) return;

      // Non-admins can only join their own room
      if (socket.role !== "admin") {
        const ownRoom = `conv:user:${socket.username}`;
        if (roomId !== ownRoom) return;
      }
      socket.join(roomId);
      io.to(roomId).emit("system", {
        message: `${socket.username} joined the conversation`,
      });
      console.log(`${socket.username} joined room ${roomId}`);
    });

    socket.on("leaveConversation", (roomId) => {
      try {
        socket.leave(roomId);
      } catch {}
    });

    // Handle sending messages
    socket.on("sendMessage", async (messageData) => {
      const { message, isPublic = false, roomId } = messageData || {};

      if (!socket.username) {
        socket.emit("error", "Not authenticated");
        return;
      }

      const chatMessage = {
        id: Date.now(),
        username: socket.username,
        role: socket.role,
        message: message,
        timestamp: new Date(),
        isPublic: isPublic,
        roomId: roomId || null,
      };

      try {
        // Save message to database
        if (dbClient) {
          const conversationKey =
            roomId || (isPublic ? "support" : `conv:user:${socket.username}`);
          await dbClient.query(
            "INSERT INTO support_chats (username, role, message, conversation_key) VALUES ($1, $2, $3, $4)",
            [socket.username, socket.role, message, conversationKey]
          );
        } else {
          console.warn(
            "ChatService: dbClient not set; message will not be persisted"
          );
        }

        // Emit message to appropriate recipients
        if (isPublic) {
          io.to("support").emit("newMessage", chatMessage);
        } else if (roomId) {
          // Send to the conversation room
          io.to(roomId).emit("newMessage", chatMessage);
        } else {
          // Backward-compatible: route private messages to the user's room
          const userRoom = `conv:user:${socket.username}`;
          io.to(userRoom).emit("newMessage", chatMessage);
        }

        console.log(`Message from ${socket.username}: ${message}`);
      } catch (error) {
        console.error("Error saving message:", error);
        socket.emit("error", "Failed to send message");
      }
    });

    // Handle typing indicators
    socket.on("typing", () => {
      socket.broadcast.to("support").emit("userTyping", {
        username: socket.username,
        role: socket.role,
      });
    });

    socket.on("stopTyping", () => {
      socket.broadcast.to("support").emit("userStoppedTyping", {
        username: socket.username,
        role: socket.role,
      });
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);

      if (socket.username) {
        connectedUsers.delete(socket.id);
        socket.broadcast.emit("userOffline", {
          username: socket.username,
          role: socket.role,
        });
      }
    });
  });

  return io;
}

// Get chat history from database
async function getChatHistory(client, limit = 50, conversationKey = null) {
  try {
    let result;
    if (conversationKey) {
      result = await client.query(
        "SELECT * FROM support_chats WHERE conversation_key = $1 ORDER BY created_at DESC LIMIT $2",
        [conversationKey, limit]
      );
    } else {
      result = await client.query(
        "SELECT * FROM support_chats ORDER BY created_at DESC LIMIT $1",
        [limit]
      );
    }

    return result.rows.reverse(); // Return in chronological order
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return [];
  }
}

// List active conversations (distinct conversation_key starting with conv:user:)
async function listConversations(client, limit = 100) {
  try {
    const result = await client.query(
      "SELECT conversation_key, MIN(created_at) as started_at, MAX(created_at) as last_message_at FROM support_chats WHERE conversation_key LIKE 'conv:user:%' GROUP BY conversation_key ORDER BY last_message_at DESC LIMIT $1",
      [limit]
    );
    return result.rows;
  } catch (e) {
    console.error("Error listing conversations:", e);
    return [];
  }
}

// Send system message
function sendSystemMessage(message, room = "support") {
  if (io) {
    const systemMessage = {
      id: Date.now(),
      username: "System",
      role: "system",
      message: message,
      timestamp: new Date(),
      isPublic: true,
    };

    io.to(room).emit("newMessage", systemMessage);
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
  getOnlineUsers,
  listConversations,
};
