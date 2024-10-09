const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socket(server);
let join_code;
const chess = new Chess();
let players = {};
let currentPlayer = "w"; // White starts the game

app.set('views', path.join(__dirname, 'views'));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("home.ejs");
});

app.get("/chess", (req, res) => {
    var { code } = req.query;
    join_code = code;
    res.render("index.ejs", { title: "Chess", joinCode: code });
});

io.on("connection", function (uniquesocket) {
    console.log("A user connected with ID:", uniquesocket.id);

    uniquesocket.on("joinCode", (code) => {
        if (!players[code]) {
            players[code] = {};
        }

        if (players[join_code]?.fen != undefined) {
            chess.load(players[join_code].fen);
        } else {
            chess.reset();
        }

        if (!players[code]?.white) {
            players[code].white = uniquesocket.id;
            uniquesocket.emit("playerRole", code, "w");
            console.log("Assigned white to:", uniquesocket.id);
        } else if (!players[code]?.black) {
            players[code].black = uniquesocket.id;
            uniquesocket.emit("playerRole", code, "b");
            console.log("Assigned black to:", uniquesocket.id);
        } else {
            uniquesocket.emit("spectatorRole", code);
            console.log("A spectator joined with ID:", uniquesocket.id);
        }
        io.emit("reconnect", code);
        io.emit("boardState", code, chess.fen());
        join_code = code;
        console.log(players)
    })

    uniquesocket.on("disconnect", function () {
        if (uniquesocket.id === players[join_code]?.white) {
            delete players[join_code].white;
            console.log("White player disconnected");

        } else if (uniquesocket.id === players[join_code]?.black) {
            delete players[join_code].black;
            console.log("Black player disconnected");
        }
        io.emit("opponent_disconnect", join_code, uniquesocket.id == players[join_code]?.white ? "w" : "b");
        console.log(players)
    });

    uniquesocket.on("move", (thisCode, move) => {
        try {
            // Log the current player and the move attempt
            console.log("Move attempt by:", uniquesocket.id);
            console.log("Current turn is:", chess.turn());
            console.log(
                "White player:",
                players[thisCode]?.white,
                " | Black player:",
                players[thisCode]?.black,
            );

            // Turn checking logic
            if (chess.turn() === "w" && uniquesocket.id !== players[thisCode]?.white) {
                console.log(
                    "It's white's turn but black or a spectator tried to move",
                );
                return;
            }
            if (chess.turn() === "b" && uniquesocket.id !== players[thisCode]?.black) {
                console.log(
                    "It's black's turn but white or a spectator tried to move",
                );
                return;
            }

            if (players[join_code]?.fen != undefined) {
                chess.load(players[join_code].fen);
            }

            const result = chess.move(move);
            if (result) {
                currentPlayer = chess.turn(); // Update to the next player's turn

                // Check for checkmate after the move
                if (chess.isCheckmate()) {
                    // Notify clients that checkmate occurred
                    io.emit("checkmate", thisCode, chess.turn()); // jeetne wale ka color bhej
                    chess.reset(); // Reset the game state
                    currentPlayer = "w"; // white ko current player bana
                } else {
                    io.emit("move", thisCode, move); // Broadcast the move to all connected clients
                    io.emit("boardState", thisCode, chess.fen()); // Send the current board state (FEN)
                    console.log("Move successful:", move);
                    players[join_code].fen = chess.fen();

                    if (chess.turn() == "w") {
                        io.emit("turn", thisCode, "w");
                    } else {
                        io.emit("turn", thisCode, "b");
                    }
                }
            } else {
                console.log("Invalid move:", move);
                uniquesocket.emit("invalidMove", thisCode, move); // Notify the specific player of an invalid move
            }
        } catch (error) {
            console.log("Error processing move:", error);
            uniquesocket.emit("invalidMove", thisCode, move); // Handle errors and notify the player
        }
    });
});

server.listen(4000, function () {
    console.log("Server running on port 4000");
});
