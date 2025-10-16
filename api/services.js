// api/services.js - Simple Service Listing API
// Provides quick access to service information without OpenAI calls

import ServiceLoader from '../shared/service-loader.js';

// Main API handler
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // Handle GET request for all services
    if (req.method === 'GET') {
      const allServices = ServiceLoader.getAllServices();
      const serviceRepository = ServiceLoader.loadServiceRepository();
      
      return res.status(200).json({
        status: "success",
        services: allServices,
        metadata: serviceRepository.metadata,
        summary: {
          total_services: allServices.length,
          available_ministries: [...new Set(allServices.map(s => s.ministry))],
          service_types: [...new Set(allServices.flatMap(s => s.service_types || []))]
        }
      });
    }
    
    // Handle POST request for specific service lookup
    if (req.method === 'POST') {
      const { service_id, service_name } = req.body;
      
      if (!service_id && !service_name) {
        return res.status(400).json({
          error: "Either service_id or service_name is required",
          status: "failed"
        });
      }
      
      const identifier = service_id || service_name;
      const service = ServiceLoader.getService(identifier);
      
      if (!service) {
        return res.status(404).json({
          error: `Service not found: ${identifier}`,
          status: "failed",
          available_services: ServiceLoader.getServiceNames()
        });
      }
      
      return res.status(200).json({
        status: "success",
        service: service,
        lookup_method: service_id ? "service_id" : "service_name"
      });
    }
    
    // Method not allowed
    return res.status(405).json({
      error: "Method not allowed. Use GET for all services or POST for specific service.",
      allowed_methods: ["GET", "POST"],
      status: "failed"
    });
    
  } catch (error) {
    console.error('[Services API] Error:', error);
    
    return res.status(500).json({
      error: "Internal server error",
      status: "failed",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}