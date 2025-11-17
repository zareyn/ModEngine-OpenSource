// public/engine/object.js
import { loadObjectData, createObject } from '../modul.js';
import { loadMapData } from '../map.js';

export async function initGameObjects() {
    // Загрузка данных карты
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
                    size: obj.params.size || 1,
                    name: mapObj.name  // ← СОХРАНЯЕМ ИМЯ ОБЪЕКТА
                };
                
                console.log(`🎯 Создан объект: ${mapObj.name} at (${mapObj.x}, ${mapObj.y}) size: ${gameObj.size}`);
                
                // Проверяем, есть ли у объекта камера
                if (obj.instance.setupCamera) {
                    camera = obj.instance.setupCamera(canvas, gameObj);
                    cameraTarget = gameObj;
                    console.log(`📷 Камера настроена на: ${mapObj.name}`);
                }
                
                gameObjects.push(gameObj);
            }
        }
    }
    
    // Инициализация коллизий и управления
    gameObjects.forEach(obj => {
        if (obj.instance.setupCollision) {
            obj.checkCollision = obj.instance.setupCollision(gameObjects);
        }
        
        if (obj.instance.setupControls) {
            const updatePosition = obj.instance.setupControls(
                canvas,
                gridSize,
                () => {}, // Рендер будет вызываться из gameLoop
                obj.checkCollision
            );
            obj.updatePosition = () => updatePosition(obj);
        }
    });
    
    return { mapData, canvas, gridSize, ctx, gameObjects, camera, cameraTarget };
}