// public/engine/core.js
import { initGameObjects } from './object.js';
import { initRender } from './render.js';
import { MultiplayerClient } from './multiplayer.js';

// 🎮 ОСНОВНАЯ ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ ИГРЫ
export async function initGame() {
    console.log('🎮 Инициализация игры с мультиплеером...');
    
    try {
        // 🔗 ШАГ 1: ИНИЦИАЛИЗАЦИЯ МУЛЬТИПЛЕЕРА
        const multiplayer = await initializeMultiplayer();
        
        // 🎯 ШАГ 2: ЗАГРУЗКА ИГРОВЫХ ОБЪЕКТОВ
        const gameData = await loadGameData();
        const { mapData, canvas, gridSize, ctx, gameObjects, camera, cameraTarget } = gameData;
        
        // 🔄 ШАГ 3: НАСТРОЙКА СИНХРОНИЗАЦИИ ИГРОКА
        const playerObj = setupPlayerSynchronization(gameObjects, multiplayer);
        
        // 🖼️ ШАГ 4: НАСТРОЙКА РЕНДЕРА С МУЛЬТИПЛЕЕРОМ
        const { render, gameLoop } = initializeMultiplayerRender(
            canvas, ctx, gridSize, gameObjects, camera, cameraTarget, multiplayer
        );
        
        // 🚀 ШАГ 5: ЗАПУСК ИГРЫ
        startGame(render, gameLoop);
        
        console.log('✅ Игра успешно запущена с мультиплеером!');
        
        // 📊 ВОЗВРАЩАЕМ ДАННЫЕ ДЛЯ ОТЛАДКИ
        return {
            multiplayer,
            gameObjects,
            canvas,
            ctx,
            camera,
            cameraTarget
        };
        
    } catch (error) {
        console.error('❌ Критическая ошибка инициализации:', error);
        // 🔄 РЕЗЕРВНЫЙ ЗАПУСК БЕЗ МУЛЬТИПЛЕЕРА
        await initGameFallback();
        return null;
    }
}

// 🔗 ИНИЦИАЛИЗАЦИЯ МУЛЬТИПЛЕЕРА
async function initializeMultiplayer() {
    console.log('🔗 Инициализация мультиплеера...');
    
    const multiplayer = new MultiplayerClient();
    
    try {
        await multiplayer.connect();
        console.log('✅ Мультиплеер успешно подключен');
        
        return multiplayer;
    } catch (error) {
        console.error('❌ Не удалось подключиться к мультиплееру:', error);
        throw new Error('MULTIPLAYER_CONNECTION_FAILED');
    }
}

// 🎯 ЗАГРУЗКА ДАННЫХ ИГРЫ
async function loadGameData() {
    console.log('📦 Загрузка игровых данных...');
    
    try {
        const gameData = await initGameObjects();
        
        if (!gameData || !gameData.gameObjects) {
            throw new Error('Не удалось загрузить игровые объекты');
        }
        
        console.log(`✅ Игровые данные загружены: ${gameData.gameObjects.length} объектов`);
        console.log(`📏 Размер карты: ${gameData.mapData.width}x${gameData.mapData.height}`);
        
        return gameData;
    } catch (error) {
        console.error('❌ Ошибка загрузки игровых данных:', error);
        throw new Error('GAME_DATA_LOAD_FAILED');
    }
}

// 🔄 НАСТРОЙКА СИНХРОНИЗАЦИИ ИГРОКА
function setupPlayerSynchronization(gameObjects, multiplayer) {
    console.log('🔄 Настройка синхронизации игроков...');
    
    const playerObjects = gameObjects.filter(obj => isPlayerObject(obj));
    
    if (playerObjects.length === 0) {
        console.warn('⚠️ В игре не найдены объекты игроков');
        return null;
    }
    
    console.log(`🎯 Найдено игроков: ${playerObjects.length}`);
    
    // 🎯 НАСТРАИВАЕМ СИНХРОНИЗАЦИЮ ДЛЯ КАЖДОГО ИГРОКА
    playerObjects.forEach(playerObj => {
        console.log(`🔄 Настройка синхронизации для: ${playerObj.name}`);
        setupPlayerSpriteSync(playerObj, multiplayer);
    });
    
    // 🔍 ВОЗВРАЩАЕМ ОСНОВНОГО ИГРОКА (ПЕРВОГО С КАМЕРОЙ)
    const mainPlayer = playerObjects.find(player => player.name === 'player') || playerObjects[0];
    
    if (mainPlayer) {
        console.log(`🎮 Основной игрок: ${mainPlayer.name}`);
    }
    
    return mainPlayer;
}

// 🔍 ПРОВЕРКА - ЯВЛЯЕТСЯ ЛИ ОБЪЕКТ ИГРОКОМ
function isPlayerObject(obj) {
    const isPlayer = 
        obj.name === 'player' || 
        obj.name.includes('player') ||
        (obj.instance && obj.instance.setupControls) ||
        (obj.params && (obj.params.spriteName || obj.params.speed !== undefined));
    
    return isPlayer;
}

// 🎨 НАСТРОЙКА СИНХРОНИЗАЦИИ СПРАЙТА ИГРОКА
function setupPlayerSpriteSync(playerObj, multiplayer) {
    let lastSentPosition = { x: playerObj.x, y: playerObj.y };
    let lastSentSpriteParams = null;
    let lastSentTime = 0;
    const UPDATE_RATE = 100; // ms - частота обновлений
    
    // 📋 ПОЛУЧАЕМ НАЧАЛЬНЫЕ ПАРАМЕТРЫ СПРАЙТА
    if (playerObj.instance && playerObj.instance.getSpriteParams) {
        lastSentSpriteParams = playerObj.instance.getSpriteParams();
        console.log(`🎨 Начальные параметры спрайта для ${playerObj.name}:`, lastSentSpriteParams);
    } else {
        console.warn(`⚠️ Объект ${playerObj.name} не имеет метода getSpriteParams`);
    }

    // 💾 СОХРАНЯЕМ ОРИГИНАЛЬНЫЙ МЕТОД ОБНОВЛЕНИЯ
    const originalUpdate = playerObj.updatePosition;
    
    if (!originalUpdate) {
        console.warn(`⚠️ Объект ${playerObj.name} не имеет метода updatePosition`);
        return;
    }
    
    // 🔄 ПЕРЕОПРЕДЕЛЯЕМ МЕТОД ОБНОВЛЕНИЯ ДЛЯ СИНХРОНИЗАЦИИ
    playerObj.updatePosition = function() {
        // 🎯 ВЫЗЫВАЕМ ОРИГИНАЛЬНОЕ ОБНОВЛЕНИЕ
        const changed = originalUpdate.call(this);
        const now = Date.now();
        
        // 📊 ПОЛУЧАЕМ ТЕКУЩИЕ ПАРАМЕТРЫ СПРАЙТА
        let currentSpriteParams = null;
        if (playerObj.instance && playerObj.instance.getSpriteParams) {
            currentSpriteParams = playerObj.instance.getSpriteParams();
        }
        
        // 🔄 ОБНОВЛЯЕМ НАПРАВЛЕНИЕ ДВИЖЕНИЯ СПРАЙТА
        if (currentSpriteParams) {
            updateSpriteDirection(playerObj, currentSpriteParams, lastSentPosition);
        }
        
        // 📤 ПРОВЕРЯЕМ НЕОБХОДИМОСТЬ ОТПРАВКИ ОБНОВЛЕНИЯ
        const shouldSendUpdate = shouldSendPlayerUpdate(
            playerObj, 
            currentSpriteParams, 
            lastSentPosition, 
            lastSentSpriteParams, 
            changed, 
            now, 
            lastSentTime, 
            UPDATE_RATE
        );
        
        if (shouldSendUpdate) {
            sendPlayerUpdateToServer(
                multiplayer, 
                playerObj, 
                currentSpriteParams, 
                changed
            );
            
            // 💾 ОБНОВЛЯЕМ ПОСЛЕДНИЕ ОТПРАВЛЕННЫЕ ДАННЫЕ
            lastSentPosition = { x: playerObj.x, y: playerObj.y };
            lastSentSpriteParams = currentSpriteParams ? {...currentSpriteParams} : null;
            lastSentTime = now;
        }
        
        return changed;
    };
    
    console.log(`✅ Синхронизация настроена для: ${playerObj.name}`);
}

// 🧭 ОБНОВЛЕНИЕ НАПРАВЛЕНИЯ СПРАЙТА ПО ДВИЖЕНИЮ
function updateSpriteDirection(playerObj, spriteParams, lastPosition) {
    // 🎯 ОПРЕДЕЛЯЕМ НАПРАВЛЕНИЕ ДВИЖЕНИЯ ПО ГОРИЗОНТАЛИ
    if (playerObj.x > lastPosition.x) {
        // ➡️ ДВИЖЕНИЕ ВПРАВО - СБРАСЫВАЕМ ОТРАЖЕНИЕ
        spriteParams.flipX = false;
    } else if (playerObj.x < lastPosition.x) {
        // ⬅️ ДВИЖЕНИЕ ВЛЕВО - ВКЛЮЧАЕМ ОТРАЖЕНИЕ
        spriteParams.flipX = true;
    }
    
    // 🎞️ СМЕНА АНИМАЦИИ ПО СОСТОЯНИЮ ДВИЖЕНИЯ
    if (playerObj.instance && playerObj.instance.setAnimation) {
        const isMoving = playerObj.x !== lastPosition.x || playerObj.y !== lastPosition.y;
        
        if (isMoving) {
            playerObj.instance.setAnimation('walk');
        } else {
            playerObj.instance.setAnimation('idle');
        }
    }
}

// 📤 ПРОВЕРКА НЕОБХОДИМОСТИ ОТПРАВКИ ОБНОВЛЕНИЯ
function shouldSendPlayerUpdate(
    playerObj, 
    currentSpriteParams, 
    lastSentPosition, 
    lastSentSpriteParams, 
    positionChanged, 
    currentTime, 
    lastSentTime, 
    updateRate
) {
    // ⏰ ПРОВЕРЯЕМ ВРЕМЯ С ПОСЛЕДНЕГО ОБНОВЛЕНИЯ
    const timeElapsed = currentTime - lastSentTime;
    if (timeElapsed < updateRate) {
        return false;
    }
    
    // 📍 ПРОВЕРЯЕМ ИЗМЕНЕНИЕ ПОЗИЦИИ
    const hasPositionChanged = playerObj.x !== lastSentPosition.x || playerObj.y !== lastSentPosition.y;
    
    // 🎨 ПРОВЕРЯЕМ ИЗМЕНЕНИЕ ПАРАМЕТРОВ СПРАЙТА
    const spriteChanged = hasSpriteChanged(currentSpriteParams, lastSentSpriteParams);
    
    // 📤 ОТПРАВЛЯЕМ ЕСЛИ ЧТО-ТО ИЗМЕНИЛОСЬ
    return hasPositionChanged || spriteChanged || positionChanged;
}

// 🔄 ПРОВЕРКА ИЗМЕНЕНИЯ ПАРАМЕТРОВ СПРАЙТА
function hasSpriteChanged(current, previous) {
    if (!current && !previous) return false;
    if (!current || !previous) return true;
    
    return current.spriteName !== previous.spriteName ||
           current.flipX !== previous.flipX ||
           current.flipY !== previous.flipY ||
           current.opacity !== previous.opacity ||
           current.color !== previous.color ||
           current.animation !== previous.animation;
}

// 📤 ОТПРАВКА ОБНОВЛЕНИЯ ИГРОКА НА СЕРВЕР
function sendPlayerUpdateToServer(multiplayer, playerObj, spriteParams, isMoving) {
    const updateData = {
        position: { 
            x: Math.round(playerObj.x * 100) / 100, // 🎯 ОКРУГЛЯЕМ ДЛЯ ТОЧНОСТИ
            y: Math.round(playerObj.y * 100) / 100,
            size: playerObj.size 
        },
        state: { 
            moving: isMoving,
            timestamp: Date.now() 
        },
        spriteParams: spriteParams
    };
    
    multiplayer.sendPlayerUpdate(
        updateData.position,
        updateData.state,
        updateData.spriteParams
    );
}

// 🖼️ ИНИЦИАЛИЗАЦИЯ РЕНДЕРА С МУЛЬТИПЛЕЕРОМ
function initializeMultiplayerRender(canvas, ctx, gridSize, gameObjects, camera, cameraTarget, multiplayer) {
    console.log('🖼️ Инициализация рендера с мультиплеером...');
    
    return initAdvancedMultiplayerRender(
        canvas, ctx, gridSize, gameObjects, camera, cameraTarget, multiplayer
    );
}

// 🖼️ РАСШИРЕННЫЙ РЕНДЕР С МУЛЬТИПЛЕЕРОМ
function initAdvancedMultiplayerRender(canvas, ctx, gridSize, gameObjects, camera, cameraTarget, multiplayer) {
    let lastTime = performance.now();
    let frameCount = 0;
    let lastFpsUpdate = performance.now();
    let fps = 0;
    
    // 🎨 ФУНКЦИЯ ОТРИСОВКИ КАДРА
    function render() {
        // 🧹 ОЧИСТКА ХОЛСТА
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        
        // 📷 ПРИМЕНЕНИЕ КАМЕРЫ
        applyCameraTransform(ctx, camera, cameraTarget, gridSize);
        
        // 🎯 ОТРИСОВКА СЕТКИ
        drawGameGrid(ctx, canvas, gridSize);
        
        // 🎮 ОТРИСОВКА ЛОКАЛЬНЫХ ОБЪЕКТОВ
        renderLocalGameObjects(ctx, gridSize, gameObjects);
        
        // 👥 ОТРИСОВКА УДАЛЕННЫХ ИГРОКОВ
        multiplayer.renderRemotePlayers(ctx, gridSize);
        
        ctx.restore();
        
        // 📊 ОТРИСОВКА ИНФОРМАЦИИ ПОВЕРХ ВСЕГО
        renderOverlayInfo(ctx, multiplayer, gameObjects, fps);
        
        // 🔢 ОБНОВЛЕНИЕ СЧЕТЧИКА КАДРОВ
        frameCount++;
    }
    
    // 🔄 ИГРОВОЙ ЦИКЛ
    function gameLoop(currentTime = performance.now()) {
        // ⏱️ ВЫЧИСЛЯЕМ DELTA TIME
        const deltaTime = calculateDeltaTime(currentTime, lastTime);
        lastTime = currentTime;
        
        // 🔄 ОБНОВЛЕНИЕ ИНТЕРПОЛЯЦИИ УДАЛЕННЫХ ИГРОКОВ
        multiplayer.updateRemotePlayers(deltaTime);
        
        // 🎯 ОБНОВЛЕНИЕ ЛОКАЛЬНЫХ ОБЪЕКТОВ
        updateAllGameObjects(gameObjects, deltaTime);
        
        // 🖼️ ОТРИСОВКА КАДРА
        render();
        
        // 📊 ОБНОВЛЕНИЕ FPS
        updateFPS(currentTime);
        
        // 🔁 ЗАПРОС СЛЕДУЮЩЕГО КАДРА
        requestAnimationFrame(gameLoop);
    }
    
    // 📷 ПРИМЕНЕНИЕ ТРАНСФОРМАЦИЙ КАМЕРЫ
    function applyCameraTransform(ctx, camera, cameraTarget, gridSize) {
        if (camera && cameraTarget) {
            camera.update(cameraTarget.x, cameraTarget.y, cameraTarget.size, gridSize);
            camera.apply(ctx);
        }
    }
    
    // 🎯 ОТРИСОВКА ИГРОВОЙ СЕТКИ
    function drawGameGrid(ctx, canvas, gridSize) {
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = 0.5;
        
        // 📏 ВЕРТИКАЛЬНЫЕ ЛИНИИ
        for (let x = 0; x <= canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        
        // 📐 ГОРИЗОНТАЛЬНЫЕ ЛИНИИ
        for (let y = 0; y <= canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }
    
    // 🎮 ОТРИСОВКА ЛОКАЛЬНЫХ ИГРОВЫХ ОБЪЕКТОВ
    function renderLocalGameObjects(ctx, gridSize, gameObjects) {
        gameObjects.forEach(obj => {
            if (obj.instance && obj.instance.draw) {
                try {
                    obj.instance.draw(ctx, obj.x, obj.y, gridSize);
                } catch (error) {
                    console.error(`💥 Ошибка отрисовки объекта ${obj.name}:`, error);
                }
            }
        });
    }
    
    // 📊 ОТРИСОВКА ИНФОРМАЦИИ ПОВЕРХ ИГРЫ
    function renderOverlayInfo(ctx, multiplayer, gameObjects, currentFps) {
        const remotePlayers = multiplayer.getRemotePlayers();
        const localPlayers = gameObjects.filter(obj => isPlayerObject(obj)).length;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(5, 5, 200, 80);
        
        ctx.fillStyle = '#00ff00';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        
        ctx.fillText(`FPS: ${currentFps}`, 10, 20);
        ctx.fillText(`Игроков: ${localPlayers} лок. + ${remotePlayers.length} уд.`, 10, 35);
        ctx.fillText(`Подключение: ${multiplayer.isConnected() ? '✅' : '❌'}`, 10, 50);
        ctx.fillText(`ID: ${multiplayer.getPlayerId() || 'Нет'}`, 10, 65);
        
        // 🎯 ОТЛАДОЧНАЯ ИНФОРМАЦИЯ О СПРАЙТАХ
        if (remotePlayers.length > 0) {
            const loadedSprites = remotePlayers.filter(p => 
                p.spriteParams && multiplayer.spriteCache && multiplayer.spriteCache.get(p.spriteParams.spriteName)
            ).length;
            
            ctx.fillText(`Спрайты: ${loadedSprites}/${remotePlayers.length}`, 10, 80);
        }
    }
    
    // ⏱️ ВЫЧИСЛЕНИЕ DELTA TIME
    function calculateDeltaTime(currentTime, lastTime) {
        return (currentTime - lastTime) / 1000;
    }
    
    // 🎯 ОБНОВЛЕНИЕ ВСЕХ ИГРОВЫХ ОБЪЕКТОВ
    function updateAllGameObjects(gameObjects, deltaTime) {
        gameObjects.forEach(obj => {
            // 🔄 ОБНОВЛЕНИЕ ПОЗИЦИИ
            if (obj.updatePosition) {
                try {
                    obj.updatePosition();
                } catch (error) {
                    console.error(`💥 Ошибка обновления позиции ${obj.name}:`, error);
                }
            }
            
            // 🎞️ ОБНОВЛЕНИЕ АНИМАЦИИ
            if (obj.instance && obj.instance.update) {
                try {
                    obj.instance.update(deltaTime);
                } catch (error) {
                    console.error(`💥 Ошибка обновления анимации ${obj.name}:`, error);
                }
            }
        });
    }
    
    // 📊 ОБНОВЛЕНИЕ СЧЕТЧИКА FPS
    function updateFPS(currentTime) {
        if (currentTime - lastFpsUpdate >= 1000) {
            fps = Math.round((frameCount * 1000) / (currentTime - lastFpsUpdate));
            frameCount = 0;
            lastFpsUpdate = currentTime;
        }
    }
    
    console.log('✅ Расширенный рендер инициализирован');
    return { render, gameLoop };
}

// 🚀 ЗАПУСК ИГРОВОГО ЦИКЛА
function startGame(render, gameLoop) {
    console.log('🚀 Запуск игрового цикла...');
    
    // 🖼️ ПЕРВОНАЧАЛЬНАЯ ОТРИСОВКА
    render();
    
    // 🔁 ЗАПУСК ИГРОВОГО ЦИКЛА
    gameLoop();
    
    console.log('✅ Игровой цикл запущен');
}

// 🔄 РЕЗЕРВНЫЙ ЗАПУСК БЕЗ МУЛЬТИПЛЕЕРА
async function initGameFallback() {
    console.log('🔄 Запуск в оффлайн режиме...');
    
    try {
        const gameData = await initGameObjects();
        const { canvas, ctx, gridSize, gameObjects, camera, cameraTarget } = gameData;
        
        const { render, gameLoop } = initRender(canvas, ctx, gridSize, gameObjects, camera, cameraTarget);
        
        render();
        gameLoop();
        
        console.log('✅ Оффлайн игра успешно запущена');
        
        // 🚨 ПОКАЗЫВАЕМ ПРЕДУПРЕЖДЕНИЕ
        showOfflineWarning();
        
    } catch (error) {
        console.error('💥 Критическая ошибка при запуске оффлайн режима:', error);
        showCriticalError(error);
    }
}

// ⚠️ ПОКАЗ ПРЕДУПРЕЖДЕНИЯ ОБ ОФФЛАЙН РЕЖИМЕ
function showOfflineWarning() {
    const warningDiv = document.createElement('div');
    warningDiv.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(255, 165, 0, 0.9);
        color: white;
        padding: 10px 15px;
        border-radius: 5px;
        font-family: Arial, sans-serif;
        font-size: 12px;
        z-index: 10000;
        max-width: 300px;
    `;
    warningDiv.innerHTML = `
        <strong>⚠️ Оффлайн режим</strong><br>
        Мультиплеер недоступен<br>
        Игра работает в одиночном режиме
    `;
    document.body.appendChild(warningDiv);
    
    // 🕐 АВТОМАТИЧЕСКОЕ СКРЫТИЕ ЧЕРЕЗ 5 СЕКУНД
    setTimeout(() => {
        if (warningDiv.parentNode) {
            warningDiv.parentNode.removeChild(warningDiv);
        }
    }, 5000);
}

// 🚨 ПОКАЗ КРИТИЧЕСКОЙ ОШИБКИ
function showCriticalError(error) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 0, 0, 0.95);
        color: white;
        padding: 30px;
        border-radius: 10px;
        text-align: center;
        z-index: 10000;
        font-family: Arial, sans-serif;
        max-width: 500px;
        box-shadow: 0 0 20px rgba(0,0,0,0.5);
    `;
    errorDiv.innerHTML = `
        <h2 style="margin: 0 0 15px 0;">🚨 Ошибка запуска игры</h2>
        <p style="margin: 0 0 20px 0; font-size: 14px;">
            Не удалось запустить игру. Пожалуйста, обновите страницу.<br>
            <small>${error.message}</small>
        </p>
        <button onclick="location.reload()" style="
            padding: 10px 20px; 
            background: white; 
            color: red; 
            border: none; 
            border-radius: 5px; 
            cursor: pointer;
            font-weight: bold;
        ">
            🔄 Обновить страницу
        </button>
    `;
    document.body.appendChild(errorDiv);
}

// 🎯 ЭКСПОРТ ВСПОМОГАТЕЛЬНЫХ ФУНКЦИЙ ДЛЯ ОТЛАДКИ
export const CoreDebug = {
    initializeMultiplayer,
    loadGameData,
    setupPlayerSynchronization,
    initializeMultiplayerRender,
    startGame,
    isPlayerObject,
    setupPlayerSpriteSync,
    updateSpriteDirection,
    hasSpriteChanged,
    sendPlayerUpdateToServer,
    initGameFallback
};

// 🌐 ГЛОБАЛЬНЫЙ ДОСТУП ДЛЯ ОТЛАДКИ В БРАУЗЕРЕ
if (typeof window !== 'undefined') {
    window.GameCore = {
        initGame,
        CoreDebug
    };
}