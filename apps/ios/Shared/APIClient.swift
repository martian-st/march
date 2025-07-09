import Foundation
import Combine

class APIClient: ObservableObject {
    static let shared = APIClient()
    
    private let baseURL = "https://app.march.cat" // Production URL
    // private let baseURL = "http://localhost:8080" // Development URL
    
    private let session = URLSession.shared
    private var cancellables = Set<AnyCancellable>()
    
    @Published var isLoading = false
    
    private init() {}
    
    // MARK: - Authentication Headers
    private func authHeaders() -> [String: String] {
        var headers = [
            "Content-Type": "application/json",
            "Accept": "application/json"
        ]
        
        if let token = AuthManager.shared.accessToken {
            headers["Authorization"] = "Bearer \(token)"
        }
        
        return headers
    }
    
    // MARK: - Generic Request Method
    private func request<T: Codable>(
        endpoint: String,
        method: HTTPMethod = .GET,
        body: Data? = nil
    ) -> AnyPublisher<T, APIError> {
        guard let url = URL(string: baseURL + endpoint) else {
            return Fail(error: APIError.invalidURL)
                .eraseToAnyPublisher()
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.allHTTPHeaderFields = authHeaders()
        request.httpBody = body
        
        return session.dataTaskPublisher(for: request)
            .map(\.data)
            .decode(type: T.self, decoder: JSONDecoder.marchDecoder)
            .mapError { error in
                if error is DecodingError {
                    return APIError.decodingError
                } else {
                    return APIError.networkError(error)
                }
            }
            .eraseToAnyPublisher()
    }
    
    // MARK: - Auth Methods
    func login(with token: String) -> AnyPublisher<User, APIError> {
        // Store token first
        AuthManager.shared.accessToken = token
        
        return request<User>(endpoint: "/users/profile")
    }
    
    func getCurrentUser() -> AnyPublisher<User, APIError> {
        return request<User>(endpoint: "/users/profile")
    }
    
    // MARK: - Object Methods
    func getInboxObjects() -> AnyPublisher<[MarchObject], APIError> {
        return request<APIResponse<InboxResponse>>(endpoint: "/api/inbox")
            .map { $0.response.objects }
            .eraseToAnyPublisher()
    }
    
    func getAllObjects() -> AnyPublisher<[MarchObject], APIError> {
        return request<APIResponse<InboxResponse>>(endpoint: "/api/all")
            .map { $0.response.objects }
            .eraseToAnyPublisher()
    }
    
    func createObject(_ object: CreateObjectRequest) -> AnyPublisher<MarchObject, APIError> {
        guard let body = try? JSONEncoder.marchEncoder.encode(object) else {
            return Fail(error: APIError.encodingError)
                .eraseToAnyPublisher()
        }
        
        return request<APIResponse<MarchObject>>(
            endpoint: "/api/inbox",
            method: .POST,
            body: body
        )
        .map { $0.response }
        .eraseToAnyPublisher()
    }
    
    func updateObject(id: String, updates: [String: Any]) -> AnyPublisher<MarchObject, APIError> {
        guard let body = try? JSONSerialization.data(withJSONObject: updates) else {
            return Fail(error: APIError.encodingError)
                .eraseToAnyPublisher()
        }
        
        return request<APIResponse<MarchObject>>(
            endpoint: "/api/inbox/\(id)",
            method: .PUT,
            body: body
        )
        .map { $0.response }
        .eraseToAnyPublisher()
    }
    
    func deleteObject(id: String) -> AnyPublisher<Void, APIError> {
        return request<APIResponse<[String: String]>>(
            endpoint: "/api/inbox/\(id)",
            method: .DELETE
        )
        .map { _ in () }
        .eraseToAnyPublisher()
    }
}

// MARK: - HTTP Method
enum HTTPMethod: String {
    case GET = "GET"
    case POST = "POST"
    case PUT = "PUT"
    case DELETE = "DELETE"
}

// MARK: - API Errors
enum APIError: Error, LocalizedError {
    case invalidURL
    case networkError(Error)
    case decodingError
    case encodingError
    case unauthorized
    case serverError(Int)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .decodingError:
            return "Failed to decode response"
        case .encodingError:
            return "Failed to encode request"
        case .unauthorized:
            return "Unauthorized access"
        case .serverError(let code):
            return "Server error: \(code)"
        }
    }
}

// MARK: - JSON Encoder/Decoder Extensions
extension JSONDecoder {
    static let marchDecoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return decoder
    }()
}

extension JSONEncoder {
    static let marchEncoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.keyEncodingStrategy = .convertToSnakeCase
        return encoder
    }()
} 