const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let players = {};
let bullets = [];

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    
    players[socket.id] = { x: Math.random() * 800, y: Math.random() * 600, size: 30, color: 'blue', health: 100, rotation: 0 };
    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', players[socket.id]);

    socket.on('playerMovement', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            players[socket.id].rotation = data.rotation;
            io.emit('playerMoved', { id: socket.id, x: data.x, y: data.y, rotation: data.rotation });
        }
    });

    socket.on('shootBullet', (data) => {
        bullets.push({ x: data.x, y: data.y, angle: data.angle, speed: 5, size: 5 });
        io.emit('bulletFired', { x: data.x, y: data.y, angle: data.angle, speed: 5, size: 5 });
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('removePlayer', socket.id);
    });
});

server.listen(3000, () => {
    console.log('Server running on port 3000');
});
