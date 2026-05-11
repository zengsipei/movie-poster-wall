// 公共功能脚本

// 主题管理
const ThemeManager = {
    THEME_KEY: 'movie-wall-theme',
    
    init() {
        // 从localStorage加载主题
        const savedTheme = localStorage.getItem(this.THEME_KEY) || 'dark';
        this.setTheme(savedTheme);
        
        // 监听导航栏滚动
        this.initScrollEffect();
    },
    
    setTheme(theme) {
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        localStorage.setItem(this.THEME_KEY, theme);
        this.updateThemeIcon(theme);
    },
    
    toggleTheme() {
        const currentTheme = localStorage.getItem(this.THEME_KEY) || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    },
    
    updateThemeIcon(theme) {
        const themeBtn = document.querySelector('.theme-toggle');
        if (themeBtn) {
            themeBtn.textContent = theme === 'dark' ? '🌞' : '🌙';
        }
    },
    
    initScrollEffect() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;
        
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }
};

// 收藏管理
const FavoritesManager = {
    FAVORITES_KEY: 'movie-wall-favorites',
    
    // 获取所有收藏
    getAll() {
        const favorites = localStorage.getItem(this.FAVORITES_KEY);
        const list = favorites ? JSON.parse(favorites) : [];
        // 统一转换为数字ID，避免字符串/数字不一致导致比较失败
        return Array.isArray(list)
            ? list.map(id => Number(id)).filter(id => Number.isFinite(id))
            : [];
    },
    
    // 添加收藏
    add(movieId) {
        const id = Number(movieId);
        const favorites = this.getAll();
        if (!favorites.includes(id)) {
            favorites.push(id);
            localStorage.setItem(this.FAVORITES_KEY, JSON.stringify(favorites));
            this.dispatchChange();
            return true;
        }
        return false;
    },
    
    // 移除收藏
    remove(movieId) {
        const id = Number(movieId);
        let favorites = this.getAll();
        const next = favorites.filter(mid => mid !== id);
        const changed = next.length !== favorites.length;
        if (changed) {
            localStorage.setItem(this.FAVORITES_KEY, JSON.stringify(next));
            this.dispatchChange();
            return true;
        }
        return false;
    },
    
    // 切换收藏状态
    toggle(movieId) {
        const id = Number(movieId);
        if (this.isFavorited(id)) {
            this.remove(id);
            return false;
        } else {
            this.add(id);
            return true;
        }
    },
    
    // 检查是否已收藏
    isFavorited(movieId) {
        const id = Number(movieId);
        return this.getAll().includes(id);
    },
    
    // 获取收藏数量
    getCount() {
        return this.getAll().length;
    },
    
    // 派发收藏变化事件
    dispatchChange() {
        window.dispatchEvent(new CustomEvent('favoritesChanged', {
            detail: { favorites: this.getAll() }
        }));
    }
};

// 创建收藏按钮
function createFavoriteButton(movieId, className = 'favorite-btn') {
    const isFavorited = FavoritesManager.isFavorited(movieId);
    const button = document.createElement('button');
    button.className = className;
    if (isFavorited) {
        button.classList.add('favorited');
    }
    button.innerHTML = `${isFavorited ? '❤️' : '🤍'} ${isFavorited ? '已收藏' : '收藏'}`;
    button.dataset.movieId = movieId;
    
    button.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        const newState = FavoritesManager.toggle(movieId);
        button.classList.toggle('favorited', newState);
        button.innerHTML = `${newState ? '❤️' : '🤍'} ${newState ? '已收藏' : '收藏'}`;
    });
    
    return button;
}

// 导航高亮
function setActiveNav(pageName) {
    const navLinks = document.querySelectorAll('.navbar-nav a');
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === pageName) {
            link.classList.add('active');
        }
    });
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 格式化时长
function formatRuntime(minutes) {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}小时${mins}分钟` : `${mins}分钟`;
}

// URL参数工具
const URLParams = {
    get(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    },
    
    set(name, value) {
        const url = new URL(window.location);
        url.searchParams.set(name, value);
        window.history.pushState({}, '', url);
    }
};

// 显示加载状态
function showLoading(container) {
    container.innerHTML = '<div class="loading">加载中</div>';
}

// 显示错误信息
function showError(container, message = '加载失败，请稍后再试') {
    container.innerHTML = `
        <div class="error-message">
            <h2>😕</h2>
            <p>${message}</p>
        </div>
    `;
}

// 页面初始化时执行
document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
});
