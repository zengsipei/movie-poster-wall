// 收藏页逻辑

let favoriteMovies = [];

// 初始化
async function init() {
    setActiveNav('favorites');
    renderFavorites();
    
    // 监听收藏变化
    window.addEventListener('favoritesChanged', () => {
        renderFavorites();
    });
}

// 渲染收藏列表
async function renderFavorites() {
    const container = document.querySelector('.favorites-container');
    const favoriteIds = FavoritesManager.getAll();
    
    if (favoriteIds.length === 0) {
        renderEmptyState(container);
        return;
    }
    
    // 从数据中获取完整电影信息
    favoriteMovies = [];
    for (const id of favoriteIds) {
        const movie = await getMovieDetail(id);
        if (movie) {
            favoriteMovies.push(movie);
        }
    }
    
    container.innerHTML = `
        <div class="favorites-content">
            <div class="favorites-header">
                <h1 class="favorites-title">我的收藏</h1>
                <p class="favorites-count">共 ${favoriteMovies.length} 部电影</p>
            </div>
            
            <div class="favorites-grid" id="favorites-grid">
                ${renderMovieCards()}
            </div>
        </div>
    `;
    
    // 绑定事件
    bindCardEvents();
}

// 渲染电影卡片
function renderMovieCards() {
    return favoriteMovies.map(movie => {
        const posterUrl = getImageUrl(movie.poster_path, 'w342');
        const rating = movie.vote_average || 0;
        
        return `
            <div class="movie-card" data-movie-id="${movie.id}">
                <div class="card-poster-wrapper">
                    <img src="${posterUrl}" 
                         alt="${movie.title}" 
                         class="card-poster"
                         onerror="this.src='https://via.placeholder.com/342x513?text=No+Image'">
                    
                    <button class="remove-btn" data-movie-id="${movie.id}" title="取消收藏">
                        ✕
                    </button>
                    
                    <div class="card-rating">
                        ★ ${rating.toFixed(1)}
                    </div>
                </div>
                
                <div class="card-title">${movie.title}</div>
            </div>
        `;
    }).join('');
}

// 渲染空状态
function renderEmptyState(container) {
    container.innerHTML = `
        <div class="favorites-content">
            <div class="empty-state">
                <div class="empty-icon">📽️</div>
                <h2 class="empty-title">还没有收藏的电影</h2>
                <p class="empty-description">快去首页发现喜欢的电影吧！</p>
                <a href="index.html" class="btn btn-primary">去首页看看</a>
            </div>
        </div>
    `;
}

// 绑定卡片事件
function bindCardEvents() {
    // 点击卡片跳转详情
    document.querySelectorAll('.movie-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // 如果点击的是删除按钮，不跳转
            if (e.target.classList.contains('remove-btn')) {
                return;
            }
            
            const movieId = card.dataset.movieId;
            window.location.href = `detail.html?id=${movieId}`;
        });
    });
    
    // 删除按钮
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const movieId = btn.dataset.movieId;
            removeFromFavorites(movieId);
        });
    });
}

// 从收藏中移除
function removeFromFavorites(movieId) {
    const card = document.querySelector(`.movie-card[data-movie-id="${movieId}"]`);
    
    if (card) {
        // 添加删除动画
        card.classList.add('removing');
        
        // 动画结束后移除
        setTimeout(() => {
            FavoritesManager.remove(movieId);
            // 注意：FavoritesManager.remove() 会触发 favoritesChanged 事件
            // 事件监听器会自动调用 renderFavorites()，所以这里不需要再调用一次
        }, 300);
    }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', init);
