import mongoose from 'mongoose';
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());

mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const messageSchema = new mongoose.Schema({
  userId: String,
  firstName: String,
  message: String,
  picturePath: String,
  category: String,
  time: Date,
});

const Message = mongoose.model('Message', messageSchema);


const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
  },
});

app.get('/messages/:category', async (req, res) => {
  try {
    const category = req.params.category;

    // Use Mongoose to find messages by category
    const messages = await Message.find({ category });

    // Send the retrieved messages as a JSON response
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'An error occurred while fetching messages.' });
  }
});


io.on("connection", (socket) => {
  console.log(`Socket ${socket.id} connected.`);

  socket.on("setUsername", () => {
    console.log(`(${socket.id}) connected.`);
  });

  socket.on("sendMessage", async  (data) => {
    const time = new Date().toLocaleTimeString();
    const message = {
      userId: data.userId,
      firstName: data.firstName,
      message: data.message,
      picturePath: data.picturePath,
      category: data.category, // include category in message data
      time: time,
    };
    console.log(`New message from user ${data.firstName}: ${data.message} in  ${data.category}`);
    io.to(data.category).emit("message", message); // emit message to specific category
    
    try {
      const newMessage = new Message({
        userId: data.userId,
        firstName: data.firstName,
        message: data.message,
        picturePath: data.picturePath,
        category: data.category,
        time: new Date(), // You may also use "time" in its native format
      });
  
      await newMessage.save();
      console.log('Message saved to MongoDB.');
    } catch (error) {
      console.error('Error saving message:', error);
    }

  });

  socket.on("joinCategory", (category) => {
    console.log(`Socket ${socket.id} joined category ${category}.`);
    socket.join(category);
  });

  socket.on("leaveCategory", (category) => {
    console.log(`Socket ${socket.id} left category ${category}.`);
    socket.leave(category);
  });

  socket.on("disconnect", () => {
    console.log(`Socket ${socket.id} disconnected.`);
  });
});

server.listen(3002, () => {
  console.log(`Server running on port ${3002}`);
});
