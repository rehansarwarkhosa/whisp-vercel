const socket = io();

let selectedUser = null;
let typingTimeout = null;

// Elements
const messagesContainer = document.getElementById('messagesContainer');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const messageInputArea = document.getElementById('messageInputArea');
const chatHeader = document.querySelector('.chat-header');
const chatUsername = document.getElementById('chatUsername');
const chatAvatar = document.getElementById('chatAvatar');
const typingIndicator = document.getElementById('typingIndicator');
const userItems = document.querySelectorAll('.user-item');
const backBtn = document.getElementById('backBtn');
const sidebar = document.getElementById('sidebar');

// User selection
userItems.forEach(item => {
  item.addEventListener('click', async () => {
    const userId = item.dataset.userId;
    const username = item.dataset.username;

    // Update UI
    userItems.forEach(u => u.classList.remove('active'));
    item.classList.add('active');

    // Clear unread badge
    const badge = item.querySelector('.unread-badge');
    if (badge) {
      badge.classList.add('d-none');
      badge.textContent = '0';
    }

    // Set selected user
    selectedUser = {
      id: userId,
      username: username
    };

    // Update chat header
    chatUsername.textContent = username;
    chatAvatar.textContent = username.charAt(0).toUpperCase();
    chatHeader.classList.remove('d-none');
    messageInputArea.classList.remove('d-none');

    // Show chat area on mobile
    if (window.innerWidth < 768) {
      sidebar.style.display = 'none';
      document.querySelector('.chat-area').style.display = 'block';
    }

    // Load chat history
    await loadChatHistory(userId);

    // Focus on message input
    messageInput.focus();
  });
});

// Back button (mobile)
if (backBtn) {
  backBtn.addEventListener('click', () => {
    sidebar.style.display = 'block';
    document.querySelector('.chat-area').style.display = 'none';
  });
}

// Load chat history
const loadChatHistory = async (userId) => {
  try {
    const response = await fetch(`/chat/history/${userId}`);
    const messages = await response.json();

    messagesContainer.innerHTML = '';

    if (messages.length === 0) {
      messagesContainer.innerHTML = `
        <div class="text-center text-muted mt-5">
          <i class="bi bi-chat-dots" style="font-size: 3rem;"></i>
          <p class="mt-3">No messages yet. Start the conversation!</p>
        </div>
      `;
    } else {
      messages.forEach(msg => {
        appendMessage(msg, false);
      });
    }

    scrollToBottom();
  } catch (error) {
    console.error('Error loading chat history:', error);
  }
};

// Send message
messageForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const message = messageInput.value.trim();

  if (!message || !selectedUser) return;

  socket.emit('private_message', {
    to: selectedUser.id,
    message: message
  });

  messageInput.value = '';
  socket.emit('stop_typing', { to: selectedUser.id });
});

// Typing indicator
messageInput.addEventListener('input', () => {
  if (!selectedUser) return;

  socket.emit('typing', { to: selectedUser.id });

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('stop_typing', { to: selectedUser.id });
  }, 1000);
});

// Receive message
socket.on('private_message', (data) => {
  const isFromSelectedUser = selectedUser && data.from._id === selectedUser.id;

  if (isFromSelectedUser) {
    appendMessage(data, true);
    scrollToBottom();
  } else {
    // Update unread badge
    const userItem = document.querySelector(`[data-user-id="${data.from._id}"]`);
    if (userItem) {
      const badge = userItem.querySelector('.unread-badge');
      if (badge) {
        badge.classList.remove('d-none');
        const count = parseInt(badge.textContent) || 0;
        badge.textContent = count + 1;
      }
    }
  }
});

// Message sent confirmation
socket.on('message_sent', (data) => {
  if (selectedUser && data.to._id === selectedUser.id) {
    appendMessage(data, true);
    scrollToBottom();
  }
});

// Typing indicator
socket.on('user_typing', (data) => {
  if (selectedUser && data.from === selectedUser.id) {
    typingIndicator.textContent = 'typing...';
  }
});

socket.on('user_stop_typing', (data) => {
  if (selectedUser && data.from === selectedUser.id) {
    typingIndicator.textContent = '';
  }
});

// Append message to chat
const appendMessage = (message, animate) => {
  const isOwnMessage = message.from._id === currentUser.id;

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isOwnMessage ? 'message-sent' : 'message-received'}`;

  if (animate) {
    messageDiv.style.opacity = '0';
    messageDiv.style.transform = 'translateY(10px)';
  }

  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  messageDiv.innerHTML = `
    <div class="message-bubble">
      <div class="message-text">${escapeHtml(message.message)}</div>
      <div class="message-time">${time}</div>
    </div>
  `;

  // Remove placeholder if exists
  const placeholder = messagesContainer.querySelector('.text-center.text-muted');
  if (placeholder) {
    placeholder.remove();
  }

  messagesContainer.appendChild(messageDiv);

  if (animate) {
    setTimeout(() => {
      messageDiv.style.transition = 'all 0.3s ease';
      messageDiv.style.opacity = '1';
      messageDiv.style.transform = 'translateY(0)';
    }, 10);
  }
};

// Scroll to bottom
const scrollToBottom = () => {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
};

// Escape HTML
const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// Handle window resize
window.addEventListener('resize', () => {
  if (window.innerWidth >= 768) {
    sidebar.style.display = 'block';
    document.querySelector('.chat-area').style.display = 'block';
  }
});
