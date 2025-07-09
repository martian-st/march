import SwiftUI

struct InboxView: View {
    @ObservedObject var viewModel: InboxViewModel
    @State private var searchText = ""
    @State private var selectedFilter: ObjectType? = nil
    @State private var showCompleted = false
    
    var filteredObjects: [MarchObject] {
        var objects = viewModel.objects
        
        // Filter by completion status
        if !showCompleted {
            objects = objects.filter { !$0.isCompleted }
        }
        
        // Filter by type
        if let selectedFilter = selectedFilter {
            objects = objects.filter { $0.type == selectedFilter }
        }
        
        // Filter by search text
        if !searchText.isEmpty {
            objects = objects.filter { object in
                object.title.localizedCaseInsensitiveContains(searchText) ||
                (object.description?.localizedCaseInsensitiveContains(searchText) ?? false)
            }
        }
        
        return objects
    }
    
    var body: some View {
        NavigationView {
            VStack {
                // Filter Controls
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        FilterChip(
                            title: "All",
                            isSelected: selectedFilter == nil,
                            action: { selectedFilter = nil }
                        )
                        
                        ForEach(ObjectType.allCases, id: \.self) { type in
                            FilterChip(
                                title: type.displayName,
                                isSelected: selectedFilter == type,
                                action: { selectedFilter = type }
                            )
                        }
                    }
                    .padding(.horizontal)
                }
                .padding(.vertical, 8)
                
                // Toggle for completed items
                HStack {
                    Toggle("Show completed", isOn: $showCompleted)
                        .padding(.horizontal)
                    Spacer()
                }
                
                // Objects List
                if viewModel.isLoading && viewModel.objects.isEmpty {
                    VStack {
                        ProgressView()
                        Text("Loading objects...")
                            .foregroundColor(.secondary)
                            .padding(.top)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if filteredObjects.isEmpty {
                    VStack {
                        Image(systemName: "tray")
                            .font(.system(size: 60))
                            .foregroundColor(.secondary)
                        Text("No objects found")
                            .font(.headline)
                            .foregroundColor(.secondary)
                        Text("Create your first object using the Add tab")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List {
                        ForEach(filteredObjects) { object in
                            ObjectRowView(object: object) {
                                viewModel.toggleComplete(object)
                            }
                        }
                        .onDelete(perform: deleteObjects)
                    }
                    .refreshable {
                        await viewModel.refreshObjects()
                    }
                }
            }
            .navigationTitle("Inbox")
            .searchable(text: $searchText, prompt: "Search objects...")
            .onAppear {
                Task {
                    await viewModel.loadObjects()
                }
            }
        }
    }
    
    private func deleteObjects(offsets: IndexSet) {
        for index in offsets {
            let object = filteredObjects[index]
            viewModel.deleteObject(object)
        }
    }
}

struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.caption)
                .fontWeight(.medium)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isSelected ? Color.blue : Color.gray.opacity(0.2))
                .foregroundColor(isSelected ? .white : .primary)
                .cornerRadius(16)
        }
    }
}

struct ObjectRowView: View {
    let object: MarchObject
    let onToggleComplete: () -> Void
    
    var body: some View {
        HStack {
            Button(action: onToggleComplete) {
                Image(systemName: object.isCompleted ? "checkmark.circle.fill" : "circle")
                    .foregroundColor(object.isCompleted ? .green : .gray)
                    .font(.title2)
            }
            .buttonStyle(PlainButtonStyle())
            
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Image(systemName: object.type.icon)
                        .foregroundColor(.blue)
                        .font(.caption)
                    
                    Text(object.title)
                        .font(.headline)
                        .strikethrough(object.isCompleted)
                        .foregroundColor(object.isCompleted ? .secondary : .primary)
                    
                    Spacer()
                    
                    Text(object.type.displayName)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.blue.opacity(0.1))
                        .cornerRadius(8)
                }
                
                if let description = object.description, !description.isEmpty {
                    Text(description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
                
                HStack {
                    Text(object.createdAt, style: .relative)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    
                    Spacer()
                    
                    if let dueDate = object.dueDate {
                        Label(dueDate, format: .dateTime.day().month().hour().minute())
                            .font(.caption2)
                            .foregroundColor(dueDate < Date() ? .red : .orange)
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }
}

struct InboxViewModel: ObservableObject {
    @Published var objects: [MarchObject] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    init() {
        // Load sample data for testing
        loadSampleData()
    }
    
    @MainActor
    func loadObjects() async {
        guard !isLoading else { return }
        
        isLoading = true
        errorMessage = nil
        
        // Simulate API call
        try? await Task.sleep(nanoseconds: 1_000_000_000)
        
        isLoading = false
    }
    
    @MainActor
    func refreshObjects() async {
        await loadObjects()
    }
    
    func toggleComplete(_ object: MarchObject) {
        if let index = objects.firstIndex(where: { $0.id == object.id }) {
            objects[index].isCompleted.toggle()
        }
    }
    
    func deleteObject(_ object: MarchObject) {
        objects.removeAll { $0.id == object.id }
    }
    
    private func loadSampleData() {
        let now = Date()
        objects = [
            MarchObject(
                id: "1",
                title: "Review iOS app mockups",
                description: "Check the new design proposals for the mobile app",
                type: .todo,
                source: "ios",
                status: .inbox,
                dueDate: Calendar.current.date(byAdding: .day, value: 2, to: now),
                createdAt: Calendar.current.date(byAdding: .hour, value: -2, to: now) ?? now,
                updatedAt: now,
                isCompleted: false,
                isArchived: false
            ),
            MarchObject(
                id: "2",
                title: "Meeting notes: Product roadmap",
                description: "Discussed Q4 features and timeline",
                type: .note,
                source: "ios",
                status: .inbox,
                dueDate: nil,
                createdAt: Calendar.current.date(byAdding: .day, value: -1, to: now) ?? now,
                updatedAt: now,
                isCompleted: true,
                isArchived: false
            ),
            MarchObject(
                id: "3",
                title: "SwiftUI Documentation",
                description: "Apple's official SwiftUI tutorials and guides",
                type: .bookmark,
                source: "ios",
                status: .inbox,
                dueDate: nil,
                createdAt: Calendar.current.date(byAdding: .hour, value: -6, to: now) ?? now,
                updatedAt: now,
                isCompleted: false,
                isArchived: false
            )
        ]
    }
}

#Preview {
    InboxView(viewModel: InboxViewModel())
} 