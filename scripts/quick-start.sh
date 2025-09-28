#!/bin/bash
# Quick Start Script for Linux/macOS
# This script provides a menu-driven interface for common operations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Dranoel Application Quick Start Menu${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""

show_menu() {
    echo -e "${WHITE}Available Actions:${NC}"
    echo -e "${GREEN}1.${NC} 🛠️  Setup Development Environment (dev-setup)"
    echo -e "${GREEN}2.${NC} 🚀 Start Application (start-app)"
    echo -e "${GREEN}3.${NC} 🧪 Run Tests (test-app)"
    echo -e "${GREEN}4.${NC} 🗑️  Reset Database (reset-db)"
    echo -e "${GREEN}5.${NC} 💾 Backup Database (backup-db)"
    echo -e "${GREEN}6.${NC} 📦 Prepare Deployment (deploy-prep)"
    echo -e "${GREEN}7.${NC} ℹ️  View Application Status"
    echo -e "${GREEN}8.${NC} 📋 View Help/Documentation"
    echo -e "${RED}9.${NC} ❌ Exit"
    echo ""
}

check_status() {
    echo -e "${CYAN}📊 Checking Application Status...${NC}"
    echo ""

    # Check Node.js
    if command -v node &> /dev/null; then
        echo -e "${GREEN}✅ Node.js:${NC} $(node --version)"
    else
        echo -e "${RED}❌ Node.js: Not installed${NC}"
    fi

    # Check npm
    if command -v npm &> /dev/null; then
        echo -e "${GREEN}✅ npm:${NC} $(npm --version)"
    else
        echo -e "${RED}❌ npm: Not installed${NC}"
    fi

    # Check dependencies
    if [ -d "node_modules" ]; then
        echo -e "${GREEN}✅ Dependencies: Installed${NC}"
    else
        echo -e "${YELLOW}⚠️  Dependencies: Not installed${NC}"
    fi

    # Check environment file
    if [ -f ".env" ] || [ -f ".env.local" ]; then
        echo -e "${GREEN}✅ Environment: Configured${NC}"
    else
        echo -e "${YELLOW}⚠️  Environment: Not configured${NC}"
    fi

    # Check if app is running
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Application: Running on http://localhost:3000${NC}"
    else
        echo -e "${YELLOW}⚠️  Application: Not running${NC}"
    fi

    # Check database connection (if Prisma is available)
    if command -v npx &> /dev/null && [ -f "prisma/schema.prisma" ]; then
        if npx prisma db pull --print > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Database: Connected${NC}"
        else
            echo -e "${YELLOW}⚠️  Database: Connection issues${NC}"
        fi
    fi

    echo ""
}

show_help() {
    echo -e "${CYAN}📚 Dranoel Application Help${NC}"
    echo -e "${CYAN}========================${NC}"
    echo ""
    echo -e "${WHITE}Quick Commands:${NC}"
    echo -e "  ${GREEN}Fresh Setup:${NC} Choose option 1 (dev-setup) then 2 (start-app)"
    echo -e "  ${GREEN}Daily Dev:${NC}   Choose option 2 (start-app) for quick start"
    echo -e "  ${GREEN}Testing:${NC}     Choose option 3 (test-app) before committing"
    echo -e "  ${GREEN}Database:${NC}    Choose option 4 (reset-db) or 5 (backup-db)"
    echo ""
    echo -e "${WHITE}File Locations:${NC}"
    echo -e "  Configuration: ${YELLOW}.env${NC} or ${YELLOW}.env.local${NC}"
    echo -e "  Database Schema: ${YELLOW}prisma/schema.prisma${NC}"
    echo -e "  Backups: ${YELLOW}backups/${NC} directory"
    echo ""
    echo -e "${WHITE}Useful URLs:${NC}"
    echo -e "  Application: ${BLUE}http://localhost:3000${NC}"
    echo -e "  Database Admin: ${BLUE}npx prisma studio${NC}"
    echo ""
    echo -e "${WHITE}Need More Help?${NC}"
    echo -e "  Read: ${YELLOW}scripts/README.md${NC} for detailed documentation"
    echo ""
}

# Main menu loop
while true; do
    show_menu
    echo -e "${WHITE}Enter your choice (1-9):${NC} \c"
    read choice
    echo ""

    case $choice in
        1)
            echo -e "${BLUE}🛠️  Running Development Setup...${NC}"
            ./scripts/dev-setup.sh
            echo -e "${GREEN}✅ Development setup completed!${NC}"
            ;;
        2)
            echo -e "${BLUE}🚀 Starting Application...${NC}"
            ./scripts/start-app.sh
            ;;
        3)
            echo -e "${BLUE}🧪 Running Tests...${NC}"
            ./scripts/test-app.sh
            echo -e "${GREEN}✅ Tests completed!${NC}"
            ;;
        4)
            echo -e "${YELLOW}⚠️  This will DELETE all data in your database!${NC}"
            echo -e "${WHITE}Are you sure? (y/N):${NC} \c"
            read confirm
            if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
                echo -e "${BLUE}🗑️  Resetting Database...${NC}"
                ./scripts/reset-db.sh
                echo -e "${GREEN}✅ Database reset completed!${NC}"
            else
                echo -e "${YELLOW}❌ Database reset cancelled${NC}"
            fi
            ;;
        5)
            echo -e "${BLUE}💾 Creating Database Backup...${NC}"
            ./scripts/backup-db.sh
            echo -e "${GREEN}✅ Database backup completed!${NC}"
            ;;
        6)
            echo -e "${BLUE}📦 Preparing Deployment Package...${NC}"
            ./scripts/deploy-prep.sh
            echo -e "${GREEN}✅ Deployment preparation completed!${NC}"
            ;;
        7)
            check_status
            ;;
        8)
            show_help
            ;;
        9)
            echo -e "${GREEN}👋 Goodbye! Thanks for using Dranoel Quick Start!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Invalid option. Please choose 1-9.${NC}"
            ;;
    esac

    echo ""
    echo -e "${WHITE}Press Enter to continue...${NC}"
    read
    echo ""
done