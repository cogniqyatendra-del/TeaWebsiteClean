// ===== STANDALONE CHAT WIDGET - NO DEPENDENCIES =====
(function() {
  'use strict';
  
  console.log('🚀 Chat widget script loading...');
  
  // Wait for DOM to be ready
  function initChatWidget() {
    console.log('🔍 Looking for chat widget elements...');
    
    const chatWidgetToggle = document.getElementById('chatWidgetToggle');
    const chatWidgetPopup = document.getElementById('chatWidgetPopup');
    const closeChatWidget = document.getElementById('closeChatWidget');
    const chatbotForm = document.getElementById('chatbotForm');
    const chatbotPrompt = document.getElementById('chatbotPrompt');
    const chatbotMessages = document.getElementById('chatbotMessages');
    
    console.log('Elements found:', {
      toggle: !!chatWidgetToggle,
      popup: !!chatWidgetPopup,
      close: !!closeChatWidget,
      form: !!chatbotForm,
      prompt: !!chatbotPrompt,
      messages: !!chatbotMessages
    });
    
    if (!chatWidgetToggle || !chatWidgetPopup || !closeChatWidget) {
      console.error('❌ Required chat widget elements not found!');
      return;
    }
    
    // Open chat
    function openChat() {
      console.log('📖 Opening chat...');
      chatWidgetPopup.classList.add('show');
      if (chatbotPrompt) {
        setTimeout(function() {
          chatbotPrompt.focus();
        }, 300);
      }
    }
    
    // Close chat
    function closeChat() {
      console.log('📕 Closing chat...');
      chatWidgetPopup.classList.remove('show');
    }
    
    // Toggle button
    chatWidgetToggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('🖱️ Toggle clicked!');
      
      if (chatWidgetPopup.classList.contains('show')) {
        closeChat();
      } else {
        openChat();
      }
    });
    
    // Close button
    closeChatWidget.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      closeChat();
    });
    
    // Close on outside click
    document.addEventListener('click', function(e) {
      if (chatWidgetPopup.classList.contains('show')) {
        const container = document.getElementById('chatWidgetContainer');
        if (container && !container.contains(e.target)) {
          closeChat();
        }
      }
    });
    
    // Quick question buttons
    const quickButtons = document.querySelectorAll('.btn-quick-question');
    console.log('Found quick buttons:', quickButtons.length);
    
    quickButtons.forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        const question = this.getAttribute('data-question');
        console.log('Quick question clicked:', question);
        
        if (question) {
          if (!chatWidgetPopup.classList.contains('show')) {
            openChat();
          }
          
          if (chatbotPrompt) {
            setTimeout(function() {
              chatbotPrompt.value = question;
              if (chatbotForm) {
                chatbotForm.dispatchEvent(new Event('submit'));
              }
            }, 400);
          }
        }
      });
    });
    
    // Handle chat form submission (basic version)
    // Handle chat form submission - Connect to Gemini API
    if (chatbotForm && chatbotPrompt) {
      chatbotForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const message = chatbotPrompt.value.trim();
        
        if (message) {
          console.log('Message sent:', message);
          
          // Call the existing handleChatPrompt function from main script
          if (typeof window.handleChatPrompt === 'function') {
            window.handleChatPrompt(message);
          } else {
            console.error('❌ handleChatPrompt function not found! Make sure your main script is loaded first.');
            
            // Fallback: Add messages manually
            if (chatbotMessages) {
              const userMsg = document.createElement('div');
              userMsg.className = 'chat-message user';
              userMsg.textContent = message;
              chatbotMessages.appendChild(userMsg);
              
              const botMsg = document.createElement('div');
              botMsg.className = 'chat-message bot';
              botMsg.textContent = '⚠️ Chat API not loaded. Please refresh the page.';
              chatbotMessages.appendChild(botMsg);
              
              chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
            }
          }
          
          // Clear input
          chatbotPrompt.value = '';
        }
      });
    }
    
    // Clear chat button
    const clearBtn = document.getElementById('clearChatbot');
    if (clearBtn && chatbotMessages) {
      clearBtn.addEventListener('click', function() {
        chatbotMessages.innerHTML = '<div class="chat-message bot">👋 Hi! I\'m the Kadak Adda assistant. Ask me anything about our chai, snacks, or delivery.</div>';
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
      });
    }
    
    console.log('✅ Chat widget initialized successfully!');
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatWidget);
  } else {
    initChatWidget();
  }
})();