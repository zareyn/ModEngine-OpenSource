export async function loadMapData() {
    try {
        const response = await fetch('./save/map.json');
        if (!response.ok) throw new Error('Failed to load map data');
        const mapData = await response.json();
        
        // Инициализация базового рендеринга
        const canvas = document.getElementById('gameCanvas');
        const gridSize = 32;
        const ctx = canvas.getContext('2d');
        
        // Установка размеров canvas
        canvas.width = mapData.width * gridSize;
        canvas.height = mapData.height * gridSize;
        
        // Отрисовка сетки (однократно)
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

        return {
            mapData,
            canvas,
            gridSize,
            ctx
        };

    } catch (error) {
        console.error('Error loading map data:', error);
        return {
            mapData: {
                width: 10,
                height: 10,
                objects: []
            },
            canvas: document.getElementById('gameCanvas'),
            gridSize: 32,
            ctx: document.getElementById('gameCanvas').getContext('2d')
        };
    }
}