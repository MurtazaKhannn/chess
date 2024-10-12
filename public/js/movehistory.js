export function addMoveToHistory(move , moveCount) {
    console.log("Adding move to history:", move); // Log the move
    const moveHistoryElement = document.querySelector('.move-history');
    const moveElement = document.createElement('p');

    // const playerName = playerRole === "w" ? "White" : "Black";
    moveElement.textContent = `${moveCount} : ${move}`;
    moveHistoryElement.appendChild(moveElement);
}

export function resetMoveHistory() {
    const moveHistoryElement = document.querySelector('.move-history');
    moveHistoryElement.innerHTML = ""; // Clears the move history
}
