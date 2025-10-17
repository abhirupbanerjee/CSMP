// src/components/ChatInterface.jsx - Main chat interface component with voice input
// Central UI for multi-agent conversations including voice recording

import React, { useState, useRef, useEffect } from 'react';
import { useAgentWorkflow } from '../hooks/useAgentWorkflow';
import { useVoiceRecording } from '../hooks/useVoiceRecording';
import AgentStatus from './AgentStatus';
import MessageBubble from './MessageBubble';
import ServiceList from './ServiceList';
import TicketDisplay from './TicketDisplay';

const ChatInterface = () => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  const {
    messages,
    isLoading,
    error,
    currentService,
    ticketData,
    validationResults,
    sendMessage,
    resetConversation,
    progressPercentage,
    currentPhaseDisplay,
    isCompleted,
    hasError,
    hasActiveService
  } = useAgentWorkflow();
  
  // Voice recording hook
  const {
    isRecording,
    isProcessing,
    error: voiceError,
    isSupported: voiceSupported,
    startRecording,
    stopRecording,
    cancelRecording,
    clearError: clearVoiceError,
    isActive: voiceActive,
    canRecord
  } = useVoiceRecording();
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Focus input after loading completes
  useEffect(() => {
    if (!isLoading && !voiceActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading, voiceActive]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isLoading || voiceActive) {
      return;
    }
    
    const message = inputValue.trim();
    setInputValue('');
    
    await sendMessage(message);
  };
  
  // Handle voice recording
  const handleVoiceToggle = async () => {
    if (isRecording) {
      // Stop recording and get transcription
      const transcription = await stopRecording();
      if (transcription) {
        setInputValue(transcription);
        // Auto-focus input so user can edit if needed
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } else if (canRecord) {
      // Start recording
      clearVoiceError();
      await startRecording();
    }
  };
  
  // Handle voice recording cancellation
  const handleVoiceCancel = () => {
    cancelRecording();
    clearVoiceError();
  };
  
  const handleReset = () => {
    if (window.confirm('Start a new conversation? Current progress will be lost.')) {
      resetConversation();
      setInputValue('');
      clearVoiceError();
    }
  };
  
  const getSuggestedMessages = () => {
    if (messages.length === 0) {
      return [
        "I need to renew my passport",
        "I want to apply for a driver's license",
        "I need a business permit",
        "What services are available?"
      ];
    }
    return [];
  };
  
  const handleSuggestionClick = (suggestion) => {
    if (!isLoading && !voiceActive) {
      sendMessage(suggestion);
    }
  };
  
  return (
    <div className="chat-interface">
      {/* Header */}
      <div className="chat-header">
        <div className="header-content">
          <h1 className="header-title">🏛️ Caribbean Government Services</h1>
          <p className="header-subtitle">Trinidad & Tobago Multi-Agent Portal</p>
          
          {hasActiveService && (
            <div className="current-service-badge">
              <span className="service-icon">📋</span>
              <span className="service-name">{currentService.service_name}</span>
              <span className="service-id">({currentService.service_id})</span>
            </div>
          )}
        </div>
        
        {messages.length > 0 && (
          <button 
            onClick={handleReset}
            className="reset-button"
            disabled={isLoading || voiceActive}
          >
            🔄 New Conversation
          </button>
        )}
      </div>
      
      {/* Agent Status Display */}
      <AgentStatus 
        progressPercentage={progressPercentage}
        currentPhase={currentPhaseDisplay}
        isLoading={isLoading}
        error={error}
      />
      
      {/* Messages Area */}
      <div className="messages-container">
        {messages.length === 0 && (
          <div className="welcome-message">
            <div className="welcome-content">
              <h2>Welcome to Government Services! 👋</h2>
              <p>I'm your AI assistant for Trinidad & Tobago government services.</p>
              <p>I can help you with:</p>
              <ul className="service-hints">
                <li>🛂 Passport applications & renewals</li>
                <li>🚗 Driver license services</li>
                <li>🏢 Business permits & registrations</li>
                <li>📄 Birth certificates</li>
                <li>🏠 Property registration</li>
              </ul>
              <p>
                Try typing or {voiceSupported && <span>🎤 <strong>use voice input</strong>: </span>}
                <em>"I need to renew my passport"</em>
              </p>
            </div>
          </div>
        )}
        
        {/* Message History */}
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        
        {/* Service List (when services are displayed) */}
        {currentService?.type === 'service_list' && (
          <ServiceList 
            services={currentService.services}
            onServiceSelect={(service) => 
              sendMessage(`I need help with ${service.service_name}`)
            }
          />
        )}
        
        {/* Ticket Display (when ticket is created) */}
        {isCompleted && ticketData && (
          <TicketDisplay 
            ticketData={ticketData}
            serviceDetails={currentService}
            validationResults={validationResults}
          />
        )}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="loading-message">
            <div className="loading-content">
              <div className="loading-spinner"></div>
              <span className="loading-text">{currentPhaseDisplay}...</span>
            </div>
          </div>
        )}
        
        {/* Error display */}
        {hasError && error && (
          <div className="error-message">
            <div className="error-content">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{error.message}</span>
              <button 
                onClick={() => sendMessage("Please try again")}
                className="retry-button"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      <div className="input-container">
        {/* Suggested Messages */}
        {getSuggestedMessages().length > 0 && (
          <div className="suggestions">
            <p className="suggestions-label">Try asking{voiceSupported && " (or use voice)"}:</p>
            <div className="suggestions-list">
              {getSuggestedMessages().map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="suggestion-button"
                  disabled={isLoading || voiceActive}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Input Form */}
        <form onSubmit={handleSubmit} className="input-form">
          <div className="input-wrapper">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                isLoading 
                  ? "Processing..." 
                  : voiceActive
                  ? (isRecording ? "Recording..." : "Processing voice...")
                  : "Type your message... (e.g., I need to renew my passport)"
              }
              className="message-input"
              disabled={isLoading || voiceActive}
              maxLength={1000}
            />
            
            {/* Voice Recording Button */}
            {voiceSupported && (
              <button 
                type="button"
                onClick={handleVoiceToggle}
                className={`voice-button ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
                disabled={isLoading || (!canRecord && !isRecording)}
                title={
                  isRecording ? "Stop recording" : 
                  isProcessing ? "Processing voice..." :
                  canRecord ? "Start voice recording" : 
                  "Voice recording unavailable"
                }
              >
                {isRecording ? '⏹️' : isProcessing ? '⏳' : '🎤'}
              </button>
            )}
            
            {/* Cancel Voice Button (only show when recording) */}
            {isRecording && (
              <button 
                type="button"
                onClick={handleVoiceCancel}
                className="voice-cancel-button"
                title="Cancel recording"
              >
                ❌
              </button>
            )}
            
            <button 
              type="submit" 
              className="send-button"
              disabled={isLoading || !inputValue.trim() || voiceActive}
            >
              {isLoading ? '⏳' : '➤'}
            </button>
          </div>
          
          {/* Voice Error Display */}
          {voiceError && (
            <div className="voice-error">
              <span className="voice-error-icon">⚠️</span>
              <span className="voice-error-text">{voiceError.message}</span>
              <button 
                onClick={clearVoiceError}
                className="voice-error-close"
              >
                ✕
              </button>
            </div>
          )}
          
          {/* Voice Recording Status */}
          {voiceActive && (
            <div className="voice-status">
              {isRecording && (
                <div className="recording-indicator">
                  <span className="recording-dot"></span>
                  <span className="recording-text">Recording... Click stop when finished</span>
                </div>
              )}
              {isProcessing && (
                <div className="processing-indicator">
                  <span className="processing-spinner"></span>
                  <span className="processing-text">Converting speech to text...</span>
                </div>
              )}
            </div>
          )}
          
          {inputValue.length > 800 && (
            <div className="character-count">
              {inputValue.length}/1000 characters
            </div>
          )}
        </form>
        
        <div className="input-footer">
          <small>
            🔒 Secure • 🇹🇹 Trinidad & Tobago Government Services • 
            Powered by Multi-Agent AI
            {voiceSupported && <span> • 🎤 Voice input available</span>}
          </small>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;