# March iOS App

A native iOS companion app for March - AI-powered productivity platform.

## 🎯 Features

- **Quick Object Creation** - Fast task/note/bookmark creation
- **Share Extension** - Receive content from any iOS app (Twitter, Safari, etc.)
- **Inbox Management** - View and manage all March objects
- **Real-time Sync** - Seamless integration with March backend

## 🏗️ Architecture

### App Structure
```
March.app/
├── ContentView.swift          # Main app entry point
├── Views/
│   ├── QuickAddView.swift     # Quick object creation
│   ├── InboxView.swift        # Object list management
│   ├── LoginView.swift        # Authentication
│   └── ProfileView.swift      # User profile
├── ViewModels/
│   └── InboxViewModel.swift   # Data management
└── Shared/
    ├── Models.swift           # Data models
    ├── APIClient.swift        # Network layer
    └── AuthManager.swift      # Authentication

ShareExtension.appex/
└── ShareViewController.swift  # iOS Share Extension
```

### Key Components

#### 1. **Object-Based Data Model**
- Mirrors March backend API structure
- Supports all object types: todo, note, bookmark, meeting
- Real-time synchronization with server

#### 2. **Share Extension**
- Processes URLs, text, and images from other apps
- Automatically detects content type
- Extracts metadata (page titles, etc.)

#### 3. **Native iOS Integration**
- SwiftUI for modern, declarative UI
- Combine for reactive programming
- Background refresh capabilities

## 🚀 Implementation Approach

### Phase 1: Core Functionality ✅
- [x] Basic app structure and navigation
- [x] API client for March backend integration
- [x] Authentication management
- [x] Quick add functionality
- [x] Inbox viewing and management

### Phase 2: Share Extension ✅
- [x] iOS Share Extension setup
- [x] Content processing (URLs, text, images)
- [x] Intelligent type detection
- [x] Metadata extraction

### Phase 3: Advanced Features (TODO)
- [ ] Push notifications for new objects
- [ ] Offline support with local storage
- [ ] Widget for quick actions
- [ ] Siri Shortcuts integration
- [ ] Apple Watch companion

### Phase 4: Polish (TODO)
- [ ] Improved UI/UX design
- [ ] Performance optimizations
- [ ] Unit and integration tests
- [ ] App Store optimization

## 🔧 Technical Details

### API Integration
- **Base URL**: `https://app.march.cat` (production)
- **Authentication**: JWT token-based
- **Endpoints**: 
  - `GET /api/inbox` - Fetch objects
  - `POST /api/inbox` - Create object
  - `PUT /api/inbox/:id` - Update object
  - `DELETE /api/inbox/:id` - Delete object

### Share Extension Flow
1. User shares content from any iOS app
2. Share Extension extracts content type and data
3. Pre-fills form with detected information
4. User reviews and creates March object
5. Object syncs to main March app

### Data Synchronization
- **Optimistic Updates** - UI responds immediately
- **Background Sync** - Automatic refresh when app becomes active
- **Error Handling** - Graceful fallback and user feedback

## 🛠️ Development Setup

### Prerequisites
- Xcode 15.0+
- iOS 17.0+ deployment target
- March backend access

### Build Configuration
1. Clone repository
2. Open `March.xcodeproj` in Xcode
3. Configure app bundle ID and team
4. Set up Share Extension target
5. Update API base URL if needed
6. Build and run

### Required Capabilities
- **App Groups** - Share data between main app and extension
- **Background App Refresh** - Sync when app becomes active
- **Network** - API communication

## 📱 User Experience

### Quick Add Flow
1. Open app → Quick Add tab
2. Enter title and optional description
3. Select object type (segmented control)
4. Set due date if needed
5. Tap "Create" → Object syncs to March

### Share Extension Flow
1. Share from any app (Twitter, Safari, etc.)
2. March Share Extension opens
3. Content auto-detected and pre-filled
4. Review and adjust details
5. Tap "Create" → Object added to March inbox

### Inbox Management
- **Search & Filter** - Find objects quickly
- **Swipe Actions** - Complete, archive, or delete
- **Pull to Refresh** - Manual sync
- **Real-time Updates** - Auto-refresh on app activation

## 🎨 Design Philosophy

### Minimalist Interface
- Clean, focused design matching March web app
- Quick actions prioritized
- Minimal taps to complete tasks

### Native iOS Patterns
- Standard navigation and interaction patterns
- iOS design guidelines compliance
- Accessibility support built-in

### Performance First
- Optimistic UI updates
- Efficient networking with Combine
- Minimal battery usage

## 🔄 Integration Benefits

### Seamless Workflow
- Objects created on mobile instantly appear in web app
- No context switching between devices
- Unified March experience across platforms

### Enhanced Productivity
- Capture ideas immediately on mobile
- Share content from any app to March
- Quick task creation without opening full web app

### Mobile-First Features
- Always-available pocket capture tool
- Location-aware object creation potential
- Native iOS sharing capabilities

This iOS app complements the March web platform by providing mobile-first object creation and seamless content sharing from other iOS apps. 