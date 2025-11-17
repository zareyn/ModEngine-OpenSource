// public/engine/multiplayer.js
export class MultiplayerClient {
    constructor() {
        this.ws = null;
        this.playerId = null;
        this.connected = false;
        this.remotePlayers = new Map();
        this.onWorldUpdate = null;
        this.lastUpdateTime = 0;
        this.gridSize = 32; // ← ДОБАВИЛИ РАЗМЕР СЕТКИ
    }

    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const serverUrl = `${protocol}//${window.location.host}`;
        
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(serverUrl);
            
            this.ws.onopen = () => {
                this.connected = true;
                this.lastUpdateTime = Date.now();
                console.log('✅ Подключено к мультиплееру');
                resolve();
            };
            
            this.ws.onmessage = (event) => {
                this.handleMessage(JSON.parse(event.data));
            };
            
            this.ws.onclose = () => {
                this.connected = false;
                console.log('❌ Отключено от сервера');
            };
            
            this.ws.onerror = (error) => {
                reject(error);
            };
        });
    }

    handleMessage(message) {
        switch (message.type) {
            case 'PLAYER_INIT':
                this.playerId = message.playerId;
                console.log(`🎮 Мой ID: ${this.playerId}`);
                this.syncWorldState(message.worldState);
                break;
                
            case 'WORLD_STATE':
                this.syncWorldState(message.data);
                break;
        }
    }

    syncWorldState(worldState) {
        const now = Date.now();
        const deltaTime = (now - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = now;

        // Обновляем удаленных игроков с интерполяцией
        worldState.players.forEach(serverPlayer => {
            if (serverPlayer.id !== this.playerId) {
                this.updateRemotePlayer(serverPlayer, deltaTime);
            }
        });

        // Удаляем отключившихся игроков
        this.cleanupDisconnectedPlayers(worldState.players);

        if (this.onWorldUpdate) {
            this.onWorldUpdate(worldState);
        }
    }

    updateRemotePlayer(serverPlayer, deltaTime) {
        let remotePlayer = this.remotePlayers.get(serverPlayer.id);
        
        if (!remotePlayer) {
            // Новый игрок
            remotePlayer = {
                ...serverPlayer,
                displayPosition: { ...serverPlayer.position },
                lastServerPosition: { ...serverPlayer.position },
                lastServerTime: Date.now(),
                interpolationTime: 0
            };
            console.log(`👤 Новый игрок: ${serverPlayer.id} at (${serverPlayer.position.x}, ${serverPlayer.position.y})`);
        } else {
            // Обновляем существующего игрока
            remotePlayer.lastServerPosition = { ...remotePlayer.displayPosition };
            remotePlayer.position = serverPlayer.position;
            remotePlayer.state = serverPlayer.state;
            remotePlayer.lastServerTime = Date.now();
            remotePlayer.interpolationTime = 0;
        }

        this.remotePlayers.set(serverPlayer.id, remotePlayer);
    }

    cleanupDisconnectedPlayers(currentPlayers) {
        const currentPlayerIds = new Set(currentPlayers.map(p => p.id));
        
        this.remotePlayers.forEach((player, playerId) => {
            if (!currentPlayerIds.has(playerId)) {
                console.log(`👤 Игрок отключился: ${playerId}`);
                this.remotePlayers.delete(playerId);
            }
        });
    }

    // Интерполяция позиций для плавности
    updateRemotePlayers(deltaTime) {
        this.remotePlayers.forEach((player) => {
            player.interpolationTime += deltaTime;
            
            const interpolationSpeed = 6.0;
            const t = Math.min(player.interpolationTime * interpolationSpeed, 1.0);
            
            player.displayPosition.x = this.lerp(
                player.lastServerPosition.x, 
                player.position.x, 
                t
            );
            player.displayPosition.y = this.lerp(
                player.lastServerPosition.y, 
                player.position.y, 
                t
            );
        });
    }

    lerp(start, end, t) {
        return start * (1 - t) + end * t;
    }

    sendPlayerUpdate(position, state = {}, spriteParams = null) {
        if (!this.connected) return;
        
        this.ws.send(JSON.stringify({
            type: 'PLAYER_UPDATE',
            data: { 
                position, 
                state, 
                spriteParams,
                timestamp: Date.now() 
            }
        }));
    }

    onWorldUpdate(callback) {
        this.onWorldUpdate = callback;
    }

    getRemotePlayers() {
        return Array.from(this.remotePlayers.values());
    }

    isConnected() {
        return this.connected;
    }

    // НОВЫЙ МЕТОД: преобразование мировых координат
    worldToScreen(worldX, worldY, camera) {
        if (!camera) return { x: worldX * this.gridSize, y: worldY * this.gridSize };
        
        const viewport = camera.getViewport();
        const screenX = (worldX * this.gridSize) - viewport.x;
        const screenY = (worldY * this.gridSize) - viewport.y;
        
        return { x: screenX, y: screenY };
    }
}