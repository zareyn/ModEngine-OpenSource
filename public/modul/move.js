// modul/move.js
export function create(params) {
    const defaultParams = {
        speed: 1 // Количество клеток за шаг
    };
    
    const finalParams = Object.assign({}, defaultParams, params);
    
    return {
        setupControls: function(canvas, gridSize, drawCallback, checkCollision) {
            const keys = {};
            
            document.addEventListener('keydown', (e) => {
                keys[e.key.toLowerCase()] = true;
            });
            
            document.addEventListener('keyup', (e) => {
                keys[e.key.toLowerCase()] = false;
            });
            
            return function(pos) {
                let changed = false;
                const gridCells = canvas.width / gridSize;
                const originalX = pos.x;
                const originalY = pos.y;
                
                // Пробуем переместиться
                if (keys['w']) { pos.y = Math.max(0, pos.y - finalParams.speed); changed = true; }
                if (keys['s']) { pos.y = Math.min(gridCells - pos.size, pos.y + finalParams.speed); changed = true; }
                if (keys['a']) { pos.x = Math.max(0, pos.x - finalParams.speed); changed = true; }
                if (keys['d']) { pos.x = Math.min(gridCells - pos.size, pos.x + finalParams.speed); changed = true; }
                
                // Если есть функция проверки коллизий и перемещение произошло
                if (changed && checkCollision) {
                    // Проверяем коллизию после перемещения
                    if (checkCollision(pos, pos.size)) {
                        // Возвращаем на прежнюю позицию, если коллизия есть
                        pos.x = originalX;
                        pos.y = originalY;
                        changed = false;
                    }
                }
                
                if (changed) drawCallback();
                return changed;
            };
        },
        params: finalParams
    };
}