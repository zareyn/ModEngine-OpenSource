document.addEventListener('DOMContentLoaded', function() {
    // Элементы DOM
    const introElement = document.getElementById('intro');
    const authContainer = document.getElementById('auth-container');
    const gameWorld = document.getElementById('game-world');
    const locationTabs = document.querySelectorAll('.tab-btn');
    const locations = document.querySelectorAll('.location');
    
    let userData = null;
    let currentLocation = 'resource';
    
    // Проверка авторизации при загрузке
    checkAuth();
    
    // Функция проверки авторизации
    function checkAuth() {
        fetch('/api/check-auth')
            .then(response => response.json())
            .then(data => {
                if (data.authenticated) {
                    loadUserData();
                    gameWorld.classList.remove('hidden');
                    authContainer.classList.add('hidden');
                    introElement.classList.add('hidden');
                } else {
                    showAuthForm();
                }
            });
    }
    
    // Загрузка данных пользователя
    function loadUserData() {
        fetch('/api/user-data')
            .then(response => response.json())
            .then(data => {
                userData = data;
                updateUI();
            })
            .catch(error => {
                console.error('Error loading user data:', error);
            });
    }
    
    // Обновление интерфейса
    function updateUI() {
        document.getElementById('username-display').textContent = userData.username;
        document.getElementById('metal-amount').textContent = userData.resources.metal;
        document.getElementById('fuel-amount').textContent = userData.resources.fuel;
        document.getElementById('money-amount').textContent = userData.resources.money;
        
        // Обновление списка участков
        updatePlotsList();
        
        // Инициализация канвасов
        initCanvases();
    }
    
    // Инициализация канвасов для локаций
    function initCanvases() {
        initResourceCanvas();
        initIndustrialCanvas();
        initCityCanvas();
    }
    
    // Канвас ресурсной локации
    function initResourceCanvas() {
        const canvas = document.getElementById('resource-canvas');
        const ctx = canvas.getContext('2d');
        
        // Очистка канваса
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Рисуем пустыню с бурей
        drawDesert(ctx, canvas.width, canvas.height);
        
        // Добавляем участки
        drawPlots(ctx, canvas.width, canvas.height, 'resource');
    }
    
    // Канвас промышленной локации
    function initIndustrialCanvas() {
        const canvas = document.getElementById('industrial-canvas');
        const ctx = canvas.getContext('2d');
        
        // Очистка канваса
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Рисуем пустыню
        drawDesert(ctx, canvas.width, canvas.height);
        
        // Добавляем участки
        drawPlots(ctx, canvas.width, canvas.height, 'industrial');
    }
    
    // Канвас городской локации
    function initCityCanvas() {
        const canvas = document.getElementById('city-canvas');
        const ctx = canvas.getContext('2d');
        
        // Очистка канваса
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Рисуем пустыню
        drawDesert(ctx, canvas.width, canvas.height);
        
        // Рисуем ратушу в центре
        const centerX = canvas.width / 2 - 40;
        const centerY = canvas.height / 2 - 40;
        
        ctx.fillStyle = '#555';
        ctx.fillRect(centerX, centerY, 80, 80);
        
        ctx.fillStyle = '#777';
        ctx.fillRect(centerX + 10, centerY + 10, 60, 60);
        
        ctx.fillStyle = '#ff8c00';
        ctx.font = '10px Arial';
        ctx.fillText('РАТУША', centerX + 15, centerY + 35);
        ctx.fillText('БАНК', centerX + 25, centerY + 50);
        
        // Добавляем участки
        drawPlots(ctx, canvas.width, canvas.height, 'city');
    }
    
    // Рисуем пустыню
    function drawDesert(ctx, width, height) {
        // Песок
        ctx.fillStyle = '#8c7b6b';
        ctx.fillRect(0, 0, width, height);
        
        // Дюны
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 10 + 5;
            
            ctx.fillStyle = '#a08c7a';
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Буря (для ресурсной локации)
        if (currentLocation === 'resource') {
            for (let i = 0; i < 100; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                
                ctx.fillStyle = 'rgba(255, 200, 100, 0.3)';
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    // Рисуем участки на канвасе
    function drawPlots(ctx, width, height, location) {
        const plotSize = 40;
        const cols = Math.floor(width / plotSize) - 1;
        const rows = Math.floor(height / plotSize) - 1;
        
        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                const plotX = x * plotSize + 20;
                const plotY = y * plotSize + 20;
                
                // Проверяем, принадлежит ли участок текущему пользователю
                const isOwned = userData.plots && userData.plots.some(p => 
                    p.location === location && p.x === x && p.y === y);
                
                // Рисуем участок
                ctx.fillStyle = isOwned ? '#5cb85c' : '#555';
                ctx.fillRect(plotX, plotY, plotSize - 2, plotSize - 2);
                
                // Обводка
                ctx.strokeStyle = isOwned ? '#4ca64c' : '#777';
                ctx.lineWidth = 1;
                ctx.strokeRect(plotX, plotY, plotSize - 2, plotSize - 2);
                
                // Координаты
                ctx.fillStyle = '#fff';
                ctx.font = '8px Arial';
                ctx.fillText(`${x},${y}`, plotX + 5, plotY + 15);
            }
        }
    }
    
    // Обновление списка участков
    function updatePlotsList() {
        const plotsContainer = document.getElementById('owned-plots');
        plotsContainer.innerHTML = '';
        
        if (!userData.plots || userData.plots.length === 0) {
            plotsContainer.innerHTML = '<p>У вас нет участков</p>';
            return;
        }
        
        userData.plots.forEach(plot => {
            const plotElement = document.createElement('div');
            plotElement.className = 'plot-item';
            plotElement.innerHTML = `
                <p>Локация: ${getLocationName(plot.location)}</p>
                <p>Координаты: ${plot.x}, ${plot.y}</p>
            `;
            plotsContainer.appendChild(plotElement);
        });
    }
    
    // Получение названия локации
    function getLocationName(location) {
        switch (location) {
            case 'resource': return 'Ресурсная';
            case 'industrial': return 'Промышленная';
            case 'city': return 'Городская';
            default: return location;
        }
    }
    
    // Переключение между локациями
    locationTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const location = tab.getAttribute('data-location');
            
            // Обновляем активную вкладку
            locationTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Показываем соответствующую локацию
            locations.forEach(l => l.classList.remove('active'));
            document.getElementById(`${location}-location`).classList.add('active');
            
            currentLocation = location;
            
            // Перерисовываем канвас при необходимости
            if (location === 'resource') {
                initResourceCanvas();
            } else if (location === 'industrial') {
                initIndustrialCanvas();
            } else if (location === 'city') {
                initCityCanvas();
            }
        });
    });
    
    // Покупка участка
    document.getElementById('buy-plot').addEventListener('click', () => {
        // Здесь должна быть логика выбора координат
        // Для демонстрации покупаем случайный участок
        const x = Math.floor(Math.random() * 10);
        const y = Math.floor(Math.random() * 5);
        
        fetch('/api/buy-plot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                location: 'city',
                x: x,
                y: y
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                userData.resources = data.resources;
                userData.plots = data.plots;
                updateUI();
                alert('Участок успешно куплен!');
            } else {
                alert(data.message);
            }
        });
    });
    
    // Добыча ресурсов
    document.getElementById('mine-resources').addEventListener('click', () => {
        // Увеличиваем ресурсы
        userData.resources.metal += 20;
        userData.resources.fuel += 10;
        
        updateUI();
        alert('Ресурсы добыты!');
    });
    
    // Голосование за мэра
    document.getElementById('vote-btn').addEventListener('click', () => {
        const candidateName = document.getElementById('candidate-name').value;
        
        if (!candidateName) {
            alert('Введите имя кандидата');
            return;
        }
        
        fetch('/api/vote-mayor', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                candidate: candidateName
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                document.getElementById('current-mayor').textContent = candidateName;
            } else {
                alert(data.message);
            }
        });
    });
    
    // Поиск игроков
    document.getElementById('find-players').addEventListener('click', () => {
        fetch('/api/find-players')
            .then(response => response.json())
            .then(data => {
                const playersList = document.getElementById('players-list');
                playersList.innerHTML = '';
                
                if (data.players.length === 0) {
                    playersList.innerHTML = '<p>Других игроков не найдено</p>';
                    return;
                }
                
                data.players.forEach(player => {
                    const playerElement = document.createElement('div');
                    playerElement.className = 'player-item';
                    playerElement.innerHTML = `
                        <p>Игрок: ${player.username}</p>
                        <p>Дата регистрации: ${new Date(player.joinDate).toLocaleDateString()}</p>
                    `;
                    playersList.appendChild(playerElement);
                });
            });
    });
    
    // Выход из системы
    document.getElementById('logout-btn').addEventListener('click', () => {
        fetch('/api/logout', { method: 'POST' })
            .then(() => {
                window.location.href = '/';
            });
    });
    
    // Показ формы авторизации
    function showAuthForm() {
        gameWorld.classList.add('hidden');
        authContainer.classList.remove('hidden');
        introElement.classList.remove('hidden');
        
        // Запускаем анимацию загрузки
        let progress = 0;
        const loadingProgress = document.getElementById('loading-progress');
        const loadingInterval = setInterval(() => {
            progress += 2;
            loadingProgress.style.width = `${progress}%`;
            
            if (progress >= 100) {
                clearInterval(loadingInterval);
            }
        }, 100);
        
        // Анимация появления букв
        const letters = document.querySelectorAll('.pixel-letter');
        letters.forEach((letter, index) => {
            setTimeout(() => {
                letter.style.opacity = 1;
                letter.style.transform = 'translateY(0)';
                letter.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            }, 500 + index * 300);
        });
    }
});