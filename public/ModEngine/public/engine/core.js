// public/engine/core.js - ПОЛНЫЙ ИСПРАВЛЕННЫЙ КОД
import { initGameObjects } from './object.js';
import { initRender } from './render.js';
import { MultiplayerClient } from './multiplayer.js';

export async function initGame() {
    console.log('🎮 Инициализация игры с улучшенным мультиплеером...');
    
    try {
        // Инициализация мультиплеера
        const multiplayer = new MultiplayerClient();
        await multiplayer.connect();
        
        // Загрузка игровых объектов
        const { mapData, canvas, gridSize, ctx, gameObjects, camera, cameraTarget } = await initGameObjects();
        
        // Находим игрока для синхронизации
        const playerObj = gameObjects.find(obj => obj.name === 'player');
        
        if (playerObj) {
            console.log('🎯 Игрок найден, настраиваю улучшенную синхронизацию...');
            setupAdvancedPlayerMultiplayer(playerObj, multiplayer);
        }
        
        // Настройка рендера с улучшенным мультиплеером
        const { render, gameLoop } = initAdvancedMultiplayerRender(
            canvas, ctx, gridSize, gameObjects, camera, cameraTarget, multiplayer
        );
        
        // Запуск игры
        render();
        gameLoop();
        
        console.log('✅ Игра запущена с улучшенным мультиплеером!');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        await initGameFallback();
    }
}

// Улучшенная настройка синхронизации игрока
function setupAdvancedPlayerMultiplayer(playerObj, multiplayer) {
    let lastSentPosition = { x: playerObj.x, y: playerObj.y };
    let lastSentTime = 0;
    const UPDATE_RATE = 50; // ms - чаще обновления
    
    // Получаем параметры спрайта игрока
    let spriteParams = null;
    if (playerObj.instance.getSpriteParams) {
        spriteParams = playerObj.instance.getSpriteParams();
    }

    // Отправка обновлений позиции
    const originalUpdate = playerObj.updatePosition;
    playerObj.updatePosition = function() {
        const changed = originalUpdate.call(this);
        const now = Date.now();
        
        // Отправляем обновление если позиция изменилась или прошло достаточно времени
        if (changed || now - lastSentTime > UPDATE_RATE) {
            const positionChanged = this.x !== lastSentPosition.x || this.y !== lastSentPosition.y;
            
            if (positionChanged) {
                // Обновляем параметры спрайта (направление движения)
                if (this.x > lastSentPosition.x) {
                    // Движение вправо
                    if (playerObj.instance.setAnimation) playerObj.instance.setAnimation('walk_right');
                    if (spriteParams) spriteParams.flipX = false;
                } else if (this.x < lastSentPosition.x) {
                    // Движение влево  
                    if (playerObj.instance.setAnimation) playerObj.instance.setAnimation('walk_left');
                    if (spriteParams) spriteParams.flipX = true;
                }
                
                multiplayer.sendPlayerUpdate(
                    { x: this.x, y: this.y, size: this.size },
                    { moving: changed },
                    spriteParams
                );
                
                lastSentPosition = { x: this.x, y: this.y };
            }
            
            lastSentTime = now;
        }
        
        return changed;
    };
}

// Улучшенный рендер с плавными спрайтами и правильной камерой
function initAdvancedMultiplayerRender(canvas, ctx, gridSize, gameObjects, camera, cameraTarget, multiplayer) {
    let lastTime = performance.now();
    
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // ВАЖНО: сохраняем ДО камеры
        ctx.save();
        
        // ПРИМЕНЯЕМ КАМЕРУ ПЕРВЫМ ДЕЛОМ
        if (camera && cameraTarget) {
            camera.update(cameraTarget.x, cameraTarget.y, cameraTarget.size, gridSize);
            camera.apply(ctx);
        }
        
        // Теперь ВСЕ объекты рисуются ВНУТРИ системы координат камеры
        
        // Сетка в мировых координатах
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 0.5;
        
        for (let x = 0; x <= canvas.width * 3; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height * 3);
            ctx.stroke();
        }
        
        for (let y = 0; y <= canvas.height * 3; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width * 3, y);
            ctx.stroke();
        }
        
        // Локальные объекты ВНУТРИ камеры
        gameObjects.forEach(obj => {
            if (obj.instance && obj.instance.draw) {
                // ДЕБАГ: зеленая рамка
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 2;
                ctx.strokeRect(
                    obj.x * gridSize, 
                    obj.y * gridSize, 
                    obj.size * gridSize, 
                    obj.size * gridSize
                );
                
                // Рисуем сам объект ВНУТРИ камеры
                obj.instance.draw(ctx, obj.x, obj.y, gridSize);
                
                // ДЕБАГ: информация
                ctx.fillStyle = 'white';
                ctx.font = '10px Arial';
                ctx.fillText(`${obj.name} (${obj.x},${obj.y})`, obj.x * gridSize, obj.y * gridSize - 5);
            }
        });
        
        // ВАЖНО: удаленные игроки тоже ВНУТРИ камеры
        renderRemotePlayers(ctx, gridSize, multiplayer, camera);
        
        // Восстанавливаем контекст
        ctx.restore();
        
        // ДЕБАГ: информация о камере ПОВЕРХ всего
        if (camera) {
            const viewport = camera.getViewport();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(10, 10, 300, 120);
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.fillText(`Камера: (${viewport.x.toFixed(1)}, ${viewport.y.toFixed(1)})`, 20, 30);
            ctx.fillText(`Размер: ${viewport.width}x${viewport.height}`, 20, 50);
            ctx.fillText(`Локальные: ${gameObjects.length}`, 20, 70);
            ctx.fillText(`Удаленные: ${multiplayer.getRemotePlayers().length}`, 20, 90);
            ctx.fillText(`Всего игроков: ${multiplayer.getRemotePlayers().length + 1}`, 20, 110);
        }
    }
    
    function renderRemotePlayers(ctx, gridSize, multiplayer, camera) {
        multiplayer.getRemotePlayers().forEach(remotePlayer => {
            const displayX = remotePlayer.displayPosition?.x || remotePlayer.position.x;
            const displayY = remotePlayer.displayPosition?.y || remotePlayer.position.y;
            const size = remotePlayer.position.size || 1;
            
            // ВАЖНО: рисуем в МИРОВЫХ координатах (внутри камеры)
            ctx.fillStyle = 'rgba(0, 100, 255, 0.8)';
            ctx.fillRect(
                displayX * gridSize,
                displayY * gridSize,
                size * gridSize,
                size * gridSize
            );
            
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.strokeRect(
                displayX * gridSize,
                displayY * gridSize,
                size * gridSize,
                size * gridSize
            );
            
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(
                `Remote ${remotePlayer.id.substring(7, 11)}`,
                displayX * gridSize + (size * gridSize) / 2,
                displayY * gridSize - 10
            );

            // ДЕБАГ: координаты удаленного игрока
            ctx.fillStyle = 'yellow';
            ctx.font = '10px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`(${displayX.toFixed(1)},${displayY.toFixed(1)})`, 
                displayX * gridSize, 
                displayY * gridSize - 20
            );
        });
    }
    
    function gameLoop(currentTime = performance.now()) {
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        
        // Обновление интерполяции удаленных игроков
        multiplayer.updateRemotePlayers(deltaTime);
        
        // Обновление локальных объектов
        gameObjects.forEach(obj => {
            if (obj.updatePosition) {
                obj.updatePosition();
            }
            // Обновление анимации
            if (obj.instance && obj.instance.update) {
                obj.instance.update(deltaTime);
            }
        });
        
        render();
        requestAnimationFrame(gameLoop);
    }
    
    return { render, gameLoop };
}

// Резервный запуск без мультиплеера
async function initGameFallback() {
    console.log('🔄 Запуск в оффлайн режиме...');
    const { mapData, canvas, gridSize, ctx, gameObjects, camera, cameraTarget } = await initGameObjects();
    const { render, gameLoop } = initRender(canvas, ctx, gridSize, gameObjects, camera, cameraTarget);
    render();
    gameLoop();
}