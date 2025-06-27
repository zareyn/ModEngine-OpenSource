import { initGameObjects } from './object.js';
import { initRender } from './render.js';

export async function initGame() {
    // Инициализация игры (вызывается из main.js)
    const { mapData, canvas, gridSize, ctx, gameObjects, camera, cameraTarget } = await initGameObjects();
    
    // Настройка рендеринга
    const { render, gameLoop } = initRender(canvas, ctx, gridSize, gameObjects, camera, cameraTarget);
    
    // Запуск игры
    render();
    gameLoop();
}