const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let players = {};

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('a user connected');
    players[socket.id] = { id: socket.id, name: '', x: 100, y: 100, color: 'green', lastActive: Date.now() };

    // Send current players to the new player
    io.to(socket.id).emit('currentPlayers', players);

    // New player joined
    socket.on('joinGame', (data) => {
        if (players[socket.id]) { // Ensure player still exists
            players[socket.id].name = data.name;
            players[socket.id].color = data.color;
            io.emit('newPlayer', { id: socket.id, x: players[socket.id].x, y: players[socket.id].y, color: data.color, name: data.name });
        }
    });

    // Player movement
    socket.on('playerMovement', (data) => {
        if (players[socket.id]) { // Ensure player still exists
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            players[socket.id].lastActive = Date.now(); // Update last active time on movement
            socket.broadcast.emit('playerMoved', { id: socket.id, x: data.x, y: data.y });
        }
    });

    // Chat message
    socket.on('chatMessage', (message) => {
        if (players[socket.id]) { // Ensure player still exists
            io.emit('chatMessage', `${players[socket.id].name}: ${message}`);
        }
    });

    // Kick player manually
    socket.on('kickPlayer', (data) => {
        const playerToKick = Object.values(players).find(player => player.name === data.targetName);
        if (playerToKick) {
            io.to(playerToKick.id).emit('kicked');
            delete players[playerToKick.id];
            io.emit('removePlayer', playerToKick.id);
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
        delete players[socket.id];
        io.emit('removePlayer', socket.id);
    });
});

// Check AFK status every 10 seconds
setInterval(() => {
    for (const id in players) {
        if (Date.now() - players[id].lastActive > 120000) { // 2 minutes
            io.to(players[id].id).emit('kicked');
            delete players[id];
            io.emit('removePlayer', id);
        }
    }
}, 10000);

server.listen(3000, () => {
    console.log('listening on *:3000');
});
