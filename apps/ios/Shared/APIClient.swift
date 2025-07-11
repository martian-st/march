import Foundation
import Combine

class APIClient: ObservableObject {
    static let shared = APIClient()
    
    private let baseURL = URL(string: "https://app.march.cat/api")!
    private var authToken: String?
    private let session = URLSession.shared
    
    private init() {}
    
    // MARK: - Authentication
    
    func setAuthToken(_ token: String) {
        self.authToken = token
    }
    
    func clearAuthToken() {
        self.authToken = nil
    }
    
    func login(request: LoginRequest) async throws -> LoginResponse {
        let url = baseURL.appendingPathComponent("auth/login")
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.httpBody = try JSONEncoder().encode(request)
        
        let (data, response) = try await session.data(for: urlRequest)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.serverError
        }
        
        return try JSONDecoder().decode(LoginResponse.self, from: data)
    }
    
    // MARK: - Objects
    
    func getObjects(page: Int = 1, limit: Int = 50) async throws -> [MarchObject] {
        // For demo purposes, return sample data
        if authToken?.contains("demo") == true {
            return MarchObject.sampleData
        }
        
        let url = baseURL.appendingPathComponent("objects")
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "limit", value: String(limit))
        ]
        
        var urlRequest = URLRequest(url: components.url!)
        urlRequest.httpMethod = "GET"
        if let token = authToken {
            urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let (data, response) = try await session.data(for: urlRequest)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.serverError
        }
        
        let objectsResponse = try JSONDecoder().decode(ObjectsResponse.self, from: data)
        return objectsResponse.objects
    }
    
    func createObject(request: CreateObjectRequest) async throws -> MarchObject {
        // For demo purposes, create a mock object
        if authToken?.contains("demo") == true {
            let newObject = MarchObject(
                id: UUID().uuidString,
                title: request.title,
                description: request.description,
                type: request.type,
                isCompleted: false,
                dueDate: request.dueDate,
                createdAt: Date(),
                updatedAt: Date(),
                userId: "demo-user",
                tags: request.tags,
                priority: request.priority,
                estimatedDuration: request.estimatedDuration
            )
            return newObject
        }
        
        let url = baseURL.appendingPathComponent("objects")
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = authToken {
            urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        urlRequest.httpBody = try JSONEncoder().encode(request)
        
        let (data, response) = try await session.data(for: urlRequest)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 201 else {
            throw APIError.serverError
        }
        
        return try JSONDecoder().decode(MarchObject.self, from: data)
    }
    
    func updateObject(id: String, request: UpdateObjectRequest) async throws -> MarchObject {
        // For demo purposes, return a mock updated object
        if authToken?.contains("demo") == true {
            var updatedObject = MarchObject.sampleData.first { $0.id == id } ??
                MarchObject.sampleData[0]
            
            if let title = request.title {
                updatedObject.title = title
            }
            if let description = request.description {
                updatedObject.description = description
            }
            if let isCompleted = request.isCompleted {
                updatedObject.isCompleted = isCompleted
            }
            if let dueDate = request.dueDate {
                updatedObject.dueDate = dueDate
            }
            if let priority = request.priority {
                updatedObject.priority = priority
            }
            
            return updatedObject
        }
        
        let url = baseURL.appendingPathComponent("objects/\(id)")
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "PATCH"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = authToken {
            urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        urlRequest.httpBody = try JSONEncoder().encode(request)
        
        let (data, response) = try await session.data(for: urlRequest)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.serverError
        }
        
        return try JSONDecoder().decode(MarchObject.self, from: data)
    }
    
    func deleteObject(id: String) async throws {
        // For demo purposes, just return success
        if authToken?.contains("demo") == true {
            return
        }
        
        let url = baseURL.appendingPathComponent("objects/\(id)")
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "DELETE"
        if let token = authToken {
            urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let (_, response) = try await session.data(for: urlRequest)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 204 else {
            throw APIError.serverError
        }
    }
    
    func toggleObjectCompletion(id: String) async throws -> MarchObject {
        let request = UpdateObjectRequest(
            title: nil,
            description: nil,
            isCompleted: true, // This would be toggled in real implementation
            dueDate: nil,
            tags: nil,
            priority: nil
        )
        
        return try await updateObject(id: id, request: request)
    }
}

// MARK: - Error Handling

enum APIError: LocalizedError {
    case invalidURL
    case noData
    case decodingError
    case serverError
    case unauthorized
    case networkError
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .noData:
            return "No data received"
        case .decodingError:
            return "Failed to decode response"
        case .serverError:
            return "Server error occurred"
        case .unauthorized:
            return "Unauthorized access"
        case .networkError:
            return "Network connection error"
        }
    }
} 