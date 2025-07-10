import SwiftUI

struct ContentView: View {
    @StateObject private var inboxViewModel = InboxViewModel()
    @State private var showingAddView = false
    @State private var isLoggedIn = false
    
    var body: some View {
        if isLoggedIn {
            NavigationView {
                VStack(spacing: 0) {
                    // Main content
                    InboxView(viewModel: inboxViewModel)
                    
                    // Bottom Action Bar
                    HStack {
                        Spacer()
                        Button(action: { showingAddView = true }) {
                            Image(systemName: "plus")
                                .font(.system(size: 24, weight: .light))
                                .foregroundColor(.white)
                                .frame(width: 44, height: 44)
                        }
                        Spacer()
                    }
                    .frame(height: 60)
                    .background(Color.black)
                    .overlay(
                        Rectangle()
                            .frame(height: 0.5)
                            .foregroundColor(Color.white.opacity(0.1)),
                        alignment: .top
                    )
                }
                .background(Color.black)
            }
            .sheet(isPresented: $showingAddView) {
                QuickAddView(onObjectCreated: { object in
                    inboxViewModel.addObject(object)
                })
            }
        } else {
            LoginView(onLogin: {
                isLoggedIn = true
            })
        }
    }
}

struct MainTabView: View {
    @StateObject private var inboxViewModel = InboxViewModel()
    @State private var showingAddView = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Main content
                InboxView(viewModel: inboxViewModel)
                
                // Bottom Action Bar
                HStack {
                    Spacer()
                    Button(action: { showingAddView = true }) {
                        Image(systemName: "plus")
                            .font(.system(size: 24, weight: .light))
                            .foregroundColor(.white)
                            .frame(width: 44, height: 44)
                    }
                    Spacer()
                }
                .frame(height: 60)
                .background(Color.black)
                .overlay(
                    Rectangle()
                        .frame(height: 0.5)
                        .foregroundColor(Color.white.opacity(0.1)),
                    alignment: .top
                )
            }
            .background(Color.black)
        }
        .sheet(isPresented: $showingAddView) {
            QuickAddView()
        }
    }
}

struct CustomTabBar: View {
    @Binding var selectedTab: Int
    
    var body: some View {
        HStack(spacing: 0) {
            // Inbox
            TabBarButton(
                icon: "tray.fill",
                title: "Inbox",
                isSelected: selectedTab == 0
            ) {
                selectedTab = 0
            }
            
            Spacer()
            
            // Floating Add Button
            Button(action: { selectedTab = 1 }) {
                Image(systemName: "plus")
                    .font(.system(size: 24, weight: .medium))
                    .foregroundColor(.black)
                    .frame(width: 56, height: 56)
                    .background(Color.white)
                    .clipShape(Circle())
                    .shadow(color: .black.opacity(0.3), radius: 8, x: 0, y: 4)
            }
            .offset(y: -10)
            
            Spacer()
            
            // Profile
            TabBarButton(
                icon: "person.fill",
                title: "Profile",
                isSelected: selectedTab == 2
            ) {
                selectedTab = 2
            }
        }
        .padding(.horizontal, 40)
        .padding(.vertical, 20)
        .background(
            RoundedRectangle(cornerRadius: 25)
                .fill(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 25)
                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                )
        )
        .padding(.horizontal, 20)
        .padding(.bottom, 10)
    }
}

struct TabBarButton: View {
    let icon: String
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 20, weight: .medium))
                    .foregroundColor(isSelected ? .white : .gray)
                
                Text(title)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(isSelected ? .white : .gray)
            }
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct LoginView: View {
    @State private var email = "demo@march.com"
    @State private var password = ""
    @State private var isLoading = false
    @StateObject private var authManager = AuthManager.shared
    
    var body: some View {
        ZStack {
            // Background gradient like Linear
            LinearGradient(
                colors: [Color.black, Color.gray.opacity(0.8)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            VStack(spacing: 40) {
                Spacer()
                
                // App branding
                VStack(spacing: 16) {
                    Text("march")
                        .font(.system(size: 48, weight: .light, design: .default))
                        .foregroundColor(.white)
                        .letterSpacing(2)
                    
                    Text("Your AI-powered second brain")
                        .font(.system(size: 16, weight: .regular))
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.center)
                }
                
                Spacer()
                
                // Login form
                VStack(spacing: 20) {
                    VStack(spacing: 16) {
                        TextField("Email", text: $email)
                            .textFieldStyle(MinimalTextFieldStyle())
                        
                        SecureField("Password", text: $password)
                            .textFieldStyle(MinimalTextFieldStyle())
                    }
                    
                    Button(action: login) {
                        HStack {
                            if isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .black))
                                    .scaleEffect(0.8)
                            } else {
                                Text("Continue")
                                    .font(.system(size: 16, weight: .medium))
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(Color.white)
                        .foregroundColor(.black)
                        .cornerRadius(12)
                    }
                    .disabled(isLoading || email.isEmpty)
                    .opacity(email.isEmpty ? 0.5 : 1.0)
                }
                
                Spacer()
                
                Text("Demo: demo@march.com + any password")
                    .font(.system(size: 13, weight: .regular))
                    .foregroundColor(.gray.opacity(0.7))
            }
            .padding(.horizontal, 32)
        }
        .preferredColorScheme(.dark)
    }
    
    private func login() {
        isLoading = true
        Task {
            await authManager.login(email: email, password: password)
            await MainActor.run {
                isLoading = false
            }
        }
    }
}

struct MinimalTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .font(.system(size: 16, weight: .regular))
            .padding(.vertical, 16)
            .padding(.horizontal, 0)
            .background(Color.clear)
            .foregroundColor(.white)
            .overlay(
                Rectangle()
                    .frame(height: 1)
                    .foregroundColor(.gray.opacity(0.3)),
                alignment: .bottom
            )
    }
}

struct ProfileView: View {
    @StateObject private var authManager = AuthManager.shared
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            VStack(spacing: 40) {
                Spacer()
                
                VStack(spacing: 20) {
                    // Profile avatar
                    Circle()
                        .fill(LinearGradient(
                            colors: [.gray.opacity(0.3), .gray.opacity(0.1)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ))
                        .frame(width: 80, height: 80)
                        .overlay(
                            Text("DU")
                                .font(.system(size: 24, weight: .medium))
                                .foregroundColor(.white)
                        )
                    
                    if let user = authManager.user {
                        VStack(spacing: 4) {
                            Text(user.name)
                                .font(.system(size: 20, weight: .medium))
                                .foregroundColor(.white)
                            
                            Text(user.email)
                                .font(.system(size: 14, weight: .regular))
                                .foregroundColor(.gray)
                        }
                    }
                }
                
                Spacer()
                
                // Sign out button
                Button("Sign out") {
                    authManager.logout()
                }
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.gray)
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                )
                
                Spacer()
            }
            .padding(.horizontal, 32)
        }
        .preferredColorScheme(.dark)
    }
}

#Preview {
    ContentView()
} 