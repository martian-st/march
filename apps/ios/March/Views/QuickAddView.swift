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
        NavigationView {
            Form {
                Section("Details") {
                    TextField("Title", text: $title)
                        .font(.headline)
                    
                    TextField("Description (optional)", text: $description, axis: .vertical)
                        .lineLimit(3...6)
                }
                
                Section("Type") {
                    Picker("Object Type", selection: $selectedType) {
                        ForEach(ObjectType.allCases, id: \.self) { type in
                            Label(type.displayName, systemImage: type.icon)
                                .tag(type)
                        }
                    }
                    .pickerStyle(SegmentedPickerStyle())
                }
                
                Section("Due Date") {
                    Toggle("Set due date", isOn: $hasDueDate)
                    
                    if hasDueDate {
                        DatePicker("Due date", selection: Binding(
                            get: { dueDate ?? Date() },
                            set: { dueDate = $0 }
                        ), displayedComponents: [.date, .hourAndMinute])
                    }
                }
                
                Section {
                    Button(action: createObject) {
                        HStack {
                            if isLoading {
                                ProgressView()
                                    .scaleEffect(0.8)
                            } else {
                                Image(systemName: "plus.circle.fill")
                            }
                            Text("Create Object")
                        }
                    }
                    .disabled(title.isEmpty || isLoading)
                }
            }
            .navigationTitle("Quick Add")
            .alert("Success!", isPresented: $showSuccess) {
                Button("OK") {
                    clearForm()
                }
            } message: {
                Text("Object created successfully!")
            }
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
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
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

#Preview {
    QuickAddView()
} 