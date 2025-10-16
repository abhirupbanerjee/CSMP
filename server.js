// server.js - Fixed CommonJS Express server for API routes
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    api_routes: ['chat-orchestrator', 'master-agent', 'service-composer', 'validation-agent', 'services', 'test']
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Caribbean Government Service Portal API',
    version: '1.0.0',
    endpoints: {
      'POST /api/chat-orchestrator': 'Main workflow orchestration',
      'POST /api/master-agent': 'Intent routing',
      'POST /api/service-composer': 'Multi-turn conversations',
      'POST /api/validation-agent': 'T&T validation',
      'GET /api/services': 'List available services',
      'GET /api/test': 'Test endpoint'
    }
  });
});

// Function to safely load and mount routes
function loadRoute(routePath, mountPath) {
  try {
    const route = require(routePath);
    
    // Check if it's a valid Express router
    if (typeof route === 'function' || (route && typeof route.handle === 'function')) {
      app.use(mountPath, route);
      console.log(`✅ Loaded: ${mountPath}`);
      return true;
    } else {
      console.error(`❌ Invalid route export at ${routePath}:`, typeof route);
      return false;
    }
  } catch (error) {
    console.error(`❌ Failed to load ${routePath}:`, error.message);
    return false;
  }
}

// Load API routes with error handling
console.log('🔄 Loading API routes...');

const routes = [
  { path: './api/chat-orchestrator-express.js', mount: '/api/chat-orchestrator' },
  { path: './api/master-agent-express.js', mount: '/api/master-agent' },
  { path: './api/service-composer-express.js', mount: '/api/service-composer' },
  { path: './api/validation-agent-express.js', mount: '/api/validation-agent' },
  { path: './api/services-express.js', mount: '/api/services' },
  { path: './api/test-express.js', mount: '/api/test' }
];

let loadedRoutes = 0;
for (const route of routes) {
  if (loadRoute(route.path, route.mount)) {
    loadedRoutes++;
  }
}

console.log(`📊 Loaded ${loadedRoutes}/${routes.length} routes successfully`);

if (loadedRoutes === 0) {
  console.error('❌ No routes loaded! Check your API files.');
  process.exit(1);
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('[API Error]', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    available_routes: routes.map(r => r.mount)
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 Caribbean Government Service Portal - API Server');
  console.log('================================================');
  console.log(`📡 API Server: http://localhost:${PORT}`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`📋 API Info: http://localhost:${PORT}/api`);
  console.log(`📋 Services: http://localhost:${PORT}/api/services`);
  console.log('================================================');
  console.log(`✅ ${loadedRoutes} API endpoints ready for testing`);
  console.log('================================================\n');
});