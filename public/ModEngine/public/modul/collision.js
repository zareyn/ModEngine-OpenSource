// modul/collision.js
export function create(params) {
    const defaultParams = {
        collidable: true, // Может ли этот объект сталкиваться с другими
        solid: true,      // Является ли объект твердым (непроходимым)
        checkCollision: true // Нужно ли проверять коллизии для этого объекта
    };

    const finalParams = Object.assign({}, defaultParams, params);

    return {
        setupCollision: function(gameObjects) {
            // Возвращаем функцию для проверки коллизий
            return function(pos, size) {
                if (!finalParams.checkCollision) return false;

                // Проверяем коллизию с каждым объектом
                for (const obj of gameObjects) {
                    // Пропускаем проверку с самим собой
                    if (obj === pos) continue;

                    // Если объект не коллизибельный или не твердый, пропускаем
                    if (!obj.params.collidable || !obj.params.solid) continue;

                    // Проверяем пересечение прямоугольников
                    if (pos.x < obj.x + obj.size &&
                        pos.x + size > obj.x &&
                        pos.y < obj.y + obj.size &&
                        pos.y + size > obj.y) {
                        return true; // Коллизия обнаружена
                    }
                }
                return false; // Коллизий нет
            };
        },
        params: finalParams
    };
}