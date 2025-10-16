// src/utils/apiClient.js - Fixed API client for Railway deployment
// Points to Railway URL in production, localhost in development

const API_BASE = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3001/api'        // Local development
  : '/api';                            // Production (Railway) - relative URLs

// Generic API call wrapper with error handling
async function apiCall(endpoint, data = null, method = 'POST') {
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
    }
  };
  
  if (data && method !== 'GET') {
    config.body = JSON.stringify(data);
  }
  
  const fullUrl = `${API_BASE}${endpoint}`;
  console.log(`[API Client] ${method} ${fullUrl}`);
  
  try {
    const response = await fetch(fullUrl, config);
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error(`[API Client] Non-JSON response from ${endpoint}:`, response.status, response.statusText);
      throw new Error(`Server returned ${response.status}: Expected JSON but got ${contentType}`);
    }
    
    const result = await response.json();
    
    // Handle HTTP errors
    if (!response.ok) {
      console.error(`[API Client] HTTP Error ${response.status}:`, result);
      throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    console.log(`[API Client] Success ${response.status}:`, endpoint);
    return {
      success: true,
      data: result,
      status: response.status
    };
    
  } catch (error) {
    console.error(`[API Client] ${endpoint} error:`, error);
    
    // Provide helpful error messages
    let errorMessage = error.message;
    let errorType = 'api';
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      if (process.env.NODE_ENV === 'development') {
        errorMessage = `Cannot connect to API server at ${API_BASE}. Make sure the Express server is running on port 3001.`;
      } else {
        errorMessage = `Cannot connect to API server. Please check your internet connection.`;
      }
      errorType = 'network';
    }
    
    if (error.message.includes('404')) {
      errorMessage = `API endpoint ${endpoint} not found. Check server routing.`;
    }
    
    if (error.message.includes('Unexpected token')) {
      errorMessage = `Server returned HTML instead of JSON. Check server setup.`;
    }
    
    return {
      success: false,
      error: errorMessage,
      type: errorType,
      originalError: error.message
    };
  }
}

// Chat Orchestrator - Main workflow coordination
export async function sendMessage(userInput, conversationState = null) {
  return await apiCall('/chat-orchestrator', {
    user_input: userInput,
    conversation_state: conversationState,
    session_id: generateSessionId()
  });
}

// Master Agent - Intent routing (rarely called directly)
export async function routeIntent(userQuery) {
  return await apiCall('/master-agent', {
    user_query: userQuery
  });
}

// Service Composer - Multi-turn conversations (rarely called directly)
export async function continueConversation(userMessage, conversationState, conversationHistory) {
  return await apiCall('/service-composer', {
    user_message: userMessage,
    conversation_state: conversationState,
    conversation_history: conversationHistory
  });
}

// Validation Agent - T&T validation rules (rarely called directly)
export async function validateTicket(serviceDetails, ticketData) {
  return await apiCall('/validation-agent', {
    service_details: serviceDetails,
    ticket_data: ticketData
  });
}

// Services - Get available services
export async function getServices() {
  return await apiCall('/services', null, 'GET');
}

// Services - Get specific service
export async function getService(serviceId) {
  return await apiCall('/services', {
    service_id: serviceId
  });
}

// Test API connectivity
export async function testConnection() {
  try {
    const healthUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3001/health' 
      : '/health';
      
    const response = await fetch(healthUrl);
    if (response.ok) {
      const data = await response.json();
      console.log('[API Client] Connection test successful:', data);
      return { success: true, data };
    } else {
      throw new Error(`Health check failed: ${response.status}`);
    }
  } catch (error) {
    console.error('[API Client] Connection test failed:', error);
    return { success: false, error: error.message };
  }
}

// Utility functions
function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Export error types for component handling
export const ErrorTypes = {
  NETWORK: 'network',
  API: 'api', 
  VALIDATION: 'validation',
  TIMEOUT: 'timeout'
};

// Export API configuration for debugging
export const ApiConfig = {
  BASE_URL: API_BASE,
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  ENVIRONMENT: process.env.NODE_ENV || 'production'
};

// Export API client functions as default object
const apiClient = {
  sendMessage,
  routeIntent,
  continueConversation,
  validateTicket,
  getServices,
  getService,
  testConnection,
  ErrorTypes,
  ApiConfig
};

export default apiClient;