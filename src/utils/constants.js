// src/utils/constants.js - Application constants

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000/api' 
    : '/api',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3
};

// Workflow Phases
export const WORKFLOW_PHASES = {
  IDLE: 'idle',
  INTENT_ROUTING: 'intent_routing',
  SERVICE_CONVERSATION: 'service_conversation',
  VALIDATION: 'validation',
  COMPLETED: 'completed',
  ERROR: 'error'
};

// Agent Status
export const AGENT_STATUS = {
  INACTIVE: 'inactive',
  THINKING: 'thinking',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ERROR: 'error'
};

// Service Icons Mapping
export const SERVICE_ICONS = {
  'SVC_001': '🛂', // Passport
  'SVC_002': '🚗', // Driver License
  'SVC_003': '🏢', // Business Permit
  'SVC_004': '📄', // Birth Certificate
  'SVC_005': '🏠'  // Property Registration
};

// Ministry Icons
export const MINISTRY_ICONS = {
  'Ministry of Home Affairs': '🏛️',
  'Ministry of Transportation': '🚦',
  'Ministry of Commerce': '💼',
  'Ministry of Lands and Property': '🏞️'
};

// Message Types
export const MESSAGE_TYPES = {
  USER: 'user',
  AGENT: 'agent',
  SYSTEM: 'system'
};

// Error Types
export const ERROR_TYPES = {
  NETWORK: 'network',
  API: 'api',
  VALIDATION: 'validation',
  TIMEOUT: 'timeout'
};

// Input Validation
export const INPUT_LIMITS = {
  MAX_LENGTH: 1000,
  MIN_LENGTH: 1
};

// Caribbean/Trinidad & Tobago Specific
export const TT_CONFIG = {
  COUNTRY_CODE: '+1-868',
  CURRENCY: 'TTD',
  FLAG: '🇹🇹',
  TIMEZONE: 'America/Port_of_Spain',
  LANGUAGES: ['English'],
  PHONE_FORMAT: '+1-868-XXX-XXXX'
};

// Application Metadata
export const APP_INFO = {
  NAME: 'Caribbean Government Service Portal',
  VERSION: '1.0.0',
  DESCRIPTION: 'Trinidad & Tobago Multi-Agent AI Assistant',
  AUTHOR: 'Caribbean Government Service Portal',
  KEYWORDS: ['trinidad', 'tobago', 'government', 'services', 'AI']
};