export function initRender(canvas, ctx, gridSize, gameObjects, camera, cameraTarget) {
    function render() {
        // Очистка canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Сохраняем состояние контекста
        ctx.save();
        
        // Применяем трансформации камеры (если есть)
        if (camera && cameraTarget) {
            camera.update(
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