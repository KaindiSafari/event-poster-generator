const canvas = document.getElementById('posterCanvas');
const ctx = canvas.getContext('2d');
const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');

// ===== API KEYS =====
const UNSPLASH_ACCESS_KEY = ''; 
const OPENAI_API_KEY = '';

// ===== CONFIGURATION =====
const posterSizes = {
    'print': { width: 800, height: 1200 },
    'instagram-post': { width: 1080, height: 1080 },
    'instagram-story': { width: 1080, height: 1920 },
    'facebook': { width: 1920, height: 1080 },
    'a4': { width: 2480, height: 3508 }
};

const templateFonts = {
    modern: 'Arial, "Helvetica Neue", sans-serif',
    bold: '"Arial Black", Impact, sans-serif',
    minimal: 'Arial, "Century Gothic", sans-serif',
    retro: '"Courier New", Courier, monospace'
};

const templates = {
    modern: {
        bgColor: '#FFFFFF',
        primaryColor: '#2D3436',
        accentColor: '#6C5CE7',
        gradientStart: '#A29BFE',
        gradientEnd: '#6C5CE7',
        textColor: '#FFFFFF'
    },
    bold: {
        bgColor: '#FFF9E6',
        primaryColor: '#FF6B6B',
        accentColor: '#4ECDC4',
        secondaryColor: '#FFE66D',
        textColor: '#2C3E50'
    },
    minimal: {
        bgColor: '#F8F9FA',
        primaryColor: '#2C3E50',
        accentColor: '#E74C3C',
        lineColor: '#BDC3C7',
        textColor: '#2C3E50'
    },
    retro: {
        bgColor: '#FFF4E6',
        primaryColor: '#FF6B9D',
        secondaryColor: '#FFD93D',
        accentColor: '#6BCF7F',
        textColor: '#2C3E50'
    }
};

let uploadedImage = null;
let textPositionOffset = 0;

// ===== POSTER SIZE HANDLER =====
const posterSizeSelect = document.getElementById('posterSize');
if (posterSizeSelect) {
    posterSizeSelect.addEventListener('change', function() {
        const size = posterSizes[this.value];
        canvas.width = size.width;
        canvas.height = size.height;
        
        const eventName = document.getElementById('eventName').value;
        if (eventName) {
            generateBtn.click();
        }
    });
}

// ===== MANUAL IMAGE UPLOAD =====
const imageUpload = document.getElementById('imageUpload');
if (imageUpload) {
    imageUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    uploadedImage = img;
                    const preview = document.getElementById('imagePreview');
                    if (preview) {
                        preview.src = event.target.result;
                        preview.style.display = 'block';
                    }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
}
// ===== AI TEMPLATE RECOMMENDATION =====
const aiRecommendBtn = document.getElementById('aiRecommend');
if (aiRecommendBtn) {
    aiRecommendBtn.addEventListener('click', async () => {
        const eventName = document.getElementById('eventName').value.trim();
        const eventDetails = document.getElementById('eventDetails').value.trim();
        
        if (!eventName) {
            alert('Please enter an event name first!');
            return;
        }
        
        aiRecommendBtn.innerHTML = 'AI is thinking...';
        aiRecommendBtn.disabled = true;
        
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{
                        role: 'system',
                        content: 'You are a professional graphic designer helping choose poster templates. Be brief and confident.'
                    }, {
                        role: 'user',
                        content: `Event: "${eventName}"
${eventDetails ? `Details: "${eventDetails}"` : ''}

Choose ONE template and explain why in 10 words max:

Templates:
- modern: Clean, professional, corporate events, elegant
- bold: Energetic, fun, parties, celebrations, youth events
- minimal: Sophisticated, elegant, formal, high-end
- retro: Vintage, nostalgic, throwback, groovy, 70s vibes

Format: "[template] - [reason]"`
                    }],
                    max_tokens: 50,
                    temperature: 0.7
                })
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error.message);
            }
            
            const recommendation = data.choices[0].message.content.trim();
            
            let selectedTemplate = 'modern';
            if (recommendation.toLowerCase().includes('bold')) selectedTemplate = 'bold';
            else if (recommendation.toLowerCase().includes('minimal')) selectedTemplate = 'minimal';
            else if (recommendation.toLowerCase().includes('retro')) selectedTemplate = 'retro';
            else if (recommendation.toLowerCase().includes('modern')) selectedTemplate = 'modern';
            
            document.getElementById('template').value = selectedTemplate;
            
            const resultDiv = document.getElementById('aiResult');
            if (resultDiv) {
                resultDiv.textContent = `AI says: ${recommendation}`;
                resultDiv.style.display = 'block';
            }
            
            aiRecommendBtn.innerHTML = 'Template Selected!';
            setTimeout(() => {
                aiRecommendBtn.innerHTML = 'AI: Recommend Best Template';
                aiRecommendBtn.disabled = false;
            }, 2000);
            
        } catch (error) {
            console.error('AI Error:', error);
            alert('AI recommendation failed. Please select template manually.');
            aiRecommendBtn.innerHTML = 'AI: Recommend Best Template';
            aiRecommendBtn.disabled = false;
        }
    });
}

// ===== SMART IMAGE SEARCH =====
const searchBtn = document.getElementById('searchBtn');
if (searchBtn) {
    searchBtn.addEventListener('click', async function() {
        const query = document.getElementById('imageSearch').value.toLowerCase().trim();
        if (!query) {
            alert('Please enter a search term');
            return;
        }
        
        const resultsDiv = document.getElementById('imageResults');
        resultsDiv.innerHTML = '<p style="color: #667eea; text-align: center; grid-column: 1 / -1;">Searching...</p>';
        
        const searchTerms = getRelatedTerms(query);
        
        try {
            const promises = searchTerms.map(term =>
                fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(term)}&per_page=3&orientation=squarish`, {
                    headers: { 'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}` }
                }).then(r => r.json())
            );
            
            const results = await Promise.all(promises);
            
            const allPhotos = [];
            const seenIds = new Set();
            
            results.forEach(data => {
                if (data.results) {
                    data.results.forEach(photo => {
                        if (!seenIds.has(photo.id) && allPhotos.length < 8) {
                            allPhotos.push(photo);
                            seenIds.add(photo.id);
                        }
                    });
                }
            });
            
            if (allPhotos.length === 0) {
                resultsDiv.innerHTML = '<p style="color: #e74c3c; text-align: center; grid-column: 1 / -1;">No images found!</p>';
                return;
            }
            
            resultsDiv.innerHTML = '';
            allPhotos.forEach(photo => {
                const div = document.createElement('div');
                div.style.cssText = 'cursor: pointer; border-radius: 8px; overflow: hidden; border: 2px solid transparent; transition: all 0.3s;';
                div.onmouseover = () => div.style.borderColor = '#667eea';
                div.onmouseout = () => div.style.borderColor = 'transparent';
                
                const img = document.createElement('img');
                img.src = photo.urls.small;
                img.style.cssText = 'width: 100%; height: 120px; object-fit: cover; display: block;';
                img.onclick = () => selectUnsplashImage(photo.urls.regular);
                
                div.appendChild(img);
                resultsDiv.appendChild(div);
            });
            
            const credit = document.createElement('p');
            credit.style.cssText = 'grid-column: 1 / -1; font-size: 0.75rem; color: #7f8c8d; text-align: center; margin-top: 0.5rem;';
            credit.innerHTML = `Photos by <a href="https://unsplash.com" target="_blank" style="color: #667eea;">Unsplash</a>`;
            resultsDiv.appendChild(credit);
            
        } catch (error) {
            console.error('Error:', error);
            resultsDiv.innerHTML = '<p style="color: #e74c3c; text-align: center; grid-column: 1 / -1;">Error loading images!</p>';
        }
    });
}

function getRelatedTerms(query) {
    const map = {
        'party': ['party', 'celebration', 'balloons'],
        'wedding': ['wedding', 'bride', 'flowers'],
        'church': ['church', 'worship', 'prayer'],
        'community': ['community', 'people', 'gathering'],
        'nature': ['nature', 'forest', 'landscape'],
        'food': ['food', 'meal', 'restaurant'],
        'diva': ['fashion', 'glamour', 'elegant woman'],
        'hospital': ['hospital', 'medical', 'healthcare'],
        'business': ['business', 'office', 'professional'],
        'school': ['school', 'students', 'education'],
        'sports': ['sports', 'fitness', 'athlete'],
        'music': ['music', 'concert', 'performance'],
        'tech': ['technology', 'computer', 'digital'],
        'kids': ['children', 'family', 'play'],
        'love': ['love', 'heart', 'romance'],
        'clothes': ['clothing', 'fashion', 'wardrobe'],
        'people': ['people', 'crowd', 'group']
    };
    
    for (const [key, terms] of Object.entries(map)) {
        if (query.includes(key) || key.includes(query)) {
            return terms;
        }
    }
    
    return [query, `${query} event`, `${query} background`];
}

function selectUnsplashImage(imageUrl) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
        uploadedImage = img;
        const preview = document.getElementById('imagePreview');
        if (preview) {
            preview.src = imageUrl;
            preview.style.display = 'block';
        }
        alert('Image selected! Click Generate Poster.');
    };
    img.src = imageUrl;
}

// ===== SEARCH SUGGESTIONS (IMPROVED) =====
const imageSearchInput = document.getElementById('imageSearch');
const suggestionsDiv = document.getElementById('searchSuggestions');

if (imageSearchInput && suggestionsDiv) {
    // Show default suggestions immediately
    showSuggestions(['church', 'party', 'wedding', 'nature', 'business']);
    
    imageSearchInput.addEventListener('input', function() {
        const value = this.value.toLowerCase().trim();
        
        if (value.length < 2) {
            // Show popular searches when empty
            showSuggestions(['church', 'party', 'wedding', 'nature', 'business']);
            return;
        }
        
        const suggestions = getSuggestions(value);
        if (suggestions.length > 0) {
            showSuggestions(suggestions);
        } else {
            // Fallback to popular searches
            showSuggestions(['church', 'party', 'wedding', 'nature', 'business']);
        }
    });
    
    // Also show suggestions when clicking the input
    imageSearchInput.addEventListener('focus', function() {
        const value = this.value.toLowerCase().trim();
        if (value.length < 2) {
            showSuggestions(['church', 'party', 'wedding', 'nature', 'business']);
        }
    });
}

function showSuggestions(suggestions) {
    const suggestDiv = document.getElementById('searchSuggestions');
    if (!suggestDiv) return;
    
    suggestDiv.innerHTML = '';
    
    suggestions.forEach(word => {
        const btn = document.createElement('button');
        btn.textContent = word;
        btn.type = 'button';
        btn.className = 'suggestion-pill';
        btn.style.cssText = `
            padding: 0.5rem 1rem;
            background: rgba(102, 92, 238, 0.15);
            border: 2px solid rgba(102, 92, 238, 0.4);
            border-radius: 25px;
            color: #667eea;
            cursor: pointer;
            font-size: 0.9rem;
            transition: all 0.2s;
            font-weight: 600;
        `;
        
        btn.onmouseover = () => {
            btn.style.background = 'rgba(102, 92, 238, 0.3)';
            btn.style.borderColor = '#667eea';
            btn.style.transform = 'translateY(-2px)';
        };
        
        btn.onmouseout = () => {
            btn.style.background = 'rgba(102, 92, 238, 0.15)';
            btn.style.borderColor = 'rgba(102, 92, 238, 0.4)';
            btn.style.transform = 'translateY(0)';
        };
        
        btn.onclick = () => {
            document.getElementById('imageSearch').value = word;
            document.getElementById('searchBtn').click();
        };
        
        suggestDiv.appendChild(btn);
    });
}

function getSuggestions(query) {
    const suggestionMap = {
        // Partial matches
        'ch': ['church', 'worship', 'celebration'],
        'chu': ['church', 'worship', 'prayer'],
        'pa': ['party', 'celebration', 'people'],
        'par': ['party', 'celebration', 'gathering'],
        'we': ['wedding', 'bride', 'celebration'],
        'wed': ['wedding', 'bride', 'love'],
        'bu': ['business', 'office', 'meeting'],
        'bus': ['business', 'professional', 'corporate'],
        'na': ['nature', 'forest', 'landscape'],
        'nat': ['nature', 'trees', 'mountains'],
        'fo': ['food', 'restaurant', 'meal'],
        'foo': ['food', 'cooking', 'dinner'],
        
        // Full matches
        'church': ['worship', 'prayer', 'cross', 'faith', 'bible'],
        'party': ['celebration', 'balloons', 'confetti', 'dancing', 'cake'],
        'wedding': ['bride', 'groom', 'flowers', 'rings', 'love'],
        'business': ['office', 'meeting', 'professional', 'corporate', 'team'],
        'nature': ['forest', 'mountains', 'sunset', 'trees', 'landscape'],
        'community': ['people', 'gathering', 'volunteers', 'together', 'crowd'],
        'school': ['students', 'classroom', 'learning', 'education', 'books'],
        'food': ['restaurant', 'dinner', 'cooking', 'meal', 'chef'],
        'diva': ['fashion', 'glamour', 'style', 'elegant', 'beauty'],
        'hospital': ['medical', 'healthcare', 'doctor', 'clinic', 'nurse'],
        'sports': ['fitness', 'athlete', 'game', 'active', 'competition'],
        'music': ['concert', 'instruments', 'performance', 'band', 'singing'],
        'tech': ['technology', 'computers', 'digital', 'innovation', 'coding'],
        'kids': ['children', 'family', 'play', 'fun', 'toys'],
        'love': ['heart', 'romance', 'couple', 'valentine', 'flowers'],
        'fitness': ['gym', 'exercise', 'workout', 'health', 'training'],
        'coffee': ['cafe', 'espresso', 'morning', 'beans', 'latte'],
        'beach': ['ocean', 'sand', 'summer', 'vacation', 'tropical']
    };
    
    // Check for matches
    for (const [key, suggestions] of Object.entries(suggestionMap)) {
        if (query === key || query.startsWith(key) || key.includes(query)) {
            return suggestions.slice(0, 5);
        }
    }
    
    // Default popular searches
    return ['church', 'party', 'nature', 'food', 'business'];
}
// ===== GENERATE POSTER =====
generateBtn.addEventListener('click', () => {
    const template = document.getElementById('template').value;
    const eventName = document.getElementById('eventName').value || 'YOUR EVENT NAME';
    const eventDate = document.getElementById('eventDate').value || 'DATE TBA';
    const eventTime = document.getElementById('eventTime').value || 'TIME TBA';
    const eventLocation = document.getElementById('eventLocation').value || 'LOCATION TBA';
    const eventDetails = document.getElementById('eventDetails').value || '';

    drawPoster(template, eventName, eventDate, eventTime, eventLocation, eventDetails);
});

function drawPoster(templateName, name, date, time, location, details) {
    const template = templates[templateName];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (templateName === 'modern') {
        drawModernTemplate(template, name, date, time, location, details);
    } else if (templateName === 'bold') {
        drawBoldTemplate(template, name, date, time, location, details);
    } else if (templateName === 'minimal') {
        drawMinimalTemplate(template, name, date, time, location, details);
    } else if (templateName === 'retro') {
        drawRetroTemplate(template, name, date, time, location, details);
    }
}

// ===== MODERN TEMPLATE =====
function drawModernTemplate(t, name, date, time, location, details) {
    if (uploadedImage) {
        ctx.drawImage(uploadedImage, 0, 0, canvas.width, canvas.height);
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(15, 15, 30, 0.75)');
        gradient.addColorStop(1, 'rgba(15, 15, 30, 0.92)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(102, 92, 238, 0.3)';
        ctx.fillRect(0, 0, 8, canvas.height);
    }
    
    const margin = 120;
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 ${Math.min(85, canvas.width * 0.095)}px ${templateFonts.modern}`;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 4;
    
    wrapText(ctx, name.toUpperCase(), canvas.width / 2, margin + textPositionOffset, canvas.width - 140, 95);
    
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = '#6C5CE7';
    const lineWidth = 120;
    ctx.fillRect((canvas.width - lineWidth) / 2, margin + 80, lineWidth, 4);
    
    const cardY = margin + 200;
    const cardPadding = 60;
    const cardWidth = canvas.width - 160;
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 15;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
    roundRect(ctx, 80, cardY, cardWidth, 600, 16);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    let yPos = cardY + 80;
    const leftMargin = 80 + cardPadding;
    
    ctx.fillStyle = '#6C5CE7';
    ctx.font = `600 ${Math.min(20, canvas.width * 0.025)}px ${templateFonts.modern}`;
    ctx.textAlign = 'left';
    ctx.fillText('DATE', leftMargin, yPos);
    
    ctx.fillStyle = '#2D3436';
    ctx.font = `700 ${Math.min(42, canvas.width * 0.048)}px ${templateFonts.modern}`;
    ctx.fillText(date, leftMargin, yPos + 45);
    
    yPos += 130;
    ctx.fillStyle = '#6C5CE7';
    ctx.font = `600 ${Math.min(20, canvas.width * 0.025)}px ${templateFonts.modern}`;
    ctx.fillText('TIME', leftMargin, yPos);
    
    ctx.fillStyle = '#2D3436';
    ctx.font = `600 ${Math.min(38, canvas.width * 0.045)}px ${templateFonts.modern}`;
    ctx.fillText(time, leftMargin, yPos + 42);
    
    yPos += 130;
    ctx.fillStyle = '#6C5CE7';
    ctx.font = `600 ${Math.min(20, canvas.width * 0.025)}px ${templateFonts.modern}`;
    ctx.fillText('LOCATION', leftMargin, yPos);
    
    ctx.fillStyle = '#2D3436';
    ctx.font = `600 ${Math.min(35, canvas.width * 0.042)}px ${templateFonts.modern}`;
    wrapText(ctx, location, leftMargin, yPos + 42, cardWidth - cardPadding * 2, 42);
    
    if (details) {
        yPos += 150;
        ctx.fillStyle = '#7F8C8D';
        ctx.font = `400 ${Math.min(28, canvas.width * 0.033)}px ${templateFonts.modern}`;
        wrapText(ctx, details, leftMargin, yPos, cardWidth - cardPadding * 2, 36);
    }
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 ${Math.min(24, canvas.width * 0.028)}px ${templateFonts.modern}`;
    ctx.textAlign = 'center';
    ctx.fillText('ALL WELCOME', canvas.width / 2, canvas.height - 80);
    
    ctx.fillStyle = '#6C5CE7';
    ctx.fillRect(0, canvas.height - 8, canvas.width, 8);
}

// ===== BOLD TEMPLATE =====
function drawBoldTemplate(t, name, date, time, location, details) {
    if (uploadedImage) {
        ctx.drawImage(uploadedImage, 0, 0, canvas.width, canvas.height);
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(255, 107, 107, 0.85)');
        gradient.addColorStop(1, 'rgba(255, 107, 107, 0.65)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#FF6B6B');
        gradient.addColorStop(1, '#4ECDC4');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    ctx.fillStyle = 'rgba(255, 230, 109, 0.25)';
    ctx.beginPath();
    ctx.arc(canvas.width - 100, 150, 200, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(78, 205, 196, 0.25)';
    ctx.beginPath();
    ctx.arc(100, canvas.height - 150, 180, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 ${Math.min(95, canvas.width * 0.11)}px ${templateFonts.bold}`;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;
    
    wrapText(ctx, name.toUpperCase(), canvas.width / 2, 200 + textPositionOffset, canvas.width - 120, 105);
    
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    const cardY = 450;
    const cardGap = 15;
    const cardWidth = (canvas.width - 140 - cardGap * 2) / 3;
    const cardHeight = 200;
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;
    
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, 70, cardY, cardWidth, cardHeight, 20);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    ctx.fillStyle = '#FF6B6B';
    ctx.font = `900 ${Math.min(60, canvas.width * 0.07)}px ${templateFonts.bold}`;
    ctx.fillText('📅', 70 + cardWidth / 2, cardY + 80);
    
    ctx.fillStyle = '#2D3436';
    ctx.font = `800 ${Math.min(24, canvas.width * 0.028)}px ${templateFonts.bold}`;
    wrapText(ctx, date, 70 + cardWidth / 2, cardY + 145, cardWidth - 30, 28);
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;
    
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, 70 + cardWidth + cardGap, cardY, cardWidth, cardHeight, 20);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    ctx.fillStyle = '#4ECDC4';
    ctx.font = `900 ${Math.min(60, canvas.width * 0.07)}px ${templateFonts.bold}`;
    ctx.fillText('🕐', 70 + cardWidth + cardGap + cardWidth / 2, cardY + 80);
    
    ctx.fillStyle = '#2D3436';
    ctx.font = `800 ${Math.min(24, canvas.width * 0.028)}px ${templateFonts.bold}`;
    wrapText(ctx, time, 70 + cardWidth + cardGap + cardWidth / 2, cardY + 145, cardWidth - 30, 28);
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;
    
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, 70 + (cardWidth + cardGap) * 2, cardY, cardWidth, cardHeight, 20);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    ctx.fillStyle = '#FFE66D';
    ctx.font = `900 ${Math.min(60, canvas.width * 0.07)}px ${templateFonts.bold}`;
    ctx.fillText('📍', 70 + (cardWidth + cardGap) * 2 + cardWidth / 2, cardY + 80);
    
    ctx.fillStyle = '#2D3436';
    ctx.font = `800 ${Math.min(22, canvas.width * 0.026)}px ${templateFonts.bold}`;
    wrapText(ctx, location, 70 + (cardWidth + cardGap) * 2 + cardWidth / 2, cardY + 145, cardWidth - 30, 26);
    
    if (details) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 25;
        ctx.shadowOffsetY = 12;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        roundRect(ctx, 70, cardY + cardHeight + 40, canvas.width - 140, 180, 20);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        
        ctx.fillStyle = '#2D3436';
        ctx.font = `600 ${Math.min(30, canvas.width * 0.035)}px ${templateFonts.bold}`;
        wrapText(ctx, details, canvas.width / 2, cardY + cardHeight + 110, canvas.width - 200, 38);
    }
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 25;
    ctx.shadowOffsetY = 12;
    
    ctx.fillStyle = '#2D3436';
    roundRect(ctx, 100, canvas.height - 180, canvas.width - 200, 110, 20);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    ctx.fillStyle = '#FFE66D';
    ctx.font = `900 ${Math.min(50, canvas.width * 0.058)}px ${templateFonts.bold}`;
    ctx.fillText('JOIN US!', canvas.width / 2, canvas.height - 108);
}

// ===== MINIMAL TEMPLATE =====
function drawMinimalTemplate(t, name, date, time, location, details) {
    if (uploadedImage) {
        ctx.drawImage(uploadedImage, 0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#FAFAFA';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.03)';
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.width; i += 50) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvas.height);
            ctx.stroke();
        }
    }
    
    ctx.fillStyle = '#E74C3C';
    ctx.fillRect(0, 0, 12, canvas.height);
    
    const leftMargin = 80;
    ctx.fillStyle = '#1A1A1A';
    ctx.font = `900 ${Math.min(100, canvas.width * 0.115)}px ${templateFonts.minimal}`;
    ctx.textAlign = 'left';
    
    wrapText(ctx, name.toUpperCase(), leftMargin, 180 + textPositionOffset, canvas.width - leftMargin - 60, 110);
    
    ctx.fillStyle = '#E74C3C';
    ctx.fillRect(leftMargin, 320, 80, 6);
    
    let yPos = 450;
    const labelSpacing = 160;
    
    ctx.fillStyle = '#E74C3C';
    ctx.font = `700 ${Math.min(22, canvas.width * 0.026)}px ${templateFonts.minimal}`;
    ctx.fillText('DATE', leftMargin, yPos);
    
    ctx.fillStyle = '#1A1A1A';
    ctx.font = `600 ${Math.min(44, canvas.width * 0.05)}px ${templateFonts.minimal}`;
    ctx.fillText(date, leftMargin, yPos + 52);
    
    yPos += labelSpacing;
    ctx.fillStyle = '#E74C3C';
    ctx.font = `700 ${Math.min(22, canvas.width * 0.026)}px ${templateFonts.minimal}`;
    ctx.fillText('TIME', leftMargin, yPos);
    
    ctx.fillStyle = '#1A1A1A';
    ctx.font = `600 ${Math.min(44, canvas.width * 0.05)}px ${templateFonts.minimal}`;
    ctx.fillText(time, leftMargin, yPos + 52);
    
    yPos += labelSpacing;
    ctx.fillStyle = '#E74C3C';
    ctx.font = `700 ${Math.min(22, canvas.width * 0.026)}px ${templateFonts.minimal}`;
    ctx.fillText('LOCATION', leftMargin, yPos);
    
    ctx.fillStyle = '#1A1A1A';
    ctx.font = `600 ${Math.min(40, canvas.width * 0.046)}px ${templateFonts.minimal}`;
    wrapText(ctx, location, leftMargin, yPos + 52, canvas.width - leftMargin - 60, 48);
    
    if (details) {
        yPos += 180;
        ctx.fillStyle = '#4A4A4A';
        ctx.font = `400 ${Math.min(32, canvas.width * 0.037)}px ${templateFonts.minimal}`;
        wrapText(ctx, details, leftMargin, yPos, canvas.width - leftMargin - 60, 40);
    }
    
    ctx.fillStyle = '#E74C3C';
    ctx.fillRect(0, canvas.height - 12, canvas.width, 12);
}

// ===== RETRO TEMPLATE =====
function drawRetroTemplate(t, name, date, time, location, details) {
    if (uploadedImage) {
        ctx.drawImage(uploadedImage, 0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(255, 244, 230, 0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#FFF8E7';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    const centerX = canvas.width / 2;
    const rays = 16;
    for (let i = 0; i < rays; i++) {
        const angle = (Math.PI * 2 / rays) * i;
        if (i % 2 === 0) {
            ctx.fillStyle = 'rgba(255, 211, 61, 0.15)';
        } else {
            ctx.fillStyle = 'rgba(255, 107, 157, 0.15)';
        }
        ctx.beginPath();
        ctx.moveTo(centerX, 0);
        ctx.arc(centerX, 0, 800, angle, angle + (Math.PI * 2 / rays));
        ctx.closePath();
        ctx.fill();
    }
    
    ctx.fillStyle = '#FF6B9D';
    ctx.font = `900 ${Math.min(110, canvas.width * 0.125)}px ${templateFonts.retro}`;
    ctx.textAlign = 'center';
    ctx.shadowColor = '#6BCF7F';
    ctx.shadowOffsetX = 10;
    ctx.shadowOffsetY = 10;
    ctx.shadowBlur = 0;
    
    wrapText(ctx, name.toUpperCase(), canvas.width / 2, 230 + textPositionOffset, canvas.width - 100, 120);
    
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    const boxY = 500;
    const boxHeight = 500;
    
    ctx.fillStyle = '#FF6B9D';
    roundRect(ctx, 100, boxY, canvas.width - 200, boxHeight, 30);
    ctx.fill();
    
    ctx.fillStyle = '#FFD93D';
    roundRect(ctx, 110, boxY + 10, canvas.width - 220, boxHeight - 20, 25);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
    roundRect(ctx, 120, boxY + 20, canvas.width - 240, boxHeight - 40, 20);
    ctx.fill();
    
    let infoY = boxY + 110;
    
    ctx.fillStyle = '#2D3436';
    ctx.font = `900 ${Math.min(50, canvas.width * 0.058)}px ${templateFonts.retro}`;
    ctx.fillText('📅  ' + date, canvas.width / 2, infoY);
    
    infoY += 100;
    ctx.fillText('🕐  ' + time, canvas.width / 2, infoY);
    
    infoY += 110;
    ctx.font = `800 ${Math.min(42, canvas.width * 0.048)}px ${templateFonts.retro}`;
    wrapText(ctx, '📍  ' + location, canvas.width / 2, infoY, canvas.width - 300, 52);
    
    if (details) {
        infoY += 120;
        ctx.font = `400 ${Math.min(34, canvas.width * 0.039)}px ${templateFonts.retro}`;
        wrapText(ctx, details, canvas.width / 2, infoY, canvas.width - 300, 42);
    }
    
    ctx.fillStyle = '#FF6B9D';
    ctx.font = `900 ${Math.min(48, canvas.width * 0.055)}px ${templateFonts.retro}`;
    ctx.shadowColor = '#FFD93D';
    ctx.shadowOffsetX = 6;
    ctx.shadowOffsetY = 6;
    ctx.fillText('✌️ PEACE & LOVE! ✌️', canvas.width / 2, canvas.height - 80);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}
// ===== HELPER FUNCTIONS =====
function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function wrapText(context, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    const lines = [];

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = context.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line);

    const startY = y - (lines.length - 1) * lineHeight / 2;
    lines.forEach((line, index) => {
        context.fillText(line.trim(), x, startY + (index * lineHeight));
    });
}

// ===== DOWNLOAD BUTTON =====
downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    const eventName = document.getElementById('eventName').value || 'event';
    link.download = `${eventName.toLowerCase().replace(/\s+/g, '-')}-poster.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
});

// ===== COPY TO CLIPBOARD =====
const copyBtn = document.getElementById('copyBtn');
if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
        try {
            canvas.toBlob(async (blob) => {
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
                alert('✅ Poster copied to clipboard!');
            });
        } catch (err) {
            alert('⚠️ Copy failed. Try Download instead!');
        }
    });
}

// ===== SHARE BUTTONS =====
const shareWhatsApp = document.getElementById('shareWhatsApp');
if (shareWhatsApp) {
    shareWhatsApp.addEventListener('click', () => {
        canvas.toBlob((blob) => {
            const file = new File([blob], 'poster.png', { type: 'image/png' });
            if (navigator.share) {
                navigator.share({
                    files: [file],
                    title: 'Event Poster',
                    text: 'Check out this event poster!'
                }).catch(() => {
                    window.open(`https://wa.me/?text=Check out this poster!`);
                });
            } else {
                window.open(`https://wa.me/?text=Check out this poster!`);
            }
        });
    });
}

const shareInstagram = document.getElementById('shareInstagram');
if (shareInstagram) {
    shareInstagram.addEventListener('click', () => {
        canvas.toBlob((blob) => {
            const file = new File([blob], 'poster.png', { type: 'image/png' });
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({
                    files: [file],
                    title: 'Event Poster',
                    text: 'Check out this event poster!'
                }).catch(() => {
                    alert('Download the poster and share it manually on Instagram!');
                    downloadBtn.click();
                });
            } else {
                alert('Download the poster and share it manually on Instagram!');
                downloadBtn.click();
            }
        });
    });
}

const shareFacebook = document.getElementById('shareFacebook');
if (shareFacebook) {
    shareFacebook.addEventListener('click', () => {
        const eventName = document.getElementById('eventName').value || 'Event';
        const url = encodeURIComponent(window.location.href);
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${encodeURIComponent(eventName)}`, '_blank');
    });
}

const shareTwitter = document.getElementById('shareTwitter');
if (shareTwitter) {
    shareTwitter.addEventListener('click', () => {
        const eventName = document.getElementById('eventName').value || 'Event';
        const text = encodeURIComponent(`Just created a poster for ${eventName}! Check out this free tool:`);
        const url = encodeURIComponent(window.location.href);
        window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
    });
}

// ===== INITIAL LOAD - WELCOME SCREEN =====
window.addEventListener('load', () => {
    // Draw blank canvas with instructions
    ctx.fillStyle = '#0f0f1e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Subtle gradient overlay
    const gradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 100, canvas.width/2, canvas.height/2, 600);
    gradient.addColorStop(0, 'rgba(102, 92, 238, 0.15)');
    gradient.addColorStop(1, 'rgba(102, 92, 238, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Welcome text
    ctx.fillStyle = '#e8e9f3';
    ctx.font = 'bold 50px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Event Poster Generator', canvas.width/2, canvas.height/2 - 100);
    
    ctx.fillStyle = '#b8b9c7';
    ctx.font = '30px Arial';
    ctx.fillText('Fill in your event details', canvas.width/2, canvas.height/2);
    ctx.fillText('Choose a template', canvas.width/2, canvas.height/2 + 50);
    ctx.fillText('Then click Generate!', canvas.width/2, canvas.height/2 + 100);
    
    ctx.font = 'bold 25px Arial';
    ctx.fillStyle = '#ecc827';
    ctx.fillText('Start here', canvas.width/2, canvas.height/2 + 180);
});