// Scripts para o Sistema CEA

document.addEventListener('DOMContentLoaded', function() {
    // Adicionar animação de fade-in aos cards
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
    
    // Tooltip para badges
    const badges = document.querySelectorAll('.badge');
    badges.forEach(badge => {
        badge.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.1)';
        });
        badge.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });
    
    // Simular atualização de XP
    const xpBar = document.querySelector('.progress-bar');
    if (xpBar) {
        let currentXP = 1450;
        const targetXP = 1500;
        const increment = 1;
        const interval = setInterval(() => {
            if (currentXP < targetXP) {
                currentXP += increment;
                const percentage = (currentXP / 3500) * 100;
                xpBar.style.width = percentage + '%';
                document.querySelector('.d-flex.justify-content-between span').textContent = 
                    `${currentXP} / 3500 XP`;
            } else {
                clearInterval(interval);
            }
        }, 50);
    }
    
    // Menu mobile
    const navbarToggler = document.querySelector('.navbar-toggler');
    const navbarCollapse = document.querySelector('.navbar-collapse');
    
    if (navbarToggler) {
        navbarToggler.addEventListener('click', function() {
            navbarCollapse.classList.toggle('show');
        });
    }
    
    // Fechar menu ao clicar em link (mobile)
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth < 992) {
                navbarCollapse.classList.remove('show');
            }
        });
    });
    
    // Scroll suave para seções
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Animação de contagem para estatísticas
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach(stat => {
        const finalValue = stat.textContent;
        let currentValue = 0;
        const increment = parseInt(finalValue) / 50;
        const timer = setInterval(() => {
            currentValue += increment;
            if (currentValue >= parseInt(finalValue)) {
                stat.textContent = finalValue;
                clearInterval(timer);
            } else {
                stat.textContent = Math.floor(currentValue);
            }
        }, 30);
    });
});

// Função para simular login (apenas visual)
function simulateLogin(event) {
    event.preventDefault();
    
    const raInput = document.getElementById('ra');
    const passwordInput = document.getElementById('password');
    const ra = raInput.value.trim();
    const password = passwordInput.value;
    
    // Validação do formato do RA (1 letra + 8 dígitos)
    const raPattern = /^[a-zA-Z]\d{8}$/;
    
    if (!ra) {
        showError(raInput, 'Por favor, digite seu RA');
        return;
    }
    
    if (!raPattern.test(ra)) {
        showError(raInput, 'RA inválido. Formato: letra + 8 dígitos (ex: a2587246)');
        return;
    }
    
    if (!password) {
        showError(passwordInput, 'Por favor, digite sua senha');
        return;
    }
    
    const button = event.target.querySelector('button[type="submit"]');
    const originalText = button.textContent;
    
    button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Entrando...';
    button.disabled = true;
    
    setTimeout(() => {
        button.innerHTML = '<i class="bi bi-check-circle me-2"></i>Redirecionando...';
        setTimeout(() => {
            window.location.href = '/dashboard/';
        }, 1000);
    }, 1500);
}

// Função para mostrar erros nos campos
function showError(input, message) {
    const formGroup = input.closest('.mb-3');
    
    // Remove erro anterior se existir
    const existingError = formGroup.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Adiciona classe de erro
    input.classList.add('is-invalid');
    
    // Cria e adiciona mensagem de erro
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message text-danger small mt-1';
    errorDiv.textContent = message;
    formGroup.appendChild(errorDiv);
    
    // Remove o erro quando o usuário começar a digitar
    input.addEventListener('input', function() {
        input.classList.remove('is-invalid');
        const error = formGroup.querySelector('.error-message');
        if (error) {
            error.remove();
        }
    }, { once: true });
}

// Formatação automática do RA (primeira letra minúscula)
document.addEventListener('DOMContentLoaded', function() {
    const raInput = document.getElementById('ra');
    if (raInput) {
        raInput.addEventListener('input', function(e) {
            let value = e.target.value;
            
            // Mantém apenas a primeira letra e números
            value = value.replace(/[^a-zA-Z0-9]/g, '');
            
            // Limita a 9 caracteres (1 letra + 8 dígitos)
            if (value.length > 9) {
                value = value.substring(0, 9);
            }
            
            // Primeira letra minúscula
            if (value.length > 0) {
                value = value[0].toLowerCase() + value.substring(1);
            }
            
            e.target.value = value;
        });
    }
});

// Adicionar evento de submit ao formulário de login
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.querySelector('form');
    if (loginForm && loginForm.querySelector('#ra')) {
        loginForm.addEventListener('submit', simulateLogin);
    }
});
