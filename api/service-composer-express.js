// api/service-composer-express.js - COMPLETE FIXED VERSION
const express = require('express');
const { OpenAI } = require('openai');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const router = express.Router();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Service loader functions (inline since we can't import from ES module)
function loadServiceRepository() {
  try {
    const jsonPath = path.join(__dirname, '..', 'shared', 'service-repository.json');
    const jsonData = fs.readFileSync(jsonPath, 'utf8');
    return JSON.parse(jsonData);
  } catch (error) {
    console.error('[Service Composer] Error loading service repository:', error);
    return { services: [] };
  }
}

// POST /api/service-composer
router.post('/', async (req, res) => {
    console.log(`[${new Date().toISOString()}] POST /api/service-composer`);
    
    try {
        const { routing_info, conversation_history = [], collected_data = {} } = req.body;
        
        if (!routing_info || !routing_info.service_details) {
            return res.status(400).json({ error: 'Missing routing_info or service_details' });
        }

        const service_details = routing_info.service_details;
        const service_name = service_details.service_name;
        const service_id = service_details.service_id;
        const ministry = service_details.ministry;
        const required_fields = service_details.required_fields || [];
        const optional_fields = service_details.optional_fields || [];

        console.log(`[Service Composer] Processing: ${service_name} (${service_id})`);
        
        // FIXED: Use provided collected_data from orchestrator instead of extracting again
        console.log(`[Service Composer] 📊 RECEIVED COLLECTED DATA:`, JSON.stringify(collected_data, null, 2));
        
        // FIXED: Recalculate missing required after using the orchestrator's data (which includes auto-detected fields)
        const missing_required = required_fields.filter(field => 
            !collected_data[field] || 
            collected_data[field].toString().trim() === ''
        );
        const is_complete = missing_required.length === 0;
        
        console.log(`[Service Composer] 📋 Required fields: [${required_fields.join(', ')}]`);
        console.log(`[Service Composer] 📋 Collected: [${Object.keys(collected_data).join(', ')}]`);
        console.log(`[Service Composer] 📋 Missing required: [${missing_required.join(', ')}]`);
        console.log(`[Service Composer] ✅ Complete: ${is_complete}`);

        if (is_complete) {
            console.log(`[Service Composer] ✅ ALL REQUIRED FIELDS COLLECTED`);
            
            // Check if we still have optional fields to ask about
            const provided_optional = optional_fields.filter(field => {
                const value = collected_data[field];
                return value && 
                       value.toString().trim() !== '' && 
                       !['no', 'skip', 'not provided', 'not available', 'n/a', 'none'].includes(value.toString().toLowerCase().trim());
            });
            
            const remaining_optional = optional_fields.filter(field => {
                const value = collected_data[field];
                return !value || 
                       value.toString().trim() === '' ||
                       ['no', 'skip', 'not provided', 'not available', 'n/a', 'none'].includes(value.toString().toLowerCase().trim());
            });
            
            console.log(`[Service Composer] 📋 Optional fields analysis:`);
            console.log(`[Service Composer] 📋 - All optional: [${optional_fields.join(', ')}]`);
            console.log(`[Service Composer] 📋 - Provided: [${provided_optional.join(', ')}]`);
            console.log(`[Service Composer] 📋 - Remaining: [${remaining_optional.join(', ')}]`);
            
            // FIXED: Better detection of user declining optional fields
            const last_user_messages = conversation_history
                .filter(msg => msg.role === 'user')
                .slice(-3); // Check last 3 user messages for decline signals
                
            const user_declined_optional = last_user_messages.some(msg => 
                msg.content && (
                    msg.content.toLowerCase().includes('no') || 
                    msg.content.toLowerCase().includes('skip') ||
                    msg.content.toLowerCase().includes('proceed') ||
                    msg.content.toLowerCase().includes('create') ||
                    msg.content.toLowerCase().includes('submit') ||
                    msg.content.toLowerCase().includes('not provided') ||
                    msg.content.toLowerCase().includes('not available') ||
                    msg.content.toLowerCase().includes('prefer not') ||
                    msg.content.toLowerCase().includes('rather not') ||
                    msg.content.toLowerCase().trim() === 'no'
                )
            );
            
            // FIXED: Also check if we've asked about all optional fields
            const optional_completion_check = remaining_optional.length === 0;
            
            console.log(`[Service Composer] 📋 User declined optional: ${user_declined_optional}`);
            console.log(`[Service Composer] 📋 All optional completed: ${optional_completion_check}`);
            
            if (user_declined_optional || optional_completion_check) {
                console.log(`[Service Composer] 📋 Proceeding to validation and ticket creation...`);
                console.log(`[Service Composer] 📋 User declined: ${user_declined_optional}, All optional completed: ${optional_completion_check}`);
                
                // FIXED: Define cleanedData outside try block so it's available in catch
                const cleanedData = {};
                Object.keys(collected_data).forEach(key => {
                    const value = collected_data[key];
                    // FIXED: Include "not available" in the filter list
                    if (value && 
                        value.toString().trim() !== '' && 
                        !['no', 'skip', 'not provided', 'not available', 'n/a', 'none'].includes(value.toString().toLowerCase().trim())) {
                        cleanedData[key] = value;
                    }
                });
                
                console.log(`[Service Composer] 🧹 CLEANED DATA for validation:`, JSON.stringify(cleanedData, null, 2));
                
                try {
                    // Call validation agent before creating ticket
                    const validation_url = process.env.NODE_ENV === 'development' 
                        ? 'http://localhost:3001/api/validation-agent'
                        : `${process.env.VERCEL_URL}/api/validation-agent`;
                        
                    console.log(`[Service Composer] 🔍 CALLING VALIDATION for data validation...`);
                    
                    const validation_response = await fetch(validation_url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            service_details: service_details,
                            collected_data: cleanedData
                        })
                    });
                    
                    const validation_result = await validation_response.json();
                    console.log(`[Service Composer] 📊 VALIDATION RESULT:`, validation_result.validation_passed ? 'PASSED' : 'FAILED');
                    
                    // FIXED: Handle both possible validation response formats
                    const validation_passed = validation_result.validation_passed || validation_result.is_valid;
                    const validation_errors = validation_result.errors || [];
                    
                    if (!validation_passed && validation_errors.length > 0) {
                        console.log(`[Service Composer] ❌ VALIDATION ERRORS:`, validation_errors);
                        
                        // Return validation errors to user
                        const error_message = `I found some issues with the information provided:\n\n${validation_errors.map(err => `• ${err}`).join('\n')}\n\nPlease provide the correct information.`;
                        
                        return res.json({
                            agent_response: error_message,
                            ticket_created: false,
                            ticket_data: null,
                            conversation_state: {
                                service_details,
                                collected_data: cleanedData,
                                phase: 'validation_failed',
                                validation_errors: validation_errors
                            }
                        });
                    }
                    
                    // Validation passed - create ticket
                    console.log(`[Service Composer] 🎫 CREATING TICKET with validated data...`);
                    
                    return res.json({
                        agent_response: `✅ **Ticket Created Successfully!**\n\n📋 **Service:** ${service_name}\n🆔 **Service ID:** ${service_id}\n🏛️ **Ministry:** ${ministry}\n⏱️ **Processing Time:** ${service_details.processing_time || 'TBD'}\n💰 **Fee:** ${service_details.fee || 'TBD'}\n\nYour service request has been submitted and will be processed accordingly. Thank you for using the Government Service Portal!`,
                        ticket_created: true,
                        ticket_data: cleanedData,
                        conversation_state: {
                            service_details,
                            collected_data: cleanedData,
                            phase: 'completed'
                        }
                    });
                    
                } catch (validation_error) {
                    console.error(`[Service Composer] ❌ VALIDATION CALL FAILED:`, validation_error.message);
                    
                    // Continue with ticket creation if validation service is down
                    console.log(`[Service Composer] ⚠️ VALIDATION UNAVAILABLE - Creating ticket anyway`);
                    
                    return res.json({
                        agent_response: `✅ **Ticket Created Successfully!**\n\n📋 **Service:** ${service_name}\n🆔 **Service ID:** ${service_id}\n🏛️ **Ministry:** ${ministry}\n\n⚠️ Note: Validation service was unavailable, but your request has been submitted.\n\nThank you for using the Government Service Portal!`,
                        ticket_created: true,
                        ticket_data: cleanedData,
                        conversation_state: {
                            service_details,
                            collected_data: cleanedData,
                            phase: 'completed'
                        }
                    });
                }
            }
        }

        // Continue conversation - prepare OpenAI messages
        const messages = buildConversationMessages(service_details, conversation_history, collected_data, missing_required);
        console.log(`[Service Composer] 📤 SENDING ${messages.length} messages to OpenAI`);
        console.log(`[Service Composer] 🤖 OpenAI will be told: COLLECTED=[${Object.keys(collected_data).join(', ')}] MISSING=[${missing_required.join(', ')}]`);

        const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 512,
            messages: messages,
            temperature: 0.3
        });

        const agent_response = completion.choices[0].message.content;
        console.log(`[Service Composer] 🤖 Agent Response Generated (${agent_response.length} chars)`);

        return res.json({
            agent_response,
            ticket_created: false,
            ticket_data: null,
            conversation_state: {
                service_details,
                collected_data,
                phase: is_complete ? 'optional_fields' : 'collecting'
            }
        });

    } catch (error) {
        console.error('[Service Composer] ❌ ERROR:', error.message);
        return res.status(500).json({ 
            error: 'Service Composer failed',
            details: error.message 
        });
    }
});

function buildConversationMessages(service_details, conversation_history, collected_data, missing_required) {
    const required_fields = service_details.required_fields || [];
    const optional_fields = service_details.optional_fields || [];
    
    const collected_fields = Object.keys(collected_data);
    const remaining_optional = optional_fields.filter(field => !collected_fields.includes(field));
    
    // FIXED: Filter out already collected fields from missing required
    const truly_missing_required = missing_required.filter(field => !collected_fields.includes(field));
    
    console.log(`[Service Composer] 🏗️ Building prompt with:`, {
        all_required: required_fields,
        collected: collected_fields,
        truly_missing: truly_missing_required,
        remaining_optional: remaining_optional
    });
    
    // FIXED: More explicit system prompt with better optional field handling
    let system_prompt = `You are a Service Agent for ${service_details.ministry} - ${service_details.service_name}.

CRITICAL INSTRUCTIONS:
- NEVER ask for information that is already collected
- Only ask for ONE missing field at a time
- Be conversational but professional
- For optional fields, always explain they are optional and can be skipped

FIELDS STATUS:
✅ ALREADY COLLECTED: ${collected_fields.length > 0 ? collected_fields.map(f => `${f}="${collected_data[f]}"`).join(', ') : 'None'}
❌ STILL NEEDED: ${truly_missing_required.length > 0 ? truly_missing_required.join(', ') : 'None'}
📋 OPTIONAL REMAINING: ${remaining_optional.join(', ')}

WHAT TO DO NOW:`;

    if (truly_missing_required.length > 0) {
        system_prompt += `\n\nASK FOR: ${truly_missing_required[0]} (this is REQUIRED)
DO NOT ASK FOR: ${collected_fields.join(', ')} (already have these)`;
    } else if (remaining_optional.length > 0) {
        const next_optional = remaining_optional[0];
        
        // FIXED: Specific instructions for optional fields
        system_prompt += `\n\nAll required fields collected! Now ask for OPTIONAL field: ${next_optional}

IMPORTANT FOR OPTIONAL FIELDS:
- Clearly state this field is OPTIONAL
- Mention they can skip it by saying "no", "skip", "not provided", or "not available"
- Be friendly and not pushy
- Explain why this information might be helpful (if applicable)

EXAMPLE PHRASES FOR OPTIONAL FIELDS:
- "This next field is optional - would you like to provide your ${next_optional}? You can skip this if you prefer."
- "For our records, we can optionally include your ${next_optional}. Would you like to provide it, or would you prefer to skip this?"
- "The last few questions are optional to help us serve you better. Would you like to share your ${next_optional}?"`;

        // Add field-specific context
        if (next_optional === 'phone') {
            system_prompt += `\n\nFor PHONE: Mention it's helpful for appointment reminders or urgent updates, but completely optional.`;
        } else if (next_optional === 'email') {
            system_prompt += `\n\nFor EMAIL: Mention it's useful for status updates and digital copies, but completely optional.`;
        } else if (next_optional === 'address') {
            system_prompt += `\n\nFor ADDRESS: Mention it's helpful for document delivery, but completely optional.`;
        } else if (next_optional === 'emergency_contact') {
            system_prompt += `\n\nFor EMERGENCY_CONTACT: Mention it's for emergency situations only, but completely optional.`;
        }
        
    } else {
        system_prompt += `\n\nAll fields collected! Ask user if they want to submit the application for processing.`;
    }

    const messages = [
        { role: 'system', content: system_prompt }
    ];
    
    // Add conversation history (limit to last 6 messages for context)
    const recent_history = conversation_history.slice(-6);
    messages.push(...recent_history);
    
    console.log(`[Service Composer] 🤖 System prompt: ASK FOR=[${truly_missing_required[0] || remaining_optional[0] || 'submit'}] DON'T ASK FOR=[${collected_fields.join(', ')}]`);
    console.log(`[Service Composer] 🤖 DETAILED PROMPT ANALYSIS:`);
    console.log(`[Service Composer] 🤖 - All required fields: [${required_fields.join(', ')}]`);
    console.log(`[Service Composer] 🤖 - Currently collected: [${collected_fields.join(', ')}]`);
    console.log(`[Service Composer] 🤖 - Truly missing required: [${truly_missing_required.join(', ')}]`);
    console.log(`[Service Composer] 🤖 - Should ask for: ${truly_missing_required.length > 0 ? truly_missing_required[0] : remaining_optional.length > 0 ? `optional ${remaining_optional[0]}` : 'submit'}`);
    
    return messages;
}

module.exports = router;