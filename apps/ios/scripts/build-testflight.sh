#!/bin/bash

# March iOS TestFlight Build Script
# Usage: ./scripts/build-testflight.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 March iOS TestFlight Build Script${NC}"
echo "========================================"

# Check if we're in the right directory
if [ ! -f "March.xcodeproj/project.pbxproj" ]; then
    echo -e "${RED}❌ Error: Must be run from apps/ios directory${NC}"
    echo "Run: cd apps/ios && ./scripts/build-testflight.sh"
    exit 1
fi

# Check if Xcode is installed
if ! command -v xcodebuild &> /dev/null; then
    echo -e "${RED}❌ Error: Xcode command line tools not found${NC}"
    echo "Install with: xcode-select --install"
    exit 1
fi

# Generate build number based on timestamp
BUILD_NUMBER=$(date +%Y%m%d%H%M)
echo -e "${YELLOW}📦 Setting build number to: ${BUILD_NUMBER}${NC}"

# Update build number in Info.plist
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUMBER" March/Info.plist

# Create build directory
mkdir -p build

echo -e "${YELLOW}🔨 Building project...${NC}"

# Clean previous builds
xcodebuild -project March.xcodeproj -scheme March clean

# Build for release
echo -e "${YELLOW}⚙️  Building for release...${NC}"
xcodebuild -project March.xcodeproj \
           -scheme March \
           -configuration Release \
           build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful!${NC}"
else
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

echo -e "${YELLOW}📁 Creating archive...${NC}"

# Archive the build
xcodebuild -project March.xcodeproj \
           -scheme March \
           -configuration Release \
           -archivePath "./build/March-$BUILD_NUMBER.xcarchive" \
           archive

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Archive created successfully!${NC}"
    echo -e "${BLUE}📍 Archive location: build/March-$BUILD_NUMBER.xcarchive${NC}"
else
    echo -e "${RED}❌ Archive failed!${NC}"
    exit 1
fi

# Open Xcode Organizer for manual upload
echo -e "${YELLOW}🎯 Opening Xcode Organizer for TestFlight upload...${NC}"
open -a Xcode build/March-$BUILD_NUMBER.xcarchive

echo ""
echo -e "${GREEN}🎉 Build process complete!${NC}"
echo "========================================"
echo -e "${BLUE}Next steps:${NC}"
echo "1. In Xcode Organizer, click 'Distribute App'"
echo "2. Choose 'App Store Connect'"
echo "3. Follow the upload wizard"
echo "4. Wait for processing (15-30 minutes)"
echo "5. Configure TestFlight in App Store Connect"
echo ""
echo -e "${YELLOW}Build Details:${NC}"
echo "- Version: 1.0.0"
echo "- Build: $BUILD_NUMBER"
echo "- Configuration: Release"
echo "- Archive: build/March-$BUILD_NUMBER.xcarchive"
echo ""
echo -e "${BLUE}📖 Full guide: ./TESTFLIGHT-GUIDE.md${NC}" 