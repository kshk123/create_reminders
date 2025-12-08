#!/bin/bash

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Apple Reminders Bridge Launcher${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is not installed${NC}"
    echo "Please install Python 3 from https://www.python.org/"
    exit 1
fi

# Check if the bridge script exists
if [ ! -f "apple_reminders_bridge.py" ]; then
    echo -e "${RED}Error: apple_reminders_bridge.py not found${NC}"
    echo "Make sure you're running this script from the extension directory"
    exit 1
fi

# Check if port 19092 is already in use
if lsof -Pi :19092 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}Warning: Port 19092 is already in use${NC}"
    echo "The bridge might already be running, or another app is using this port."
    echo ""
    read -p "Kill the existing process and restart? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Stopping existing process..."
        lsof -ti:19092 | xargs kill -9 2>/dev/null
        sleep 1
    else
        echo "Exiting..."
        exit 0
    fi
fi

echo -e "${GREEN}✓${NC} Starting Apple Reminders bridge..."
echo -e "${YELLOW}Note:${NC} macOS may ask for permission to access Reminders on first run"
echo -e "${YELLOW}      Go to: System Settings → Privacy & Security → Reminders${NC}"
echo ""
echo -e "${GREEN}Bridge will run on: http://localhost:19092${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""
echo "========================================="
echo ""

# Make the script executable
chmod +x apple_reminders_bridge.py 2>/dev/null

# Run the bridge
python3 apple_reminders_bridge.py

# If the script exits unexpectedly
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
    echo ""
    echo -e "${RED}Bridge stopped with error code: $EXIT_CODE${NC}"
    exit $EXIT_CODE
fi
