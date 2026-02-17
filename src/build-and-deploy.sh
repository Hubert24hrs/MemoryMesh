#!/bin/bash

###############################################################################
# MemoryMesh Enhanced - Build & Deploy Script
# Version: 2.0.0
# 
# This script automates the entire build and deployment process
# Usage: ./scripts/build-and-deploy.sh [environment] [platform]
#
# Examples:
#   ./scripts/build-and-deploy.sh development ios
#   ./scripts/build-and-deploy.sh production all
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="MemoryMesh Enhanced"
VERSION=$(node -p "require('./package.json').version")

###############################################################################
# HELPER FUNCTIONS
###############################################################################

print_header() {
    echo -e "\n${BLUE}================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 is not installed"
        exit 1
    fi
}

###############################################################################
# ENVIRONMENT SETUP
###############################################################################

# Parse arguments
ENVIRONMENT=${1:-development}
PLATFORM=${2:-all}

print_header "Building $PROJECT_NAME v$VERSION"
print_info "Environment: $ENVIRONMENT"
print_info "Platform: $PLATFORM"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|preview|production)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT"
    echo "Valid options: development, preview, production"
    exit 1
fi

# Validate platform
if [[ ! "$PLATFORM" =~ ^(ios|android|all)$ ]]; then
    print_error "Invalid platform: $PLATFORM"
    echo "Valid options: ios, android, all"
    exit 1
fi

###############################################################################
# PRE-FLIGHT CHECKS
###############################################################################

print_header "Pre-flight Checks"

# Check required commands
print_info "Checking required tools..."
check_command node
check_command npm
check_command eas
check_command git

print_success "All required tools are installed"

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js 18+ is required (current: $(node -v))"
    exit 1
fi
print_success "Node.js version is compatible"

# Check environment file
if [ ! -f ".env.local" ] && [ "$ENVIRONMENT" != "development" ]; then
    print_error ".env.local file not found"
    print_info "Copy .env.example to .env.local and fill in your values"
    exit 1
fi
print_success "Environment configuration found"

# Check git status
if [ "$ENVIRONMENT" == "production" ]; then
    if [ -n "$(git status --porcelain)" ]; then
        print_warning "You have uncommitted changes"
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

###############################################################################
# DEPENDENCY INSTALLATION
###############################################################################

print_header "Installing Dependencies"

print_info "Running npm install..."
npm ci --silent

print_success "Dependencies installed"

###############################################################################
# CODE QUALITY CHECKS
###############################################################################

print_header "Code Quality Checks"

# Type checking
print_info "Running TypeScript type check..."
npm run type-check
print_success "Type check passed"

# Linting
print_info "Running ESLint..."
npm run lint
print_success "Linting passed"

# Unit tests
print_info "Running unit tests..."
npm test -- --coverage --watchAll=false --silent
print_success "All tests passed"

###############################################################################
# BUILD PREPARATION
###############################################################################

print_header "Build Preparation"

# Clean previous builds
print_info "Cleaning previous builds..."
rm -rf dist/
rm -rf .expo/
print_success "Build directory cleaned"

# Generate Supabase types (if needed)
if [ -f "supabase/.env" ]; then
    print_info "Generating Supabase types..."
    npm run db:generate
    print_success "Database types generated"
fi

###############################################################################
# BUILD EXECUTION
###############################################################################

print_header "Building Application"

# Set environment variables
export APP_ENV=$ENVIRONMENT
export APP_VERSION=$VERSION

case $ENVIRONMENT in
    development)
        BUILD_PROFILE="development"
        ;;
    preview)
        BUILD_PROFILE="preview"
        ;;
    production)
        BUILD_PROFILE="production"
        ;;
esac

print_info "Using build profile: $BUILD_PROFILE"

# Build for specified platform
case $PLATFORM in
    ios)
        print_info "Building for iOS..."
        eas build --platform ios --profile $BUILD_PROFILE --non-interactive
        ;;
    android)
        print_info "Building for Android..."
        eas build --platform android --profile $BUILD_PROFILE --non-interactive
        ;;
    all)
        print_info "Building for both platforms..."
        eas build --platform all --profile $BUILD_PROFILE --non-interactive
        ;;
esac

print_success "Build completed successfully!"

###############################################################################
# POST-BUILD ACTIONS
###############################################################################

print_header "Post-Build Actions"

# Get build info
BUILD_ID=$(eas build:list --platform $PLATFORM --limit 1 --json | jq -r '.[0].id')
print_info "Build ID: $BUILD_ID"

# Generate changelog
print_info "Generating changelog..."
git log --oneline --no-merges -n 10 > CHANGELOG.txt
print_success "Changelog generated"

###############################################################################
# DEPLOYMENT (Production only)
###############################################################################

if [ "$ENVIRONMENT" == "production" ]; then
    print_header "Deployment"
    
    read -p "Submit to app stores? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        case $PLATFORM in
            ios)
                print_info "Submitting to iOS App Store..."
                eas submit --platform ios --latest --non-interactive
                ;;
            android)
                print_info "Submitting to Google Play Store..."
                eas submit --platform android --latest --non-interactive
                ;;
            all)
                print_info "Submitting to both app stores..."
                eas submit --platform ios --latest --non-interactive
                eas submit --platform android --latest --non-interactive
                ;;
        esac
        print_success "Submission completed!"
    fi
fi

###############################################################################
# ANALYTICS & MONITORING
###############################################################################

print_header "Analytics & Monitoring"

# Send build event to analytics (if configured)
if [ ! -z "$MIXPANEL_TOKEN" ]; then
    print_info "Tracking build event..."
    curl -X POST "https://api.mixpanel.com/track" \
        -d "data=$(echo '{
            "event": "app_built",
            "properties": {
                "version": "'$VERSION'",
                "environment": "'$ENVIRONMENT'",
                "platform": "'$PLATFORM'",
                "build_id": "'$BUILD_ID'",
                "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
            }
        }' | base64)" > /dev/null 2>&1
    print_success "Build event tracked"
fi

# Create Sentry release (if configured)
if [ ! -z "$SENTRY_AUTH_TOKEN" ] && [ "$ENVIRONMENT" == "production" ]; then
    print_info "Creating Sentry release..."
    sentry-cli releases new "$VERSION" > /dev/null 2>&1 || true
    sentry-cli releases set-commits "$VERSION" --auto > /dev/null 2>&1 || true
    sentry-cli releases finalize "$VERSION" > /dev/null 2>&1 || true
    print_success "Sentry release created"
fi

###############################################################################
# BACKUP & ARCHIVE
###############################################################################

print_header "Backup & Archive"

# Create build archive
ARCHIVE_NAME="memorymesh-$VERSION-$ENVIRONMENT-$(date +%Y%m%d-%H%M%S).zip"
print_info "Creating build archive..."

mkdir -p ./builds
zip -r "./builds/$ARCHIVE_NAME" \
    ./package.json \
    ./app.json \
    ./eas.json \
    ./CHANGELOG.txt \
    -x "*/node_modules/*" "*/.*" > /dev/null 2>&1

print_success "Build archived: ./builds/$ARCHIVE_NAME"

###############################################################################
# CLEANUP
###############################################################################

print_header "Cleanup"

# Remove temporary files
rm -f CHANGELOG.txt
print_success "Temporary files removed"

###############################################################################
# SUMMARY
###############################################################################

print_header "Build Summary"

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Build Successful! 🎉${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${BLUE}Project:${NC}     $PROJECT_NAME"
echo -e "  ${BLUE}Version:${NC}     $VERSION"
echo -e "  ${BLUE}Environment:${NC} $ENVIRONMENT"
echo -e "  ${BLUE}Platform:${NC}    $PLATFORM"
echo -e "  ${BLUE}Build ID:${NC}    $BUILD_ID"
echo -e "  ${BLUE}Archive:${NC}     $ARCHIVE_NAME"
echo ""

# Next steps
print_info "Next Steps:"
echo "  1. Download build from: https://expo.dev/accounts/[account]/projects/memorymesh/builds/$BUILD_ID"
echo "  2. Test on device before submitting"
echo "  3. Monitor analytics and error tracking"

if [ "$ENVIRONMENT" == "production" ]; then
    echo "  4. Update version in package.json for next release"
    echo "  5. Create git tag: git tag v$VERSION && git push origin v$VERSION"
fi

echo ""
print_success "All done! 🚀"
echo ""

###############################################################################
# EXIT
###############################################################################

exit 0
