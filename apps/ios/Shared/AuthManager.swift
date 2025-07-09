import Foundation
import Combine

class AuthManager: ObservableObject {
    static let shared = AuthManager()
    
    @Published var isAuthenticated = false
    @Published var user: User?
    
    private let userDefaults = UserDefaults.standard
    private let tokenKey = "march_access_token"
    private let userKey = "march_user"
    
    var accessToken: String? {
        get {
            return userDefaults.string(forKey: tokenKey)
        }
        set {
            if let token = newValue {
                userDefaults.set(token, forKey: tokenKey)
            } else {
                userDefaults.removeObject(forKey: tokenKey)
            }
            
            DispatchQueue.main.async {
                self.isAuthenticated = newValue != nil
            }
        }
    }
    
    private init() {
        checkAuthStatus()
    }
    
    func checkAuthStatus() {
        let hasToken = accessToken != nil
        
        if hasToken, let userData = userDefaults.data(forKey: userKey) {
            do {
                let user = try JSONDecoder().decode(User.self, from: userData)
                DispatchQueue.main.async {
                    self.user = user
                    self.isAuthenticated = true
                }
            } catch {
                // Clear invalid data
                logout()
            }
        } else {
            DispatchQueue.main.async {
                self.isAuthenticated = false
                self.user = nil
            }
        }
    }
    
    @MainActor
    func login(email: String, password: String) async {
        guard let url = URL(string: "https://app.march.cat/auth/login") else {
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["email": email, "password": password]
        request.httpBody = try? JSONEncoder().encode(body)
        
        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            let response = try JSONDecoder().decode(LoginResponse.self, from: data)
            
            // Store token and user
            self.accessToken = response.token
            
            if let userData = try? JSONEncoder().encode(response.user) {
                userDefaults.set(userData, forKey: userKey)
            }
            
            self.user = response.user
            self.isAuthenticated = true
        } catch {
            print("Login failed: \(error)")
            // For demo purposes, allow demo login
            if email.contains("demo") {
                let demoUser = User(id: "demo", name: "Demo User", email: email, avatar: nil)
                self.accessToken = "demo_token"
                
                if let userData = try? JSONEncoder().encode(demoUser) {
                    userDefaults.set(userData, forKey: userKey)
                }
                
                self.user = demoUser
                self.isAuthenticated = true
            }
        }
    }
    
    func logout() {
        accessToken = nil
        userDefaults.removeObject(forKey: userKey)
        
        DispatchQueue.main.async {
            self.isAuthenticated = false
            self.user = nil
        }
    }
} 