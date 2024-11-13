// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3000;

// Serve static files (index.html, etc.)
app.use(express.static(__dirname));

// Store player data
const players = {};

io.on('connection', (socket) => {
    console.log('New player connected:', socket.id);
    
    // Create a new player and add to players object
    players[socket.id] = { x: 100, y: 100, size: 30, color: 'blue' };

    // Send the player list to the newly connected player
    socket.emit('updatePlayer', players);

    // Listen for player movement
    socket.on('playerMove', (position) => {
        if (players[socket.id]) {
            // Update player position
            players[socket.id].x = position.x;
            players[socket.id].y = position.y;
            
            // Broadcast updated player data to all clients
            io.emit('updatePlayer', players);
        }
    });

    // Handle player disconnection
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        
        // Remove player from list
        delete players[socket.id];
        
        // Notify all clients to update their player list
        io.emit('updatePlayer', players);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
