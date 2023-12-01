const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const crypto = require("crypto");
const { exit } = require("process");
const e = require("express");
const randomId = () => crypto.randomBytes(8).toString("hex");


const azureConfig = {
  endpoint: process.env.ENDPOINT,
  key : process.env.KEY
}
const {userDB} = require("./utils/sessionDBAzure")
const userStore = new userDB(azureConfig)


const secretKey = process.env.SECRET_KEY; // Secret key for signing JWT


app.use(bodyParser.json());

app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log("username", username, password);
    const user = await userStore.queryByUsername(username);
    if (user) {
      return res.status(400).json({ message: 'Username is already taken' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    userStore.saveUser(randomId(), username, hashedPassword)
    res.status(200).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/', async (req, res) => {
  try{
    res.status(200).json({ message: 'Server is running' });
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login and generate a JWT token
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await userStore.queryByUsername(username);
    if (!user) {
      return res.status(401).json({ message: 'Authentication failed' });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Authentication failed' });
    }  
    // Generate a JWT token
    const token = jwt.sign({ username }, secretKey, { expiresIn: '10h' });
    
    res.status(200).json({ token: token, userID: user.id, username: user.username });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/get_user_id', async (req, res) => {
  try {
    const username = req.query.username;
    const password = req.query.password;
    console.log("username", username, password);

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required in query parameters' });
    }

    const user = await userStore.queryByUsername(username);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Authentication failed' });
    }

    res.status(200).json({ userID: user.id, username: user.username });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Verify the JWT token
async function validateToken(token) {
  try {
    const user = await jwt.verify(token, secretKey);
    return user;
  } catch (err) {
    console.error("Token validation failed", err);
    return null;
  }
}

io.use(async (socket, next) => {
  console.log("socket.handshake.auth", socket.handshake.auth);
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error("Invalid token"));
  }

  const user = await validateToken(token);

  if (!user) {
    return next(new Error("Invalid token"));
  }
  socket.userID = socket.handshake.auth.userID;
  socket.username = socket.handshake.auth.username;

  userStore.updateUser(socket.userID, true);

  console.log("User connected successfully, socket.userID", socket.userID, socket.username);
  return next();
});

// Run when client connects
io.on("connection", (socket) => {
  
  console.log("New WS Connection...", socket.userID, socket.username);
  
  socket.join(socket.userID);  
  console.log(io.of("/").adapter);
  io.to(socket.userID).emit("message", "Welcome!");


    // private message
    socket.on("join", async (to) => {
            io.to(socket.userID).emit("server_message", {"message": "connected", "id": to});
            io.to(to).emit("server_message", {"message": "connected", "id": socket.userID});
    });

  // private message
  socket.on("private message", async ({ content, to }) => {
    try {
          socket.to(to).emit("message", formatMessage(socket.username, content));
          console.log("private message:", "from:", socket.username, " to:", to, " content:", content);
    } catch (err) {
      console.error("Error querying by username:", err);
      io.to(socket.userID).emit("server_message", {"response":"failure"});
    }
  });

  
  // response
  socket.on("response", async ({ content, to, response }) => {
    try {
          socket.to(to).emit("response", {"response":response, "content":content, "id": socket.username});
          console.log("response:", "from:", socket.username, " to:", to, " content:", content);
    } catch (err) {
      console.error("Error querying by username:", err);
      io.to(socket.userID).emit("server_message", {"response":"failure"});
    }
  });


  socket.on('sendFile', async ({ fileName, fileChunk, fileSize, fileEnd, to }) => {
    console.log('Sending file...', fileName);
    try {

        // Send the file data chunk to the client
        if (fileEnd) {
          socket.to(to).emit('file', { fileEnd: "fileEnd", fileName: fileName, fileSize:fileSize});
          console.log('File transmission completed.', fileName);
        }else{
          socket.to(to).emit('file', { fileChunk: fileChunk, fileName: fileName, fileSize:fileSize });
        }
    } catch (err) {
      console.error("Error sending the file:", err);
      io.to(socket.userID).emit("server_message", {"response":"failure"});
    }
  });


  // Runs when client disconnects
  socket.on("disconnect", () => {
    console.log("disconnects", socket.userID, socket.username)
    io.to(socket.userID).emit(
      "message",
      formatMessage(`${socket.username} has left the chat`)
    );
    
    userStore.updateUser(socket.userID, false)
    console.log("disconnects", socket.userID, socket.username)
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

