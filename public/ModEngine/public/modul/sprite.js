// public/modul/sprite.js - РАБОЧАЯ ВЕРСИЯ
export function create(params) {
    // КЕШ спрайтов и изображений
    const spriteCache = new Map();
    const imageCache = new Map();

    // Загрузка данных спрайтов
    async function loadSpriteData() {
        try {
            const response = await fetch('/api/sprites');
            if (!response.ok) throw new Error('Failed to load sprite data');
            const data = await response.json();
            
            Object.keys(data).forEach(spriteName => {
                spriteCache.set(spriteName, data[spriteName]);
            });
            
            console.log('✅ Спрайты загружены и закешированы');
        } catch (error) {
            console.error('Error loading sprite data:', error);
        }
    }

    // Загружаем спрайты при первом вызове
    let spriteDataLoaded = false;
    if (!spriteDataLoaded) {
        loadSpriteData();
        spriteDataLoaded = true;
    }

    // Параметры по умолчанию
    const defaultParams = {
        spriteName: '',
        frame: 0,
        frameTime: 0,
        animation: 'default',
        flipX: false,
        flipY: false,
        opacity: 1,
        size: 1  // ← ДОБАВИЛ РАЗМЕР!
    };

    const finalParams = Object.assign({}, defaultParams, params);
    
    function getSprite() {
        return spriteCache.get(finalParams.spriteName) || null;
    }
    
    function getAnimation() {
        const sprite = getSprite();
        if (!sprite || !sprite.animations) return null;
        return sprite.animations[finalParams.animation] || sprite.animations.default || null;
    }
    
    function loadImage(imagePath) {
        return new Promise((resolve) => {
            if (imageCache.has(imagePath)) {
                resolve(imageCache.get(imagePath));
                return;
            }

            const img = new Image();
            img.onload = () => {
                imageCache.set(imagePath, img);
                resolve(img);
            };
            img.onerror = () => {
                console.error('Failed to load image:', imagePath);
                resolve(null);
            };
            img.src = `/img/${imagePath}`;
        });
    }
    
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
        draw: async function(ctx, x, y, cellSize) {
            const sprite = getSprite();
            if (!sprite || !sprite.imagePath) return;
            
            const animation = getAnimation();
            if (!animation) return;
            
            const img = await loadImage(sprite.imagePath);
            if (!img) return;
            
            const frameIndex = animation.frames[finalParams.frame];
            const frame = sprite.frames[frameIndex];
            
            if (!frame) return;
            
            // РАБОЧАЯ ФОРМУЛА из оригинального спрайта:
            const width = finalParams.size * cellSize;
            const height = finalParams.size * cellSize;
            
            ctx.save();
            ctx.globalAlpha = finalParams.opacity;
            
            // Оригинальная трансформация:
            ctx.translate(
                finalParams.flipX ? (x * cellSize + width) : x * cellSize,
                finalParams.flipY ? (y * cellSize + height) : y * cellSize
            );
            ctx.scale(finalParams.flipX ? -1 : 1, finalParams.flipY ? -1 : 1);
            
            // Оригинальная отрисовка:
            ctx.drawImage(
                img,
                frame.x, frame.y, frame.width, frame.height,
                0, 0, width, height
            );
            
            ctx.restore();
            
            // ДЕБАГ: зеленая рамка где должен быть спрайт
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.strokeRect(x * cellSize, y * cellSize, width, height);
        },
        
        update: function(deltaTime) {
            updateAnimation(deltaTime);
        },
        
        setAnimation: function(name) {
            if (finalParams.animation !== name) {
                finalParams.animation = name;
                finalParams.frame = 0;
                finalParams.frameTime = 0;
            }
        },
        
        getSpriteParams: function() {
            return {
                spriteName: finalParams.spriteName,
                animation: finalParams.animation,
                frame: finalParams.frame,
                flipX: finalParams.flipX,
                flipY: finalParams.flipY,
                size: finalParams.size
            };
        },
        
        params: finalParams
    };
}