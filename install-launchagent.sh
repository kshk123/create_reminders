#!/bin/bash

# Install or uninstall the LaunchAgent for Apple Reminders Bridge
# This makes the bridge start automatically when you log in

PLIST_NAME="com.user.apple-reminders-bridge.plist"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PLIST_FILE="$SCRIPT_DIR/$PLIST_NAME"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
INSTALLED_PLIST="$LAUNCH_AGENTS_DIR/$PLIST_NAME"

echo "========================================"
echo "  Apple Reminders Bridge Auto-Start"
echo "========================================"
echo ""

# Function to install the LaunchAgent
install_launchagent() {
    # Create LaunchAgents directory if it doesn't exist
    mkdir -p "$LAUNCH_AGENTS_DIR"
    
    # Create a customized plist with the actual script path
    sed "s|/Users/basu/CodeBase/apps/set_reminders|$SCRIPT_DIR|g" "$PLIST_FILE" > "$INSTALLED_PLIST"
    
    # Load the LaunchAgent
    launchctl load "$INSTALLED_PLIST"
    
    echo "✓ LaunchAgent installed successfully!"
    echo ""
    echo "The bridge will now start automatically when you log in."
    echo "It's running now in the background."
    echo ""
    echo "To view logs:"
    echo "  Standard output: ~/Library/Logs/apple-reminders-bridge.log"
    echo "  Errors:          ~/Library/Logs/apple-reminders-bridge-error.log"
    echo ""
    echo "To uninstall, run: ./install-launchagent.sh uninstall"
}

# Function to uninstall the LaunchAgent
uninstall_launchagent() {
    if [ -f "$INSTALLED_PLIST" ]; then
        # Unload the LaunchAgent
        launchctl unload "$INSTALLED_PLIST" 2>/dev/null
        
        # Remove the plist file
        rm "$INSTALLED_PLIST"
        
        echo "✓ LaunchAgent uninstalled successfully!"
        echo ""
        echo "The bridge will no longer start automatically."
        echo "You can still start it manually with: ./start-bridge.sh"
    else
        echo "LaunchAgent is not currently installed."
    fi
}

# Function to check status
check_status() {
    if [ -f "$INSTALLED_PLIST" ]; then
        echo "✓ LaunchAgent is installed"
        echo ""
        echo "Checking if bridge is running..."
        if lsof -ti:19092 > /dev/null 2>&1; then
            echo "✓ Bridge is currently running on port 19092"
            echo ""
            echo "Recent logs (last 10 lines):"
            echo "---"
            tail -n 10 "$HOME/Library/Logs/apple-reminders-bridge.log" 2>/dev/null || echo "No logs yet"
        else
            echo "⚠ Bridge is not running"
            echo ""
            echo "Check error logs:"
            tail -n 20 "$HOME/Library/Logs/apple-reminders-bridge-error.log" 2>/dev/null || echo "No error logs"
        fi
    else
        echo "LaunchAgent is not installed."
        echo "Run: ./install-launchagent.sh install"
    fi
}

# Main script
case "$1" in
    install)
        if [ -f "$INSTALLED_PLIST" ]; then
            echo "LaunchAgent is already installed."
            echo "To reinstall, run: ./install-launchagent.sh uninstall"
            echo "Then run: ./install-launchagent.sh install"
            exit 0
        fi
        install_launchagent
        ;;
    uninstall)
        uninstall_launchagent
        ;;
    status)
        check_status
        ;;
    restart)
        echo "Restarting bridge..."
        if [ -f "$INSTALLED_PLIST" ]; then
            launchctl unload "$INSTALLED_PLIST" 2>/dev/null
            launchctl load "$INSTALLED_PLIST"
            echo "✓ Bridge restarted (new auth token generated)"
        else
            echo "LaunchAgent is not installed. Nothing to restart."
        fi
        ;;
    *)
        echo "Usage: $0 {install|uninstall|status|restart}"
        echo ""
        echo "Commands:"
        echo "  install   - Install LaunchAgent (auto-start on login)"
        echo "  uninstall - Remove LaunchAgent (stop auto-start)"
        echo "  status    - Check if LaunchAgent is installed and running"
        echo "  restart   - Restart the bridge (generates new auth token)"
        echo ""
        echo "Examples:"
        echo "  ./install-launchagent.sh install"
        echo "  ./install-launchagent.sh status"
        echo "  ./install-launchagent.sh restart"
        exit 1
        ;;
esac
