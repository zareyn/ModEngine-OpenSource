// public/engine/render.js
export function initRender(canvas, ctx, gridSize, gameObjects, camera, cameraTarget) {
    function render() {
        // Очистка canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Сохраняем состояние контекста
        ctx.save();
        
        // ПРИМЕНЯЕМ КАМЕРУ СРАЗУ - ДО ЛЮБОЙ ОТРИСОВКИ
        if (camera && cameraTarget) {
            camera.update(
                cameraTarget.x, 
                cameraTarget.y, 
                cameraTarget.size, 
                gridSize
            );
            camera.apply(ctx);
        }
        
        // Теперь ВСЕ рисуется в МИРОВЫХ координатах
        
        // Рисуем сетку
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 0.5;
        
        // Вертикальные линии
        for (let x = 0; x <= canvas.width * 3; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height * 3);
            ctx.stroke();
        }
        
        // Горизонтальные линии
        for (let y = 0; y <= canvas.height * 3; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width * 3, y);
            ctx.stroke();
        }
        
        // ВАЖНО: все объекты рисуются после применения камеры
        gameObjects.forEach(obj => {
            if (obj.instance && obj.instance.draw) {
                obj.instance.draw(ctx, obj.x, obj.y, gridSize);
            }
        });
        
        // Восстанавливаем состояние контекста
        ctx.restore();
    }
    
    function gameLoop() {
        // Обновление позиций объектов
        gameObjects.forEach(obj => {
            if (obj.updatePosition) {
                obj.updatePosition();
            }
        });
        
        render();
        requestAnimationFrame(gameLoop);
    }
    
    return { render, gameLoop };
}