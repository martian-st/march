# Testing the March iOS App

## 🚀 Quick Start

### 1. Open the Project
```bash
cd apps/ios
bun run dev
```
This will open the project in Xcode.

### 2. Choose Simulator
- Select iPhone 15 Pro (or any recent iPhone simulator)
- iOS 17.0+ required

### 3. Build & Run
- Press `Cmd + R` or click the Play button
- The app will build and launch in the simulator

## 📱 App Testing Guide

### Login Screen
- **Demo Login**: Use email `demo@march.com` with any password
- **Real API**: Use your March account credentials
- The app will show a login screen first

### Quick Add Tab
1. **Create Objects**:
   - Enter a title (required)
   - Add description (optional)
   - Select type: Task, Note, Bookmark, Meeting
   - Set due date (optional)
   - Tap "Create Object"

2. **Test Scenarios**:
   - Empty title (button should be disabled)
   - Different object types
   - With/without due dates
   - Success feedback after creation

### Inbox Tab
1. **View Objects**:
   - See sample data on first load
   - Filter by type using chips
   - Toggle completed items
   - Search functionality
   - Pull to refresh

2. **Interact with Objects**:
   - Tap circle to toggle completion
   - Swipe to delete
   - See relative timestamps
   - Due date indicators

### Profile Tab
- View user information
- Sign out functionality

## 🔧 Testing Features

### Sample Data
The app loads with 3 sample objects:
- A task with due date
- A completed note
- A bookmark

### Offline Mode
- App works without network connection
- Sample data always available
- Login allows demo mode

### UI Testing
- **Light/Dark Mode**: Toggle in Settings app
- **Orientation**: Rotate device
- **Accessibility**: Test with VoiceOver
- **Different Screen Sizes**: iPhone/iPad

## 🐛 Common Issues

### Build Errors
1. **Missing Files**: Ensure all Swift files are in correct directories
2. **Bundle ID**: May need to change `com.march.app` to unique identifier
3. **iOS Version**: Requires iOS 17.0+

### Runtime Issues
1. **Network Errors**: Check console for API failures
2. **Demo Mode**: Use `demo@march.com` for testing
3. **Simulator**: Reset if app state is corrupted

## 📊 Testing Checklist

- [ ] App launches successfully
- [ ] Login with demo credentials works
- [ ] Quick Add creates objects
- [ ] Inbox displays and filters objects
- [ ] Object completion toggles work
- [ ] Search functionality works
- [ ] Profile shows user info
- [ ] Sign out returns to login
- [ ] App works in portrait/landscape
- [ ] Pull to refresh works
- [ ] Swipe to delete works

## 🎯 Next Steps

### Real API Integration
1. Update `AuthManager` API endpoints
2. Implement proper error handling
3. Add real object creation/fetching
4. Handle authentication tokens

### Share Extension Testing
1. Build ShareExtension target
2. Test sharing from Safari/Twitter
3. Verify content parsing
4. Check object creation flow

### Production Deployment
1. Set up Apple Developer account
2. Configure proper bundle IDs
3. Add app icons and launch screens
4. Submit to App Store Connect

---

**Happy Testing! 🎉**

The app is now ready for development and testing in Xcode simulator or device. 