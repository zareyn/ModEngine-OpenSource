document.addEventListener('DOMContentLoaded', function() {
    // Элементы DOM
    const introElement = document.getElementById('intro');
    const authContainer = document.getElementById('auth-container');
    const loadingProgress = document.getElementById('loading-progress');
    const letters = document.querySelectorAll('.pixel-letter');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterBtn = document.getElementById('show-register');
    const showLoginBtn = document.getElementById('show-login');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const authMessage = document.getElementById('auth-message');
    
    // Анимация загрузки и появления букв
    let progress = 0;
    const loadingInterval = setInterval(() => {
        progress += 2;
        loadingProgress.style.width = `${progress}%`;
        
        if (progress >= 100) {
            clearInterval(loadingInterval);
            setTimeout(showAuthForm, 1000);
        }
    }, 100);
    
    // Анимация появления букв
    letters.forEach((letter, index) => {
        setTimeout(() => {
            letter.style.opacity = 1;
            letter.style.transform = 'translateY(0)';
            
            // Добавляем эффект "падения" как в тетрисе
            letter.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            
            // Добавляем эффект ржавчины с помощью случайных текстур
            const rustLevel = Math.random() * 30 + 70;
            letter.style.filter = `url(#rusted) brightness(${rustLevel}%)`;
        }, 500 + index * 300);
    });
    
    // Показать форму авторизации
    function showAuthForm() {
        introElement.style.opacity = 0;
        setTimeout(() => {
            introElement.classList.add('hidden');
            authContainer.classList.remove('hidden');
        }, 1000);
    }
    
    // Переключение между формами входа и регистрации
    showRegisterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        clearMessage();
    });
    
    showLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        clearMessage();
    });
    
    // Очистка сообщений
    function clearMessage() {
        authMessage.classList.add('hidden');
        authMessage.textContent = '';
    }
    
    // Показать сообщение
    function showMessage(text, isError = false) {
        authMessage.textContent = text;
        authMessage.classList.remove('hidden');
        authMessage.className = isError ? 'error-message' : 'success-message';
    }
    
    // Обработка входа
    loginBtn.addEventListener('click', () => {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        
        if (!username || !password) {
            showMessage('Заполните все поля', true);
            return;
        }
        
        fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showMessage('Успешный вход! Перенаправление...');
                setTimeout(() => {
                    window.location.href = '/game';
                }, 1000);
            } else {
                showMessage(data.message, true);
            }
        })
        .catch(error => {
            showMessage('Ошибка соединения', true);
            console.error('Error:', error);
        });
    });
    
    // Обработка регистрации
    registerBtn.addEventListener('click', () => {
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm').value;
        
        if (!username || !password || !confirmPassword) {
            showMessage('Заполните все поля', true);
            return;
        }
        
        if (password !== confirmPassword) {
            showMessage('Пароли не совпадают', true);
            return;
        }
        
        if (password.length < 6) {
            showMessage('Пароль должен содержать не менее 6 символов', true);
            return;
        }
        
        fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showMessage('Регистрация успешна! Перенаправление...');
                setTimeout(() => {
                    window.location.href = '/game';
                }, 1000);
            } else {
                showMessage(data.message, true);
            }
        })
        .catch(error => {
            showMessage('Ошибка соединения', true);
            console.error('Error:', error);
        });
    });
    
    // Проверка авторизации при загрузке
    fetch('/api/check-auth')
        .then(response => response.json())
        .then(data => {
            if (data.authenticated) {
                window.location.href = '/game';
            }
        });
});