// 首页逻辑 - 全屏轮播版 (修正缩略图逻辑)
let movies = [];
let currentIndex = 0;
let autoPlayInterval = null;
let carouselOffset = 0; // Index of the first visible thumbnail
const ITEMS_PER_VIEW = 10; // Fixed number of visible items

// 初始化
async function init() {
    setActiveNav('home');
    
    try {
        // Fetch movies
        movies = await getUpcomingMovies(); 
        
        if (movies && movies.length > 0) {
            setupHeroStructure();
            // Initial Render
            updateHero(0);
            renderCarousel();
            startAutoPlay();
            
            // Add key listener
            document.addEventListener('keydown', handleKeyPress);
        } else {
            document.getElementById('hero').innerHTML = '<div class="loading">暂无数据</div>';
        }
    } catch (error) {
        console.error('加载失败:', error);
        document.getElementById('hero').innerHTML = '<div class="loading">加载失败</div>';
    }
}

function setupHeroStructure() {
    const heroContainer = document.getElementById('hero');
    heroContainer.innerHTML = `
        <div class="hero-background" id="hero-bg"></div>
        <div class="hero-overlay"></div>
        <div class="hero-overlay-horizontal"></div>
        
        <div class="hero-content" id="hero-content">
            <!-- Content injected by JS -->
        </div>
    `;
}

function updateHero(index) {
    if (index < 0 || index >= movies.length) return;
    
    // Update State
    currentIndex = index;
    const movie = movies[index];
    
    // Update Background
    const bgEl = document.getElementById('hero-bg');
    const backdropUrl = getImageUrl(movie.backdrop_path || movie.poster_path, 'original');
    
    bgEl.style.color = 'transparent'; // hack to trigger change? No, just url
    bgEl.style.backgroundImage = `url('${backdropUrl}')`;
    
    // Trigger zoom effect reset
    const hero = document.querySelector('.hero');
    hero.classList.remove('active-zoom');
    void hero.offsetWidth; 
    hero.classList.add('active-zoom');

    // Update Content
    const contentEl = document.getElementById('hero-content');
    contentEl.classList.remove('active');
    
    setTimeout(() => {
        const isFav = FavoritesManager.isFavorited(movie.id);
        const year = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
        
        contentEl.innerHTML = `
            <h1 class="hero-title">${movie.title}</h1>
            
            <div class="hero-meta">
                <span class="hero-rating">HD</span>
                <span class="hero-rating" style="background:#ffd700; color:#000;">${rating}</span>
                <span>${year}</span>
                <span>${movie.original_title}</span>
            </div>
            
            <p class="hero-overview">${movie.overview || '暂无简介'}</p>
        `;
        contentEl.classList.add('active');
        
        // Update Static Buttons
        updateStaticButtons(movie);
    }, 200);

    // Update Thumbnails Active State & Scroll to view
    updateThumbnailState(index);
}

function renderCarousel() {
    const container = document.getElementById('carousel-thumbnails');
    if (!container) return;
    
    // Inject Structure with Buttons
    // Check if we need buttons (if total > 10)
    const showControls = movies.length > ITEMS_PER_VIEW;
    
    let html = '';
    
    if (showControls) {
        html += `<button class="nav-btn prev" onclick="scrollCarousel(-1)">‹</button>`;
    }
    
    html += `<div class="carousel-viewport"><div class="carousel-track" id="track">`;
    
    html += movies.map((movie, index) => {
        const posterUrl = getImageUrl(movie.poster_path, 'w200');
        return `
            <div class="thumbnail-item" 
                 onclick="onThumbnailClick(${index})"
                 id="thumb-${index}">
                <img src="${posterUrl}" alt="${movie.title}" loading="lazy">
            </div>
        `;
    }).join('');
    
    html += `</div></div>`;
    
    if (showControls) {
        html += `<button class="nav-btn next" onclick="scrollCarousel(1)">›</button>`;
    }
    
    container.innerHTML = html;
    
    // Update button states initially
    updateCarouselButtons();
}

function updateThumbnailState(index) {
    document.querySelectorAll('.thumbnail-item').forEach(el => el.classList.remove('active'));
    
    const currentThumb = document.getElementById(`thumb-${index}`);
    if (currentThumb) {
        currentThumb.classList.add('active');
    }
    
    // Auto-scroll logic: If selected item is outside current visible window, scroll to it
    // But user asked for "Manual navigation" specifically via buttons for overflow.
    // However, if auto-play selects an item, we should probably scroll to it IF it's hidden.
    // Let's implement a "smart follow" logic.
    
    if (index < carouselOffset) {
        // Target is to the left of view
        carouselOffset = index;
        applyTrackTransform();
    } else if (index >= carouselOffset + ITEMS_PER_VIEW) {
        // Target is to the right of view
        carouselOffset = index - ITEMS_PER_VIEW + 1;
        applyTrackTransform();
    }
    updateCarouselButtons();
}

function scrollCarousel(direction) {
    // direction: -1 (left) or 1 (right)
    // Scroll by ITEMS_PER_VIEW amount or 1?
    // "Left right move buttons" -> maybe scroll by 1 pages worth or half page? 
    // Let's scroll by ITEMS_PER_VIEW for "paging" feel, or 5.
    const step = 5;
    
    let newOffset = carouselOffset + (direction * step);
    
    // Bounds check
    const maxOffset = Math.max(0, movies.length - ITEMS_PER_VIEW);
    
    if (newOffset < 0) newOffset = 0;
    if (newOffset > maxOffset) newOffset = maxOffset;
    
    carouselOffset = newOffset;
    applyTrackTransform();
    updateCarouselButtons();
}

function applyTrackTransform() {
    const track = document.getElementById('track');
    if (!track) return;
    
    // Determine the width percentage of one shift.
    // We are shifting by 'carouselOffset' items.
    // Each item is approx (100% / 10). 
    // So shift percentage is roughly (carouselOffset * 10)%.
    // But we need to account for gaps.
    // CSS calc logic: flex: 0 0 calc((100% - 90px) / 10);
    // It's safer to just set Transform in percentage based on item Width.
    // 1 item = 10% of Viewport (including gap).
    // Actually, gap is fixed px (10px). Percentage calc is tricky.
    // Simpler: use negative margin-left on first child? No, animation.
    
    // Let's assume viewport width is 100%. track width is (movies.length * 10%) approx? No.
    // Let's use JS to calculate pixel shift or use percentage approximation.
    // 10 items fit perfectly.
    // Shift = -1 * (carouselOffset * (100% / ITEMS_PER_VIEW + GapCorrection?))
    
    // Actually, if we use translateX with percentage, 100% = width of track? No, width of element.
    // If track is flexbox container, its width grows.
    
    // Better way:
    // Move element by: -(carouselOffset * (ItemWidth + Gap))
    // ItemWidth + Gap = ViewportWidth / 10.
    // So translateX = -(carouselOffset * 10)% of Viewport Width.
    
    track.style.transform = `translateX(-${carouselOffset * (100 / ITEMS_PER_VIEW)}%)`;
    
    // CSS Note: 
    // .thumbnail-item { flex: 0 0 calc((100% - 90px) / 10); margin-right: 10px? No, we used gap. }
    // If we use gap: 10px, the precise percentage shift is tricky.
    // Let's rely on the fact that (Item + Gap) * 10 = Viewport + 10px (extra gap at end).
    // Let's just try percentage.
}

function updateCarouselButtons() {
    const prevBtn = document.querySelector('.nav-btn.prev');
    const nextBtn = document.querySelector('.nav-btn.next');
    if (!prevBtn || !nextBtn) return;
    
    const maxOffset = Math.max(0, movies.length - ITEMS_PER_VIEW);
    
    prevBtn.disabled = carouselOffset <= 0;
    nextBtn.disabled = carouselOffset >= maxOffset;
}

function onThumbnailClick(index) {
    if (index === currentIndex) return;
    updateHero(index);
    resetAutoPlay();
}

function startAutoPlay() {
    stopAutoPlay();
    autoPlayInterval = setInterval(() => {
        let nextIndex = currentIndex + 1;
        if (nextIndex >= movies.length) nextIndex = 0;
        updateHero(nextIndex);
    }, 8000); 
}

function stopAutoPlay() {
    if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
    }
}

function resetAutoPlay() {
    stopAutoPlay();
    startAutoPlay();
}

function handleKeyPress(e) {
    if (e.key === 'ArrowRight') {
        let next = currentIndex + 1;
        if (next >= movies.length) next = 0;
        updateHero(next);
        resetAutoPlay();
    } else if (e.key === 'ArrowLeft') {
        let prev = currentIndex - 1;
        if (prev < 0) prev = movies.length - 1;
        updateHero(prev);
        resetAutoPlay();
    }
}

function toggleHeroFavorite(movieId, btnElement) {
    if(event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    // Check if FavoritesManager is available
    if (typeof FavoritesManager === 'undefined') {
        console.error('FavoritesManager not loaded');
        return;
    }

    const newState = FavoritesManager.toggle(movieId);
    if(btnElement) {
        btnElement.innerHTML = newState ? '✓ 已收藏' : '+ 收藏';
    }
}

function updateStaticButtons(movie) {
    const btnDetail = document.getElementById('hero-btn-detail');
    const btnFav = document.getElementById('hero-btn-fav');
    
    if (btnDetail) {
        btnDetail.href = `detail.html?id=${movie.id}`;
    }
    
    if (btnFav) {
        const isFav = FavoritesManager.isFavorited(movie.id);
        if (isFav) {
            btnFav.classList.add('active');
        } else {
            btnFav.classList.remove('active');
        }
    }
}

function handleStaticFavorite() {
    if (currentIndex < 0 || currentIndex >= movies.length) return;
    const movie = movies[currentIndex];
    
    const newState = FavoritesManager.toggle(movie.id);
    const btnFav = document.getElementById('hero-btn-fav');
    
    if (btnFav) {
         if (newState) {
            btnFav.classList.add('active');
        } else {
            btnFav.classList.remove('active');
        }
    }
}

// Global
window.onThumbnailClick = onThumbnailClick;
window.scrollCarousel = scrollCarousel;
window.toggleHeroFavorite = toggleHeroFavorite;
window.handleStaticFavorite = handleStaticFavorite;

document.addEventListener('DOMContentLoaded', init);
