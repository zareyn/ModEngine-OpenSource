// public/modul/sprite.js
export function create(params) {
    const defaultParams = {
        spriteName: '',
        color: '#ff0000', // fallback цвет
        size: 1,
        flipX: false,
        flipY: false,
        opacity: 1
    };

    const finalParams = Object.assign({}, defaultParams, params);
    
    // Preload изображений
    const imageCache = new Map();
    
    function preloadImage(spriteName) {
        return new Promise((resolve) => {
            if (!spriteName) {
                resolve(null);
                return;
            }
            
            // Загружаем данные спрайтов
            fetch('/api/sprites')
                .then(response => {
                    if (!response.ok) throw new Error('Sprite data not found');
                    return response.json();
                })
                .then(spriteData => {
                    const sprite = spriteData[spriteName];
                    if (!sprite || !sprite.imagePath) {
                        console.warn(`Sprite "${spriteName}" not found in sprite data`);
                        resolve(null);
                        return;
                    }
                    
                    // Проверяем кеш
                    if (imageCache.has(spriteName)) {
                        resolve(imageCache.get(spriteName));
                        return;
                    }
                    
                    const img = new Image();
                    img.onload = () => {
                        console.log(`✅ Sprite loaded: ${spriteName}`);
                        imageCache.set(spriteName, img);
                        resolve(img);
                    };
                    img.onerror = () => {
                        console.warn(`❌ Failed to load sprite image: ${spriteName}`);
                        resolve(null);
                    };
                    img.src = `/img/${sprite.imagePath}`;
                })
                .catch((error) => {
                    console.warn('Could not load sprite data:', error);
                    resolve(null);
                });
        });
    }

    // Preload при создании
    let preloadPromise = null;
    if (finalParams.spriteName) {
        preloadPromise = preloadImage(finalParams.spriteName);
    }

    return {
        draw: function(ctx, x, y, cellSize) {
            const img = imageCache.get(finalParams.spriteName);
            
            ctx.save();
            ctx.globalAlpha = finalParams.opacity;
            
            if (img) {
                // Рисуем спрайт с трансформациями
                const width = finalParams.size * cellSize;
                const height = finalParams.size * cellSize;
                
                // Применяем отражение
                ctx.translate(
                    finalParams.flipX ? (x * cellSize + width) : x * cellSize,
                    finalParams.flipY ? (y * cellSize + height) : y * cellSize
                );
                ctx.scale(finalParams.flipX ? -1 : 1, finalParams.flipY ? -1 : 1);
                
                ctx.drawImage(img, 0, 0, width, height);
            } else {
                // Fallback - цветной квадрат
                const width = finalParams.size * cellSize;
                const height = finalParams.size * cellSize;
                
                ctx.fillStyle = finalParams.color;
                ctx.fillRect(x * cellSize, y * cellSize, width, height);
                
                // Отладочная информация для мультиплеера
                if (finalParams.spriteName) {
                    ctx.fillStyle = 'white';
                    ctx.font = '10px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(
                        finalParams.spriteName.substring(0, 6),
                        x * cellSize + width/2,
                        y * cellSize + height/2
                    );
                }
            }
            
            ctx.restore();
        },
        
        // Методы для мультиплеера
        getSpriteParams: function() {
            return {
                spriteName: finalParams.spriteName,
                color: finalParams.color,
                flipX: finalParams.flipX,
                flipY: finalParams.flipY,
                opacity: finalParams.opacity
            };
        },
        
        setSprite: function(spriteName) {
            if (finalParams.spriteName !== spriteName) {
                finalParams.spriteName = spriteName;
                preloadImage(spriteName); // Preload новой текстуры
            }
        },
        
        setFlipX: function(flip) {
            finalParams.flipX = flip;
        },
        
        setFlipY: function(flip) {
            finalParams.flipY = flip;
        },
        
        // Preload promise для ожидания загрузки
        getPreloadPromise: function() {
            return preloadPromise;
        },
        
        params: finalParams
    };
}