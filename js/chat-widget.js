/**
 * Penuel Stopover - Floating Chat Widget
 * ============================================
 * Mobile-optimized chat widget with N8N integration
 * Similar to Sironosim Gardens implementation
 */

(function() {
    'use strict';

    // Configuration
    var CONFIG = {
        N8N_WEBHOOK: 'https://your-n8n-instance.com/webhook/penuel-chat',
        API_KEY: 'your-api-key-here',
        TIMEOUT: 30000,
        STORAGE_KEY: 'penuel_user_id'
    };

    // Initialize chat widget
    function initChatWidget() {
        var chatBtn = document.getElementById('penuel-chat-btn');
        var chatWindow = document.getElementById('penuel-chat-window');
        var closeBtn = document.getElementById('penuel-chat-close');
        var sendBtn = document.getElementById('penuel-chat-send');
        var input = document.getElementById('penuel-chat-input');
        var messagesContainer = document.getElementById('penuel-chat-messages');

        // Verify all elements exist
        if (!chatBtn || !chatWindow || !closeBtn || !sendBtn || !input || !messagesContainer) {
            console.warn('Chat widget elements not found');
            return;
        }

        // Warning for unconfigured API
        if (CONFIG.N8N_WEBHOOK.includes('your-n8n-instance')) {
            console.warn('⚠️ Chat widget: Configure N8N_WEBHOOK URL in chat-widget.js');
        }

        /**
         * Toggle chat window open/close
         */
        function toggleChat() {
            var isMobile = window.innerWidth <= 768;

            if (chatWindow.classList.contains('penuel-chat-hidden')) {
                // Open chat
                chatWindow.classList.remove('penuel-chat-hidden');
                chatBtn.classList.add('penuel-chat-active');

                // Lock scroll on mobile
                if (isMobile) {
                    document.body.classList.add('penuel-chat-open');
                    var scrollPos = window.pageYOffset || document.documentElement.scrollTop;
                    document.body.setAttribute('data-scroll-pos', scrollPos);
                    document.body.style.top = -scrollPos + 'px';
                }

                // Focus input
                setTimeout(function() {
                    input.focus();
                }, isMobile ? 300 : 100);

                scrollToBottom();
            } else {
                // Close chat
                chatWindow.classList.add('penuel-chat-hidden');
                chatBtn.classList.remove('penuel-chat-active');

                // Restore scroll on mobile
                if (isMobile) {
                    document.body.classList.remove('penuel-chat-open');
                    var scrollPos = parseInt(document.body.getAttribute('data-scroll-pos')) || 0;
                    document.body.style.top = '';
                    window.scrollTo(0, scrollPos);
                }

                input.blur();
            }
        }

        /**
         * Scroll messages to bottom
         */
        function scrollToBottom() {
            setTimeout(function() {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 100);
        }

        /**
         * Add message to chat
         */
        function addMessage(text, sender) {
            var msgDiv = document.createElement('div');
            msgDiv.className = 'penuel-chat-msg penuel-chat-' + sender;
            msgDiv.textContent = text;
            messagesContainer.appendChild(msgDiv);
            scrollToBottom();
        }

        /**
         * Show loading indicator
         */
        function showLoading() {
            var loader = document.createElement('div');
            loader.id = 'penuel-chat-loader';
            loader.className = 'penuel-chat-msg penuel-chat-bot penuel-chat-typing';
            loader.innerHTML = '<span></span><span></span><span></span>';
            messagesContainer.appendChild(loader);
            scrollToBottom();
        }

        /**
         * Remove loading indicator
         */
        function hideLoading() {
            var loader = document.getElementById('penuel-chat-loader');
            if (loader && loader.parentNode) {
                loader.parentNode.removeChild(loader);
            }
        }

        /**
         * Get or create user ID
         */
        function getUserId() {
            try {
                var userId = localStorage.getItem(CONFIG.STORAGE_KEY);
                if (!userId) {
                    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    localStorage.setItem(CONFIG.STORAGE_KEY, userId);
                }
                return userId;
            } catch (e) {
                return 'user_' + Date.now();
            }
        }

        /**
         * Send message to N8N
         */
        function sendMessage() {
            var messageText = input.value.trim();
            if (!messageText) return;

            // Show user message
            addMessage(messageText, 'user');
            input.value = '';

            // Refocus on mobile
            if (window.innerWidth <= 768) {
                input.blur();
                setTimeout(function() {
                    input.focus();
                }, 100);
            }

            // Show loading
            showLoading();

            // Prepare data
            var payload = {
                message: messageText,
                userId: getUserId(),
                page: window.location.pathname,
                timestamp: new Date().toISOString()
            };

            // Send via fetch
            fetch(CONFIG.N8N_WEBHOOK, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': CONFIG.API_KEY
                },
                body: JSON.stringify(payload),
                timeout: CONFIG.TIMEOUT
            })
            .then(function(response) {
                if (!response.ok) throw new Error('Network error');
                return response.json();
            })
            .then(function(data) {
                hideLoading();
                var reply = data.response || data.reply || data.message || 
                           'Sorry, I could not process that. Please try again.';
                addMessage(reply, 'bot');
            })
            .catch(function(error) {
                hideLoading();
                console.error('Chat error:', error);
                addMessage('Unable to connect. Please try again later.', 'bot');
            });
        }

        /**
         * Event Listeners
         */
        chatBtn.addEventListener('click', toggleChat);
        closeBtn.addEventListener('click', toggleChat);
        sendBtn.addEventListener('click', sendMessage);

        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Handle window resize
        window.addEventListener('resize', function() {
            if (!chatWindow.classList.contains('penuel-chat-hidden')) {
                scrollToBottom();
            }
        });

        console.log('✅ Penuel Chat Widget initialized');
    }

    /**
     * Initialize when DOM is ready
     */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(initChatWidget, 100);
        });
    } else {
        setTimeout(initChatWidget, 100);
    }
})();