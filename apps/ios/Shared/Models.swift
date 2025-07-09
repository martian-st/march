import Foundation

// MARK: - March Object Model
struct MarchObject: Identifiable, Codable {
    let id: String
    var title: String
    var description: String?
    var type: ObjectType
    var source: String
    var status: ObjectStatus
    var dueDate: Date?
    var createdAt: Date
    var updatedAt: Date
    var isCompleted: Bool
    var isArchived: Bool
    
    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case title, description, type, source, status
        case dueDate, createdAt, updatedAt
        case isCompleted, isArchived
    }
}

// MARK: - Object Types
enum ObjectType: String, Codable, CaseIterable {
    case todo = "todo"
    case note = "note"
    case bookmark = "bookmark"
    case meeting = "meeting"
    
    var displayName: String {
        switch self {
        case .todo: return "Task"
        case .note: return "Note"
        case .bookmark: return "Bookmark"
        case .meeting: return "Meeting"
        }
    }
    
    var icon: String {
        switch self {
        case .todo: return "checkmark.circle"
        case .note: return "note.text"
        case .bookmark: return "bookmark"
        case .meeting: return "calendar"
        }
    }
}

// MARK: - Object Status
enum ObjectStatus: String, Codable {
    case inbox = "inbox"
    case doing = "doing"
    case done = "done"
    case archived = "archived"
}

// MARK: - User Model
struct User: Identifiable, Codable {
    let id: String
    let name: String
    let email: String
    let avatar: String?
    
    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case name, email, avatar
    }
}

// MARK: - API Response Models
struct LoginResponse: Codable {
    let token: String
    let user: User
}

struct APIResponse<T: Codable>: Codable {
    let success: Bool
    let data: T?
    let message: String?
}

// MARK: - Create Object Request
struct CreateObjectRequest: Codable {
    let title: String
    let description: String?
    let type: ObjectType
    let source: String
    let dueDate: Date?
    
    init(title: String, description: String? = nil, type: ObjectType, source: String = "ios", dueDate: Date? = nil) {
        self.title = title
        self.description = description
        self.type = type
        self.source = source
        self.dueDate = dueDate
    }
} 