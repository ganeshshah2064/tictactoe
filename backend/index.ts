import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { checkWinner, Games } from "./misc.js";

const games: Games = {};

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 4000;

app.use(cors());

if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (req.headers["x-forwarded-proto"] !== "https") {
      return res.redirect("https://" + req.headers.host + req.url);
    }
    next();
  });
}

app.get("/", (req, res) => {
  res.send("Chat server is running");
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });

  socket.on("joinGame", (data) => {
    const { username, room } = data;
    socket.join(room);

    if (!games[room]) {
      games[room] = {
        board: [
          ["", "", ""],
          ["", "", ""],
          ["", "", ""],
        ],
        players: [username, null],
        currentPlayer: username,
        winner: null,
        movesMade: 0,
      };
      socket.emit("gameCreated", { room });
    } else {
      if (games[room].players[1] === null) {
        games[room].players[1] = username;
        io.to(room).emit("gameStart", {
          board: games[room].board,
          players: games[room].players,
          currentPlayer: games[room].currentPlayer,
        });
      } else {
        socket.emit("roomFull", {
          message: "Room is full. Please join another room.",
        });
        socket.leave(room);
        return;
      }
    }

    console.log(`${username} joined room ${room}`);
    console.log({ games });
  });

  socket.on("makeMove", (data) => {
    const { room, row, col, username } = data;

    if (!games[room]) {
      console.log("Room does not exists!");
      return;
    }

    const game = games[room];

    if (game.currentPlayer !== username) {
      console.log("Not your turn");
      return;
    }

    if (game.board[row][col] !== "") {
      console.log("Cell already occupied");
      return;
    }

    // Update the board
    game.board[row][col] = username === game.players[0] ? "X" : "O";
    game.movesMade++;

    const winner = checkWinner(game.board);
    if (winner) {
      game.winner = winner;
    }

    const isDraw = game.movesMade === 9 && !winner;

    if (!winner && !isDraw) {
      game.currentPlayer =
        game.currentPlayer === game.players[0]
          ? game.players[1]
          : game.players[0];
    } else if (isDraw) {
      game.winner = "draw";
    }

    io.to(room).emit("moveMade", {
      board: game.board,
      currentPlayer: game.currentPlayer,
      winner: game.winner,
      isDraw: isDraw,
    });

    console.log(`Move made in room ${room}:`, game);
  });

  socket.on("resetGame", (data) => {
    const { room } = data;
    if (games[room]) {
      games[room] = {
        board: [
          ["", "", ""],
          ["", "", ""],
          ["", "", ""],
        ],
        players: [games[room].players[0], games[room].players[1]],
        currentPlayer: games[room].players[0],
        winner: null,
        movesMade: 0,
      };
      io.to(room).emit("gameReset", {
        board: games[room].board,
        currentPlayer: games[room].currentPlayer,
        winner: games[room].winner,
      });
    }
  });

  // Chat functionality
  socket.on("sendMessage", (data) => {
    console.log("Received sendMessage:", data);
    const { room, username, message } = data;
    
    if (!games[room]) {
      console.log("Room not found:", room);
      socket.emit("chatError", { message: "Room not found!" });
      return;
    }

    // Validate message
    if (!message || message.trim().length === 0) {
      console.log("Empty message received");
      socket.emit("chatError", { message: "Message cannot be empty!" });
      return;
    }

    if (message.length > 200) {
      console.log("Message too long:", message.length);
      socket.emit("chatError", { message: "Message too long! (max 200 characters)" });
      return;
    }

    // Send message to all players in the room
    const messageData = {
      username,
      message: message.trim(),
      timestamp: new Date().toISOString(),
      room
    };
    
    console.log("Sending newMessage to room:", room, messageData);
    io.to(room).emit("newMessage", messageData);

    console.log(`Chat message in room ${room} from ${username}: ${message}`);
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

export default app;
