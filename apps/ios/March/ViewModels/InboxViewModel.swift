import Foundation
import Combine

@MainActor
class InboxViewModel: ObservableObject {
    @Published var objects: [MarchObject] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let apiClient = APIClient.shared
    private var cancellables = Set<AnyCancellable>()
    
    init() {
        // Auto-load objects when authenticated
        if AuthManager.shared.isAuthenticated {
            Task {
                await loadObjects()
            }
        }
    }
    
    func loadObjects() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let fetchedObjects = try await apiClient.getObjects()
            self.objects = fetchedObjects.sorted { $0.createdAt > $1.createdAt }
        } catch {
            self.errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func refreshObjects() async {
        await loadObjects()
    }
    
    func toggleComplete(_ object: MarchObject) {
        // Optimistic update
        if let index = objects.firstIndex(where: { $0.id == object.id }) {
            objects[index].isCompleted.toggle()
            objects[index].completedAt = objects[index].isCompleted ? Date() : nil
        }
        
        Task {
            do {
                let updatedObject = try await apiClient.toggleObjectCompletion(id: object.id)
                
                // Update with server response
                if let index = objects.firstIndex(where: { $0.id == object.id }) {
                    objects[index] = updatedObject
                }
            } catch {
                // Revert optimistic update on error
                if let index = objects.firstIndex(where: { $0.id == object.id }) {
                    objects[index].isCompleted.toggle()
                    objects[index].completedAt = objects[index].isCompleted ? Date() : nil
                }
                self.errorMessage = error.localizedDescription
            }
        }
    }
    
    func deleteObject(_ object: MarchObject) {
        // Optimistic update
        objects.removeAll { $0.id == object.id }
        
        Task {
            do {
                try await apiClient.deleteObject(id: object.id)
            } catch {
                // Revert optimistic update on error
                objects.append(object)
                objects.sort { $0.createdAt > $1.createdAt }
                self.errorMessage = error.localizedDescription
            }
        }
    }
    
    func addObject(_ newObject: MarchObject) {
        // Optimistic update
        objects.insert(newObject, at: 0)
    }
    
    func updateObject(_ updatedObject: MarchObject) {
        if let index = objects.firstIndex(where: { $0.id == updatedObject.id }) {
            objects[index] = updatedObject
        }
    }
    
    // Utility methods for filtering
    func objects(of type: ObjectType) -> [MarchObject] {
        return objects.filter { $0.type == type }
    }
    
    func completedObjects() -> [MarchObject] {
        return objects.filter { $0.isCompleted }
    }
    
    func pendingObjects() -> [MarchObject] {
        return objects.filter { !$0.isCompleted }
    }
    
    func overDueObjects() -> [MarchObject] {
        let now = Date()
        return objects.filter { object in
            guard let dueDate = object.dueDate else { return false }
            return dueDate < now && !object.isCompleted
        }
    }
} 