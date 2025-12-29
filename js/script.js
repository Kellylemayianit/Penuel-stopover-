// Penuel Stopover - Professional Script Suite
// Includes AI Chat, Dynamic Data Bridge, Analytics, and UX Enhancements

// ============================================
// 1. DOCUMENT READY & INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    initNavbar();
    initAI();
    injectHeroOffers();
    initScrollAnimations();
    trackPageInteractions();
    loadDynamicContent();
});

// ============================================
// 2. NAVBAR ENHANCEMENTS
// ============================================

function initNavbar() {
    const navbar = document.querySelector('.navbar');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Sticky navbar scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Active link tracking
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Smooth navigation
    document.querySelectorAll('a[href^="mailto:"], a[href^="tel:"]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            window.location.href = href;
        });
    });
}

// ============================================
// 3. AI CHAT WIDGET INITIALIZATION
// ============================================

const chatState = {
    messages: [],
    isLoading: false,
    sessionId: generateSessionId(),
    context: {
        page: 'index',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
    }
};

function initAI() {
    const chatWidget = document.getElementById('ai-chat-widget');
    
    if (!chatWidget) return;

    chatWidget.innerHTML = `
        <div class="chat-header">
            <h5 class="mb-0">💬 Penuel Assistant</h5>
            <small>Ask us anything about services, pricing, or hours</small>
        </div>
        <div class="chat-messages" id="chatMessages" style="height: 250px; overflow-y: auto; padding: 1rem;">
            <div class="message bot-message">
                <p class="small mb-0">Welcome to Penuel Stopover! 🦁 How can I help you today? Ask about our Restaurant, Supermarket, Service Bay, or Car Wash services.</p>
            </div>
        </div>
        <div class="chat-input-group">
            <div class="d-flex gap-2">
                <input type="text" id="chatInput" class="form-control form-control-sm" placeholder="Type your question here..." autocomplete="off" />
                <button id="chatSend" class="btn btn-success btn-sm">
                    <span id="sendText">Send</span>
                    <span id="sendLoader" style="display: none;">
                        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    </span>
                </button>
            </div>
        </div>
    `;

    attachChatListeners();
}

function attachChatListeners() {
    const chatInput = document.getElementById('chatInput');
    const chatSend = document.getElementById('chatSend');

    if (!chatInput || !chatSend) return;

    // Send button click
    chatSend.addEventListener('click', handleSendMessage);

    // Enter key press
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // Focus animation
    chatInput.addEventListener('focus', function() {
        this.style.borderColor = 'var(--success)';
    });

    chatInput.addEventListener('blur', function() {
        this.style.borderColor = 'var(--border)';
    });
}

function handleSendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();

    if (!message || chatState.isLoading) return;

    chatState.isLoading = true;
    updateSendButton(true);

    const chatMessages = document.getElementById('chatMessages');
    displayMessage(message, 'user', chatMessages);
    chatInput.value = '';

    // Add to chat history
    chatState.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
    });

    // Send to N8N
    sendChatMessage(message, chatMessages);
}

function sendChatMessage(message, container) {
    const n8nEndpoint = 'https://your-n8n-instance.com/webhook/penuel-chat';

    const payload = {
        message: message,
        sessionId: chatState.sessionId,
        context: chatState.context,
        messageHistory: chatState.messages.slice(-5) // Send last 5 messages for context
    };

    fetch(n8nEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': chatState.sessionId
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000) // 10 second timeout
    })
    .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    })
    .then(data => {
        const reply = data.reply || data.message || 'Thank you for your inquiry. We will respond shortly.';
        
        chatState.messages.push({
            role: 'assistant',
            content: reply,
            timestamp: new Date().toISOString()
        });

        displayMessage(reply, 'bot', container);
        trackChatInteraction('message_received', { hasResponse: !!data.reply });
    })
    .catch(error => {
        console.error('Chat error:', error);
        const errorMsg = 'Unable to connect right now. Please call us directly or try again in a moment.';
        displayMessage(errorMsg, 'bot', container);
        trackChatInteraction('message_error', { error: error.message });
    })
    .finally(() => {
        chatState.isLoading = false;
        updateSendButton(false);
    });
}

function displayMessage(text, sender, container) {
    const messageDiv = document.createElement('div');
    messageDiv.className = sender === 'user' ? 'message user-message' : 'message bot-message';
    
    const p = document.createElement('p');
    p.className = 'small mb-0';
    p.textContent = text;
    
    messageDiv.appendChild(p);
    container.appendChild(messageDiv);
    
    // Scroll to bottom
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 0);
}

function updateSendButton(isLoading) {
    const sendBtn = document.getElementById('chatSend');
    const sendText = document.getElementById('sendText');
    const sendLoader = document.getElementById('sendLoader');

    if (isLoading) {
        sendText.style.display = 'none';
        sendLoader.style.display = 'inline';
        sendBtn.disabled = true;
    } else {
        sendText.style.display = 'inline';
        sendLoader.style.display = 'none';
        sendBtn.disabled = false;
    }
}

// ============================================
// 4. DYNAMIC DATA BRIDGE - HERO OFFERS
// ============================================

function injectHeroOffers() {
    const heroOffers = document.getElementById('hero-offers');
    
    if (!heroOffers) return;

    const offersEndpoint = '/api/daily-specials';

    fetch(offersEndpoint, { signal: AbortSignal.timeout(5000) })
        .then(response => response.json())
        .then(data => {
            if (data.specials && Array.isArray(data.specials) && data.specials.length > 0) {
                renderOffers(heroOffers, data.specials);
                trackPageInteraction('offers_loaded', { count: data.specials.length });
            }
        })
        .catch(error => {
            console.log('Daily specials unavailable:', error.message);
        });
}

function renderOffers(container, specials) {
    let html = '<div class="alert alert-info"><strong>🎉 Today\'s Specials:</strong><br>';
    
    specials.forEach((special, index) => {
        html += `<span class="badge bg-warning text-dark me-2 mb-2">${special.name}${special.discount ? ` - ${special.discount}% OFF` : ''}</span>`;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// ============================================
// 5. SCROLL ANIMATIONS
// ============================================

function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.service-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        observer.observe(card);
    });
}

// ============================================
// 6. PAGE INTERACTION TRACKING
// ============================================

const analyticsQueue = [];

function trackChatInteraction(action, metadata = {}) {
    const event = {
        type: 'chat_interaction',
        action: action,
        timestamp: new Date().toISOString(),
        sessionId: chatState.sessionId,
        metadata: metadata
    };
    
    analyticsQueue.push(event);
    
    // Send in batches every 30 seconds or when queue is full
    if (analyticsQueue.length >= 5) {
        flushAnalytics();
    }
}

function trackPageInteraction(action, metadata = {}) {
    const event = {
        type: 'page_interaction',
        action: action,
        timestamp: new Date().toISOString(),
        page: 'index',
        metadata: metadata
    };
    
    analyticsQueue.push(event);
}

function flushAnalytics() {
    if (analyticsQueue.length === 0) return;

    const analyticsEndpoint = '/api/analytics';
    const eventsToSend = [...analyticsQueue];
    analyticsQueue.length = 0;

    fetch(analyticsEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ events: eventsToSend }),
        keepalive: true
    }).catch(error => console.log('Analytics send failed:', error.message));
}

// Flush analytics periodically
setInterval(flushAnalytics, 30000);

// Flush on page unload
window.addEventListener('beforeunload', flushAnalytics);

// ============================================
// 7. LOAD DYNAMIC CONTENT
// ============================================

function loadDynamicContent() {
    // Load featured services or promotions
    const serviceCards = document.querySelectorAll('.service-card');
    
    serviceCards.forEach((card, index) => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px)';
        });
    });

    // Track button clicks
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            trackPageInteraction('button_click', {
                buttonText: this.textContent.trim(),
                buttonClass: this.className
            });
        });
    });
}

// ============================================
// 8. UTILITY FUNCTIONS
// ============================================

function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Debounce utility for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle utility for scroll events
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Log page performance
function logPerformance() {
    if (window.performance && window.performance.timing) {
        const timing = window.performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        console.log(`Page load time: ${loadTime}ms`);
    }
}

window.addEventListener('load', logPerformance);

// ============================================
// 9. ACCESSIBILITY & UX
// ============================================

// Keyboard navigation support
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K to focus chat
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const chatInput = document.getElementById('chatInput');
        if (chatInput) chatInput.focus();
    }
});

// Detect dark mode preference
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    // Future dark mode implementation
}


// ========================================
// BACK TO TOP BUTTON FUNCTIONALITY
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    const backToTopBtn = document.querySelector('.back-to-top');
    
    if (!backToTopBtn) return;

    // Show/Hide back-to-top button based on scroll position
    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            backToTopBtn.classList.add('show');
        } else {
            backToTopBtn.classList.remove('show');
        }
    });

    // Smooth scroll to top when button is clicked
    backToTopBtn.addEventListener('click', function(e) {
        e.preventDefault();
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
});