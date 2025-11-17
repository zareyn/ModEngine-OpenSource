// index.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
const express = require('express');
const path = require('path');
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs'); // ← ДОБАВИТЬ ЭТОТ ИМПОРТ!

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// 🎨 API ДЛЯ СПРАЙТОВ И ИЗОБРАЖЕНИЙ
app.get('/api/sprites', (req, res) => {
    const spritesPath = path.join(__dirname, 'public', 'img', 'spr.json');
    console.log('🔍 Ищу спрайты по пути:', spritesPath);
    
    // Проверяем существует ли файл
    if (!fs.existsSync(spritesPath)) {
        console.error('❌ Файл не найден:', spritesPath);
        return res.status(500).json({ error: 'Sprite file not found' });
    }
    
    fs.readFile(spritesPath, 'utf8', (err, data) => {
        if (err) {
            console.error('❌ Ошибка чтения файла:', err);
            return res.status(500).json({ error: 'Failed to read sprite file' });
        }
        
        try {
            const spriteData = JSON.parse(data);
            console.log('✅ Спрайты загружены через API');
            res.json(spriteData);
        } catch (parseError) {
            console.error('❌ Ошибка парсинга JSON:', parseError);
            res.status(500).json({ error: 'Invalid JSON format' });
        }
    });
});

app.use('/img', express.static(path.join(__dirname, 'public', 'img')));

// 🎮 ЯДРО МУЛЬТИПЛЕЕРА
class MultiplayerCore {
    constructor() {
        this.players = new Map();
        this.gameState = {
            objects: [],
            worldTime: 0
        };
        console.log('🎮 Мультиплеер ядро инициализировано');
    }

    addPlayer(playerId, ws) {
        const player = {
            id: playerId,
            ws: ws,
            position: { x: 2, y: 2 },
            state: 'connected',
            lastUpdate: Date.now()
        };
        
        this.players.set(playerId, player);
        console.log(`🎮 Игрок ${playerId} подключился | Всего: ${this.players.size}`);
        return player;
    }

    removePlayer(playerId) {
        this.players.delete(playerId);
        console.log(`🎮 Игрок ${playerId} отключился | Осталось: ${this.players.size}`);
    }

    updatePlayer(playerId, data) {
        const player = this.players.get(playerId);
        if (player) {
            player.position = data.position || player.position;
            player.state = data.state || player.state;
            player.lastUpdate = Date.now();
        }
    }

    getWorldState() {
        return {
            players: Array.from(this.players.values()).map(p => ({
                id: p.id,
                position: p.position,
                state: p.state
            })),
            worldTime: this.gameState.worldTime,
            timestamp: Date.now()
        };
    }

    broadcastWorldState() {
        const worldState = this.getWorldState();
        const message = JSON.stringify({
            type: 'WORLD_STATE',
            data: worldState
        });

        this.players.forEach((player) => {
            if (player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(message);
            }
        });
    }

    startGameLoop() {
        console.log('🔄 Запуск сетевого игрового цикла (20 FPS)...');
        
        setInterval(() => {
            this.gameState.worldTime++;
            this.broadcastWorldState();
            
            if (this.gameState.worldTime % 120 === 0) {
                console.log(`⏰ Сетевое время: ${this.gameState.worldTime} | Игроков: ${this.players.size}`);
            }
        }, 1000 / 20); // 20 FPS для сети
    }
}

// 🎪 СОЗДАЕМ МУЛЬТИПЛЕЕР ЯДРО
const multiplayerCore = new MultiplayerCore();

// 🌐 WEB SOCKET ОБРАБОТКА
wss.on('connection', (ws) => {
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🔌 Новое подключение: ${playerId}`);
    
    const player = multiplayerCore.addPlayer(playerId, ws);

    // Отправляем игроку его ID
    ws.send(JSON.stringify({
        type: 'PLAYER_INIT',
        playerId: playerId,
        worldState: multiplayerCore.getWorldState()
    }));

    // Обработка сообщений
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            
            if (message.type === 'PLAYER_UPDATE') {
                multiplayerCore.updatePlayer(playerId, message.data);
            }
        } catch (error) {
            console.error('❌ Ошибка обработки сообщения:', error);
        }
    });

    ws.on('close', () => {
        multiplayerCore.removePlayer(playerId);
    });

    ws.on('error', (error) => {
        console.error(`💥 Ошибка WebSocket:`, error);
        multiplayerCore.removePlayer(playerId);
    });
});

// 🚀 ЗАПУСК СЕРВЕРА
server.listen(PORT, () => {
    console.log('===================================');
    console.log('🎮 MOD ENGINE MULTIPLAYER SERVER');
    console.log('===================================');
    console.log(`📍 Сервер: http://localhost:${PORT}`);
    console.log(`🌐 WebSocket: ${PORT}`);
    console.log(`🎨 API спрайтов: http://localhost:${PORT}/api/sprites`);
    console.log(`📁 Путь к спрайтам: ${path.join(__dirname, 'public', 'img', 'spr.json')}`);
    console.log('===================================\n');
    
    // Проверяем существование spr.json при запуске
    const spritesPath = path.join(__dirname, 'public', 'img', 'spr.json');
    if (fs.existsSync(spritesPath)) {
        console.log('✅ spr.json найден');
    } else {
        console.log('❌ spr.json НЕ НАЙДЕН!');
        console.log('❌ Проверь путь:', spritesPath);
    }
    
    // Запускаем сетевой цикл
    multiplayerCore.startGameLoop();
});