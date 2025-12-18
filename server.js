require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const expect = require('chai');
const socket = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');

const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner.js');

const app = express();

// Security middleware with Helmet
app.use(helmet({
  noSniff: true, // Sets x-content-type-options: nosniff
  xssFilter: true, // Sets x-xss-protection: 1; mode=block
  noCache: true, // Disables caching
  hidePoweredBy: { setTo: 'PHP 7.4.3' } // Sets x-powered-by: PHP 7.4.3
}));

// Additional cache control headers for FCC tests
app.use((req, res, next) => {
  res.set({
    'Surrogate-Control': 'no-store',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  next();
});

app.use('/public', express.static(process.cwd() + '/public'));
app.use('/assets', express.static(process.cwd() + '/assets'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//For FCC testing purposes and enables user to connect from outside the hosting platform
app.use(cors({origin: '*'})); 

// Index page (static HTML)
app.route('/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  }); 

//For FCC testing purposes
fccTestingRoutes(app);
    
// 404 Not Found Middleware
app.use(function(req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});

const portNum = process.env.PORT || 5000;

// Set up server and tests
const server = app.listen(portNum, '0.0.0.0', () => {
  console.log(`Listening on port ${portNum}`);
  if (process.env.NODE_ENV==='test') {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch (error) {
        console.log('Tests are not valid:');
        console.error(error);
      }
    }, 1500);
  }
});

// Game classes will be handled client-side

// Game state
const players = {};
let collectible = null;

// Game settings
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;

// Generate random collectible
function generateCollectible() {
  return {
    x: Math.floor(Math.random() * (CANVAS_WIDTH - 16)),
    y: Math.floor(Math.random() * (CANVAS_HEIGHT - 16)),
    value: Math.floor(Math.random() * 10) + 1,
    id: Math.random().toString(36).substring(2, 15),
    width: 16,
    height: 16
  };
}

// Initialize first collectible
collectible = generateCollectible();

// Set up Socket.IO
const io = socket(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // Create new player
  const newPlayer = {
    x: Math.floor(Math.random() * (CANVAS_WIDTH - 32)),
    y: Math.floor(Math.random() * (CANVAS_HEIGHT - 32)),
    score: 0,
    id: socket.id,
    width: 32,
    height: 32
  };
  
  players[socket.id] = newPlayer;
  
  // Send initial game state to new player
  socket.emit('init', {
    player: newPlayer,
    players: players,
    collectible: collectible
  });
  
  // Notify other players of new player
  socket.broadcast.emit('updatePlayers', players);
  
  // Handle player movement
  socket.on('playerMovement', (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      
      // Broadcast updated positions to all players
      io.emit('updatePlayers', players);
    }
  });
  
  // Handle collectible collection
  socket.on('collectItem', (collectibleId) => {
    if (collectible && collectible.id === collectibleId && players[socket.id]) {
      // Add points to player
      players[socket.id].score += collectible.value;
      
      // Generate new collectible
      collectible = generateCollectible();
      
      // Update all players
      io.emit('updatePlayers', players);
      io.emit('updateCollectible', collectible);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove player from game
    delete players[socket.id];
    
    // Notify remaining players
    io.emit('updatePlayers', players);
    socket.broadcast.emit('playerDisconnect', socket.id);
  });
});

module.exports = app; // For testing
