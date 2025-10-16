// shared/service-loader.js - Service Repository Loader for Vercel
// Handles loading and caching of service definitions

import fs from 'fs';
import path from 'path';

// Cache for service repository to avoid repeated file reads
let serviceCache = null;
let lastCacheTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

/**
 * Load service repository from JSON file
 * Uses caching to improve performance on Vercel
 */
export function loadServiceRepository() {
  const now = Date.now();
  
  // Return cached version if still valid
  if (serviceCache && lastCacheTime && (now - lastCacheTime) < CACHE_DURATION) {
    return serviceCache;
  }
  
  try {
    // Get the correct path for Vercel deployment
    const jsonPath = path.join(process.cwd(), 'shared', 'service-repository.json');
    
    // Read and parse JSON file
    const jsonData = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(jsonData);
    
    // Validate repository structure
    if (!data.services || !Array.isArray(data.services)) {
      throw new Error("Invalid service repository: missing 'services' array");
    }
    
    // Convert services array to indexed object for faster lookup
    const serviceIndex = {};
    const requiredFields = ['service_id', 'service_name', 'ministry', 'required_fields', 'optional_fields'];
    
    for (const service of data.services) {
      // Validate required fields
      const missing = requiredFields.filter(field => !(field in service));
      if (missing.length > 0) {
        throw new Error(`Service ${service.service_id || 'unknown'} missing fields: ${missing.join(', ')}`);
      }
      
      // Create service key (lowercase with underscores)
      const serviceKey = service.service_name.toLowerCase().replace(/\s+/g, '_');
      serviceIndex[serviceKey] = service;
    }
    
    // Cache the processed repository
    serviceCache = {
      services: serviceIndex,
      metadata: data.metadata || {
        version: "1.0",
        total_services: data.services.length,
        region: "Caribbean"
      },
      rawServices: data.services // Keep original array for listing
    };
    
    lastCacheTime = now;
    
    console.log(`[Service Loader] Loaded ${data.services.length} services from repository`);
    return serviceCache;
    
  } catch (error) {
    console.error('[Service Loader] Error loading service repository:', error);
    
    // Return fallback empty repository
    return {
      services: {},
      metadata: { total_services: 0, error: error.message },
      rawServices: []
    };
  }
}

/**
 * Get a specific service by name or ID
 */
export function getService(identifier) {
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

/**
 * Get all services as array (for listing)
 */
export function getAllServices() {
  const repo = loadServiceRepository();
  return repo.rawServices;
}

/**
 * Get service names for OpenAI function definitions
 */
export function getServiceNames() {
  const repo = loadServiceRepository();
  return Object.keys(repo.services);
}

/**
 * Validate service repository integrity
 */
export function validateRepository() {
  const repo = loadServiceRepository();
  const errors = [];
  const warnings = [];
  
  // Check metadata
  if (!repo.metadata) {
    warnings.push("Missing metadata section");
  } else {
    if (repo.metadata.total_services !== repo.rawServices.length) {
      warnings.push(`Metadata mismatch: claims ${repo.metadata.total_services} but found ${repo.rawServices.length}`);
    }
  }
  
  // Check for duplicate service IDs
  const serviceIds = new Set();
  const serviceNames = new Set();
  
  for (const service of repo.rawServices) {
    if (serviceIds.has(service.service_id)) {
      errors.push(`Duplicate service_id: ${service.service_id}`);
    } else {
      serviceIds.add(service.service_id);
    }
    
    if (serviceNames.has(service.service_name)) {
      errors.push(`Duplicate service_name: ${service.service_name}`);
    } else {
      serviceNames.add(service.service_name);
    }
    
    // Validate required vs optional fields don't overlap
    const reqSet = new Set(service.required_fields || []);
    const optSet = new Set(service.optional_fields || []);
    const overlap = [...reqSet].filter(field => optSet.has(field));
    
    if (overlap.length > 0) {
      errors.push(`Service ${service.service_id}: overlapping fields ${overlap.join(', ')}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    serviceCount: repo.rawServices.length
  };
}

// Export default object for easier imports
export default {
  loadServiceRepository,
  getService,
  getAllServices,
  getServiceNames,
  validateRepository
};