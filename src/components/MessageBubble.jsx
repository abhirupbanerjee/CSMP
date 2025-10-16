// src/components/MessageBubble.jsx - Fixed ESLint Issues
// ✅ FIXED: Import moved to top, unused import removed

import React from 'react';

const MessageBubble = ({ message, sender, timestamp, isLoading }) => {
  
  // ✅ FIXED: Function definition moved inside component
  const formatMessageContent = (content) => {
    // Defensive programming - handle null/undefined content
    if (!content) {
      console.warn('MessageBubble: Received null/undefined content');
      return ['System: Processing your request...'];
    }
    
    if (typeof content !== 'string') {
      console.warn('MessageBubble: Content is not a string:', typeof content, content);
      return [`System: ${JSON.stringify(content)}`];
    }
    
    // Safe to split now
    return content.split('\n').filter(line => line.trim() !== '');
  };

  // Early return for loading state
  if (isLoading) {
    return (
      <div className={`message-bubble ${sender}`}>
        <div className="typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
    );
  }

  // Early return for invalid message
  if (!message) {
    return (
      <div className="message-bubble system">
        <div className="message-content">
          <p>⚠️ Invalid message received</p>
        </div>
      </div>
    );
  }

  // Extract content from message object
  const messageContent = message.content || message.text || message;
  const formattedLines = formatMessageContent(messageContent);

  return (
    <div className={`message-bubble ${sender}`}>
      <div className="message-content">
        {formattedLines.map((line, index) => (
          <p key={index}>{line}</p>
        ))}
      </div>
      {timestamp && (
        <div className="message-timestamp">
          {new Date(timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default MessageBubble;