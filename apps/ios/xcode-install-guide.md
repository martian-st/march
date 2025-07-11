# Xcode 14 Installation Guide for macOS 12.7

## 📥 Download Steps

### 1. Apple Developer Account
- Go to: https://developer.apple.com/account/
- Sign in with your Apple ID (free account)
- Accept developer terms if prompted

### 2. Access Downloads
- Navigate to: https://developer.apple.com/download/more/
- Sign in if not already signed in

### 3. Find Xcode 14.3.1
- Search for "Xcode 14"
- Select "Xcode 14.3.1" (latest stable for macOS 12)
- File: `Xcode_14.3.1.xip` (~6.7 GB)
- Release: March 30, 2023

### 4. Download
- Click "Download" button
- Save to ~/Downloads/
- Wait for completion (30-90 minutes)

## 🛠️ Installation Steps

### 1. Extract XIP File
```bash
# Navigate to Downloads
cd ~/Downloads

# Extract the XIP file (this may take 15-30 minutes)
xip -x Xcode_14.3.1.xip
```

### 2. Move to Applications
```bash
# Move Xcode to Applications folder
sudo mv Xcode.app /Applications/Xcode.app

# Set correct permissions
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

### 3. Accept License
```bash
# Accept Xcode license
sudo xcodebuild -license accept
```

### 4. Install Additional Components
```bash
# Install iOS Simulator and other components
sudo xcodebuild -downloadAllPlatforms
```

## ✅ Verification

### Test Installation
```bash
# Check Xcode version
xcodebuild -version

# Should output:
# Xcode 14.3.1
# Build version 14E300c
```

### Test iOS Project
```bash
# Navigate to March iOS project
cd /Users/optimus/Downloads/march/apps/ios

# Try to build the project
xcodebuild -project March.xcodeproj -scheme March -destination 'platform=iOS Simulator,name=iPhone 14' build
```

## 🚀 Launch March App

### Open in Xcode
```bash
# Open the project
open March.xcodeproj
```

### Run the App
1. Select iPhone 14 simulator
2. Press Cmd+R to build and run
3. App should launch in simulator

## 📱 Testing the App

### Login Screen
- Use: `demo@march.com` / any password
- Should transition to main app

### Main App Features
- **Quick Add Tab**: Create objects
- **Inbox Tab**: View sample objects  
- **Profile Tab**: User management

## 🐛 Troubleshooting

### Common Issues

**1. XIP Extraction Fails**
```bash
# Clear Downloads and re-download
rm ~/Downloads/Xcode_14.3.1.xip
# Re-download from developer portal
```

**2. Permission Denied**
```bash
# Fix permissions
sudo chown -R $(whoami):admin /Applications/Xcode.app
```

**3. Build Errors**
```bash
# Clean and rebuild
xcodebuild -project March.xcodeproj clean
xcodebuild -project March.xcodeproj -scheme March build
```

**4. Simulator Issues**
```bash
# Reset iOS Simulator
xcrun simctl erase all
```

## 💡 Tips

- **Disk Space**: Ensure 15GB+ free space
- **Internet**: Stable connection for download
- **Time**: Allow 2-3 hours for complete process
- **Patience**: XIP extraction is slow but normal

## 🎯 Success Criteria

✅ Xcode 14.3.1 installed and running  
✅ iOS Simulator launches  
✅ March project builds without errors  
✅ App runs in simulator  
✅ Login and main features work  

---

**Once installed, you'll have a fully functional iOS development environment!** 🎉 