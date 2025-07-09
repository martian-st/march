import Foundation

// MARK: - Core Models

struct User: Codable, Identifiable {
    let id: String
    let email: String
    let name: String
    let avatar: String?
    let createdAt: Date
    let updatedAt: Date
}

struct MarchObject: Codable, Identifiable {
    let id: String
    var title: String
    var description: String?
    let type: ObjectType
    var isCompleted: Bool
    var dueDate: Date?
    let createdAt: Date
    let updatedAt: Date
    let userId: String
    
    // Additional metadata
    var tags: [String]
    var priority: Priority
    var estimatedDuration: TimeInterval?
    var completedAt: Date?
}

enum ObjectType: String, CaseIterable, Codable {
    case todo = "todo"
    case note = "note" 
    case bookmark = "bookmark"
    case meeting = "meeting"
    case idea = "idea"
    
    var displayName: String {
        switch self {
        case .todo: return "Todo"
        case .note: return "Note"
        case .bookmark: return "Bookmark"
        case .meeting: return "Meeting"
        case .idea: return "Idea"
        }
    }
    
    var icon: String {
        switch self {
        case .todo: return "checkmark.circle"
        case .note: return "note.text"
        case .bookmark: return "bookmark"
        case .meeting: return "calendar"
        case .idea: return "lightbulb"
        }
    }
}

enum Priority: String, CaseIterable, Codable {
    case low = "low"
    case medium = "medium" 
    case high = "high"
    case urgent = "urgent"
    
    var displayName: String {
        switch self {
        case .low: return "Low"
        case .medium: return "Medium"
        case .high: return "High"
        case .urgent: return "Urgent"
        }
    }
    
    var color: String {
        switch self {
        case .low: return "gray"
        case .medium: return "blue"
        case .high: return "orange"
        case .urgent: return "red"
        }
    }
}

// MARK: - API Request/Response Models

struct LoginRequest: Codable {
    let email: String
    let password: String
}

struct LoginResponse: Codable {
    let token: String
    let user: User
    let expiresAt: Date
}

struct CreateObjectRequest: Codable {
    let title: String
    let description: String?
    let type: ObjectType
    let dueDate: Date?
    let tags: [String]
    let priority: Priority
    let estimatedDuration: TimeInterval?
    
    init(
        title: String,
        description: String? = nil,
        type: ObjectType,
        dueDate: Date? = nil,
        tags: [String] = [],
        priority: Priority = .medium,
        estimatedDuration: TimeInterval? = nil
    ) {
        self.title = title
        self.description = description
        self.type = type
        self.dueDate = dueDate
        self.tags = tags
        self.priority = priority
        self.estimatedDuration = estimatedDuration
    }
}

struct UpdateObjectRequest: Codable {
    let title: String?
    let description: String?
    let isCompleted: Bool?
    let dueDate: Date?
    let tags: [String]?
    let priority: Priority?
}

struct ObjectsResponse: Codable {
    let objects: [MarchObject]
    let total: Int
    let page: Int
    let hasMore: Bool
}

// MARK: - App State Models

struct AppState {
    var isAuthenticated: Bool = false
    var user: User?
    var authToken: String?
    var objects: [MarchObject] = []
    var isLoading: Bool = false
    var errorMessage: String?
}

// MARK: - Sample Data

extension MarchObject {
    static let sampleData: [MarchObject] = [
        MarchObject(
            id: "1",
            title: "Review Linear mobile design",
            description: "Study their minimal UI patterns and interaction design for our March app",
            type: .todo,
            isCompleted: false,
            dueDate: Calendar.current.date(byAdding: .day, value: 2, to: Date()),
            createdAt: Date().addingTimeInterval(-3600),
            updatedAt: Date().addingTimeInterval(-3600),
            userId: "user1",
            tags: ["design", "mobile"],
            priority: .high,
            estimatedDuration: 1800 // 30 minutes
        ),
        MarchObject(
            id: "2", 
            title: "Meeting notes: Product strategy Q1",
            description: "Key takeaways from our product roadmap discussion:\n\n- Focus on mobile-first experience\n- AI integration for smart suggestions\n- Cross-platform sync improvements",
            type: .note,
            isCompleted: false,
            dueDate: nil,
            createdAt: Date().addingTimeInterval(-7200),
            updatedAt: Date().addingTimeInterval(-7200),
            userId: "user1",
            tags: ["meeting", "strategy"],
            priority: .medium
        ),
        MarchObject(
            id: "3",
            title: "Neuecast - Minimal podcast app inspiration",
            description: "https://neuecast.app/ - Beautiful example of minimalist design principles",
            type: .bookmark,
            isCompleted: false,
            dueDate: nil,
            createdAt: Date().addingTimeInterval(-10800),
            updatedAt: Date().addingTimeInterval(-10800),
            userId: "user1",
            tags: ["design", "inspiration"],
            priority: .low
        )
    ]
}

extension User {
    static let demoUser = User(
        id: "demo-user",
        email: "demo@march.com",
        name: "Demo User",
        avatar: nil,
        createdAt: Date().addingTimeInterval(-86400 * 30),
        updatedAt: Date()
    )
} 