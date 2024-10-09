const startButton = document.getElementById('ID_input');

function generateRandomCode(length) {
    let code = '';
    for (let i = 0; i < length; i++) {
        code += Math.floor(Math.random() * 10);
    }
    return code;
}

startButton.addEventListener('click', () => {
    const isNewGame = confirm('Do you want to start a new game? Click "OK" to start a new game or "Cancel" to join with a code.');

    if (isNewGame) {
        let code = generateRandomCode(6);
        window.location.href = "/chess?code=" + code;
    } else {
        let code = prompt('Enter 6-digit Game Code:');
        if (code) {
            alert(`Joining Game with Code: ${code}`);
            window.location.href = "/chess?code=" + code;
        } else {
            alert('No code entered.');
        }
    }
});
