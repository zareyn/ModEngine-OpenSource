export function create(params) {
    const defaultParams = {
        color: 'red',
        size: 1 // Размер в клетках (не в пикселях)
    };
    
    const finalParams = Object.assign({}, defaultParams, params);
    
    return {
        draw: function(ctx, x, y, cellSize) {
            ctx.fillStyle = finalParams.color;
            ctx.fillRect(
                x * cellSize, 
                y * cellSize, 
                finalParams.size * cellSize, 
                finalParams.size * cellSize
            );
        },
        params: finalParams
    };
}