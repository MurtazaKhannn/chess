const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
let players = {};
let currentPlayer = "w"; // White starts the game

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index", { title: "Chess" });
});

io.on("connection", function (uniquesocket) {
    console.log("A user connected with ID:", uniquesocket.id);

    // Assign player roles
    if (!players.white) {
        players.white = uniquesocket.id;
        uniquesocket.emit("playerRole", "w"); // Assign white role
        console.log("Assigned white to:", uniquesocket.id);
    } else if (!players.black) {
        players.black = uniquesocket.id;
        uniquesocket.emit("playerRole", "b"); // Assign black role
        console.log("Assigned black to:", uniquesocket.id);
    } else {
        uniquesocket.emit("spectatorRole"); // Additional users become spectators
        console.log("A spectator joined with ID:", uniquesocket.id);
    }

    uniquesocket.on("disconnect", function () {
        if (uniquesocket.id === players.white) {
            delete players.white;
            console.log("White player disconnected");
        } else if (uniquesocket.id === players.black) {
            delete players.black;
            console.log("Black player disconnected");
        }
    });

    uniquesocket.on("move", (move) => {
        try {
            // Log the current player and the move attempt
            console.log("Move attempt by:", uniquesocket.id);
            console.log("Current turn is:", chess.turn());
            console.log("White player:", players.white, " | Black player:", players.black);

            // Turn checking logic
            if (chess.turn() === "w" && uniquesocket.id !== players.white) {
                console.log("It's white's turn but black or a spectator tried to move");
                return;
            }
            if (chess.turn() === "b" && uniquesocket.id !== players.black) {
                console.log("It's black's turn but white or a spectator tried to move");
                return;
            }

            const result = chess.move(move);
            if (result) {
                currentPlayer = chess.turn(); // Update to the next player's turn
            
                // Check for checkmate after the move
                if (chess.isCheckmate()) {
                    // Notify clients that checkmate occurred
                    io.emit("checkmate", chess.turn()); // Send the color of the winning player
                    chess.reset(); // Reset the game state
                    currentPlayer = "w"; // Set White to start the new game
                } else {
                    io.emit("move", move); // Broadcast the move to all connected clients
                    io.emit("boardState", chess.fen()); // Send the current board state (FEN)
                    console.log("Move successful:", move);
                }
            } else {
                console.log("Invalid move:", move);
                uniquesocket.emit("invalidMove", move); // Notify the specific player of an invalid move
            }
            
        } catch (error) {
            console.log("Error processing move:", error);
            uniquesocket.emit("invalidMove", move); // Handle errors and notify the player
        }
    });
});

server.listen(3000, function () {
    console.log("Server running on port 3000");
});
