// src/components/AgentStatus.jsx - Agent status and progress display
// Shows which agents are active and workflow progress

import React from 'react';

const AgentStatus = ({ 
  progressPercentage, 
  currentPhase, 
  isLoading, 
  error,
  agentStatuses = {}
}) => {
  
  const agents = [
    {
      id: 'masterAgent',
      name: 'Intent Router',
      icon: '🎯',
      description: 'Understands your request',
      status: agentStatuses.masterAgent || 'inactive'
    },
    {
      id: 'serviceComposer',
      name: 'Service Agent',
      icon: '🤖',
      description: 'Collects required information',
      status: agentStatuses.serviceComposer || 'inactive'
    },
    {
      id: 'validationAgent',
      name: 'T&T Validator',
      icon: '✅',
      description: 'Verifies Trinidad & Tobago requirements',
      status: agentStatuses.validationAgent || 'inactive'
    }
  ];
  
  const getStatusIcon = (status) => {
    switch (status) {
      case 'thinking':
        return '🧠';
      case 'active':
        return '⚡';
      case 'completed':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '⚪';
    }
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'thinking':
        return '#fbbf24'; // yellow
      case 'active':
        return '#10b981'; // green
      case 'completed':
        return '#059669'; // dark green
      case 'error':
        return '#ef4444'; // red
      default:
        return '#9ca3af'; // gray
    }
  };
  
  return (
    <div className="agent-status-container">
      {/* Progress Bar */}
      <div className="progress-section">
        <div className="progress-header">
          <span className="progress-label">{currentPhase}</span>
          <span className="progress-percentage">{progressPercentage}%</span>
        </div>
        
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ 
              width: `${progressPercentage}%`,
              backgroundColor: error ? '#ef4444' : '#10b981',
              transition: 'width 0.5s ease-in-out'
            }}
          />
        </div>
      </div>
      
      {/* Agent Status Grid */}
      <div className="agents-grid">
        {agents.map((agent) => (
          <div 
            key={agent.id}
            className={`agent-card ${agent.status}`}
          >
            <div className="agent-header">
              <span className="agent-main-icon">{agent.icon}</span>
              <span 
                className="agent-status-icon"
                style={{ color: getStatusColor(agent.status) }}
              >
                {getStatusIcon(agent.status)}
              </span>
            </div>
            
            <div className="agent-content">
              <h4 className="agent-name">{agent.name}</h4>
              <p className="agent-description">{agent.description}</p>
            </div>
            
            {/* Active indicator */}
            {agent.status === 'thinking' && (
              <div className="thinking-animation">
                <div className="thinking-dot"></div>
                <div className="thinking-dot"></div>
                <div className="thinking-dot"></div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Current Activity Indicator */}
      {isLoading && (
        <div className="current-activity">
          <div className="activity-spinner"></div>
          <span className="activity-text">
            {currentPhase === 'Understanding Request' && '🎯 Routing to appropriate service...'}
            {currentPhase === 'Collecting Information' && '🤖 Asking follow-up questions...'}
            {currentPhase === 'Validating Details' && '✅ Checking Trinidad & Tobago requirements...'}
            {currentPhase === 'Processing' && '⚡ Processing your request...'}
          </span>
        </div>
      )}
      
      {/* Error Indicator */}
      {error && (
        <div className="error-indicator">
          <span className="error-icon">⚠️</span>
          <span className="error-message">
            {error.type === 'network' 
              ? 'Network connection issue' 
              : 'Service temporarily unavailable'
            }
          </span>
        </div>
      )}
      
      {/* Workflow Complete Indicator */}
      {progressPercentage === 100 && !error && (
        <div className="completion-indicator">
          <span className="completion-icon">🎉</span>
          <span className="completion-text">Service request completed successfully!</span>
        </div>
      )}
    </div>
  );
};

export default AgentStatus;