// server.js - Fixed CommonJS Express server for Railway deployment
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const app = express();

// 🚀 RAILWAY FIX #1: Use Railway's PORT environment variable
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://*.railway.app', 'https://your-domain.com'] 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// 🚀 RAILWAY FIX #2: Health check endpoint (REQUIRED)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    api_routes: ['chat-orchestrator', 'master-agent', 'service-composer', 'validation-agent', 'services', 'test']
  });
});

// 🚀 RAILWAY FIX #3: Serve React build files in production
if (process.env.NODE_ENV === 'production') {
  // Serve static files from React build
  app.use(express.static(path.join(__dirname, 'build')));
  
  // Serve React app for any non-API routes
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Caribbean Government Service Portal API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      'POST /api/chat-orchestrator': 'Main workflow orchestration',
      'POST /api/master-agent': 'Intent routing',
      'POST /api/service-composer': 'Multi-turn conversations',
      'POST /api/validation-agent': 'T&T validation',
      'GET /api/services': 'List available services',
      'GET /api/test': 'Test endpoint',
      'GET /health': 'Health check'
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
  // Don't exit in production - serve health check at minimum
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
}

// 🚀 RAILWAY FIX #4: Serve React app for all non-API routes (SPA support)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('[API Error]', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'API route not found',
    path: req.originalUrl,
    available_routes: routes.map(r => r.mount)
  });
});

// 🚀 RAILWAY FIX #5: Listen on 0.0.0.0 (not localhost) for Railway
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 Caribbean Government Service Portal - Railway Deployment');
  console.log('========================================================');
  console.log(`📡 Server: http://0.0.0.0:${PORT}`);
  console.log(`🏥 Health Check: http://0.0.0.0:${PORT}/health`);
  console.log(`📋 API Info: http://0.0.0.0:${PORT}/api`);
  console.log(`📋 Services: http://0.0.0.0:${PORT}/api/services`);
  console.log('========================================================');
  console.log(`✅ ${loadedRoutes} API endpoints ready`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('========================================================\n');
});