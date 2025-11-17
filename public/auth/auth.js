// public/auth/auth.js
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.authForm = null;
        this.gameContainer = null;
        this.waitForAnimation = true;
    }

    // 🚀 ИНИЦИАЛИЗАЦИЯ СИСТЕМЫ АУТЕНТИФИКАЦИИ
    init() {
        console.log('🔐 Инициализация системы аутентификации...');
        
        // 🎯 НАХОДИМ ЭЛЕМЕНТЫ
        this.authForm = document.querySelector('.auth-form');
        this.authContainer = document.querySelector('.auth-container');
        this.gameContainer = document.getElementById('gameContainer');
        
        if (!this.authForm) {
            console.error('❌ Не найдена форма аутентификации');
            return false;
        }

        // 🎯 СКРЫВАЕМ ИГРОВОЙ КОНТЕЙНЕР ЕСЛИ ЕСТЬ
        if (this.gameContainer) {
            this.gameContainer.style.display = 'none';
        }

        // 🎯 СКРЫВАЕМ ФОРМУ ДО ЗАВЕРШЕНИЯ АНИМАЦИИ
        this.authForm.style.opacity = '0';
        this.authForm.style.visibility = 'hidden';
        
        // 🎬 ЖДЕМ ЗАВЕРШЕНИЯ АНИМАЦИИ
        this.waitForInitialAnimation();
        
        return true;
    }

    // 🎬 ОЖИДАНИЕ ЗАВЕРШЕНИЯ АНИМАЦИИ
    waitForInitialAnimation() {
        console.log('🎬 Ожидание завершения начальной анимации...');
        
        setTimeout(() => {
            this.startAuthSystem();
        }, 8000);
    }

    // 🚀 ЗАПУСК СИСТЕМЫ АУТЕНТИФИКАЦИИ ПОСЛЕ АНИМАЦИИ
    startAuthSystem() {
        console.log('🚀 Запуск системы аутентификации после анимации...');
        
        this.addDynamicIds();
        this.showAuthForm();
        this.setupEventListeners();
        
        console.log('✅ Система аутентификации готова');
    }

    // 🎯 ДОБАВЛЕНИЕ ID БЕЗ ИЗМЕНЕНИЯ ВИЗУАЛА
    addDynamicIds() {
        const inputs = this.authForm.querySelectorAll('.form-input');
        const button = this.authForm.querySelector('.auth-btn');
        
        if (inputs.length >= 3) {
            inputs[0].id = 'auth-username';
            inputs[1].id = 'auth-password'; 
            inputs[2].id = 'auth-access-level';
        }
        
        if (button) {
            button.id = 'auth-submit-btn';
            button.type = 'button';
        }
        
        console.log('✅ ID добавлены динамически');
    }

    // 🎪 ПОКАЗ ФОРМЫ АУТЕНТИФИКАЦИИ С АНИМАЦИЕЙ
    showAuthForm() {
        setTimeout(() => {
            this.authForm.style.transition = 'opacity 1s ease, visibility 1s ease';
            this.authForm.style.opacity = '1';
            this.authForm.style.visibility = 'visible';
            
            const usernameInput = document.getElementById('auth-username');
            if (usernameInput) {
                setTimeout(() => {
                    usernameInput.focus();
                }, 1000);
            }
        }, 500);
    }

    // 🎯 НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ
    setupEventListeners() {
        const submitBtn = document.getElementById('auth-submit-btn');

        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                this.handleLogin();
            });

            document.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && this.authForm.style.opacity === '1') {
                    this.handleLogin();
                }
            });

            console.log('✅ Обработчики событий настроены');
        }
    }

    // 🔐 ОБРАБОТКА ПРОЦЕССА ВХОДА
    async handleLogin() {
        const username = document.getElementById('auth-username')?.value.trim();
        const password = document.getElementById('auth-password')?.value;
        const accessLevel = document.getElementById('auth-access-level')?.value.trim();

        if (!this.validateInputs(username, password, accessLevel)) {
            return;
        }

        this.showLoadingState();

        try {
            const userData = await this.sendAuthRequest(username, password, accessLevel);
            await this.handleSuccessfulAuth(userData);
            
        } catch (error) {
            this.handleAuthError(error);
        }
    }

    // 🎯 ПРОВЕРКА ВАЛИДНОСТИ ВВОДА
    validateInputs(username, password, accessLevel) {
        if (!username || username.length < 3) {
            this.showError('Логин должен содержать минимум 3 символа');
            return false;
        }

        if (!password || password.length < 4) {
            this.showError('Пароль должен содержать минимум 4 символа');
            return false;
        }

        const level = parseInt(accessLevel);
        if (isNaN(level) || level < 1 || level > 5) {
            this.showError('Уровень доступа должен быть числом от 1 до 5');
            return false;
        }

        return true;
    }

    // 📡 ОТПРАВКА ЗАПРОСА АУТЕНТИФИКАЦИИ
    async sendAuthRequest(username, password, accessLevel) {
        const authData = {
            username: username,
            password: password,
            access_level: parseInt(accessLevel)
        };

        console.log('📤 Отправка запроса аутентификации:', { 
            username: username, 
            accessLevel: accessLevel 
        });

        return await this.mockAuthRequest(authData);
    }

    // 🎭 МОК-ЗАПРОС АУТЕНТИФИКАЦИИ
    async mockAuthRequest(authData) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (authData.username && authData.password) {
                    resolve({
                        success: true,
                        user: {
                            id: 'user_' + Date.now(),
                            username: authData.username,
                            displayName: this.generateDisplayName(authData.username),
                            accessLevel: authData.access_level,
                            avatar: this.generateAvatar(authData.username),
                            joinTime: new Date().toISOString()
                        },
                        token: 'mock_jwt_token_' + Math.random().toString(36).substr(2),
                        expiresIn: 3600
                    });
                } else {
                    reject(new Error('Неверные учетные данные'));
                }
            }, 1500);
        });
    }

    // 🎨 ГЕНЕРАЦИЯ ОТОБРАЖАЕМОГО ИМЕНИ
    generateDisplayName(username) {
        const names = {
            'admin': 'Администратор',
            'moder': 'Модератор', 
            'user': 'Игрок',
            'test': 'Тестер',
            'player': 'Игрок',
            'guest': 'Гость'
        };

        return names[username.toLowerCase()] || 
               username.charAt(0).toUpperCase() + username.slice(1).toLowerCase();
    }

    // 🖼️ ГЕНЕРАЦИЯ АВАТАРА ПО ИМЕНИ
    generateAvatar(username) {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
        const color = colors[username.length % colors.length];
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=${color.replace('#', '')}&color=fff&bold=true`;
    }

    // ✅ ОБРАБОТКА УСПЕШНОЙ АУТЕНТИФИКАЦИИ
    async handleSuccessfulAuth(userData) {
        console.log('✅ Аутентификация успешна:', userData.user);
        
        this.currentUser = userData.user;
        this.isAuthenticated = true;

        this.saveUserData(userData);
        await this.switchToGameScreen();
        this.startGameWithUser();
    }

    // ❌ ОБРАБОТКА ОШИБКИ АУТЕНТИФИКАЦИИ
    handleAuthError(error) {
        console.error('❌ Ошибка аутентификации:', error);
        this.hideLoadingState();
        this.showError(error.message || 'Ошибка подключения к серверу');
    }

    // 💾 СОХРАНЕНИЕ ДАННЫХ ПОЛЬЗОВАТЕЛЯ
    saveUserData(userData) {
        localStorage.setItem('user_data', JSON.stringify(userData.user));
        localStorage.setItem('auth_token', userData.token);
        localStorage.setItem('auth_expires', Date.now() + (userData.expiresIn * 1000));
        
        // 🎯 СОХРАНЯЕМ В ГЛОБАЛЬНУЮ ПЕРЕМЕННУЮ СРАЗУ
        window.gameUserData = userData.user;
    }

    // 🔄 ПЕРЕКЛЮЧЕНИЕ НА ИГРОВОЙ ЭКРАН
    async switchToGameScreen() {
        this.authForm.style.transition = 'opacity 0.8s ease, visibility 0.8s ease';
        this.authForm.style.opacity = '0';
        this.authForm.style.visibility = 'hidden';
        
        await new Promise(resolve => setTimeout(resolve, 800));
        
        this.authForm.style.display = 'none';
        
        if (this.gameContainer) {
            this.gameContainer.style.display = 'block';
            this.gameContainer.style.opacity = '0';
            
            setTimeout(() => {
                this.gameContainer.style.transition = 'opacity 1s ease';
                this.gameContainer.style.opacity = '1';
            }, 100);
        }

        console.log('🎮 Переход на игровой экран завершен');
    }

    // 🚀 ЗАПУСК ИГРЫ С ДАННЫМИ ПОЛЬЗОВАТЕЛЯ
startGameWithUser() {
    console.log('🎮 Запуск игры для пользователя:', this.currentUser.displayName);

    // 🎯 СОХРАНЯЕМ ДАННЫЕ В ГЛОБАЛЬНУЮ ПЕРЕМЕННУЮ
    window.gameUserData = this.currentUser;
    
    // 🚀 ЗАПУСКАЕМ ИГРУ ЧЕРЕЗ initializeGame
    if (typeof window.initializeGame === 'function') {
        window.initializeGame();
    } else {
        console.error('❌ Функция initializeGame не найдена');
        // 🔄 РЕЗЕРВНЫЙ ВАРИАНТ - ПЕРЕЗАГРУЗКА
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }
}

    // 👤 ПОЛУЧЕНИЕ ДАННЫХ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ
    getUserData() {
        return this.currentUser;
    }

    // 🔍 ПРОВЕРКА АУТЕНТИФИКАЦИИ
    checkAuth() {
        return this.isAuthenticated;
    }

    // ⏳ ПОКАЗ СОСТОЯНИЯ ЗАГРУЗКИ
    showLoadingState() {
        const submitBtn = document.getElementById('auth-submit-btn');
        if (submitBtn) {
            submitBtn.innerHTML = 'ПОДКЛЮЧЕНИЕ...';
            submitBtn.disabled = true;
        }
        
        this.hideError();
    }

    // 🎯 СКРЫТИЕ СОСТОЯНИЯ ЗАГРУЗКИ
    hideLoadingState() {
        const submitBtn = document.getElementById('auth-submit-btn');
        if (submitBtn) {
            submitBtn.innerHTML = 'ПОДКЛЮЧИТЬСЯ';
            submitBtn.disabled = false;
        }
    }

    // 🚨 ПОКАЗ ОШИБКИ
    showError(message) {
        this.hideError();
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'auth-error-message';
        errorDiv.innerHTML = `
            <div style="
                background: rgba(255, 0, 0, 0.1);
                border: 1px solid #ff4444;
                color: #ff4444;
                padding: 10px 15px;
                border-radius: 5px;
                margin-top: 15px;
                font-size: 14px;
                text-align: center;
            ">
                ⚠️ ${message}
            </div>
        `;
        
        if (this.authForm) {
            this.authForm.appendChild(errorDiv);
            this.currentError = errorDiv;
        }
    }

    // 🎯 СКРЫТИЕ ОШИБКИ
    hideError() {
        if (this.currentError && this.currentError.parentNode) {
            this.currentError.parentNode.removeChild(this.currentError);
            this.currentError = null;
        }
    }
}

// 🌐 СОЗДАЕМ ГЛОБАЛЬНЫЙ ЭКЗЕМПЛЯР
window.AuthSystem = new AuthSystem();

// 🚀 АВТОМАТИЧЕСКАЯ ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 Загрузка системы аутентификации...');
    
    // 🎯 ПРОВЕРЯЕМ СОХРАНЕННУЮ СЕССИЮ
    const savedUser = localStorage.getItem('user_data');
    const authToken = localStorage.getItem('auth_token');
    const authExpires = localStorage.getItem('auth_expires');
    
    if (savedUser && authToken && authExpires && Date.now() < parseInt(authExpires)) {
        // 🔄 АВТОМАТИЧЕСКИЙ ВХОД - ПЕРЕХОДИМ СРАЗУ К ИГРЕ
        console.log('🔄 Автоматический вход по сохраненным данным');
        const userData = JSON.parse(savedUser);
        window.gameUserData = userData;
        
        // 🎯 СКРЫВАЕМ ФОРМУ АУТЕНТИФИКАЦИИ
        const authForm = document.querySelector('.auth-form');
        const gameContainer = document.getElementById('gameContainer');
        
        if (authForm) authForm.style.display = 'none';
        if (gameContainer) gameContainer.style.display = 'block';
        
    } else {
        // 🎪 ЗАПУСКАЕМ СИСТЕМУ АУТЕНТИФИКАЦИИ
        setTimeout(() => {
            window.AuthSystem.init();
        }, 100);
    }
});