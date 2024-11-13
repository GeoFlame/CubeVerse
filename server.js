// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let rooms = {};

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('joinRoom', (roomCode, nickname) => {
        if (!rooms[roomCode]) rooms[roomCode] = [];
        rooms[roomCode].push({ id: socket.id, nickname });
        socket.join(roomCode);
        io.to(roomCode).emit('playerJoined', nickname);
    });

    socket.on('playerMove', (roomCode, playerData) => {
        io.to(roomCode).emit('updatePlayer', playerData);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
