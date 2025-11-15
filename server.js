import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import connectDB from './config/database.js';
import initAdmin from './utils/initAdmin.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import chatRoutes from './routes/chat.js';
import User from './models/User.js';
import Message from './models/Message.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  pingTimeout: 60000,
  pingInterval: 25000,
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3000;

// Connect to database
await connectDB();
await initAdmin();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
});

app.use(sessionMiddleware);

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
  res.redirect('/login');
});

app.use('/', authRoutes);
app.use('/', adminRoutes);
app.use('/', chatRoutes);

// Socket.io session sharing
io.engine.use(sessionMiddleware);

// Socket.io connection
io.on('connection', (socket) => {
  const session = socket.request.session;

  if (!session || !session.userId) {
    console.log('Socket connection rejected: No valid session');
    socket.emit('error', { message: 'No valid session. Please login again.' });
    socket.disconnect();
    return;
  }

  const userId = session.userId;
  const username = session.username;

  console.log(`User connected: ${username} (Socket ID: ${socket.id})`);

  // Join user to their own room
  socket.join(userId.toString());

  // Handle private messages
  socket.on('private_message', async (data) => {
    try {
      const { to, message } = data;

      if (!to || !message) {
        console.error('Invalid message data:', data);
        socket.emit('error', { message: 'Invalid message data' });
        return;
      }

      console.log(`Message from ${username} to ${to}: ${message.substring(0, 50)}...`);

      // Save message to database
      const newMessage = new Message({
        from: userId,
        to: to,
        message: message
      });

      await newMessage.save();
      console.log(`Message saved with ID: ${newMessage._id}`);

      const populatedMessage = await Message.findById(newMessage._id)
        .populate('from', 'username')
        .populate('to', 'username');

      if (!populatedMessage) {
        throw new Error('Failed to populate message');
      }

      const messageData = {
        id: populatedMessage._id,
        _id: populatedMessage._id,
        from: {
          _id: populatedMessage.from._id,
          username: populatedMessage.from.username
        },
        to: {
          _id: populatedMessage.to._id,
          username: populatedMessage.to.username
        },
        message: populatedMessage.message,
        timestamp: populatedMessage.timestamp
      };

      // Send to recipient
      io.to(to).emit('private_message', messageData);
      console.log(`Message sent to recipient: ${to}`);

      // Send back to sender (confirmation)
      socket.emit('message_sent', messageData);
      console.log(`Message confirmation sent to sender: ${userId}`);
    } catch (error) {
      console.error('Private message error:', error);
      console.error('Error stack:', error.stack);
      socket.emit('error', { message: 'Failed to send message: ' + error.message });
    }
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    io.to(data.to).emit('user_typing', {
      from: userId,
      username: username
    });
  });

  socket.on('stop_typing', (data) => {
    io.to(data.to).emit('user_stop_typing', {
      from: userId
    });
  });

  // Handle message deletion
  socket.on('message_deleted', (data) => {
    io.to(data.to).emit('message_deleted', {
      messageId: data.messageId
    });
  });

  // Handle message restoration
  socket.on('message_restored', (data) => {
    io.to(data.to).emit('message_restored', {
      messageId: data.messageId,
      message: data.message
    });
  });

  // Update last seen on disconnect
  socket.on('disconnect', async () => {
    try {
      await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
      console.log(`User disconnected: ${username}`);
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
