# TestFlight Deployment Guide for March iOS App

## 🎯 Overview

This guide walks you through building, archiving, and distributing the March iOS app via TestFlight.

## 📋 Prerequisites

### 1. Apple Developer Account
- **Individual or Organization account** ($99/year)
- Sign up at: https://developer.apple.com/programs/
- **Note**: Free accounts cannot distribute via TestFlight

### 2. Required Software
- **Xcode 14.3.1** (for macOS 12.7) - [Installation Guide](./xcode-install-guide.md)
- **macOS 12.7** or later
- **iOS device** for testing (optional but recommended)

### 3. App Store Connect Access
- Access to App Store Connect with your Apple ID
- App registered in App Store Connect (we'll create this)

## 🔧 Step 1: Xcode Project Configuration

### 1.1 Set Bundle Identifier
Open the project in Xcode and update the bundle identifier:

```bash
# Open project
cd apps/ios
open March.xcodeproj
```

In Xcode:
1. Select project "March" in navigator
2. Select "March" target
3. Go to "Signing & Capabilities" tab
4. Change **Bundle Identifier** to: `com.march.app` (or your unique ID)

### 1.2 Configure Development Team
1. In "Signing & Capabilities" tab
2. Select your **Team** (your Apple Developer account)
3. Ensure "Automatically manage signing" is checked
4. Xcode will generate provisioning profiles automatically

### 1.3 Set App Version and Build Number
1. In "General" tab, update:
   - **Version**: `1.0.0` (marketing version)
   - **Build**: `1` (will increment for each TestFlight upload)

### 1.4 Configure App Icons
Create app icons in these sizes:
- 20x20, 29x29, 40x40, 58x58, 60x60, 76x76, 80x80, 87x87, 120x120, 152x152, 167x167, 180x180, 1024x1024

Add them to `March/Assets.xcassets/AppIcon.appiconset/`

## 🏗️ Step 2: Build and Archive

### 2.1 Select Device
1. In Xcode, select **"Any iOS Device (arm64)"** from the device menu
2. **Do NOT** select a simulator for archiving

### 2.2 Build for Release
```bash
# Command line build (optional)
cd apps/ios
xcodebuild -project March.xcodeproj -scheme March -configuration Release build
```

### 2.3 Create Archive
**Option A: Using Xcode**
1. Go to **Product → Archive**
2. Wait for build to complete
3. Organizer window will open

**Option B: Using Command Line**
```bash
xcodebuild -project March.xcodeproj \
           -scheme March \
           -configuration Release \
           -archivePath ./build/March.xcarchive \
           archive
```

## 📱 Step 3: App Store Connect Setup

### 3.1 Create App Record
1. Go to https://appstoreconnect.apple.com
2. Sign in with your Apple Developer account
3. Click **"My Apps"** → **"+"** → **"New App"**

### 3.2 App Information
- **Platform**: iOS
- **Name**: March
- **Primary Language**: English (U.S.)
- **Bundle ID**: `com.march.app` (must match Xcode)
- **SKU**: `march-ios-app` (unique identifier)
- **User Access**: Full Access

### 3.3 App Store Information
- **Category**: Productivity
- **Content Rights**: [✓] My app uses, or I have the rights to use, all content.
- **Age Rating**: 4+ (Safe for all ages)

## 🚀 Step 4: Upload to TestFlight

### 4.1 Distribute Archive
In Xcode Organizer:
1. Select your archive
2. Click **"Distribute App"**
3. Choose **"App Store Connect"**
4. Click **"Next"**

### 4.2 Distribution Options
- **Upload**: ✓ Selected
- **App Thinning**: All compatible device variants
- **Rebuild from Bitcode**: ✓ (if available)
- **Include symbols**: ✓ (for crash reports)

### 4.3 Review and Upload
1. Review app summary
2. Click **"Upload"**
3. Wait for upload to complete (5-15 minutes)

### 4.4 Alternative: Using Xcode Command Line Tools
```bash
# Export archive for App Store
xcodebuild -exportArchive \
           -archivePath ./build/March.xcarchive \
           -exportPath ./build/export \
           -exportOptionsPlist exportOptions.plist

# Upload using altool
xcrun altool --upload-app \
             --type ios \
             --file ./build/export/March.ipa \
             --username YOUR_APPLE_ID \
             --password YOUR_APP_SPECIFIC_PASSWORD
```

## 🧪 Step 5: TestFlight Configuration

### 5.1 Processing Time
- Wait 15-30 minutes for Apple to process your build
- You'll receive email notification when ready

### 5.2 Add Test Information
In App Store Connect → TestFlight:
1. Select your build
2. Add **"What to Test"** description:
```
Testing the March iOS app - AI-powered productivity platform.

Key Features to Test:
- Login with demo@march.com / any password
- Quick Add: Create tasks, notes, bookmarks
- Inbox: View and manage objects
- Search functionality
- Object completion toggle

Known Issues:
- Demo mode only (real API integration pending)
- Limited to sample data for testing

Focus Areas:
- UI/UX feedback on minimal design
- Performance on different devices
- Any crashes or bugs
```

### 5.3 Add Test Metadata
- **App Name**: March
- **Feedback Email**: your-email@domain.com
- **Marketing URL**: https://march.cat (optional)
- **Privacy Policy URL**: (if available)

## 👥 Step 6: Add Testers

### 6.1 Internal Testing
1. Go to **TestFlight → Internal Testing**
2. Add internal testers (your team members)
3. They must have Developer account access

### 6.2 External Testing
1. Go to **TestFlight → External Testing**
2. Create new test group: "March Beta Testers"
3. Add testers by email address
4. **Note**: First external build requires Apple review (24-48 hours)

### 6.3 Add Testers via Public Link
1. Enable **Public Link** in external testing
2. Share the TestFlight link: `https://testflight.apple.com/join/[UNIQUE_ID]`

## 📧 Step 7: Send Invitations

### 7.1 Automatic Invitations
When you add testers, they automatically receive:
- Email invitation to TestFlight
- Instructions to install TestFlight app
- Link to install March app

### 7.2 Manual Invitation Process
1. Testers install **TestFlight** from App Store
2. Testers open invitation email on iOS device
3. Tap **"View in TestFlight"**
4. Tap **"Install"** to download March app

## 🔄 Step 8: Update Workflow

### 8.1 For Each New Build
1. **Increment build number** in Xcode (e.g., 1 → 2 → 3)
2. **Archive** new build
3. **Upload** to App Store Connect
4. **Wait** for processing
5. **Add** to existing test groups
6. **Notify** testers of updates

### 8.2 Automated Build Script
Create `scripts/build-testflight.sh`:
```bash
#!/bin/bash

# Increment build number
BUILD_NUMBER=$(date +%Y%m%d%H%M)
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUMBER" March/Info.plist

# Archive
xcodebuild -project March.xcodeproj \
           -scheme March \
           -configuration Release \
           -archivePath ./build/March-$BUILD_NUMBER.xcarchive \
           archive

echo "Build $BUILD_NUMBER archived successfully!"
echo "Upload to TestFlight manually via Xcode Organizer"
```

## 📊 Step 9: Monitoring and Feedback

### 9.1 TestFlight Metrics
Monitor in App Store Connect:
- **Install rate**: How many invited testers installed
- **Session data**: Usage patterns
- **Crash reports**: Technical issues
- **Feedback**: Tester comments

### 9.2 Crash Reporting
- Enable **dsym uploading** for detailed crash reports
- Monitor crashes in Xcode Organizer
- Fix critical issues in subsequent builds

### 9.3 Feedback Collection
- **TestFlight feedback**: Built-in feedback system
- **Email feedback**: Direct communication
- **Beta tester surveys**: Structured feedback collection

## 🎯 Step 10: Preparing for App Store

### 10.1 Final Testing
- Test on multiple device types
- Test all core functionality
- Ensure stable performance
- Gather positive feedback

### 10.2 App Store Submission
Once ready for public release:
1. Create **App Store version** in App Store Connect
2. Add **screenshots, description, keywords**
3. Submit for **App Store review**
4. Release to **App Store** after approval

## ⚠️ Common Issues and Solutions

### Build Issues
- **Signing errors**: Check Developer account and certificates
- **Bundle ID conflicts**: Ensure unique bundle identifier
- **Missing icons**: Add all required app icon sizes

### Upload Issues
- **App Store Connect errors**: Wait and retry
- **Large file size**: Enable App Thinning
- **Bitcode errors**: Disable if problematic

### TestFlight Issues
- **Processing stuck**: Contact Apple Developer Support
- **Invite not received**: Check spam folder, resend
- **Install failures**: Ensure device compatibility

## 📞 Support Resources

- **Apple Developer Support**: https://developer.apple.com/support/
- **TestFlight Documentation**: https://developer.apple.com/testflight/
- **App Store Connect Help**: https://help.apple.com/app-store-connect/

---

## 🎉 Quick Start Checklist

- [ ] Apple Developer account ($99/year)
- [ ] Xcode 14.3.1 installed
- [ ] Project bundle ID configured
- [ ] Development team selected
- [ ] App icons added
- [ ] Archive created successfully
- [ ] App Store Connect app created
- [ ] Build uploaded to TestFlight
- [ ] Test information added
- [ ] Testers invited
- [ ] TestFlight testing commenced

**Your March iOS app is now ready for TestFlight distribution!** 🚀 