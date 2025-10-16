// api/validation-agent-express.js - FIXED NATIONALITY VALIDATION
// Handles T&T specific validation rules with enhanced nationality matching

const express = require('express');
const router = express.Router();

// Trinidad & Tobago specific validation rules
const TT_VALIDATION_RULES = {
  // Phone number validation (Trinidad & Tobago format)
  phone: {
    pattern: /^(\+1-?868-?)?[2-9]\d{2}-?\d{4}$/,
    format: "+1-868-XXX-XXXX or 868-XXX-XXXX",
    examples: ["+1-868-123-4567", "868-123-4567", "8681234567"]
  },
  
  // National ID validation (placeholder - adjust for actual T&T format)
  id_number: {
    pattern: /^[A-Z]{2}\d{6}[A-Z]?$/,
    format: "TT123456 or TT123456A",
    description: "Trinidad & Tobago National ID format"
  },
  
  // Age validation rules
  age: {
    driver_license_min: 17,
    passport_min: 0, // No minimum for passport
    business_permit_min: 18,
    voting_age: 18,
    senior_citizen: 60
  },
  
  // ✅ ENHANCED: Nationality validation with multiple accepted formats
  nationality: {
    accepted: [
      "Trinidadian", "Tobagonian", "Trinidad and Tobago", 
      "Trinidad & Tobago", "T&T", "TT", "Trinbagonian", "Caribbean",
      "trinidad and tobago", "trinidad & tobago", "trini", "tobago"
    ],
    default: "Trinidad and Tobago"
  },
  
  // License class validation
  license_class: {
    valid_classes: ["A", "B", "C", "D", "E", "F", "G", "H"],
    descriptions: {
      "A": "Motorcycle",
      "B": "Private motor car", 
      "C": "Light goods vehicle",
      "D": "Heavy goods vehicle",
      "E": "Public service vehicle",
      "F": "Tractor",
      "G": "Road roller",
      "H": "Special purpose vehicle"
    }
  },
  
  // Business type validation
  business_type: {
    valid_types: [
      "Sole Proprietorship", "Partnership", "Private Company", 
      "Public Company", "NGO", "Cooperative", "Branch Office"
    ]
  }
};

// Validate phone number
function validatePhone(phone) {
  if (!phone) return { valid: true, message: "Phone number not provided (optional)" };
  
  const cleaned = phone.replace(/[\s-]/g, '');
  const rules = TT_VALIDATION_RULES.phone;
  
  if (!rules.pattern.test(phone)) {
    return {
      valid: false,
      message: `Invalid phone format. Use ${rules.format}`,
      examples: rules.examples
    };
  }
  
  return { valid: true, message: "Valid Trinidad & Tobago phone number" };
}

// Validate age based on service requirements
function validateAge(dateOfBirth, serviceType) {
  if (!dateOfBirth) return { valid: false, message: "Date of birth is required" };
  
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  
  if (birthDate >= today) {
    return { valid: false, message: "Date of birth cannot be in the future" };
  }
  
  const age = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
  const rules = TT_VALIDATION_RULES.age;
  
  let minAge = 0;
  let serviceName = "this service";
  
  // Determine minimum age based on service
  if (serviceType === "SVC_002" || serviceType?.toLowerCase().includes("driver")) {
    minAge = rules.driver_license_min;
    serviceName = "driver license";
  } else if (serviceType === "SVC_003" || serviceType?.toLowerCase().includes("business")) {
    minAge = rules.business_permit_min;
    serviceName = "business permit";
  }
  
  if (age < minAge) {
    return {
      valid: false,
      message: `Minimum age for ${serviceName} is ${minAge} years. Current age: ${age}`,
      current_age: age,
      required_age: minAge
    };
  }
  
  return {
    valid: true,
    message: `Age verification passed (${age} years)`,
    current_age: age
  };
}

// ✅ ENHANCED: Improved nationality validation with better matching
function validateNationality(nationality) {
  if (!nationality) return { valid: false, message: "Nationality is required" };
  
  const rules = TT_VALIDATION_RULES.nationality;
  
  // Normalize input: lowercase, remove extra spaces, handle & vs and
  const normalized = nationality.toLowerCase().trim()
    .replace(/\s+/g, ' ')           // Replace multiple spaces with single space
    .replace(/\s*&\s*/g, ' and ')   // Convert " & " to " and "
    .replace(/\s*\&\s*/g, ' and '); // Convert "&" to " and "
  
  console.log(`[Validation Agent] Checking nationality: "${nationality}" → normalized: "${normalized}"`);
  
  // Enhanced matching: check various patterns
  const isValid = rules.accepted.some(accepted => {
    const acceptedNorm = accepted.toLowerCase().trim()
      .replace(/\s+/g, ' ')
      .replace(/\s*&\s*/g, ' and ')
      .replace(/\s*\&\s*/g, ' and ');
    
    // Exact match
    if (normalized === acceptedNorm) {
      console.log(`[Validation Agent] ✅ EXACT MATCH: "${normalized}" === "${acceptedNorm}"`);
      return true;
    }
    
    // Contains match (for partial matches like "trini")
    if (normalized.includes(acceptedNorm) || acceptedNorm.includes(normalized)) {
      console.log(`[Validation Agent] ✅ CONTAINS MATCH: "${normalized}" <-> "${acceptedNorm}"`);
      return true;
    }
    
    return false;
  });
  
  if (!isValid) {
    console.log(`[Validation Agent] ❌ NO MATCH FOUND for: "${normalized}"`);
    console.log(`[Validation Agent] 📋 ACCEPTED VALUES:`, rules.accepted);
    
    return {
      valid: false,
      message: "Please specify Trinidad & Tobago nationality",
      accepted: rules.accepted,
      suggestion: rules.default,
      received: nationality,
      normalized: normalized
    };
  }
  
  console.log(`[Validation Agent] ✅ NATIONALITY VALIDATED: "${nationality}"`);
  return { valid: true, message: "Nationality verified" };
}

// Validate ID number
function validateIdNumber(idNumber) {
  if (!idNumber) return { valid: false, message: "ID number is required" };
  
  const rules = TT_VALIDATION_RULES.id_number;
  
  if (!rules.pattern.test(idNumber)) {
    return {
      valid: false,
      message: `Invalid ID format. Expected: ${rules.format}`,
      description: rules.description
    };
  }
  
  return { valid: true, message: "Valid Trinidad & Tobago ID format" };
}

// Validate license class
function validateLicenseClass(licenseClass) {
  if (!licenseClass) return { valid: false, message: "License class is required" };
  
  const rules = TT_VALIDATION_RULES.license_class;
  const upperClass = licenseClass.toUpperCase();
  
  if (!rules.valid_classes.includes(upperClass)) {
    return {
      valid: false,
      message: `Invalid license class. Valid classes: ${rules.valid_classes.join(', ')}`,
      valid_classes: rules.descriptions
    };
  }
  
  return {
    valid: true,
    message: `Valid license class: ${rules.descriptions[upperClass]}`,
    class_description: rules.descriptions[upperClass]
  };
}

// Validate business type
function validateBusinessType(businessType) {
  if (!businessType) return { valid: false, message: "Business type is required" };
  
  const rules = TT_VALIDATION_RULES.business_type;
  
  const isValid = rules.valid_types.some(validType =>
    validType.toLowerCase() === businessType.toLowerCase()
  );
  
  if (!isValid) {
    return {
      valid: false,
      message: "Invalid business type",
      valid_types: rules.valid_types
    };
  }
  
  return { valid: true, message: "Valid business type" };
}

// Main validation function
function performValidation(serviceDetails, ticketData) {
  const results = {
    overall_valid: true,
    errors: [],
    warnings: [],
    field_validations: {}
  };
  
  const serviceId = serviceDetails.service_id;
  
  // Phone validation (if provided)
  if (ticketData.phone) {
    const phoneResult = validatePhone(ticketData.phone);
    results.field_validations.phone = phoneResult;
    if (!phoneResult.valid) {
      results.errors.push(`Phone: ${phoneResult.message}`);
      results.overall_valid = false;
    }
  }
  
  // Age validation (if date_of_birth provided)
  if (ticketData.date_of_birth) {
    const ageResult = validateAge(ticketData.date_of_birth, serviceId);
    results.field_validations.age = ageResult;
    if (!ageResult.valid) {
      results.errors.push(`Age: ${ageResult.message}`);
      results.overall_valid = false;
    }
  }
  
  // Nationality validation (if provided)
  if (ticketData.nationality) {
    const nationalityResult = validateNationality(ticketData.nationality);
    results.field_validations.nationality = nationalityResult;
    if (!nationalityResult.valid) {
      results.errors.push(`Nationality: ${nationalityResult.message}`);
      results.overall_valid = false;
    }
  }
  
  // ID number validation (if provided)
  if (ticketData.id_number) {
    const idResult = validateIdNumber(ticketData.id_number);
    results.field_validations.id_number = idResult;
    if (!idResult.valid) {
      results.errors.push(`ID Number: ${idResult.message}`);
      results.overall_valid = false;
    }
  }
  
  // Service-specific validations
  if (serviceId === "SVC_002" && ticketData.license_class) {
    const licenseResult = validateLicenseClass(ticketData.license_class);
    results.field_validations.license_class = licenseResult;
    if (!licenseResult.valid) {
      results.errors.push(`License Class: ${licenseResult.message}`);
      results.overall_valid = false;
    }
  }
  
  if (serviceId === "SVC_003" && ticketData.business_type) {
    const businessResult = validateBusinessType(ticketData.business_type);
    results.field_validations.business_type = businessResult;
    if (!businessResult.valid) {
      results.errors.push(`Business Type: ${businessResult.message}`);
      results.overall_valid = false;
    }
  }
  
  return results;
}

// POST /api/validation-agent
router.post('/', async (req, res) => {
  try {
    const { service_details, ticket_data, validation_type = "full" } = req.body;
    
    // Input validation
    if (!service_details || !ticket_data) {
      return res.status(400).json({
        error: "Both service_details and ticket_data are required",
        status: "failed"
      });
    }
    
    // Validate service details structure
    if (!service_details.service_id || !service_details.service_name) {
      return res.status(400).json({
        error: "Invalid service_details: missing service_id or service_name",
        status: "failed"
      });
    }
    
    console.log(`[Validation Agent] Validating ${service_details.service_name} (${service_details.service_id})`);
    
    // Perform validation
    const validationResults = performValidation(service_details, ticket_data);
    
    // Build response
    const response = {
      validation_passed: validationResults.overall_valid,
      errors: validationResults.errors,
      warnings: validationResults.warnings,
      field_validations: validationResults.field_validations,
      service_id: service_details.service_id,
      service_name: service_details.service_name,
      status: "success",
      validation_summary: {
        total_fields_checked: Object.keys(validationResults.field_validations).length,
        errors_found: validationResults.errors.length,
        warnings_found: validationResults.warnings.length,
        tt_specific_rules_applied: true
      }
    };
    
    // Add improvement suggestions if validation failed
    if (!validationResults.overall_valid) {
      response.improvement_suggestions = [];
      
      if (validationResults.errors.some(e => e.includes('phone'))) {
        response.improvement_suggestions.push({
          field: "phone",
          suggestion: "Use Trinidad & Tobago format: +1-868-XXX-XXXX"
        });
      }
      
      if (validationResults.errors.some(e => e.includes('age'))) {
        response.improvement_suggestions.push({
          field: "age",
          suggestion: "Verify date of birth meets minimum age requirements"
        });
      }
      
      if (validationResults.errors.some(e => e.includes('nationality'))) {
        response.improvement_suggestions.push({
          field: "nationality",
          suggestion: 'Use "Trinidad and Tobago" or "Trinidadian"'
        });
      }
    }
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('[Validation Agent] API Error:', error);
    
    return res.status(500).json({
      error: "Internal server error during validation",
      status: "failed",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;