const express = require('express');
const { WebSocketServer } = require('ws');
const { createServer } = require('http');
const { randomUUID } = require('crypto');
const path = require('path');

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Serve static files
app.use(express.static('public'));

// In-memory storage
const rooms = new Map();

// Main page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Team Challenge App</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>body { background: #0a0a0a; color: #e5e5e5; }</style>
</head>
<body>
    <div class="min-h-screen flex items-center justify-center">
        <div class="text-center">
            <h1 class="text-6xl font-bold mb-8">🏆 Team Challenge</h1>
            <div class="space-y-4">
                <a href="/admin" class="block bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-xl">
                    👨‍💼 Admin Setup
                </a>
                <a href="/arena/demo" class="block bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-lg text-xl">
                    🏟️ Arena Ansicht
                </a>
                <a href="/beamer/demo" class="block bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-lg text-xl">
                    📺 Beamer Ansicht
                </a>
                <a href="/highscore/demo" class="block bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-4 px-8 rounded-lg text-xl">
                    🏆 Highscore
                </a>
            </div>
            <p class="mt-8 text-gray-400">WebSocket Server läuft</p>
        </div>
    </div>
</body>
</html>
  `);
});

// Admin page
app.get('/admin', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Setup - Team Challenge</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/qrcode@1.5.3/build/qrcode.min.js"></script>
    <style>body { background: #0a0a0a; color: #e5e5e5; }</style>
</head>
<body>
    <div class="min-h-screen p-8">
        <div class="max-w-4xl mx-auto">
            <h1 class="text-4xl font-bold mb-8">👨‍💼 Admin Setup</h1>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div class="bg-gray-800 p-6 rounded-lg">
                    <h2 class="text-2xl font-bold mb-4">Event erstellen</h2>
                    <form id="eventForm" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium mb-2">Event Name</label>
                            <input type="text" id="eventName" class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg" placeholder="Mein Team Challenge" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">Countdown (Sekunden)</label>
                            <input type="number" id="countdownSec" class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg" value="600" required>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-2">Modus</label>
                            <div class="space-y-2">
                                <label class="flex items-center">
                                    <input type="radio" name="mode" value="shared" checked class="mr-2">
                                    Shared Mode (alle Teams gleiche Fragen)
                                </label>
                                <label class="flex items-center">
                                    <input type="radio" name="mode" value="individual" class="mr-2">
                                    Individual Mode (jedes Team eigene Fragen)
                                </label>
                            </div>
                        </div>
                        
                        <div id="sharedMode">
                            <div>
                                <label class="block text-sm font-medium mb-2">Finaler Code</label>
                                <input type="text" id="finalCode" class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg" placeholder="FINAL123">
                            </div>
                            
                            <div id="levelsSection">
                                <div class="flex justify-between items-center mb-2">
                                    <label class="block text-sm font-medium">Level</label>
                                    <button type="button" id="addLevelBtn" class="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded">
                                        Level hinzufügen
                                    </button>
                                </div>
                                <div id="levelsList">
                                    <div class="level-item mb-3 p-3 bg-gray-700 rounded">
                                        <div class="flex justify-between items-center mb-2">
                                            <span class="text-sm font-medium">Level 1</span>
                                            <button type="button" class="remove-level text-red-400 hover:text-red-300 text-sm">Entfernen</button>
                                        </div>
                                        <div class="space-y-2">
                                            <input type="text" class="level-prompt w-full p-2 bg-gray-600 border border-gray-500 rounded" placeholder="Frage eingeben" value="dfw">
                                            <input type="text" class="level-code w-full p-2 bg-gray-600 border border-gray-500 rounded" placeholder="Antwort eingeben" value="LION">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg">
                            Event erstellen
                        </button>
                    </form>
                </div>
                
                <div class="bg-gray-800 p-6 rounded-lg">
                    <h2 class="text-2xl font-bold mb-4">Event Links</h2>
                    <div id="eventLinks" class="space-y-4" style="display: none;">
                        <div>
                            <label class="block text-sm font-medium mb-2">Join Link</label>
                            <input type="text" id="joinLink" class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg" readonly>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">QR Code</label>
                            <div id="qrcode" class="flex justify-center"></div>
                        </div>
                        <div class="space-y-2">
                            <a id="beamerLink" href="#" class="block bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg text-center">
                                📺 Beamer Ansicht
                            </a>
                            <a id="arenaLink" href="#" class="block bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg text-center">
                                🏟️ Arena Ansicht
                            </a>
                            <a id="highscoreLink" href="#" class="block bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg text-center">
                                🏆 Highscore
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            
            <div id="countdownControls" class="mt-8 bg-gray-800 p-6 rounded-lg" style="display: none;">
                <h2 class="text-2xl font-bold mb-4">Countdown Kontrolle</h2>
                <div class="flex space-x-4">
                    <button id="startBtn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">▶️ Start</button>
                    <button id="pauseBtn" class="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg">⏸️ Pause</button>
                    <button id="resumeBtn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">▶️ Resume</button>
                    <button id="resetBtn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">🔄 Reset</button>
                </div>
                <div id="countdownDisplay" class="mt-4 text-3xl font-bold text-center"></div>
            </div>
        </div>
    </div>

    <script>
        let ws = null;
        let currentEventId = null;

        function connectWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = \`\${protocol}//\${window.location.host}\`;
            ws = new WebSocket(wsUrl);
            
            ws.onopen = () => {
                console.log('WebSocket connected');
                ws.send(JSON.stringify({ type: 'hello', role: 'admin' }));
            };
            
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'event_created') {
                    currentEventId = data.eventId;
                    showEventLinks(data.eventId);
                } else if (data.type === 'state') {
                    updateCountdown(data.payload.countdown);
                }
            };
            
            ws.onclose = () => {
                console.log('WebSocket disconnected');
                setTimeout(connectWebSocket, 1000);
            };
        }

        function showEventLinks(eventId) {
            const baseUrl = window.location.origin;
            const joinUrl = \`\${baseUrl}/join/\${eventId}\`;
            
            document.getElementById('joinLink').value = joinUrl;
            document.getElementById('beamerLink').href = \`\${baseUrl}/beamer/\${eventId}\`;
            document.getElementById('arenaLink').href = \`\${baseUrl}/arena/\${eventId}\`;
            document.getElementById('highscoreLink').href = \`\${baseUrl}/highscore/\${eventId}\`;
            
            const qrDiv = document.getElementById('qrcode');
            qrDiv.innerHTML = '';
            QRCode.toCanvas(qrDiv, joinUrl, { width: 200, color: { light: '#000000' } });
            
            document.getElementById('eventLinks').style.display = 'block';
            document.getElementById('countdownControls').style.display = 'block';
        }

        function updateCountdown(countdown) {
            const display = document.getElementById('countdownDisplay');
            const minutes = Math.floor(countdown.remainingMs / 60000);
            const seconds = Math.floor((countdown.remainingMs % 60000) / 1000);
            display.textContent = \`\${minutes.toString().padStart(2, '0')}:\${seconds.toString().padStart(2, '0')}\`;
        }

        function sendCountdownControl(action) {
            if (ws && currentEventId) {
                ws.send(JSON.stringify({ type: 'countdown_control', action }));
            }
        }

        // Level management
        let levelCount = 1;
        
        document.getElementById('addLevelBtn').addEventListener('click', () => {
            levelCount++;
            const levelsList = document.getElementById('levelsList');
            const newLevel = document.createElement('div');
            newLevel.className = 'level-item mb-3 p-3 bg-gray-700 rounded';
            newLevel.innerHTML = \`
                <div class="flex justify-between items-center mb-2">
                    <span class="text-sm font-medium">Level \${levelCount}</span>
                    <button type="button" class="remove-level text-red-400 hover:text-red-300 text-sm">Entfernen</button>
                </div>
                <div class="space-y-2">
                    <input type="text" class="level-prompt w-full p-2 bg-gray-600 border border-gray-500 rounded" placeholder="Frage eingeben">
                    <input type="text" class="level-code w-full p-2 bg-gray-600 border border-gray-500 rounded" placeholder="Antwort eingeben">
                </div>
            \`;
            levelsList.appendChild(newLevel);
            
            // Add remove functionality
            newLevel.querySelector('.remove-level').addEventListener('click', () => {
                newLevel.remove();
            });
        });
        
        // Remove level functionality for existing levels
        document.querySelectorAll('.remove-level').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.level-item').remove();
            });
        });
        
        // Mode switching
        document.querySelectorAll('input[name="mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                document.getElementById('sharedMode').style.display = e.target.value === 'shared' ? 'block' : 'none';
            });
        });

        document.getElementById('eventForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const levels = [];
            document.querySelectorAll('.level-item').forEach((item, index) => {
                const prompt = item.querySelector('.level-prompt').value;
                const code = item.querySelector('.level-code').value;
                if (prompt && code) {
                    levels.push({ index, prompt, code });
                }
            });
            
            const formData = {
                name: document.getElementById('eventName').value,
                countdownSec: parseInt(document.getElementById('countdownSec').value),
                mode: document.querySelector('input[name="mode"]:checked').value,
                finalCode: document.getElementById('finalCode').value,
                levels: levels
            };
            
            ws.send(JSON.stringify({ type: 'create_event', payload: formData }));
        });

        document.getElementById('startBtn').addEventListener('click', () => sendCountdownControl('start'));
        document.getElementById('pauseBtn').addEventListener('click', () => sendCountdownControl('pause'));
        document.getElementById('resumeBtn').addEventListener('click', () => sendCountdownControl('resume'));
        document.getElementById('resetBtn').addEventListener('click', () => sendCountdownControl('reset'));

        connectWebSocket();
    </script>
</body>
</html>
  `);
});

// Join page
app.get('/join/:eventId', (req, res) => {
  const eventId = req.params.eventId;
  res.send(`
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Team beitreten - Team Challenge</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>body { background: #0a0a0a; color: #e5e5e5; }</style>
</head>
<body>
    <div class="min-h-screen flex items-center justify-center">
        <div class="max-w-md mx-auto bg-gray-800 p-8 rounded-lg">
            <h1 class="text-3xl font-bold mb-6 text-center">🏆 Team beitreten</h1>
            <form id="joinForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-2">Team Name</label>
                    <input type="text" id="teamName" class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg" placeholder="Mein Team" required>
                </div>
                <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg">
                    Beitreten
                </button>
            </form>
            <div id="teamView" class="mt-6" style="display: none;">
                <h2 class="text-xl font-bold mb-4">Team: <span id="currentTeamName"></span></h2>
                <div id="levelInfo" class="mb-4"></div>
                <div class="space-y-2">
                    <input type="text" id="answerInput" class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg" placeholder="Antwort eingeben">
                    <button id="submitBtn" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">
                        Antwort senden
                    </button>
                </div>
            </div>
        </div>
    </div>

    <script>
        const eventId = '${eventId}';
        let ws = null;
        let currentTeam = null;

        function connectWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = \`\${protocol}//\${window.location.host}\`;
            ws = new WebSocket(wsUrl);
            
            ws.onopen = () => {
                console.log('WebSocket connected');
                ws.send(JSON.stringify({ type: 'hello', role: 'team', eventId }));
            };
            
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'state') {
                    updateTeamView(data.payload);
                }
            };
            
            ws.onclose = () => {
                console.log('WebSocket disconnected');
                setTimeout(connectWebSocket, 1000);
            };
        }

        function updateTeamView(state) {
            const team = state.teams.find(t => t.id === currentTeam?.id);
            if (team) {
                document.getElementById('currentTeamName').textContent = team.name;
                document.getElementById('levelInfo').innerHTML = \`
                    <p>Level: \${team.currentLevel + 1}</p>
                    <p>Gelöst: \${team.solvedCount}</p>
                    <p>Status: \${team.finished ? 'Fertig!' : 'Aktiv'}</p>
                \`;
            }
        }

        document.getElementById('joinForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const teamName = document.getElementById('teamName').value;
            ws.send(JSON.stringify({ type: 'join_team', teamName }));
            currentTeam = { name: teamName };
            document.getElementById('joinForm').style.display = 'none';
            document.getElementById('teamView').style.display = 'block';
        });

        document.getElementById('submitBtn').addEventListener('click', () => {
            const answer = document.getElementById('answerInput').value;
            if (answer && currentTeam) {
                ws.send(JSON.stringify({ type: 'submit_answer', payload: { code: answer } }));
                document.getElementById('answerInput').value = '';
            }
        });

        connectWebSocket();
    </script>
</body>
</html>
  `);
});

// Beamer page
app.get('/beamer/:eventId', (req, res) => {
  const eventId = req.params.eventId;
  res.send(`
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Beamer - Team Challenge</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>body { background: #0a0a0a; color: #e5e5e5; }</style>
</head>
<body>
    <div class="min-h-screen flex items-center justify-center">
        <div class="text-center">
            <h1 class="text-8xl font-bold mb-8">🏆 Team Challenge</h1>
            <div id="countdownDisplay" class="text-9xl font-bold mb-8">10:00</div>
            <div id="teamsInfo" class="text-2xl"></div>
        </div>
    </div>

    <script>
        const eventId = '${eventId}';
        let ws = null;

        function connectWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = \`\${protocol}//\${window.location.host}\`;
            ws = new WebSocket(wsUrl);
            
            ws.onopen = () => {
                console.log('WebSocket connected');
                ws.send(JSON.stringify({ type: 'hello', role: 'beamer', eventId }));
            };
            
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'state') {
                    updateDisplay(data.payload);
                }
            };
            
            ws.onclose = () => {
                console.log('WebSocket disconnected');
                setTimeout(connectWebSocket, 1000);
            };
        }

        function updateDisplay(state) {
            const countdown = state.countdown;
            const minutes = Math.floor(countdown.remainingMs / 60000);
            const seconds = Math.floor((countdown.remainingMs % 60000) / 1000);
            document.getElementById('countdownDisplay').textContent = \`\${minutes.toString().padStart(2, '0')}:\${seconds.toString().padStart(2, '0')}\`;
            
            const teamsInfo = \`Teams: \${state.teams.length} | Gelöst: \${state.teams.filter(t => t.finished).length}\`;
            document.getElementById('teamsInfo').textContent = teamsInfo;
        }

        connectWebSocket();
    </script>
</body>
</html>
  `);
});

// Arena page
app.get('/arena/:eventId', (req, res) => {
  const eventId = req.params.eventId;
  res.send(`
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Arena - Team Challenge</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>body { background: #0a0a0a; color: #e5e5e5; }</style>
</head>
<body>
    <div class="min-h-screen p-8">
        <div class="max-w-6xl mx-auto">
            <h1 class="text-6xl font-bold mb-8 text-center">🏟️ Arena</h1>
            <div id="teamsGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
        </div>
    </div>

    <script>
        const eventId = '${eventId}';
        let ws = null;

        function connectWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = \`\${protocol}//\${window.location.host}\`;
            ws = new WebSocket(wsUrl);
            
            ws.onopen = () => {
                console.log('WebSocket connected');
                ws.send(JSON.stringify({ type: 'hello', role: 'arena', eventId }));
            };
            
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'state') {
                    updateTeamsGrid(data.payload);
                }
            };
            
            ws.onclose = () => {
                console.log('WebSocket disconnected');
                setTimeout(connectWebSocket, 1000);
            };
        }

        function updateTeamsGrid(state) {
            const grid = document.getElementById('teamsGrid');
            grid.innerHTML = state.teams.map(team => \`
                <div class="bg-gray-800 p-6 rounded-lg">
                    <h3 class="text-xl font-bold mb-2">\${team.name}</h3>
                    <p>Level: \${team.currentLevel + 1}</p>
                    <p>Gelöst: \${team.solvedCount}</p>
                    <p>Status: \${team.finished ? '✅ Fertig!' : '🔄 Aktiv'}</p>
                </div>
            \`).join('');
        }

        connectWebSocket();
    </script>
</body>
</html>
  `);
});

// Highscore page
app.get('/highscore/:eventId', (req, res) => {
  const eventId = req.params.eventId;
  res.send(`
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Highscore - Team Challenge</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>body { background: #0a0a0a; color: #e5e5e5; }</style>
</head>
<body>
    <div class="min-h-screen p-8">
        <div class="max-w-4xl mx-auto">
            <h1 class="text-6xl font-bold mb-8 text-center">🏆 Highscore</h1>
            <div id="highscoreList" class="space-y-4"></div>
        </div>
    </div>

    <script>
        const eventId = '${eventId}';
        let ws = null;

        function connectWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = \`\${protocol}//\${window.location.host}\`;
            ws = new WebSocket(wsUrl);
            
            ws.onopen = () => {
                console.log('WebSocket connected');
                ws.send(JSON.stringify({ type: 'hello', role: 'highscore', eventId }));
            };
            
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'state') {
                    updateHighscore(data.payload);
                }
            };
            
            ws.onclose = () => {
                console.log('WebSocket disconnected');
                setTimeout(connectWebSocket, 1000);
            };
        }

        function updateHighscore(state) {
            const sortedTeams = state.teams.sort((a, b) => {
                if (a.finished && !b.finished) return -1;
                if (!a.finished && b.finished) return 1;
                return b.solvedCount - a.solvedCount;
            });

            const list = document.getElementById('highscoreList');
            list.innerHTML = sortedTeams.map((team, index) => \`
                <div class="bg-gray-800 p-6 rounded-lg flex justify-between items-center">
                    <div class="flex items-center">
                        <span class="text-3xl mr-4">\${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}</span>
                        <div>
                            <h3 class="text-xl font-bold">\${team.name}</h3>
                            <p>Level: \${team.currentLevel + 1} | Gelöst: \${team.solvedCount}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-2xl font-bold">\${team.finished ? '✅' : '🔄'}</p>
                    </div>
                </div>
            \`).join('');
        }

        connectWebSocket();
    </script>
</body>
</html>
  `);
});

// WebSocket handling
wss.on('connection', (socket) => {
  let meta = { socket, role: 'admin' };

  socket.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      
      if (msg.type === 'hello') {
        meta.role = msg.role;
        meta.eventId = msg.eventId;
        meta.teamName = msg.teamName;
        
        if (msg.eventId) {
          if (!rooms.has(msg.eventId)) {
            rooms.set(msg.eventId, { clients: new Set(), state: null });
          }
          rooms.get(msg.eventId).clients.add(meta);
        }
      }
      
      if (msg.type === 'create_event') {
        const eventId = randomUUID();
        const event = {
          id: eventId,
          name: msg.payload.name,
          countdownSec: msg.payload.countdownSec,
          levels: msg.payload.levels || [],
          finalCode: msg.payload.finalCode || '',
          createdAt: Date.now()
        };
        
        const room = { 
          clients: new Set(), 
          state: { 
            event, 
            teams: [], 
            countdown: { 
              startedAtMs: null, 
              pausedAtMs: null, 
              remainingMs: event.countdownSec * 1000, 
              isRunning: false 
            } 
          } 
        };
        rooms.set(eventId, room);
        room.clients.add(meta);
        meta.eventId = eventId;
        
        socket.send(JSON.stringify({ type: 'event_created', eventId }));
      }
      
      if (msg.type === 'join_team' && meta.eventId) {
        const room = rooms.get(meta.eventId);
        if (room && room.state) {
          const teamId = randomUUID();
          const newTeam = {
            id: teamId,
            name: msg.teamName,
            currentLevel: 0,
            solvedCount: 0,
            finished: false,
            elapsedMs: 0,
            joinedAt: Date.now()
          };
          room.state.teams.push(newTeam);
          meta.teamId = teamId;
          
          // Broadcast updated state
          room.clients.forEach(client => {
            if (client.socket.readyState === 1) {
              client.socket.send(JSON.stringify({ type: 'state', payload: room.state }));
            }
          });
        }
      }
      
      if (msg.type === 'countdown_control' && meta.eventId) {
        const room = rooms.get(meta.eventId);
        if (room && room.state) {
          const cd = room.state.countdown;
          const totalDuration = room.state.event.countdownSec * 1000;
          
          if (msg.action === 'start') {
            cd.startedAtMs = Date.now();
            cd.pausedAtMs = null;
            cd.isRunning = true;
            cd.remainingMs = totalDuration;
          } else if (msg.action === 'pause' && cd.isRunning) {
            cd.pausedAtMs = Date.now();
            cd.isRunning = false;
            cd.remainingMs = Math.max(0, totalDuration - (cd.pausedAtMs - cd.startedAtMs));
          } else if (msg.action === 'resume' && !cd.isRunning) {
            cd.startedAtMs = Date.now() - (totalDuration - cd.remainingMs);
            cd.pausedAtMs = null;
            cd.isRunning = true;
          } else if (msg.action === 'reset') {
            cd.startedAtMs = null;
            cd.pausedAtMs = null;
            cd.isRunning = false;
            cd.remainingMs = totalDuration;
          }
          
          // Broadcast to all clients
          room.clients.forEach(client => {
            if (client.socket.readyState === 1) {
              client.socket.send(JSON.stringify({ type: 'state', payload: room.state }));
            }
          });
        }
      }
      
      if (msg.type === 'submit_answer' && meta.eventId && meta.teamId) {
        const room = rooms.get(meta.eventId);
        if (room && room.state) {
          const team = room.state.teams.find(t => t.id === meta.teamId);
          if (team) {
            const event = room.state.event;
            let isCorrect = false;
            
            if (team.currentLevel < event.levels.length) {
              isCorrect = normalizeCode(msg.payload.code) === normalizeCode(event.levels[team.currentLevel].code);
            } else {
              isCorrect = normalizeCode(msg.payload.code) === normalizeCode(event.finalCode);
            }
            
            if (isCorrect) {
              team.currentLevel++;
              team.solvedCount++;
              
              const totalLevels = event.levels.length + 1;
              if (team.currentLevel >= totalLevels) {
                team.finished = true;
                team.elapsedMs = Date.now() - team.joinedAt;
              }
            }
            
            // Broadcast updated state
            room.clients.forEach(client => {
              if (client.socket.readyState === 1) {
                client.socket.send(JSON.stringify({ type: 'state', payload: room.state }));
              }
            });
          }
        }
      }
      
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  socket.on('close', () => {
    if (meta.eventId) {
      const room = rooms.get(meta.eventId);
      if (room) room.clients.delete(meta);
    }
  });
});

// Countdown ticker
setInterval(() => {
  rooms.forEach((room, eventId) => {
    if (room.state && room.state.countdown.isRunning) {
      const cd = room.state.countdown;
      const totalDuration = room.state.event.countdownSec * 1000;
      const elapsed = Date.now() - cd.startedAtMs;
      cd.remainingMs = Math.max(0, totalDuration - elapsed);
      
      if (cd.remainingMs <= 0) {
        cd.isRunning = false;
        cd.remainingMs = 0;
      }
      
      // Broadcast to all clients
      room.clients.forEach(client => {
        if (client.socket.readyState === 1) {
          client.socket.send(JSON.stringify({ type: 'state', payload: room.state }));
        }
      });
    }
  });
}, 100);

function normalizeCode(code) {
  return code.replace(/\s/g, '');
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Team Challenge Server running on port ${PORT}`);
});
