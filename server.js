const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: 'farh-industrial-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 часа
}));

// Загрузка пользователей из файла
function loadUsers() {
    try {
        if (fs.existsSync('users.json')) {
            return JSON.parse(fs.readFileSync('users.json', 'utf8'));
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
    return [];
}

// Загрузка данных игрового мира
function loadGameData() {
    try {
        if (fs.existsSync('game-data.json')) {
            return JSON.parse(fs.readFileSync('game-data.json', 'utf8'));
        }
    } catch (error) {
        console.error('Error loading game data:', error);
    }
    return { plots: [], mayor: null, players: [] };
}

// Сохранение пользователей в файл
function saveUsers(users) {
    try {
        fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
    } catch (error) {
        console.error('Error saving users:', error);
    }
}

// Сохранение данных игрового мира
function saveGameData(gameData) {
    try {
        fs.writeFileSync('game-data.json', JSON.stringify(gameData, null, 2));
    } catch (error) {
        console.error('Error saving game data:', error);
    }
}

// Маршруты
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Авторизация
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const users = loadUsers();
    
    const user = users.find(u => u.username === username);
    if (!user) {
        return res.status(401).json({ success: false, message: 'Пользователь не найден' });
    }
    
    try {
        const match = await bcrypt.compare(password, user.password);
        if (match) {
            req.session.user = { id: user.id, username: user.username };
            return res.json({ success: true, message: 'Авторизация успешна' });
        } else {
            return res.status(401).json({ success: false, message: 'Неверный пароль' });
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Регистрация
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    const users = loadUsers();
    
    if (users.find(u => u.username === username)) {
        return res.status(409).json({ success: false, message: 'Пользователь уже существует' });
    }
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: Date.now().toString(),
            username,
            password: hashedPassword,
            createdAt: new Date().toISOString(),
            resources: {
                metal: 100,
                fuel: 50,
                money: 1000
            },
            plots: []
        };
        
        users.push(newUser);
        saveUsers(users);
        
        req.session.user = { id: newUser.id, username: newUser.username };
        res.json({ success: true, message: 'Регистрация успешна' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Ошибка при регистрации' });
    }
});

// Проверка авторизации
app.get('/api/check-auth', (req, res) => {
    if (req.session.user) {
        res.json({ authenticated: true, user: req.session.user });
    } else {
        res.json({ authenticated: false });
    }
});

// Получение данных пользователя
app.get('/api/user-data', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Не авторизован' });
    }
    
    const users = loadUsers();
    const user = users.find(u => u.id === req.session.user.id);
    
    if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    res.json({
        username: user.username,
        resources: user.resources,
        plots: user.plots || []
    });
});

// Покупка участка
app.post('/api/buy-plot', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Не авторизован' });
    }
    
    const { location, x, y } = req.body;
    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === req.session.user.id);
    
    if (userIndex === -1) {
        return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }
    
    const user = users[userIndex];
    const plotPrice = 500;
    
    if (user.resources.money < plotPrice) {
        return res.json({ success: false, message: 'Недостаточно денег' });
    }
    
    // Проверяем, не куплен ли уже этот участок
    const gameData = loadGameData();
    const existingPlot = gameData.plots.find(p => p.location === location && p.x === x && p.y === y);
    
    if (existingPlot) {
        return res.json({ success: false, message: 'Участок уже куплен' });
    }
    
    // Покупка участка
    user.resources.money -= plotPrice;
    user.plots = user.plots || [];
    user.plots.push({ location, x, y });
    
    // Добавляем в общие данные игры
    gameData.plots.push({
        location, x, y,
        owner: user.username,
        ownerId: user.id
    });
    
    saveUsers(users);
    saveGameData(gameData);
    
    res.json({ 
        success: true, 
        message: 'Участок куплен',
        resources: user.resources,
        plots: user.plots
    });
});

// Выборы мэра
app.post('/api/vote-mayor', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Не авторизован' });
    }
    
    const { candidate } = req.body;
    const gameData = loadGameData();
    
    // Если это первые выборы, создаем запись
    if (!gameData.mayor) {
        gameData.mayor = {
            name: candidate,
            votes: 1,
            voters: [req.session.user.id]
        };
    } else {
        // Если пользователь уже голосовал
        if (gameData.mayor.voters.includes(req.session.user.id)) {
            return res.json({ success: false, message: 'Вы уже голосовали' });
        }
        
        // Добавляем голос
        gameData.mayor.votes += 1;
        gameData.mayor.voters.push(req.session.user.id);
    }
    
    saveGameData(gameData);
    res.json({ success: true, message: 'Ваш голос учтен' });
});

// Поиск игроков
app.get('/api/find-players', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Не авторизован' });
    }
    
    const users = loadUsers();
    const otherPlayers = users
        .filter(u => u.id !== req.session.user.id)
        .map(u => ({ username: u.username, joinDate: u.createdAt }));
    
    res.json({ players: otherPlayers });
});

// Выход
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Выход выполнен' });
});

// Игровой мир
app.get('/game', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'ModEngine/public/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});