// 详情页逻辑

let movieData = null;

// 初始化
async function init() {
    // 详情页不需要导航高亮
    setActiveNav();
    
    const movieId = URLParams.get('id');
    
    if (!movieId) {
        showError(document.querySelector('.detail-container'), '未找到电影信息');
        return;
    }
    
    try {
        showLoading(document.querySelector('.detail-container'));
        movieData = await getMovieDetail(movieId);
        
        if (movieData) {
            renderDetail();
        } else {
            showError(document.querySelector('.detail-container'), '未找到该电影');
        }
    } catch (error) {
        console.error('加载失败:', error);
        showError(document.querySelector('.detail-container'));
    }
}

// 渲染详情页
function renderDetail() {
    const container = document.querySelector('.detail-container');
    const backdropUrl = getImageUrl(movieData.backdrop_path || movieData.poster_path, 'original');
    const posterUrl = getImageUrl(movieData.poster_path, 'w500');
    const rating = movieData.vote_average || 0;
    const stars = generateStars(rating);
    
    // 类型标签
    const genres = movieData.genres || [];
    const genresHtml = genres.map(g => `<span class="genre-tag">${g.name}</span>`).join('');
    
    // 演员列表
    const cast = movieData.credits?.cast || [];
    const castHtml = cast.slice(0, 8).map(actor => {
        const photoUrl = getImageUrl(actor.profile_path, 'w185');
        return `
            <div class="cast-item">
                <img src="${photoUrl || 'https://via.placeholder.com/185x278?text=No+Photo'}" 
                     alt="${actor.name}" 
                     class="cast-photo"
                     onerror="this.src='https://via.placeholder.com/185x278?text=No+Photo'">
                <div class="cast-name">${actor.name}</div>
                <div class="cast-character">${actor.character || ''}</div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = `
        <!-- 背景 -->
        <div class="detail-backdrop" style="background-image: url('${backdropUrl}')"></div>
        
        <!-- 内容 -->
        <div class="detail-content">
            <!-- 主信息 -->
            <div class="detail-header">
                <div class="detail-poster">
                    <img src="${posterUrl}" alt="${movieData.title}" onerror="this.src='https://via.placeholder.com/320x480?text=No+Image'">
                </div>
                
                <div class="detail-info">
                    <h1 class="detail-title">${movieData.title}</h1>
                    ${movieData.original_title !== movieData.title ? 
                        `<div class="detail-original-title">${movieData.original_title}</div>` : ''}
                    
                    <div class="detail-rating">
                        <span class="stars">${stars}</span>
                        <span class="rating-score">${rating.toFixed(1)}</span>
                        <span class="rating-count">(${movieData.vote_count || 0} 评价)</span>
                    </div>
                    
                    <div class="detail-meta">
                        ${movieData.release_date ? `
                            <div class="meta-item">
                                <span class="meta-label">上映日期:</span>
                                <span>${formatDate(movieData.release_date)}</span>
                            </div>
                        ` : ''}
                        ${movieData.runtime ? `
                            <div class="meta-item">
                                <span class="meta-label">时长:</span>
                                <span>${formatRuntime(movieData.runtime)}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${genres.length > 0 ? `
                        <div class="detail-genres">
                            ${genresHtml}
                        </div>
                    ` : ''}
                    
                    <div class="detail-actions">
                        <div id="favorite-btn-container"></div>
                    </div>
                </div>
            </div>
            
            <!-- 剧情简介 -->
            ${movieData.overview ? `
                <div class="detail-section">
                    <h2 class="section-title">剧情简介</h2>
                    <p class="detail-overview">${movieData.overview}</p>
                </div>
            ` : ''}
            
            <!-- 演员阵容 -->
            ${cast.length > 0 ? `
                <div class="detail-section">
                    <h2 class="section-title">演员阵容</h2>
                    <div class="cast-list">
                        ${castHtml}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    // 添加收藏按钮
    const favoriteContainer = document.getElementById('favorite-btn-container');
    if (favoriteContainer) {
        favoriteContainer.appendChild(createFavoriteButton(movieData.id, 'btn btn-icon favorite-btn'));
    }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', init);
