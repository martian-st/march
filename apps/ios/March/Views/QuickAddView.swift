import SwiftUI

struct QuickAddView: View {
    @State private var title = ""
    @State private var description = ""
    @State private var selectedType: ObjectType = .todo
    @State private var dueDate: Date?
    @State private var hasDueDate = false
    @State private var isLoading = false
    @State private var showSuccess = false
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header
                headerView
                
                // Form
                ScrollView {
                    VStack(spacing: 32) {
                        // Title input
                        titleSection
                        
                        // Description input
                        descriptionSection
                        
                        // Type selector
                        typeSection
                        
                        // Due date
                        dueDateSection
                        
                        Spacer(minLength: 100)
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, 32)
                }
                
                // Create button
                createButton
            }
        }
        .preferredColorScheme(.dark)
        .alert("Created!", isPresented: $showSuccess) {
            Button("Continue") {
                clearForm()
            }
        } message: {
            Text("Added to your inbox")
        }
    }
    
    private var headerView: some View {
        HStack {
            Text("Add")
                .font(.system(size: 32, weight: .light))
                .foregroundColor(.white)
            
            Spacer()
            
            if !title.isEmpty {
                Button("Clear") {
                    clearForm()
                }
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.gray)
            }
        }
        .padding(.horizontal, 24)
        .padding(.top, 8)
    }
    
    private var titleSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("What needs to be done?")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.gray)
            
            TextField("", text: $title)
                .font(.system(size: 20, weight: .medium))
                .foregroundColor(.white)
                .background(Color.clear)
                .overlay(
                    Rectangle()
                        .frame(height: 1)
                        .foregroundColor(.gray.opacity(0.2)),
                    alignment: .bottom
                )
        }
    }
    
    private var descriptionSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Add details")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.gray)
            
            TextField("", text: $description, axis: .vertical)
                .font(.system(size: 16, weight: .regular))
                .foregroundColor(.white)
                .lineLimit(3...6)
                .background(Color.clear)
                .overlay(
                    Rectangle()
                        .frame(height: 1)
                        .foregroundColor(.gray.opacity(0.2)),
                    alignment: .bottom
                )
        }
    }
    
    private var typeSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Type")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.gray)
            
            HStack(spacing: 12) {
                ForEach(ObjectType.allCases, id: \.self) { type in
                    TypeButton(
                        type: type,
                        isSelected: selectedType == type
                    ) {
                        selectedType = type
                    }
                }
            }
        }
    }
    
    private var dueDateSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("Due date")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.gray)
                
                Spacer()
                
                Toggle("", isOn: $hasDueDate)
                    .toggleStyle(SwitchToggleStyle(tint: .white))
            }
            
            if hasDueDate {
                DatePicker(
                    "",
                    selection: Binding(
                        get: { dueDate ?? Date() },
                        set: { dueDate = $0 }
                    ),
                    displayedComponents: [.date, .hourAndMinute]
                )
                .datePickerStyle(CompactDatePickerStyle())
                .colorScheme(.dark)
            }
        }
    }
    
    private var createButton: some View {
        VStack(spacing: 0) {
            Rectangle()
                .frame(height: 0.5)
                .foregroundColor(.gray.opacity(0.2))
            
            Button(action: createObject) {
                HStack {
                    if isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .black))
                            .scaleEffect(0.8)
                    } else {
                        Text("Add to inbox")
                            .font(.system(size: 16, weight: .medium))
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(title.isEmpty ? Color.gray.opacity(0.3) : Color.white)
                .foregroundColor(title.isEmpty ? .gray : .black)
                .cornerRadius(0)
            }
            .disabled(title.isEmpty || isLoading)
            .padding(.horizontal, 24)
            .padding(.vertical, 16)
            .background(Color.black)
        }
    }
    
    private func createObject() {
        isLoading = true
        
        let request = CreateObjectRequest(
            title: title,
            description: description.isEmpty ? nil : description,
            type: selectedType,
            dueDate: hasDueDate ? dueDate : nil
        )
        
        // Simulate API call
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            isLoading = false
            showSuccess = true
        }
    }
    
    private func clearForm() {
        title = ""
        description = ""
        selectedType = .todo
        dueDate = nil
        hasDueDate = false
    }
}

struct TypeButton: View {
    let type: ObjectType
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: type.icon)
                    .font(.system(size: 20, weight: .medium))
                    .foregroundColor(isSelected ? .black : .gray)
                
                Text(type.displayName)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(isSelected ? .black : .gray)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(isSelected ? Color.white : Color.clear)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                    )
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

#Preview {
    QuickAddView()
} 