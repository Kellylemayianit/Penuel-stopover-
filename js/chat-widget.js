/**
 * Penuel Stopover - Persistent Chat Widget
 * ============================================
 * Loads external HTML and manages chat functionality
 * Works across all pages with smooth navigation
 */

(function() {
    'use strict';

    var WIDGET_HTML_PATH = '/chat-widget.html';
    var WIDGET_CONTAINER_ID = 'penuel-chat-container';
    var initialized = false;

    /**
     * Load external chat widget HTML
     */
    function loadChatWidget() {
        // Check if already loaded
        if (document.getElementById(WIDGET_CONTAINER_ID)) {
            initializeChatEvents();
            return;
        }

        // Fetch external HTML
        fetch(WIDGET_HTML_PATH)
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Failed to load chat widget');
                }
                return response.text();
            })
            .then(function(html) {
                // Extract only the chat widget HTML (not the full page)
                var parser = new DOMParser();
                var doc = parser.parseFromString(html, 'text/html');
                
                // Find chat container in the loaded HTML
                var chatContainer = doc.getElementById(WIDGET_CONTAINER_ID);
                
                if (chatContainer) {
                    // Append to body
                    document.body.appendChild(chatContainer.cloneNode(true));
                    
                    // Load CSS
                    loadChatCSS();
                    
                    // Initialize events
                    setTimeout(function() {
                        initializeChatEvents();
                    }, 100);
                } else {
                    console.error('Chat widget container not found in external HTML');
                }
            })
            .catch(function(error) {
                console.error('Error loading chat widget:', error);
            });
    }

    /**
     * Load chat widget CSS
     */
    function loadChatCSS() {
        if (!document.querySelector('link[href*="chat-widget.css"]')) {
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'css/chat-widget.css';
            document.head.appendChild(link);
        }
    }

    /**
     * Initialize chat events
     */
    function initializeChatEvents() {
        if (initialized) return;

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

        /**
         * Toggle chat window
         */
        function toggleChat() {
            var isMobile = window.innerWidth <= 480;

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
                }, 100);

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
            }, 50);
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
         * Show typing indicator
         */
        function showTyping() {
            var typingDiv = document.createElement('div');
            typingDiv.id = 'penuel-chat-typing';
            typingDiv.className = 'penuel-chat-msg penuel-chat-bot penuel-chat-typing';
            typingDiv.innerHTML = '<span></span><span></span><span></span>';
            messagesContainer.appendChild(typingDiv);
            scrollToBottom();
        }

        /**
         * Hide typing indicator
         */
        function hideTyping() {
            var typing = document.getElementById('penuel-chat-typing');
            if (typing && typing.parentNode) {
                typing.parentNode.removeChild(typing);
            }
        }

        /**
         * Get bot response
         */
        function getBotResponse(userMessage) {
            var msg = userMessage.toLowerCase();

            if (msg.includes('menu') || msg.includes('food') || msg.includes('eat') || msg.includes('restaurant')) {
                return 'Check out our Restaurant Menu section! We serve authentic Kenyan and continental cuisine for breakfast, lunch, and dinner.';
            }

            if (msg.includes('service') || msg.includes('car wash') || msg.includes('maintenance') || msg.includes('wash')) {
                return 'We offer professional vehicle services including Service Bay, inspections, repairs, and premium Car Wash packages. Visit Services page!';
            }

            if (msg.includes('shop') || msg.includes('buy') || msg.includes('product') || msg.includes('supermarket')) {
                return 'Our Supermarket has groceries, snacks, beverages, and supplies. Perfect for stocking up before your wildlife adventure!';
            }

            if (msg.includes('location') || msg.includes('where') || msg.includes('address') || msg.includes('direction')) {
                return 'We\'re located in Kimana on Loitokitok Road. Call +254 XXX XXX XXX or visit Contact page for directions!';
            }

            if (msg.includes('hour') || msg.includes('open') || msg.includes('close')) {
                return 'Penuel Stopover operates 24/7! Peak hours are 6:00 AM - 10:00 PM. We\'re always ready to serve you!';
            }

            if (msg.includes('book') || msg.includes('reserve') || msg.includes('appointment')) {
                return 'You can book services through our Contact page or call +254 XXX XXX XXX. We handle requests quickly!';
            }

            var defaults = [
                'Great question! Feel free to explore our website or contact us directly.',
                'I\'m here to help! Browse our services - Restaurant, Supermarket, Services, or Contact us.',
                'Thanks for your interest! Is there a specific service you\'d like to know more about?',
                'Feel free to check our Services page or contact our team directly.'
            ];

            return defaults[Math.floor(Math.random() * defaults.length)];
        }

        /**
         * Send message
         */
        function sendMessage() {
            var text = input.value.trim();
            if (!text) return;

            // Add user message
            addMessage(text, 'user');
            input.value = '';

            // Show typing
            showTyping();

            // Simulate response delay
            setTimeout(function() {
                hideTyping();
                var response = getBotResponse(text);
                addMessage(response, 'bot');
            }, 800 + Math.random() * 700);
        }

        /**
         * Event listeners
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

        initialized = true;
        console.log('✅ Penuel Chat Widget Initialized');
    }

    /**
     * Initialize when DOM is ready
     */
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                loadChatWidget();
            });
        } else {
            loadChatWidget();
        }
    }

    // Start initialization
    init();
})();