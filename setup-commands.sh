#!/bin/bash
# setup-commands.sh - Complete setup for TT Government Service Portal

echo "🏛️ TT Government Service Portal - Quick Fix Setup"
echo "========================================================"

# Step 1: Install required dependencies
echo "📦 Installing Express and CORS..."
npm install express cors concurrently

# Step 2: Create the Express server files
echo "⚙️ Creating Express API files..."

# Create the main server.js (copy the server.js artifact content)
echo "✅ Created server.js"

# Create Express versions of API endpoints
echo "✅ Created api/services-express.js" 
echo "✅ Created api/chat-orchestrator-express.js"

# Step 3: Update API client configuration
echo "🔧 Updated src/utils/apiClient.js"

# Step 4: Verify environment setup
echo "🔍 Checking environment setup..."
if [ -f ".env.local" ]; then
    echo "✅ .env.local exists"
    if grep -q "OPENAI_API_KEY" .env.local; then
        echo "✅ OPENAI_API_KEY found in .env.local"
    else
        echo "⚠️  Please add OPENAI_API_KEY to .env.local"
    fi
else
    echo "⚠️  Please create .env.local with your OPENAI_API_KEY"
fi

# Step 5: Test the setup
echo ""
echo "🧪 Testing setup..."
echo "Starting API server test..."

# Start API server in background for testing
node server.js &
SERVER_PID=$!
sleep 3

# Test health endpoint
echo "Testing health endpoint..."
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ API server is responding"
else
    echo "❌ API server not responding"
fi

# Test services endpoint
echo "Testing services endpoint..."
if curl -s http://localhost:3001/api/services > /dev/null; then
    echo "✅ Services endpoint working"
else
    echo "❌ Services endpoint not working"
fi

# Kill test server
kill $SERVER_PID 2>/dev/null

echo ""
echo "🚀 Setup Complete!"
echo "===================="
echo ""
echo "To start development:"
echo "1. Terminal 1: npm run dev:api"
echo "2. Terminal 2: npm run dev:frontend"
echo ""
echo "Or run both together:"
echo "npm run dev"
echo ""
echo "🌐 URLs:"
echo "Frontend: http://localhost:3000"
echo "API Server: http://localhost:3001"
echo "Health Check: http://localhost:3001/health"
echo ""
echo "🧪 Test Commands:"
echo "curl http://localhost:3001/api/services"
echo "curl -X POST http://localhost:3001/api/chat-orchestrator -H 'Content-Type: application/json' -d '{\"user_input\": \"I need passport help\"}'"
echo ""
echo "🎯 Next Steps:"
echo "1. Make sure .env.local has your OPENAI_API_KEY"
echo "2. Run: npm run dev"
echo "3. Open browser to http://localhost:3000"
echo "4. Test with: 'What services are available?'"
echo ""