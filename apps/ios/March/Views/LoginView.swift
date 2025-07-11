import SwiftUI

struct LoginView: View {
    @State private var isLoading = false
    let onLogin: () -> Void
    
    var body: some View {
        VStack(spacing: 0) {
            Spacer()
            
            // Auth Buttons
            VStack(spacing: 8) {
                // Google Login
                Button(action: { loginWithGoogle() }) {
                    HStack(spacing: 12) {
                        Image(systemName: "globe")
                            .font(.system(size: 18))
                            .foregroundColor(.white)
                        
                        Text("Continue with Google")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundColor(.white)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                }
                
                // GitHub Login
                Button(action: { loginWithGitHub() }) {
                    HStack(spacing: 12) {
                        Image(systemName: "chevron.left.forwardslash.chevron.right")
                            .font(.system(size: 18))
                            .foregroundColor(.white)
                        
                        Text("Continue with GitHub")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundColor(.white)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                }
            }
            .padding(.horizontal, 40)
            .frame(maxWidth: 280)
            
            Spacer()
        }
        .background(Color.black)
    }
    
    private func loginWithGoogle() {
        // In real app, implement Google OAuth
        isLoading = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            isLoading = false
            onLogin()
        }
    }
    
    private func loginWithGitHub() {
        // In real app, implement GitHub OAuth
        isLoading = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            isLoading = false
            onLogin()
        }
    }
}

#Preview {
    LoginView(onLogin: {})
} 