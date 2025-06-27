import { loadObjectData, createObject } from './modul.js';

// Константы для карты
const GRID_SIZE = 40; // Размер клетки в пикселях
const GRID_COLOR = '#333';
const GRID_LINE_WIDTH = 1;

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.createElement('div');
    container.className = 'objects-container';
    document.body.appendChild(container);

    const table = document.createElement('table');
    table.className = 'objects-table';
    container.appendChild(table);

    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Объект</th>
            <th>Параметры</th>
            <th>Карта</th>
        </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    table.appendChild(tbody);

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
            paramsCell.textContent = JSON.stringify(result.params, null, 2);
            row.appendChild(paramsCell);
            
            const mapCell = document.createElement('td');
            const mapCanvas = createMap(result.instance, 10); // 10x10 клеток
            mapCell.appendChild(mapCanvas);
            row.appendChild(mapCell);
            
            tbody.appendChild(row);
        }
    }

    const style = document.createElement('style');
    style.textContent = `
        .objects-container {
            padding: 20px;
            font-family: Arial, sans-serif;
        }
        .objects-table {
            width: 100%;
            border-collapse: collapse;
        }
        .objects-table th, .objects-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            vertical-align: top;
        }
        .objects-table th {
            background-color: #f2f2f2;
        }
        .objects-table tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .map-canvas {
            background-color: #111;
            width: ${GRID_SIZE * 10}px;
            height: ${GRID_SIZE * 10}px;
        }
    `;
    document.head.appendChild(style);
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