import { loadObjectData, createObject } from './modul.js';
import { loadMapData } from './map.js';

async function initGame() {
    // Загрузка данных карты и первоначальный рендеринг
    const { mapData, canvas, gridSize, ctx } = await loadMapData();
    
    // Загрузка данных объектов
    const objectData = await loadObjectData();
    
    // Создание игровых объектов
    const gameObjects = [];
    let camera = null;
    let cameraTarget = null;
    
    for (const mapObj of mapData.objects) {
        if (objectData[mapObj.name]) {
            const obj = await createObject(mapObj.name, objectData[mapObj.name]);
            if (obj) {
                const gameObj = {
                    ...obj,
                    x: mapObj.x,
                    y: mapObj.y,
                    size: obj.params.size || 1
                };
                
                // Проверяем, есть ли у объекта камера
                if (obj.instance.setupCamera) {
                    camera = obj.instance.setupCamera(canvas, gameObj);
                    cameraTarget = gameObj;
                }
                
                gameObjects.push(gameObj);
            }
        }
    }
    
    // Инициализация коллизий для объектов
    gameObjects.forEach(obj => {
        if (obj.instance.setupCollision) {
            obj.checkCollision = obj.instance.setupCollision(gameObjects);
        }
    });
    
    // Функция рендеринга
    function render() {
        // Очистка canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Сохраняем состояние контекста
        ctx.save();
        
        // Применяем трансформации камеры
        if (camera && cameraTarget) {
            const cam = camera.update(
                cameraTarget.x, 
                cameraTarget.y, 
                cameraTarget.size, 
                gridSize
            );
            camera.apply(ctx);
        }
        
        // Рисуем сетку
        ctx.strokeStyle = '#CCCCCC';
        ctx.lineWidth = 0.5;
        
        // Вертикальные линии
        for (let x = 0; x <= canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        
        // Горизонтальные линии
        for (let y = 0; y <= canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        
        // Отрисовка объектов
        gameObjects.forEach(obj => {
            if (obj.instance && obj.instance.draw) {
                obj.instance.draw(ctx, obj.x, obj.y, gridSize);
            }
        });
        
        // Восстанавливаем состояние контекста
        ctx.restore();
    }
    
    // Настройка управления для объектов
    gameObjects.forEach(obj => {
        if (obj.instance.setupControls) {
            const updatePosition = obj.instance.setupControls(
                canvas,
                gridSize,
                render,
                obj.checkCollision // Передаем функцию проверки коллизий
            );
            
            obj.updatePosition = () => updatePosition(obj);
        }
    });
    
    // Игровой цикл
    function gameLoop() {
        gameObjects.forEach(obj => {
            if (obj.updatePosition) {
                obj.updatePosition();
            }
        });
        
        render();
        requestAnimationFrame(gameLoop);
    }
    
    // Первоначальный рендер
    render();
    gameLoop();
}

initGame().catch(console.error);