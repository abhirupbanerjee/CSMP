// api/chat-orchestrator-express.js - FIXED for Railway deployment
// Use internal function calls instead of HTTP requests to localhost

const express = require('express');
const router = express.Router();

// Helper functions to call other agents INTERNALLY (not via HTTP)
async function callMasterAgent(userQuery) {
  try {
    // FIXED: Import and call master agent function directly
    const masterAgentRoute = require('./master-agent-express.js');
    
    // Create mock req/res objects for internal call
    const mockReq = {
      body: { user_query: userQuery },
      method: 'POST'
    };
    
    return new Promise((resolve, reject) => {
      const mockRes = {
        json: (data) => resolve(data),
        status: (code) => ({
          json: (data) => {
            if (code >= 400) {
              reject(new Error(data.error || `Master Agent failed: ${code}`));
            } else {
              resolve(data);
            }
          }
        })
      };
      
      // Call the master agent route handler directly
      const routeHandler = masterAgentRoute.stack?.[0]?.route?.stack?.[0]?.handle;
      if (routeHandler) {
        routeHandler(mockReq, mockRes);
      } else {
        // Fallback: try to execute the router directly
        masterAgentRoute(mockReq, mockRes, (err) => {
          if (err) reject(err);
        });
      }
    });
    
  } catch (error) {
    console.error('[Orchestrator] Master Agent call failed:', error);
    throw error;
  }
}

async function callServiceComposer(routingInfo, conversationHistory, collectedData) {
  try {
    // FIXED: Import and call service composer function directly
    const serviceComposerRoute = require('./service-composer-express.js');
    
    // Create mock req/res objects for internal call
    const mockReq = {
      body: { 
        routing_info: routingInfo,
        conversation_history: conversationHistory,
        collected_data: collectedData
      },
      method: 'POST'
    };
    
    return new Promise((resolve, reject) => {
      const mockRes = {
        json: (data) => resolve(data),
        status: (code) => ({
          json: (data) => {
            if (code >= 400) {
              reject(new Error(data.error || `Service Composer failed: ${code}`));
            } else {
              resolve(data);
            }
          }
        })
      };
      
      // Call the service composer route handler directly
      const routeHandler = serviceComposerRoute.stack?.[0]?.route?.stack?.[0]?.handle;
      if (routeHandler) {
        routeHandler(mockReq, mockRes);
      } else {
        // Fallback: try to execute the router directly
        serviceComposerRoute(mockReq, mockRes, (err) => {
          if (err) reject(err);
        });
      }
    });
    
  } catch (error) {
    console.error('[Orchestrator] Service Composer call failed:', error);
    throw error;
  }
}

// FIXED: Centralized data extraction with comprehensive field mapping
function extractCollectedData(conversation_history, required_fields, optional_fields) {
  const collected = {};
  
  console.log(`[Orchestrator] 🔍 EXTRACTING from ${conversation_history.length} messages`);
  
  // FIXED: Auto-detect service type FIRST before processing Q&A pairs
  if (!collected.service_type) {
    const allContent = conversation_history.map(msg => msg.content).join(' ').toLowerCase();
    
    if (allContent.includes('renew') || allContent.includes('renewal')) {
      collected.service_type = 'renewal';
      console.log(`[Orchestrator] 🔍 AUTO-DETECTED service_type: "renewal" from conversation context`);
    } else if (allContent.includes('new') || allContent.includes('application')) {
      collected.service_type = 'new_application';
      console.log(`[Orchestrator] 🔍 AUTO-DETECTED service_type: "new_application" from conversation context`);
    } else if (allContent.includes('replace') || allContent.includes('replacement')) {
      collected.service_type = 'replacement';
      console.log(`[Orchestrator] 🔍 AUTO-DETECTED service_type: "replacement" from conversation context`);
    }
  }
  
  // Process conversation history to extract field values
  for (let i = 0; i < conversation_history.length - 1; i++) {
    const assistant_msg = conversation_history[i];
    const user_msg = conversation_history[i + 1];
    
    if (assistant_msg && user_msg && assistant_msg.role === 'assistant' && user_msg.role === 'user') {
      const question = assistant_msg.content.toLowerCase();
      const answer = user_msg.content.trim();
      
      // Skip if answer is too short or seems like a question
      if (answer.length < 2 || answer.endsWith('?')) {
        continue;
      }
      
      console.log(`[Orchestrator] 🔍 Q: "${question.substring(0, 50)}..." → A: "${answer}"`);
      
      // COMPREHENSIVE field detection
      if ((question.includes('full name') || question.includes('your name') || question.includes('provide your name')) && !collected.full_name) {
        collected.full_name = answer;
        console.log(`[Orchestrator] ✅ EXTRACTED full_name: "${answer}"`);
      }
      else if ((question.includes('date of birth') || question.includes('birth date') || question.includes('born')) && !collected.date_of_birth) {
        collected.date_of_birth = answer;
        console.log(`[Orchestrator] ✅ EXTRACTED date_of_birth: "${answer}"`);
      }
      else if ((question.includes('nationality') || question.includes('citizen') || question.includes('from which country')) && !collected.nationality) {
        collected.nationality = answer;
        console.log(`[Orchestrator] ✅ EXTRACTED nationality: "${answer}"`);
      }
      else if ((question.includes('id number') || question.includes('identification') || question.includes('id card')) && !collected.id_number) {
        collected.id_number = answer;
        console.log(`[Orchestrator] ✅ EXTRACTED id_number: "${answer}"`);
      }
      else if ((question.includes('phone number') || (question.includes('phone') && !question.includes('email'))) && !collected.phone) {
        collected.phone = answer.replace(/^(phone:|tel:)/i, '').trim();
        console.log(`[Orchestrator] ✅ EXTRACTED phone: "${collected.phone}"`);
      }
      else if ((question.includes('email address') || (question.includes('email') && !question.includes('phone'))) && !collected.email) {
        collected.email = answer.replace(/^email:/i, '').trim();
        console.log(`[Orchestrator] ✅ EXTRACTED email: "${collected.email}"`);
      }
      else if ((question.includes('address') || question.includes('where do you live')) && !collected.address) {
        collected.address = answer;
        console.log(`[Orchestrator] ✅ EXTRACTED address: "${answer}"`);
      }
      else if (question.includes('emergency contact') && !collected.emergency_contact) {
        collected.emergency_contact = answer;
        console.log(`[Orchestrator] ✅ EXTRACTED emergency_contact: "${answer}"`);
      }
      // Service-specific fields
      else if ((question.includes('license class') || question.includes('class of license')) && !collected.license_class) {
        collected.license_class = answer;
        console.log(`[Orchestrator] ✅ EXTRACTED license_class: "${answer}"`);
      }
      else if (question.includes('business name') && !collected.business_name) {
        collected.business_name = answer;
        console.log(`[Orchestrator] ✅ EXTRACTED business_name: "${answer}"`);
      }
      else if (question.includes('business type') && !collected.business_type) {
        collected.business_type = answer;
        console.log(`[Orchestrator] ✅ EXTRACTED business_type: "${answer}"`);
      }
      else if (question.includes('owner name') && !collected.owner_name) {
        collected.owner_name = answer;
        console.log(`[Orchestrator] ✅ EXTRACTED owner_name: "${answer}"`);
      }
      else if (question.includes('tax id') && !collected.tax_id) {
        collected.tax_id = answer;
        console.log(`[Orchestrator] ✅ EXTRACTED tax_id: "${answer}"`);
      }
      else if (question.includes('business address') && !collected.business_address) {
        collected.business_address = answer;
        console.log(`[Orchestrator] ✅ EXTRACTED business_address: "${answer}"`);
      }
      else if (question.includes('parent name') && !collected.parent_name) {
        collected.parent_name = answer;
        console.log(`[Orchestrator] ✅ EXTRACTED parent_name: "${answer}"`);
      }
      else if (question.includes('registration number') && !collected.registration_number) {
        collected.registration_number = answer;
        console.log(`[Orchestrator] ✅ EXTRACTED registration_number: "${answer}"`);
      }
      else if (question.includes('property address') && !collected.property_address) {
        collected.property_address = answer;
        console.log(`[Orchestrator] ✅ EXTRACTED property_address: "${answer}"`);
      }
      else if (question.includes('property type') && !collected.property_type) {
        collected.property_type = answer;
        console.log(`[Orchestrator] ✅ EXTRACTED property_type: "${answer}"`);
      }
      else if (question.includes('deed number') && !collected.deed_number) {
        collected.deed_number = answer;
        console.log(`[Orchestrator] ✅ EXTRACTED deed_number: "${answer}"`);
      }
      else if (question.includes('land area') && !collected.land_area) {
        collected.land_area = answer;
        console.log(`[Orchestrator] ✅ EXTRACTED land_area: "${answer}"`);
      }
      else {
        console.log(`[Orchestrator] ❓ NO MATCH for: "${question.substring(0, 50)}..."`);
      }
    }
  }
  
  console.log(`[Orchestrator] 📊 FINAL EXTRACTED DATA:`, collected);
  return collected;
}

// Conversation state management
function createInitialConversationState(routingInfo) {
  return {
    routing_info: routingInfo,
    conversation_history: [],
    collected_data: {},
    current_phase: "information_gathering",
    service_id: routingInfo.service_details.service_id,
    service_name: routingInfo.service_details.service_name,
    ministry: routingInfo.service_details.ministry,
    created_at: new Date().toISOString(),
    turn_count: 0
  };
}

// Main orchestration workflow
async function orchestrateWorkflow(userInput, conversationState = null) {
  const workflowLog = {
    started_at: new Date().toISOString(),
    phases: [],
    user_input: userInput,
    workflow_id: `WF-${Date.now()}`
  };
  
  try {
    let routingInfo = null;
    let updatedConversationState = conversationState;

    // PHASE 1: Intent Routing (first interaction only)
    if (!conversationState) {
      console.log('[Orchestrator] 🎯 PHASE 1: Intent Routing');
      console.log('[Orchestrator] Calling Master Agent:', userInput.substring(0, 50), '...');
      
      workflowLog.phases.push({
        phase: "intent_routing",
        started_at: new Date().toISOString(),
        agent: "master_agent"
      });
      
      const routingResult = await callMasterAgent(userInput);
      
      workflowLog.phases[workflowLog.phases.length - 1].completed_at = new Date().toISOString();
      workflowLog.phases[workflowLog.phases.length - 1].result = routingResult.action;
      
      // Handle service listing
      if (routingResult.action === "list_services") {
        console.log('[Orchestrator] ✅ Service listing requested');
        return {
          status: "services_listed",
          action: "list_services",
          services: routingResult.services,
          agent_response: `I found ${routingResult.services.length} government services available. Which service do you need help with?`,
          workflow_metadata: workflowLog
        };
      }
      
      // Handle service routing
      if (routingResult.action === "route_to_service" && routingResult.service_details) {
        routingInfo = {
          service_name: routingResult.service_name,
          service_details: routingResult.service_details,
          user_context: routingResult.user_context
        };
        updatedConversationState = createInitialConversationState(routingInfo);
        console.log('[Orchestrator] ✅ Routed to:', routingInfo.service_details.service_name);
      } else {
        throw new Error("Master Agent did not provide valid routing information");
      }
    } else {
      routingInfo = conversationState.routing_info;
      console.log('[Orchestrator] 🔄 Continuing conversation for:', routingInfo.service_details.service_name);
    }

    // PHASE 2: Service Information Collection
    console.log('[Orchestrator] 🎯 PHASE 2: Service Agent Processing');
    
    // FIXED: Build complete conversation history including current user input
    const currentHistory = [...(updatedConversationState.conversation_history || [])];
    currentHistory.push({ role: 'user', content: userInput });
    
    // FIXED: Extract data from complete conversation history BEFORE calling Service Composer
    const service_details = routingInfo.service_details;
    const required_fields = service_details.required_fields || [];
    const optional_fields = service_details.optional_fields || [];
    const collectedData = extractCollectedData(currentHistory, required_fields, optional_fields);
    
    console.log('[Orchestrator] 📝 Sending conversation history with', currentHistory.length, 'messages to Service Composer');
    console.log('[Orchestrator] 📊 Pre-extracted data:', Object.keys(collectedData));
    
    workflowLog.phases.push({
      phase: "service_conversation",
      started_at: new Date().toISOString(),
      agent: "service_composer",
      service_id: routingInfo.service_details.service_id,
      turn: updatedConversationState.turn_count,
      collected_fields: Object.keys(collectedData)
    });
    
    const composerResult = await callServiceComposer(
      routingInfo,
      currentHistory,
      collectedData  // FIXED: Pass extracted data to Service Composer
    );
    
    workflowLog.phases[workflowLog.phases.length - 1].completed_at = new Date().toISOString();
    workflowLog.phases[workflowLog.phases.length - 1].ticket_created = composerResult.ticket_created;
    
    if (!composerResult.agent_response) {
      throw new Error("Service Composer did not provide valid response");
    }

    // FIXED: Update conversation state with complete history and collected data
    const finalHistory = [...currentHistory];
    finalHistory.push({ role: 'assistant', content: composerResult.agent_response });
    
    updatedConversationState = {
      ...updatedConversationState,
      conversation_history: finalHistory,
      collected_data: collectedData,  // Use orchestrator's extracted data
      turn_count: Math.floor(finalHistory.length / 2),
      current_phase: composerResult.ticket_created ? "completed" : "information_gathering",
      last_updated: new Date().toISOString()
    };

    console.log('[Orchestrator] 📊 Turn count:', updatedConversationState.turn_count);
    console.log('[Orchestrator] 📋 Final collected fields:', Object.keys(collectedData));
    console.log('[Orchestrator] 📊 Final data values:', collectedData);

    // PHASE 3: Result Compilation
    console.log('[Orchestrator] 🎯 PHASE 3: Response Compilation');
    
    workflowLog.phases.push({
      phase: "response_compilation",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    });
    
    workflowLog.completed_at = new Date().toISOString();
    workflowLog.total_duration_ms = new Date() - new Date(workflowLog.started_at);

    // Final response
    const response = {
      status: "success",
      agent_response: composerResult.agent_response,
      conversation_state: updatedConversationState,
      service_details: {
        ...routingInfo.service_details,
        turn: updatedConversationState.turn_count,
        collected_fields: Object.keys(collectedData),
        phase: updatedConversationState.current_phase
      },
      ticket_created: composerResult.ticket_created,
      ticket_data: composerResult.ticket_data,
      workflow_metadata: workflowLog
    };

    console.log('[Orchestrator] ✅ Success:', routingInfo.service_details.service_name);
    console.log('[Orchestrator] 🎫 Ticket created:', composerResult.ticket_created);
    
    return response;
    
  } catch (error) {
    console.error('[Orchestrator] ❌ Workflow Error:', error);
    workflowLog.error = error.message;
    workflowLog.completed_at = new Date().toISOString();
    
    return {
      status: "error",
      error: error.message || "Unknown error",
      agent_response: "I'm sorry, there was an error processing your request. Please try again.",
      workflow_metadata: workflowLog
    };
  }
}

// POST /api/chat-orchestrator
router.post('/', async (req, res) => {
  try {
    const { user_input, conversation_state } = req.body;
    
    if (!user_input) {
      return res.status(400).json({ 
        status: "error",
        error: 'user_input is required' 
      });
    }

    console.log(`[${new Date().toISOString()}] POST /api/chat-orchestrator`);
    console.log(`[Orchestrator] Processing: "${user_input.substring(0, 30)}..."`);
    console.log(`[Orchestrator] Has conversation state: ${!!conversation_state}`);
    
    if (conversation_state) {
      console.log(`[Orchestrator] Service: ${conversation_state.service_name}`);
      console.log(`[Orchestrator] Turn: ${conversation_state.turn_count}`);
      console.log(`[Orchestrator] Phase: ${conversation_state.current_phase}`);
      console.log(`[Orchestrator] Current collected: [${Object.keys(conversation_state.collected_data || {}).join(', ')}]`);
    }

    const result = await orchestrateWorkflow(user_input, conversation_state);
    
    console.log(`[Orchestrator] ✅ RESULT: ${result.status}`);
    if (result.status === "success") {
      console.log(`[Orchestrator] 📋 Service: ${result.service_details?.service_name || 'N/A'}`);
      console.log(`[Orchestrator] 🎫 Ticket: ${result.ticket_created ? 'Created' : 'Not created'}`);
    }
    
    res.status(200).json(result);
    
  } catch (error) {
    console.error('[Orchestrator] ❌ Handler Error:', error);
    res.status(500).json({
      status: "error",
      error: error.message || "Internal server error"
    });
  }
});

module.exports = router;