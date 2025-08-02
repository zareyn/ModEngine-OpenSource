export function create(params) {
    // Загружаем данные спрайтов
    let spriteData = {};
    
    // Загрузка данных спрайтов
    async function loadSpriteData() {
        try {
            const response = await fetch('../img/spr.json');
            if (!response.ok) throw new Error('Failed to load sprite data');
            spriteData = await response.json();
        } catch (error) {
            console.error('Error loading sprite data:', error);
        }
    }
    
    // Загружаем сразу при создании модуля
    loadSpriteData();

    // Параметры по умолчанию
    const defaultParams = {
        spriteName: '',       // Название спрайта из spr.json
        frame: 0,             // Текущий кадр анимации
        frameTime: 0,         // Время текущего кадра
        animation: 'default', // Название текущей анимации
        flipX: false,        // Отразить по горизонтали
        flipY: false,        // Отразить по вертикали
        opacity: 1           // Прозрачность (0-1)
    };

    const finalParams = Object.assign({}, defaultParams, params);
    
    // Получаем данные спрайта
    function getSprite() {
        return spriteData[finalParams.spriteName] || null;
    }
    
    // Получаем текущую анимацию
    function getAnimation() {
        const sprite = getSprite();
        if (!sprite || !sprite.animations) return null;
        return sprite.animations[finalParams.animation] || sprite.animations.default || null;
    }
    
    // Обновление анимации
    function updateAnimation(deltaTime) {
        const animation = getAnimation();
        if (!animation) return;
        
        finalParams.frameTime += deltaTime;
        const frameDuration = animation.frameDuration || 0.1;
        
        if (finalParams.frameTime >= frameDuration) {
            finalParams.frameTime = 0;
            finalParams.frame = (finalParams.frame + 1) % animation.frames.length;
        }
    }
    
    return {
        draw: function(ctx, x, y, cellSize) {
            const sprite = getSprite();
            if (!sprite || !sprite.imagePath) return;
            
            const animation = getAnimation();
            if (!animation) return;
            
            // Загружаем изображение (можно оптимизировать кешированием)
            const img = new Image();
            img.src = `../img/${sprite.imagePath}`;
            
            // Получаем текущий кадр
            const frameIndex = animation.frames[finalParams.frame];
            const frame = sprite.frames[frameIndex];
            
            if (!frame) return;
            
            // Рассчитываем размеры
            const width = finalParams.size * cellSize;
            const height = finalParams.size * cellSize;
            
            // Сохраняем состояние контекста
            ctx.save();
            
            // Устанавливаем прозрачность
            ctx.globalAlpha = finalParams.opacity;
            
            // Отражаем если нужно
            ctx.translate(
                finalParams.flipX ? (x * cellSize + width) : x * cellSize,
                finalParams.flipY ? (y * cellSize + height) : y * cellSize
            );
            ctx.scale(finalParams.flipX ? -1 : 1, finalParams.flipY ? -1 : 1);
            
            // Рисуем кадр спрайта
            ctx.drawImage(
                img,
                frame.x, frame.y, frame.width, frame.height,
                0, 0, width, height
            );
            
            // Восстанавливаем состояние контекста
            ctx.restore();
        },
        
        update: function(deltaTime) {
            updateAnimation(deltaTime);
        },
        
        // Установка анимации
        setAnimation: function(name) {
            if (finalParams.animation !== name) {
                finalParams.animation = name;
                finalParams.frame = 0;
                finalParams.frameTime = 0;
            }
        },
        
        params: finalParams
    };
}