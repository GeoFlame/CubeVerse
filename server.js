const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let players = {};

app.use(express.static('public')); // Serve the static files (like HTML, JS, CSS)

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    
    // Initialize new player
    players[socket.id] = { x: Math.random() * 800, y: Math.random() * 600, size: 30, color: 'blue' };

    // Send current player list to the new player
    socket.emit('currentPlayers', players);

    // Notify other players about the new player
    socket.broadcast.emit('newPlayer', { id: socket.id, x: players[socket.id].x, y: players[socket.id].y });

    // Handle player movement
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            io.emit('playerMoved', { id: socket.id, x: players[socket.id].x, y: players[socket.id].y });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete players[socket.id];
        io.emit('removePlayer', socket.id);
    });
});

server.listen(3000, () => {
    console.log('Server running on port 3000');
});
