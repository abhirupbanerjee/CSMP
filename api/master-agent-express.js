// api/master-agent-express.js - Master Agent Intent Router for Express
// Converted from Vercel format to Express/CommonJS format

const express = require('express');
const OpenAI = require('openai');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Service loader functions (simplified version)
function loadServiceRepository() {
  try {
    const jsonPath = path.join(__dirname, '..', 'shared', 'service-repository.json');
    const jsonData = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(jsonData);
    
    if (!data.services || !Array.isArray(data.services)) {
      throw new Error("Invalid service repository: missing 'services' array");
    }
    
    // Convert to indexed format
    const serviceIndex = {};
    for (const service of data.services) {
      const serviceKey = service.service_name.toLowerCase().replace(/\s+/g, '_');
      serviceIndex[serviceKey] = service;
    }
    
    return {
      services: serviceIndex,
      rawServices: data.services
    };
    
  } catch (error) {
    console.error('[Master Agent] Error loading service repository:', error);
    return { services: {}, rawServices: [] };
  }
}

function getServiceNames() {
  const repo = loadServiceRepository();
  return Object.keys(repo.services);
}

function getAllServices() {
  const repo = loadServiceRepository();
  return repo.rawServices;
}

function getService(identifier) {
  const repo = loadServiceRepository();
  
  // Try by service key first
  const serviceKey = identifier.toLowerCase().replace(/\s+/g, '_');
  if (repo.services[serviceKey]) {
    return repo.services[serviceKey];
  }
  
  // Try by service_id
  const serviceById = repo.rawServices.find(s => s.service_id === identifier);
  if (serviceById) {
    return serviceById;
  }
  
  return null;
}

// Input validation function
function validateInput(userInput) {
  if (!userInput || typeof userInput !== 'string') {
    return { valid: false, error: "Input must be a non-empty string" };
  }
  
  if (userInput.trim().length === 0) {
    return { valid: false, error: "Input cannot be empty" };
  }
  
  const maxLength = parseInt(process.env.MAX_INPUT_LENGTH || '1000');
  if (userInput.length > maxLength) {
    return { valid: false, error: `Input exceeds maximum length (${maxLength})` };
  }
  
  return { valid: true };
}

// POST /api/master-agent
router.post('/', async (req, res) => {
  try {
    const { user_query } = req.body;
    
    // Input validation
    const validation = validateInput(user_query);
    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error,
        service_name: null
      });
    }
    
    // Get available services for routing
    const availableServices = getServiceNames();
    
    if (availableServices.length === 0) {
      return res.status(500).json({
        error: "No services available. Check service repository configuration.",
        service_name: null,
        status: "failed"
      });
    }
    
    // System prompt for intent routing
    const systemPrompt = `You are an intent router for a Caribbean government service portal.
Available services: ${availableServices.join(', ')}

Your job is to:
1. If user asks about available services, use 'list_services' function
2. If user requests a specific service, use 'route_to_service' function
3. Extract details from user requests

Be helpful and guide users to available services.`;

    // OpenAI function definitions
    const tools = [
      {
        type: "function",
        function: {
          name: "route_to_service",
          description: "Route user to the appropriate service agent",
          parameters: {
            type: "object",
            properties: {
              service_name: {
                type: "string",
                enum: availableServices,
                description: "The service the user needs (from repository)"
              },
              user_context: {
                type: "string",
                description: "User's original query/context"
              }
            },
            required: ["service_name", "user_context"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "list_services",
          description: "List all available government services",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        }
      }
    ];
    
    console.log(`[Master Agent] Processing query: ${user_query.substring(0, 100)}`);
    
    // Call OpenAI API for intent routing
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '256'),
      tools: tools,
      tool_choice: "auto",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: user_query }
      ]
    });
    
    // Process OpenAI response
    const message = response.choices[0].message;
    
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      console.log(`[Master Agent] Function called: ${toolCall.function.name}`);
      
      // Handle list_services function
      if (toolCall.function.name === "list_services") {
        const serviceList = getAllServices().map(service => ({
          service_id: service.service_id,
          service_name: service.service_name,
          ministry: service.ministry,
          description: service.description,
          processing_time: service.processing_time,
          fee: service.fee
        }));
        
        return res.status(200).json({
          action: "list_services",
          services: serviceList,
          service_name: null,
          status: "success"
        });
      }
      
      // Handle route_to_service function
      if (toolCall.function.name === "route_to_service") {
        const result = JSON.parse(toolCall.function.arguments);
        const serviceName = result.service_name;
        
        console.log(`[Master Agent] Routing to service: ${serviceName}`);
        
        // Validate service exists in repository
        const serviceDetails = getService(serviceName);
        
        if (serviceDetails) {
          return res.status(200).json({
            action: "route_to_service",
            service_name: serviceName,
            service_details: serviceDetails,
            user_context: result.user_context,
            status: "success",
            routing_info: {
              service_name: serviceName,
              service_details: serviceDetails,
              user_context: result.user_context
            }
          });
        } else {
          return res.status(400).json({
            error: `Service '${serviceName}' not found in repository`,
            service_name: null,
            status: "failed",
            available_services: availableServices
          });
        }
      }
    }
    
    // No function call triggered
    return res.status(400).json({
      error: "Could not determine service from user input",
      service_name: null,
      status: "failed",
      message: message.content || "Please try rephrasing your request.",
      suggestion: "Try asking about 'passport', 'driver license', 'business permit', or 'available services'"
    });
    
  } catch (error) {
    console.error('[Master Agent] API Error:', error);
    
    // Handle specific OpenAI errors
    if (error.code === 'insufficient_quota') {
      return res.status(429).json({
        error: "API quota exceeded. Please try again later.",
        service_name: null,
        status: "failed"
      });
    }
    
    if (error.code === 'invalid_api_key') {
      return res.status(401).json({
        error: "Invalid API key configuration",
        service_name: null,
        status: "failed"
      });
    }
    
    if (error.message && error.message.includes('model')) {
      return res.status(400).json({
        error: "OpenAI model not available",
        service_name: null,
        status: "failed"
      });
    }
    
    return res.status(500).json({
      error: "Internal server error",
      service_name: null,
      status: "failed",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;