// public/engine/multiplayer.js
export class MultiplayerClient {
    constructor() {
        this.ws = null;
        this.playerId = null;
        this.connected = false;
        this.remotePlayers = new Map();
        this.onWorldUpdate = null;
        this.lastUpdateTime = 0;
        this.spriteCache = new Map(); // Кеш для спрайтов удаленных игроков
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
    }

    // 🔗 ПОДКЛЮЧЕНИЕ К СЕРВЕРУ
    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const serverUrl = `${protocol}//${window.location.host}`;
        
        return new Promise((resolve, reject) => {
            console.log(`🔗 Подключаюсь к серверу: ${serverUrl}`);
            
            this.ws = new WebSocket(serverUrl);
            
            this.ws.onopen = () => {
                this.connected = true;
                this.lastUpdateTime = Date.now();
                this.reconnectAttempts = 0;
                console.log('✅ Успешно подключено к мультиплееру');
                resolve();
            };
            
            this.ws.onmessage = (event) => {
                this.handleMessage(JSON.parse(event.data));
            };
            
            this.ws.onclose = (event) => {
                this.connected = false;
                console.log(`❌ Соединение закрыто: ${event.code} ${event.reason}`);
                
                // 🔄 ПЫТАЕМСЯ ПЕРЕПОДКЛЮЧИТЬСЯ
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.attemptReconnect();
                } else {
                    console.log('💥 Превышено количество попыток переподключения');
                }
            };
            
            this.ws.onerror = (error) => {
                console.error('💥 Ошибка WebSocket:', error);
                this.connected = false;
                reject(error);
            };
        });
    }

    // 🔄 ПОПЫТКА ПЕРЕПОДКЛЮЧЕНИЯ
    attemptReconnect() {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * this.reconnectAttempts;
        
        console.log(`🔄 Попытка переподключения ${this.reconnectAttempts}/${this.maxReconnectAttempts} через ${delay}ms`);
        
        setTimeout(() => {
            if (!this.connected) {
                this.connect().catch(console.error);
            }
        }, delay);
    }

    // 📨 ОБРАБОТКА ВХОДЯЩИХ СООБЩЕНИЙ
    handleMessage(message) {
        try {
            switch (message.type) {
                case 'PLAYER_INIT':
                    this.handlePlayerInit(message);
                    break;
                    
                case 'WORLD_STATE':
                    this.handleWorldState(message);
                    break;
                    
                case 'PLAYER_JOINED':
                    this.handlePlayerJoined(message);
                    break;
                    
                case 'PLAYER_LEFT':
                    this.handlePlayerLeft(message);
                    break;
                    
                default:
                    console.warn('⚠️ Неизвестный тип сообщения:', message.type);
            }
        } catch (error) {
            console.error('💥 Ошибка обработки сообщения:', error, message);
        }
    }

    // 🎯 ОБРАБОТКА ИНИЦИАЛИЗАЦИИ ИГРОКА
    handlePlayerInit(message) {
        this.playerId = message.playerId;
        console.log(`🎮 Мой ID: ${this.playerId}`);
        this.syncWorldState(message.worldState);
        
        // 🔔 УВЕДОМЛЯЕМ О УСПЕШНОЙ ИНИЦИАЛИЗАЦИИ
        if (this.onWorldUpdate) {
            this.onWorldUpdate({ type: 'PLAYER_INIT', playerId: this.playerId });
        }
    }

    // 🌍 ОБРАБОТКА СОСТОЯНИЯ МИРА
    handleWorldState(message) {
        this.syncWorldState(message.data);
    }

    // 👤 ОБРАБОТКА ПОДКЛЮЧЕНИЯ НОВОГО ИГРОКА
    handlePlayerJoined(message) {
        console.log(`👤 Новый игрок подключился: ${message.playerId}`);
        
        // ДОБАВЛЯЕМ ИГРОКА В СПИСОК
        const remotePlayer = {
            id: message.playerId,
            position: message.position || { x: 0, y: 0, size: 1 },
            state: 'connected',
            displayPosition: { ...(message.position || { x: 0, y: 0 }) },
            lastServerPosition: { ...(message.position || { x: 0, y: 0 }) },
            lastServerTime: Date.now(),
            interpolationTime: 0,
            spriteParams: message.spriteParams || null
        };
        
        this.remotePlayers.set(message.playerId, remotePlayer);
        
        // PRELOAD СПРАЙТА ЕСЛИ ЕСТЬ
        if (remotePlayer.spriteParams && remotePlayer.spriteParams.spriteName) {
            this.preloadSprite(remotePlayer.spriteParams.spriteName);
        }
    }

    // 🚪 ОБРАБОТКА ОТКЛЮЧЕНИЯ ИГРОКА
    handlePlayerLeft(message) {
        console.log(`👤 Игрок отключился: ${message.playerId}`);
        this.remotePlayers.delete(message.playerId);
    }

    // 🔄 СИНХРОНИЗАЦИЯ СОСТОЯНИЯ МИРА
    syncWorldState(worldState) {
        const now = Date.now();
        const deltaTime = (now - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = now;

        // 🎯 ОБНОВЛЯЕМ ДАННЫЕ УДАЛЕННЫХ ИГРОКОВ
        if (worldState.players && Array.isArray(worldState.players)) {
            worldState.players.forEach(serverPlayer => {
                if (serverPlayer.id !== this.playerId) {
                    this.updateRemotePlayer(serverPlayer, deltaTime);
                }
            });

            // 🧹 ОЧИЩАЕМ ОТКЛЮЧИВШИХСЯ ИГРОКОВ
            this.cleanupDisconnectedPlayers(worldState.players);
        }

        // 🔔 ВЫЗЫВАЕМ КОЛБЭК ОБНОВЛЕНИЯ МИРА
        if (this.onWorldUpdate) {
            this.onWorldUpdate({
                type: 'WORLD_STATE',
                worldState: worldState,
                remotePlayers: this.getRemotePlayers()
            });
        }
    }

    // 👤 ОБНОВЛЕНИЕ ДАННЫХ УДАЛЕННОГО ИГРОКА
    updateRemotePlayer(serverPlayer, deltaTime) {
        let remotePlayer = this.remotePlayers.get(serverPlayer.id);
        
        if (!remotePlayer) {
            // 🆕 СОЗДАЕМ НОВОГО ИГРОКА
            remotePlayer = this.createNewRemotePlayer(serverPlayer);
            console.log(`👤 Обнаружен новый игрок: ${serverPlayer.id}`);
        } else {
            // 🔄 ОБНОВЛЯЕМ СУЩЕСТВУЮЩЕГО ИГРОКА
            this.updateExistingRemotePlayer(remotePlayer, serverPlayer);
        }

        this.remotePlayers.set(serverPlayer.id, remotePlayer);
    }

    // 🆕 СОЗДАНИЕ НОВОГО УДАЛЕННОГО ИГРОКА
    createNewRemotePlayer(serverPlayer) {
        const remotePlayer = {
            ...serverPlayer,
            displayPosition: { ...serverPlayer.position },
            lastServerPosition: { ...serverPlayer.position },
            lastServerTime: Date.now(),
            interpolationTime: 0,
            spriteParams: serverPlayer.spriteParams || null
        };
        
        // 🖼️ PRELOAD СПРАЙТА ДЛЯ НОВОГО ИГРОКА
        if (remotePlayer.spriteParams && remotePlayer.spriteParams.spriteName) {
            this.preloadSprite(remotePlayer.spriteParams.spriteName);
        }
        
        return remotePlayer;
    }

    // 🔄 ОБНОВЛЕНИЕ СУЩЕСТВУЮЩЕГО ИГРОКА
    updateExistingRemotePlayer(remotePlayer, serverPlayer) {
        // 💾 СОХРАНЯЕМ ПРЕДЫДУЩУЮ ПОЗИЦИЮ ДЛЯ ИНТЕРПОЛЯЦИИ
        remotePlayer.lastServerPosition = { ...remotePlayer.position };
        
        // 🔄 ОБНОВЛЯЕМ ДАННЫЕ
        remotePlayer.position = serverPlayer.position;
        remotePlayer.state = serverPlayer.state || remotePlayer.state;
        remotePlayer.lastServerTime = Date.now();
        remotePlayer.interpolationTime = 0;
        
        // 🎨 ОБНОВЛЯЕМ ПАРАМЕТРЫ СПРАЙТА ЕСЛИ ИЗМЕНИЛИСЬ
        if (serverPlayer.spriteParams) {
            const oldSprite = remotePlayer.spriteParams?.spriteName;
            const newSprite = serverPlayer.spriteParams.spriteName;
            
            remotePlayer.spriteParams = serverPlayer.spriteParams;
            
            // ЕСЛИ СПРАЙТ ИЗМЕНИЛСЯ - PRELOAD НОВОГО
            if (newSprite && oldSprite !== newSprite) {
                this.preloadSprite(newSprite);
            }
        }
    }

    // 🧹 ОЧИСТКА ОТКЛЮЧИВШИХСЯ ИГРОКОВ
    cleanupDisconnectedPlayers(currentPlayers) {
        const currentPlayerIds = new Set(currentPlayers.map(p => p.id));
        
        this.remotePlayers.forEach((player, playerId) => {
            if (!currentPlayerIds.has(playerId)) {
                console.log(`👤 Игрок покинул игру: ${playerId}`);
                this.remotePlayers.delete(playerId);
            }
        });
    }

    // 🖼️ PRELOAD СПРАЙТОВ ДЛЯ УДАЛЕННЫХ ИГРОКОВ
    preloadSprite(spriteName) {
        // 🚫 ПРОВЕРЯЕМ КЕШ
        if (this.spriteCache.has(spriteName)) {
            return;
        }
        
        console.log(`🖼️ Preload спрайта: ${spriteName}`);
        
        // 🎯 ЗАГРУЖАЕМ ДАННЫЕ СПРАЙТА
        fetch('/api/sprites')
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .then(spriteData => {
                const sprite = spriteData[spriteName];
                if (sprite && sprite.imagePath) {
                    const img = new Image();
                    
                    img.onload = () => {
                        this.spriteCache.set(spriteName, img);
                        console.log(`✅ Спрайт загружен: ${spriteName}`);
                    };
                    
                    img.onerror = () => {
                        console.warn(`❌ Не удалось загрузить спрайт: ${spriteName}`);
                        this.spriteCache.set(spriteName, null); // Помечаем как неудачную загрузку
                    };
                    
                    img.src = `/img/${sprite.imagePath}`;
                } else {
                    console.warn(`⚠️ Спрайт не найден в данных: ${spriteName}`);
                    this.spriteCache.set(spriteName, null);
                }
            })
            .catch(error => {
                console.warn('⚠️ Ошибка загрузки данных спрайтов:', error);
                this.spriteCache.set(spriteName, null);
            });
    }

    // 📤 ОТПРАВКА ОБНОВЛЕНИЯ ПОЗИЦИИ ИГРОКА
    sendPlayerUpdate(position, state = {}, spriteParams = null) {
        if (!this.connected) {
            console.warn('⚠️ Не подключено к серверу, не могу отправить обновление');
            return;
        }
        
        const message = {
            type: 'PLAYER_UPDATE',
            data: { 
                position, 
                state, 
                spriteParams,
                timestamp: Date.now() 
            }
        };
        
        try {
            this.ws.send(JSON.stringify(message));
        } catch (error) {
            console.error('💥 Ошибка отправки сообщения:', error);
        }
    }

    // 🔄 ОБНОВЛЕНИЕ ИНТЕРПОЛЯЦИИ УДАЛЕННЫХ ИГРОКОВ
    updateRemotePlayers(deltaTime) {
        this.remotePlayers.forEach((player) => {
            player.interpolationTime += deltaTime;
            
            // 🎯 ИНТЕРПОЛЯЦИЯ К ЦЕЛЕВОЙ ПОЗИЦИИ
            const interpolationSpeed = 8.0;
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

    // 📐 ЛИНЕЙНАЯ ИНТЕРПОЛЯЦИЯ
    lerp(start, end, t) {
        return start * (1 - t) + end * t;
    }

    // 🎨 ОТРИСОВКА УДАЛЕННЫХ ИГРОКОВ СО СПРАЙТАМИ
    renderRemotePlayers(ctx, gridSize) {
        this.remotePlayers.forEach((remotePlayer) => {
            const displayX = remotePlayer.displayPosition?.x || remotePlayer.position.x;
            const displayY = remotePlayer.displayPosition?.y || remotePlayer.position.y;
            const size = remotePlayer.position.size || 1;
            
            // 🎯 ПРИОРИТЕТ: ОТРИСОВКА СПРАЙТА ИГРОКА
            if (remotePlayer.spriteParams && remotePlayer.spriteParams.spriteName) {
                const spriteImg = this.spriteCache.get(remotePlayer.spriteParams.spriteName);
                
                if (spriteImg && spriteImg.complete && spriteImg.naturalWidth !== 0) {
                    // ✅ СПРАЙТ ЗАГРУЖЕН - РИСУЕМ СПРАЙТ
                    this.renderRemotePlayerWithSprite(ctx, displayX, displayY, size, gridSize, remotePlayer, spriteImg);
                } else {
                    // ⏳ СПРАЙТ ЗАГРУЖАЕТСЯ - ПОКАЗЫВАЕМ ИНФОРМАЦИЮ
                    this.renderRemotePlayerLoading(ctx, displayX, displayY, size, gridSize, remotePlayer);
                }
            } else {
                // ❌ НЕТ ДАННЫХ О СПРАЙТЕ - FALLBACK
                this.renderRemotePlayerFallback(ctx, displayX, displayY, size, gridSize, remotePlayer);
            }
            
            // ℹ️ ИНФОРМАЦИЯ ОБ ИГРОКЕ (ВСЕГДА СВЕРХУ)
            this.renderPlayerInfo(ctx, displayX, displayY, size, gridSize, remotePlayer);
        });
    }

    // 🖼️ ОТРИСОВКА УДАЛЕННОГО ИГРОКА СО СПРАЙТОМ
    renderRemotePlayerWithSprite(ctx, x, y, size, gridSize, remotePlayer, spriteImg) {
        ctx.save();
        
        const width = size * gridSize;
        const height = size * gridSize;
        
        // 🎯 ПРИМЕНЯЕМ ПАРАМЕТРЫ СПРАЙТА
        ctx.globalAlpha = remotePlayer.spriteParams.opacity || 1;
        
        // 🔄 ТРАНСФОРМАЦИИ ДЛЯ ОТРАЖЕНИЯ
        if (remotePlayer.spriteParams.flipX || remotePlayer.spriteParams.flipY) {
            ctx.translate(
                remotePlayer.spriteParams.flipX ? (x * gridSize + width) : x * gridSize,
                remotePlayer.spriteParams.flipY ? (y * gridSize + height) : y * gridSize
            );
            ctx.scale(
                remotePlayer.spriteParams.flipX ? -1 : 1,
                remotePlayer.spriteParams.flipY ? -1 : 1
            );
            
            ctx.drawImage(spriteImg, 0, 0, width, height);
        } else {
            // 🎯 БЕЗ ТРАНСФОРМАЦИЙ - ПРОСТОЙ RENDER
            ctx.drawImage(spriteImg, x * gridSize, y * gridSize, width, height);
        }
        
        ctx.restore();
    }

    // ⏳ ОТРИСОВКА ИГРОКА ПРИ ЗАГРУЗКЕ СПРАЙТА
    renderRemotePlayerLoading(ctx, x, y, size, gridSize, remotePlayer) {
        const width = size * gridSize;
        const height = size * gridSize;
        
        // 🟦 ФОН ЗАГРУЗКИ
        ctx.fillStyle = 'rgba(0, 100, 255, 0.3)';
        ctx.fillRect(x * gridSize, y * gridSize, width, height);
        
        // 📝 ИНФОРМАЦИЯ О ЗАГРУЗКЕ
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            'Loading...',
            x * gridSize + width / 2,
            y * gridSize + height / 2
        );
        
        // 🎯 РАМКА ЗАГРУЗКИ
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x * gridSize, y * gridSize, width, height);
    }

    // 🟦 FALLBACK ОТРИСОВКА (ЕСЛИ НЕТ ДАННЫХ О СПРАЙТЕ)
    renderRemotePlayerFallback(ctx, x, y, size, gridSize, remotePlayer) {
        const width = size * gridSize;
        const height = size * gridSize;
        
        // 🎨 ИСПОЛЬЗУЕМ ЦВЕТ ИЗ ПАРАМЕТРОВ ИГРОКА ИЛИ СИНИЙ
        const playerColor = remotePlayer.spriteParams?.color || '#0066ff';
        ctx.fillStyle = playerColor;
        ctx.fillRect(x * gridSize, y * gridSize, width, height);
        
        // 👤 ИКОНКА ИГРОКА
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            '👤',
            x * gridSize + width / 2,
            y * gridSize + height / 2 + 4
        );
    }

    // ℹ️ ОТРИСОВКА ИНФОРМАЦИИ ОБ ИГРОКЕ
    renderPlayerInfo(ctx, x, y, size, gridSize, remotePlayer) {
        const width = size * gridSize;
        
        // 📛 ИМЯ ИГРОКА (СВЕРХУ)
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            `Player_${remotePlayer.id.substring(7, 12)}`, // Короткий ID
            x * gridSize + width / 2,
            y * gridSize - 8
        );
        
        // 💚 ИНДИКАТОР ПОДКЛЮЧЕНИЯ
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(x * gridSize - 4, y * gridSize - 4, 4, 0, 2 * Math.PI);
        ctx.fill();
    }

    // 📋 ПОЛУЧЕНИЕ СПИСКА УДАЛЕННЫХ ИГРОКОВ
    getRemotePlayers() {
        return Array.from(this.remotePlayers.values());
    }

    // 🔔 УСТАНОВКА КОЛБЭКА ОБНОВЛЕНИЯ МИРА
    onWorldUpdate(callback) {
        this.onWorldUpdate = callback;
    }

    // 🔌 ПРОВЕРКА ПОДКЛЮЧЕНИЯ
    isConnected() {
        return this.connected;
    }

    // 🆔 ПОЛУЧЕНИЕ ID ИГРОКА
    getPlayerId() {
        return this.playerId;
    }

    // 📊 СТАТИСТИКА ПОДКЛЮЧЕНИЯ
    getStats() {
        return {
            connected: this.connected,
            playerId: this.playerId,
            remotePlayers: this.remotePlayers.size,
            spriteCache: this.spriteCache.size,
            reconnectAttempts: this.reconnectAttempts
        };
    }

    // 🗑️ ОЧИСТКА РЕСУРСОВ
    disconnect() {
        if (this.ws) {
            this.ws.close(1000, 'Player disconnected');
        }
        this.connected = false;
        this.remotePlayers.clear();
        this.spriteCache.clear();
        console.log('🔌 Мультиплеер отключен');
    }

    // 🔄 ПЕРЕПОДКЛЮЧЕНИЕ
    reconnect() {
        this.disconnect();
        this.reconnectAttempts = 0;
        return this.connect();
    }
}

// 🎯 СОЗДАНИЕ ГЛОБАЛЬНОГО ЭКЗЕМПЛЯРА ДЛЯ ОТЛАДКИ
if (typeof window !== 'undefined') {
    window.MultiplayerDebug = {
        createClient: () => new MultiplayerClient()
    };
}