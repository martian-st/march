import Foundation
import Combine

@MainActor
class AuthManager: ObservableObject {
    static let shared = AuthManager()
    
    @Published var isAuthenticated = false
    @Published var user: User?
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let apiClient = APIClient.shared
    private let tokenKey = "auth_token"
    private let userKey = "user_data"
    
    private init() {}
    
    func checkAuthStatus() {
        if let tokenData = UserDefaults.standard.data(forKey: tokenKey),
           let token = String(data: tokenData, encoding: .utf8),
           let userData = UserDefaults.standard.data(forKey: userKey),
           let user = try? JSONDecoder().decode(User.self, from: userData) {
            
            self.user = user
            self.isAuthenticated = true
            apiClient.setAuthToken(token)
        }
    }
    
    func login(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        
        do {
            // Demo login support
            if email == "demo@march.com" {
                let demoUser = User.demoUser
                let token = "demo-token-\(UUID().uuidString)"
                
                // Save to UserDefaults
                UserDefaults.standard.set(Data(token.utf8), forKey: tokenKey)
                if let userData = try? JSONEncoder().encode(demoUser) {
                    UserDefaults.standard.set(userData, forKey: userKey)
                }
                
                self.user = demoUser
                self.isAuthenticated = true
                apiClient.setAuthToken(token)
            } else {
                // Real API login
                let request = LoginRequest(email: email, password: password)
                let response = try await apiClient.login(request: request)
                
                // Save to UserDefaults
                UserDefaults.standard.set(Data(response.token.utf8), forKey: tokenKey)
                if let userData = try? JSONEncoder().encode(response.user) {
                    UserDefaults.standard.set(userData, forKey: userKey)
                }
                
                self.user = response.user
                self.isAuthenticated = true
                apiClient.setAuthToken(response.token)
            }
        } catch {
            self.errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func logout() {
        // Clear UserDefaults
        UserDefaults.standard.removeObject(forKey: tokenKey)
        UserDefaults.standard.removeObject(forKey: userKey)
        
        // Clear state
        self.user = nil
        self.isAuthenticated = false
        self.errorMessage = nil
        
        // Clear API client token
        apiClient.clearAuthToken()
    }
    
    func refreshToken() async throws {
        // Implementation for token refresh if needed
        // For demo purposes, we'll just check if token exists
        guard let tokenData = UserDefaults.standard.data(forKey: tokenKey),
              let _ = String(data: tokenData, encoding: .utf8) else {
            throw AuthError.tokenExpired
        }
    }
}

enum AuthError: LocalizedError {
    case invalidCredentials
    case tokenExpired
    case networkError
    case unknown
    
    var errorDescription: String? {
        switch self {
        case .invalidCredentials:
            return "Invalid email or password"
        case .tokenExpired:
            return "Session expired. Please log in again"
        case .networkError:
            return "Network connection error"
        case .unknown:
            return "An unknown error occurred"
        }
    }
} 