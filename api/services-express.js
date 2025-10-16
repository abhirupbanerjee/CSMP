// api/services-express.js - Express version of services API
// Simple service listing endpoint converted from Vercel format

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Load service repository
function loadServiceRepository() {
  try {
    const jsonPath = path.join(__dirname, '..', 'shared', 'service-repository.json');
    const jsonData = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(jsonData);
    
    if (!data.services || !Array.isArray(data.services)) {
      throw new Error("Invalid service repository: missing 'services' array");
    }
    
    console.log(`[Services] Loaded ${data.services.length} services from repository`);
    return data;
    
  } catch (error) {
    console.error('[Services] Error loading service repository:', error);
    return {
      services: [],
      metadata: { error: error.message, total_services: 0 }
    };
  }
}

// GET /api/services - List all services
router.get('/', async (req, res) => {
  try {
    const serviceData = loadServiceRepository();
    
    res.json({
      status: "success",
      services: serviceData.services,
      metadata: serviceData.metadata,
      summary: {
        total_services: serviceData.services.length,
        available_ministries: [...new Set(serviceData.services.map(s => s.ministry))],
        service_types: [...new Set(serviceData.services.flatMap(s => s.service_types || []))]
      }
    });
    
  } catch (error) {
    console.error('[Services] GET error:', error);
    res.status(500).json({
      error: "Internal server error",
      status: "failed"
    });
  }
});

// POST /api/services - Get specific service
router.post('/', async (req, res) => {
  try {
    const { service_id, service_name } = req.body;
    
    if (!service_id && !service_name) {
      return res.status(400).json({
        error: "Either service_id or service_name is required",
        status: "failed"
      });
    }
    
    const serviceData = loadServiceRepository();
    const identifier = service_id || service_name;
    
    // Find service by ID or name
    const service = serviceData.services.find(s => 
      s.service_id === identifier || 
      s.service_name.toLowerCase() === identifier.toLowerCase()
    );
    
    if (!service) {
      const availableServices = serviceData.services.map(s => ({
        id: s.service_id,
        name: s.service_name
      }));
      
      return res.status(404).json({
        error: `Service not found: ${identifier}`,
        status: "failed",
        available_services: availableServices
      });
    }
    
    res.json({
      status: "success",
      service: service,
      lookup_method: service_id ? "service_id" : "service_name"
    });
    
  } catch (error) {
    console.error('[Services] POST error:', error);
    res.status(500).json({
      error: "Internal server error",
      status: "failed"
    });
  }
});

module.exports = router;