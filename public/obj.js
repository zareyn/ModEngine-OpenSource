import { loadObjectData, createObject } from './modul.js';

// Константы для карты
const GRID_SIZE = 40; // Размер клетки в пикселях
const GRID_COLOR = '#333';
const GRID_LINE_WIDTH = 1;

document.addEventListener('DOMContentLoaded', async () => {
    const tbody = document.querySelector('.objects-table tbody');
    
    try {
        const objectsData = await loadObjectData();

        for (const objName in objectsData) {
            const objData = objectsData[objName];
            const result = await createObject(objName, objData);

            if (result) {
                const row = document.createElement('tr');
                
                const nameCell = document.createElement('td');
                nameCell.textContent = objName;
                row.appendChild(nameCell);
                
                const paramsCell = document.createElement('td');
                const jsonView = document.createElement('pre');
                jsonView.className = 'json-view';
                jsonView.textContent = JSON.stringify(result.params, null, 2);
                paramsCell.appendChild(jsonView);
                row.appendChild(paramsCell);
                
                const mapCell = document.createElement('td');
                const mapCanvas = createMap(result.instance, 10); // 10x10 клеток
                mapCell.appendChild(mapCanvas);
                row.appendChild(mapCell);
                
                tbody.appendChild(row);
            }
        }
    } catch (error) {
        console.error('Error loading objects:', error);
        const errorRow = document.createElement('tr');
        const errorCell = document.createElement('td');
        errorCell.colSpan = 3;
        errorCell.textContent = `Error loading objects: ${error.message}`;
        errorCell.style.color = '#ff5555';
        errorRow.appendChild(errorCell);
        tbody.appendChild(errorRow);
    }
});

function createMap(instance, gridCells) {
    const canvas = document.createElement('canvas');
    canvas.className = 'map-canvas';
    canvas.width = GRID_SIZE * gridCells;
    canvas.height = GRID_SIZE * gridCells;
    
    const ctx = canvas.getContext('2d');
    
    // Позиция объекта в клетках
    const position = {
        x: Math.floor((gridCells - instance.params.size) / 2),
        y: Math.floor((gridCells - instance.params.size) / 2),
        size: instance.params.size
    };
    
    // Отрисовка сетки
    function drawGrid() {
        ctx.strokeStyle = GRID_COLOR;
        ctx.lineWidth = GRID_LINE_WIDTH;
        
        // Вертикальные линии
        for (let x = 0; x <= canvas.width; x += GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        
        // Горизонтальные линии
        for (let y = 0; y <= canvas.height; y += GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }
    
    // Отрисовка объекта
    function drawObject() {
        if (instance.draw && typeof instance.draw === 'function') {
            instance.draw(ctx, position.x, position.y, GRID_SIZE);
        }
    }
    
    // Полная отрисовка
    function draw() {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawGrid();
        drawObject();
    }
    
    // Настройка управления
    let updatePosition = () => false;
    if (instance.setupControls && typeof instance.setupControls === 'function') {
        updatePosition = instance.setupControls(canvas, GRID_SIZE, draw);
    }
    
    // Анимация
    function animate() {
        if (updatePosition(position)) {
            draw();
        }
        requestAnimationFrame(animate);
    }
    
    draw();
    animate();
    
    return canvas;
}