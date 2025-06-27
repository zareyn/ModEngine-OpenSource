// modul/camera.js
export function create(params) {
    const defaultParams = {
        followSpeed: 0.1,    // Скорость следования камеры (0-1)
        smooth: true,        // Плавное следование
        width: null,         // Фиксированная ширина видимой области
        height: null,        // Фиксированная высота видимой области
        zoom: 1,             // Масштаб (1 = 100%)
        minZoom: 1,        // Минимальный масштаб
        maxZoom: 1,         // Максимальный масштаб
        bounds: null         // Границы {x, y, width, height} для ограничения камеры
    };
    
    const finalParams = Object.assign({}, defaultParams, params);
    
    return {
        setupCamera: function(canvas, target) {
            let camera = {
                x: 0,
                y: 0,
                width: finalParams.width !== null ? finalParams.width : canvas.width,
                height: finalParams.height !== null ? finalParams.height : canvas.height,
                zoom: finalParams.zoom,
                viewport: {
                    width: canvas.width,
                    height: canvas.height
                }
            };
            
            return {
                update: function(targetX, targetY, targetSize, gridSize) {
                    // Рассчитываем целевую позицию камеры (центрирование по объекту)
                    const targetCenterX = (targetX + targetSize/2) * gridSize - camera.width/2;
                    const targetCenterY = (targetY + targetSize/2) * gridSize - camera.height/2;
                    
                    // Плавное следование или мгновенное
                    if (finalParams.smooth) {
                        camera.x += (targetCenterX - camera.x) * finalParams.followSpeed;
                        camera.y += (targetCenterY - camera.y) * finalParams.followSpeed;
                    } else {
                        camera.x = targetCenterX;
                        camera.y = targetCenterY;
                    }
                    
                    // Ограничение камеры границами, если они заданы
                    if (finalParams.bounds) {
                        camera.x = Math.max(finalParams.bounds.x, Math.min(camera.x, 
                            finalParams.bounds.x + finalParams.bounds.width - camera.width));
                        camera.y = Math.max(finalParams.bounds.y, Math.min(camera.y, 
                            finalParams.bounds.y + finalParams.bounds.height - camera.height));
                    }
                    
                    return camera;
                },
                apply: function(ctx) {
                    ctx.save();
                    
                    // Масштабирование
                    const scaleX = camera.viewport.width / camera.width;
                    const scaleY = camera.viewport.height / camera.height;
                    const scale = Math.min(scaleX, scaleY) * camera.zoom;
                    
                    // Центрирование
                    const offsetX = (camera.viewport.width - camera.width * scale) / 2;
                    const offsetY = (camera.viewport.height - camera.height * scale) / 2;
                    
                    ctx.translate(offsetX, offsetY);
                    ctx.scale(scale, scale);
                    ctx.translate(-camera.x, -camera.y);
                },
                reset: function(ctx) {
                    ctx.restore();
                },
                setZoom: function(newZoom) {
                    camera.zoom = Math.max(finalParams.minZoom, Math.min(finalParams.maxZoom, newZoom));
                },
                getViewport: function() {
                    return {
                        x: camera.x,
                        y: camera.y,
                        width: camera.width,
                        height: camera.height,
                        zoom: camera.zoom
                    };
                }
            };
        },
        params: finalParams
    };
}