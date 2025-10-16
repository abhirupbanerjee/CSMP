// src/hooks/useAgentWorkflow.js - Agent workflow state management
// Manages multi-agent conversation state and workflow phases

import { useState, useCallback } from 'react';
import apiClient from '../utils/apiClient';

// Workflow phases that match the backend orchestrator
const WorkflowPhases = {
  IDLE: 'idle',
  INTENT_ROUTING: 'intent_routing',
  SERVICE_CONVERSATION: 'service_conversation',
  VALIDATION: 'validation',
  COMPLETED: 'completed',
  ERROR: 'error'
};

// Agent status indicators
const AgentStatus = {
  INACTIVE: 'inactive',
  THINKING: 'thinking',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ERROR: 'error'
};

export function useAgentWorkflow() {
  // Core state
  const [conversationState, setConversationState] = useState(null);
  const [currentPhase, setCurrentPhase] = useState(WorkflowPhases.IDLE);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Agent status tracking
  const [agentStatuses, setAgentStatuses] = useState({
    masterAgent: AgentStatus.INACTIVE,
    serviceComposer: AgentStatus.INACTIVE,
    validationAgent: AgentStatus.INACTIVE,
    orchestrator: AgentStatus.INACTIVE
  });
  
  // Current service information
  const [currentService, setCurrentService] = useState(null);
  const [ticketData, setTicketData] = useState(null);
  const [validationResults, setValidationResults] = useState(null);
  
  // Update agent status helper
  const updateAgentStatus = useCallback((agent, status) => {
    setAgentStatuses(prev => ({
      ...prev,
      [agent]: status
    }));
  }, []);
  
  // Add message to conversation
  const addMessage = useCallback((message, sender = 'user') => {
    const newMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      content: message,
      sender,
      timestamp: new Date().toISOString(),
      phase: currentPhase
    };
    
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, [currentPhase]);
  
  // Send message through orchestrated workflow
  const sendMessage = useCallback(async (userInput) => {
    if (isLoading) {
      console.warn('[Workflow] Already processing message');
      return;
    }
    
    // Clear previous error
    setError(null);
    setIsLoading(true);
    
    // Add user message
    addMessage(userInput, 'user');
    
    // Update orchestrator status
    updateAgentStatus('orchestrator', AgentStatus.THINKING);
    
    try {
      // Determine workflow phase
      if (!conversationState) {
        setCurrentPhase(WorkflowPhases.INTENT_ROUTING);
        updateAgentStatus('masterAgent', AgentStatus.THINKING);
      } else {
        setCurrentPhase(WorkflowPhases.SERVICE_CONVERSATION);
        updateAgentStatus('serviceComposer', AgentStatus.THINKING);
      }
      
      // Call orchestrator API
      const result = await apiClient.sendMessage(userInput, conversationState);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      const response = result.data;
      
      // Handle different response types
      if (response.status === 'services_listed') {
        // Services listing response
        setCurrentPhase(WorkflowPhases.IDLE);
        updateAgentStatus('masterAgent', AgentStatus.COMPLETED);
        
        addMessage(response.agent_response, 'agent');
        
        // Store services for display
        setCurrentService({ 
          type: 'service_list', 
          services: response.services 
        });
        
      } else if (response.status === 'success') {
        // Normal workflow response
        
        // Update conversation state
        setConversationState(response.conversation_state);
        
        // Update current service info
        if (response.service_details) {
          setCurrentService({
            type: 'active_service',
            ...response.service_details,
            turn: response.workflow_metadata?.turn_number || 1
          });
        }
        
        // Add agent response
        addMessage(response.agent_response, 'agent');
        
        // Handle ticket creation
        if (response.ticket_created) {
          setCurrentPhase(WorkflowPhases.VALIDATION);
          updateAgentStatus('validationAgent', AgentStatus.THINKING);
          
          setTicketData(response.ticket_data);
          
          // Handle validation results
          if (response.validation_results) {
            setValidationResults(response.validation_results);
            updateAgentStatus('validationAgent', 
              response.validation_results.validation_passed 
                ? AgentStatus.COMPLETED 
                : AgentStatus.ERROR
            );
          }
          
          // Workflow completed
          setCurrentPhase(WorkflowPhases.COMPLETED);
          updateAgentStatus('orchestrator', AgentStatus.COMPLETED);
          
          // Add completion message if provided
          if (response.completion_details) {
            setTimeout(() => {
              addMessage(
                `🎫 Service Request Complete!\n` +
                `Tracking: ${response.completion_details.tracking_reference}\n` +
                `Processing: ${response.completion_details.processing_time}\n` +
                `Fee: ${response.completion_details.fee}`, 
                'system'
              );
            }, 1000);
          }
          
        } else {
          // Continue conversation
          setCurrentPhase(WorkflowPhases.SERVICE_CONVERSATION);
          updateAgentStatus('serviceComposer', AgentStatus.ACTIVE);
        }
        
        // Update agent statuses based on workflow
        updateAgentStatus('orchestrator', AgentStatus.COMPLETED);
        if (response.workflow_metadata) {
          updateAgentStatus('masterAgent', 
            response.workflow_metadata.turn_number === 1 
              ? AgentStatus.COMPLETED 
              : AgentStatus.INACTIVE
          );
        }
        
      } else {
        // Error response
        throw new Error(response.error || 'Unknown error occurred');
      }
      
    } catch (err) {
      console.error('[Workflow] Send message error:', err);
      
      setError({
        message: err.message,
        type: err.name === 'TypeError' ? 'network' : 'api',
        timestamp: new Date().toISOString()
      });
      
      setCurrentPhase(WorkflowPhases.ERROR);
      updateAgentStatus('orchestrator', AgentStatus.ERROR);
      
      addMessage(
        'Sorry, I encountered an error processing your request. Please try again.', 
        'system'
      );
      
    } finally {
      setIsLoading(false);
    }
  }, [conversationState, isLoading, addMessage, updateAgentStatus]);
  
  // Reset conversation
  const resetConversation = useCallback(() => {
    setConversationState(null);
    setCurrentPhase(WorkflowPhases.IDLE);
    setMessages([]);
    setError(null);
    setCurrentService(null);
    setTicketData(null);
    setValidationResults(null);
    
    setAgentStatuses({
      masterAgent: AgentStatus.INACTIVE,
      serviceComposer: AgentStatus.INACTIVE,
      validationAgent: AgentStatus.INACTIVE,
      orchestrator: AgentStatus.INACTIVE
    });
  }, []);
  
  // Get workflow progress percentage
  const getProgressPercentage = useCallback(() => {
    switch (currentPhase) {
      case WorkflowPhases.IDLE:
        return 0;
      case WorkflowPhases.INTENT_ROUTING:
        return 25;
      case WorkflowPhases.SERVICE_CONVERSATION:
        return 50;
      case WorkflowPhases.VALIDATION:
        return 75;
      case WorkflowPhases.COMPLETED:
        return 100;
      default:
        return 0;
    }
  }, [currentPhase]);
  
  // Get current phase display name
  const getCurrentPhaseDisplay = useCallback(() => {
    switch (currentPhase) {
      case WorkflowPhases.IDLE:
        return 'Ready';
      case WorkflowPhases.INTENT_ROUTING:
        return 'Understanding Request';
      case WorkflowPhases.SERVICE_CONVERSATION:
        return 'Collecting Information';
      case WorkflowPhases.VALIDATION:
        return 'Validating Details';
      case WorkflowPhases.COMPLETED:
        return 'Request Complete';
      case WorkflowPhases.ERROR:
        return 'Error Occurred';
      default:
        return 'Processing';
    }
  }, [currentPhase]);
  
  return {
    // State
    conversationState,
    currentPhase,
    messages,
    isLoading,
    error,
    agentStatuses,
    currentService,
    ticketData,
    validationResults,
    
    // Actions
    sendMessage,
    resetConversation,
    
    // Computed values
    progressPercentage: getProgressPercentage(),
    currentPhaseDisplay: getCurrentPhaseDisplay(),
    
    // Helper flags
    isIdle: currentPhase === WorkflowPhases.IDLE,
    isProcessing: isLoading,
    isCompleted: currentPhase === WorkflowPhases.COMPLETED,
    hasError: currentPhase === WorkflowPhases.ERROR || error !== null,
    hasActiveService: currentService?.type === 'active_service',
    
    // Constants (for components)
    WorkflowPhases,
    AgentStatus
  };
}