const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
require("dotenv").config();

const azureConfig = {
  endpoint: process.env.ENDPOINT,
  key : process.env.KEY
}
const {SessionDB} = require("./utils/sessionDBAzure")
const sessionDB = new SessionDB(azureConfig)


const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Set static folder
app.use(express.static(path.join(__dirname, "public")));

const crypto = require("crypto");
const { exit } = require("process");
const randomId = () => crypto.randomBytes(8).toString("hex");


io.use(async (socket, next) => {
  console.log("socket.handshake.auth", socket.handshake.auth);
  const sessionID = socket.handshake.auth.sessionID;
  const username = socket.handshake.auth.username;
  if (!username) {
    return next(new Error("invalid username"));
  }
  
  
  console.log("Session Id:", sessionID)
  if (sessionID) {    
    if (session) {
      const session = await sessionDB.findSession(username);
      socket.sessionID = sessionID;
      socket.userID = session.userID;
      socket.username = session.username;
      return next();
    }
  }
  socket.sessionID = randomId();
  socket.userID = randomId();
  socket.username = username;
  sessionDB.saveSession(socket.userID,socket.sessionID, socket.username)
  next();
});

// Run when client connects
io.on("connection", (socket) => {
  
  console.log("New WS Connection...",socket.sessionID, socket.userID, socket.username);
  io.to(socket.userID).emit("session", {
    sessionID: socket.sessionID,
    userID: socket.userID,
  });
  
  sessionDB.findAllSessions(function (err, sessions) {
    if (err) {
        console.error("Error retrieving sessions:", err);
    } else {
        console.log("All sessions:", sessions);
    }
});

  socket.join(socket.userID);
  
  console.log(io.of("/").adapter);

  // Welcome current user
  io.to(socket.userID).emit("message", "Welcome!");


    // private message
    socket.on("join", async (to) => {
      try {
        const sessions = await sessionDB.queryByUsername(to);
        if (sessions.length === 0) {
          console.log("User not found");
          io.to(socket.userID).emit("server_message", {"message":"User not found"});
        } else {
          console.log("Sessions:", sessions);
    
          // Loop through the sessions after awaiting the promise
          for (const session of sessions) {
            console.log("Sending message to session id:",session.id.toString());
            io.to(socket.userID).emit("server_message", {"message": "connected", "id": session.id.toString()});
            io.to(session.id).emit("server_message", {"message": "connected", "id": socket.userID});
            break;
          }
        }
      } catch (err) {
        console.error("Error querying by username:", err);
        io.to(socket.userID).emit("server_message", {"message":"An error occurred"});
      }
    });

  // private message
  socket.on("private message", async ({ content, to }) => {
    try {
          socket.to(to).emit("message", formatMessage(socket.username, content));
    } catch (err) {
      console.error("Error querying by username:", err);
      io.to(socket.userID).emit("message", formatMessage("server", "An error occurred"));
    }
  });

  // Runs when client disconnects
  socket.on("disconnect", () => {
    console.log("disconnects", socket.userID, socket.username)
    io.to(socket.userID).emit(
      "message",
      formatMessage(`${socket.username} has left the chat`)
    );
    
    sessionDB.deleteSession(socket.userID)
    console.log("disconnects", socket.userID, socket.username)
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
