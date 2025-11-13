const socket = io();

let selectedUser = null;
let typingTimeout = null;

// Theme management
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
  // Load saved theme from localStorage
  const savedTheme = localStorage.getItem('theme') || 'light';
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggle.checked = true;
  }

  // Toggle theme
  themeToggle.addEventListener('change', () => {
    if (themeToggle.checked) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  });
}

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
const emojiBtn = document.getElementById('emojiBtn');
const emojiPicker = document.getElementById('emojiPicker');
const emojiGrid = document.getElementById('emojiGrid');
const breadcrumbNav = document.getElementById('breadcrumbNav');
const currentChatUser = document.getElementById('currentChatUser');
const backToUsers = document.getElementById('backToUsers');

// Emoji list
const emojis = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
  '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
  '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
  '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
  '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
  '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
  '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
  '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈',
  '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾',
  '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿',
  '😾', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️',
  '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️',
  '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲',
  '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶',
  '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄',
  '💋', '💘', '💝', '💖', '💗', '💓', '💞', '💕', '💟', '❣️',
  '💔', '❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍',
  '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💬', '👁️‍🗨️', '🗨️',
  '🗯️', '💭', '💤', '👋', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇'
];

// Initialize emoji picker
emojis.forEach(emoji => {
  const emojiItem = document.createElement('div');
  emojiItem.className = 'emoji-item';
  emojiItem.textContent = emoji;
  emojiItem.addEventListener('click', () => {
    const cursorPos = messageInput.selectionStart;
    const textBefore = messageInput.value.substring(0, cursorPos);
    const textAfter = messageInput.value.substring(cursorPos);
    messageInput.value = textBefore + emoji + textAfter;
    messageInput.focus();
    messageInput.selectionStart = messageInput.selectionEnd = cursorPos + emoji.length;
    emojiPicker.classList.add('d-none');
  });
  emojiGrid.appendChild(emojiItem);
});

// Toggle emoji picker
emojiBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  emojiPicker.classList.toggle('d-none');
});

// Close emoji picker when clicking outside
document.addEventListener('click', (e) => {
  if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
    emojiPicker.classList.add('d-none');
  }
});

// Auto-resize textarea
messageInput.addEventListener('input', () => {
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + 'px';
});

// Breadcrumb navigation
backToUsers.addEventListener('click', (e) => {
  e.preventDefault();
  selectedUser = null;
  chatHeader.classList.add('d-none');
  messageInputArea.classList.add('d-none');
  breadcrumbNav.classList.add('d-none');
  userItems.forEach(u => u.classList.remove('active'));
  messagesContainer.innerHTML = `
    <div class="text-center text-muted mt-5">
      <i class="bi bi-chat-dots" style="font-size: 3rem;"></i>
      <p class="mt-3">Select a user to start chatting</p>
    </div>
  `;
});

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

    // Update breadcrumb
    currentChatUser.textContent = username;
    breadcrumbNav.classList.remove('d-none');

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

// Handle Enter key to send message
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    messageForm.dispatchEvent(new Event('submit'));
  }
});

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
  messageInput.style.height = 'auto';
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
  const isDeleted = message.deleted || message.message === '[Message deleted]';

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isOwnMessage ? 'message-sent' : 'message-received'}`;
  messageDiv.dataset.messageId = message._id || message.id;

  if (animate) {
    messageDiv.style.opacity = '0';
    messageDiv.style.transform = 'translateY(10px)';
  }

  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  let messageText = escapeHtml(message.message);
  let messageClass = '';
  let deletedIcon = '';

  if (isDeleted) {
    messageClass = 'message-deleted';
    deletedIcon = '<i class="bi bi-trash message-deleted-icon"></i>';
    if (currentUser.isAdmin && message.deleted) {
      // Admin can see the original message
      messageText = `${deletedIcon}<del>${escapeHtml(message.message)}</del>`;
    } else {
      messageText = `${deletedIcon}${messageText}`;
    }
  } else {
    // Preserve line breaks in message text
    messageText = messageText.replace(/\n/g, '<br>');
  }

  // Add delete/restore buttons
  let actionsHtml = '';
  if (isOwnMessage && !isDeleted) {
    actionsHtml = `
      <div class="message-actions">
        <button class="message-action-btn delete-msg-btn" data-message-id="${message._id || message.id}" title="Delete message">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `;
  } else if (currentUser.isAdmin && isDeleted && message.deleted) {
    actionsHtml = `
      <div class="message-actions">
        <button class="message-action-btn restore-msg-btn" data-message-id="${message._id || message.id}" title="Restore message">
          <i class="bi bi-arrow-counterclockwise"></i>
        </button>
      </div>
    `;
  }

  messageDiv.innerHTML = `
    <div class="message-bubble ${messageClass}">
      <div class="message-text">${messageText}</div>
      <div class="message-time">${time}</div>
    </div>
    ${actionsHtml}
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

  // Add event listeners for delete/restore buttons
  const deleteBtn = messageDiv.querySelector('.delete-msg-btn');
  const restoreBtn = messageDiv.querySelector('.restore-msg-btn');

  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      const messageId = deleteBtn.dataset.messageId;
      await deleteMessage(messageId);
    });
  }

  if (restoreBtn) {
    restoreBtn.addEventListener('click', async () => {
      const messageId = restoreBtn.dataset.messageId;
      await restoreMessage(messageId);
    });
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

// Delete message
const deleteMessage = async (messageId) => {
  try {
    const response = await fetch(`/chat/message/${messageId}/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.success) {
      // Emit socket event to notify other user
      socket.emit('message_deleted', {
        messageId: messageId,
        to: selectedUser.id
      });

      // Update message in UI
      const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
      if (messageEl) {
        const messageBubble = messageEl.querySelector('.message-bubble');
        const messageText = messageEl.querySelector('.message-text');
        messageBubble.classList.add('message-deleted');
        messageText.innerHTML = '<i class="bi bi-trash message-deleted-icon"></i>[Message deleted]';

        // Remove delete button
        const actionsDiv = messageEl.querySelector('.message-actions');
        if (actionsDiv) {
          actionsDiv.remove();
        }
      }
    } else {
      console.error('Failed to delete message:', data.error);
    }
  } catch (error) {
    console.error('Error deleting message:', error);
  }
};

// Restore message (admin only)
const restoreMessage = async (messageId) => {
  try {
    const response = await fetch(`/chat/message/${messageId}/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.success) {
      // Emit socket event to notify other user
      socket.emit('message_restored', {
        messageId: messageId,
        message: data.data,
        to: selectedUser.id
      });

      // Reload chat history to get the updated message
      await loadChatHistory(selectedUser.id);
    } else {
      console.error('Failed to restore message:', data.error);
    }
  } catch (error) {
    console.error('Error restoring message:', error);
  }
};

// Listen for message deletion from other users
socket.on('message_deleted', (data) => {
  const messageEl = document.querySelector(`[data-message-id="${data.messageId}"]`);
  if (messageEl) {
    const messageBubble = messageEl.querySelector('.message-bubble');
    const messageText = messageEl.querySelector('.message-text');
    messageBubble.classList.add('message-deleted');
    messageText.innerHTML = '<i class="bi bi-trash message-deleted-icon"></i>[Message deleted]';

    // Remove any action buttons
    const actionsDiv = messageEl.querySelector('.message-actions');
    if (actionsDiv) {
      actionsDiv.remove();
    }
  }
});

// Listen for message restoration from admin
socket.on('message_restored', async (data) => {
  if (selectedUser) {
    await loadChatHistory(selectedUser.id);
  }
});

// Handle window resize
window.addEventListener('resize', () => {
  if (window.innerWidth >= 768) {
    sidebar.style.display = 'block';
    document.querySelector('.chat-area').style.display = 'block';
  }
});
