#!/bin/bash

# SEC EDGAR Query App - Quick Start Script

echo "🚀 Starting SEC EDGAR Query Application..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if ports are available
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠️  Port 3000 is already in use. Please stop any running services on port 3000.${NC}"
    echo "You can find and kill the process with: lsof -ti:3000 | xargs kill"
    exit 1
fi

if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠️  Port 5173 is already in use. Please stop any running services on port 5173.${NC}"
    echo "You can find and kill the process with: lsof -ti:5173 | xargs kill"
    exit 1
fi

echo -e "${BLUE}📋 Starting services...${NC}"

# Start backend in background
echo -e "${GREEN}🔧 Starting backend server...${NC}"
cd backend
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
echo -e "${YELLOW}⏳ Waiting for backend to start...${NC}"
sleep 3

# Start frontend in background
echo -e "${GREEN}🎨 Starting frontend server...${NC}"
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
echo -e "${YELLOW}⏳ Waiting for frontend to start...${NC}"
sleep 3

echo ""
echo -e "${GREEN}✅ SEC EDGAR Query App is now running!${NC}"
echo ""
echo -e "${BLUE}🌐 Frontend:${NC} http://localhost:5173"
echo -e "${BLUE}🔗 Backend API:${NC} http://localhost:3000"
echo -e "${BLUE}💊 Health Check:${NC} http://localhost:3000/health"
echo ""
echo -e "${YELLOW}📖 Usage:${NC}"
echo "   1. Open http://localhost:5173 in your browser"
echo "   2. Try asking questions like 'What was Apple's revenue in 2023?'"
echo "   3. Use Ctrl+C to stop both servers"
echo ""
echo -e "${YELLOW}🔍 Process IDs:${NC}"
echo "   Backend PID: $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${RED}🛑 Stopping servers...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}✅ Servers stopped.${NC}"
    exit 0
}

# Set trap to cleanup on Ctrl+C
trap cleanup SIGINT SIGTERM

# Wait for user to press Ctrl+C
echo -e "${YELLOW}Press Ctrl+C to stop the servers...${NC}"
wait