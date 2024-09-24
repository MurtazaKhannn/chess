const socket = io();  
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");
const messageElement = document.querySelector(".message"); 

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;
let opponentDisconnected = false; 

const restartButton = document.getElementById("restartButton");

const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = "";
    board.forEach((row, rowindex) => {
        row.forEach((square, squareindex) => {
            const squareElement = document.createElement("div");
            squareElement.classList.add("square", 
                (rowindex + squareindex) % 2 === 0 ? "light" : "dark"
            );

            squareElement.dataset.row = rowindex;
            squareElement.dataset.col = squareindex;

            if (square) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add("piece", square.color === "w" ? "white" : "black");
                pieceElement.innerText = getPieceUnicode(square);
                pieceElement.draggable = playerRole === square.color;

                pieceElement.addEventListener("dragstart", (e) => {
                    if (pieceElement.draggable) {
                        draggedPiece = pieceElement;
                        sourceSquare = { row: rowindex, col: squareindex };
                        e.dataTransfer.setData("text/plain", "");
                    }
                });

                pieceElement.addEventListener("dragend", (e) => {
                    draggedPiece = null;
                    sourceSquare = null;
                });

                squareElement.appendChild(pieceElement);
            }

            squareElement.addEventListener("dragover", (e) => {
                e.preventDefault();
            });

            squareElement.addEventListener("drop", (e) => {
                e.preventDefault();
                if (draggedPiece) {
                    const targetSource = {
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col)
                    };

                    handleMove(sourceSquare, targetSource);
                }
            });
            boardElement.appendChild(squareElement);
        });
    });

    if (playerRole === 'b') {
        boardElement.classList.add("flipped");
    } else {
        boardElement.classList.remove("flipped");
    }

    // Check for checkmate or opponent disconnection
    if (chess.in_checkmate()) {
        messageElement.innerText = "Endgame: Checkmate!";
        restartButton.classList.remove("hidden"); // Show restart button
    } else if (opponentDisconnected) {
        messageElement.innerText = "Opponent has disconnected.";
        restartButton.classList.add("hidden"); // Hide restart button
    } else {
        messageElement.innerText = ""; // Clear message
        restartButton.classList.add("hidden"); // Hide restart button
    }
}

// Handle move and socket communication
const handleMove = (source, target) => {
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: "q"
    };

    socket.emit("move", move);
}

// Unicode representation of pieces
const getPieceUnicode = (piece) => {
    const unicodePieces = {
        "p": "♙",
        "r": "♖",
        "n": "♘",
        "b": "♗",
        "k": "♔",
        "q": "♕",
        "P": "♟",
        "R": "♜",
        "N": "♞",
        "B": "♝",
        "K": "♚",
        "Q": "♛"
    };

    return unicodePieces[piece.type] || "";
}

// Socket event listeners
socket.on("playerRole", function(role) {
    playerRole = role;
    renderBoard();
});

socket.on("spectatorRole", function() {
    playerRole = null;
    renderBoard();
});

socket.on("boardState", function(fen) {
    chess.load(fen);
    renderBoard();
});

socket.on("move", function(move) {
    chess.move(move);
    renderBoard();
});

socket.on("checkmate", function(winnerColor) {
    const winner = winnerColor === "w" ? "Black" : "White";
    messageElement.innerText = `${winner} wins by checkmate!`;
    restartButton.classList.remove("hidden"); // Show restart button
});


// Handle disconnection
socket.on("disconnect", function() {
    opponentDisconnected = true;
    renderBoard();
});

socket.on("reconnect", function() {
    opponentDisconnected = false;
    // Optionally, you can fetch the current game state here
    renderBoard();
});

// Restart the game logic
restartButton.addEventListener("click", () => {
    chess.reset(); // Resets the chess game to the initial state
    socket.emit("restartGame"); // Notify the server to restart the game
    socket.emit("initializeGame"); // Optionally, let the server know to set the game state
    renderBoard(); // Re-render the board
});

// Initial render
renderBoard();
