import Foundation
import Combine

@MainActor
class InboxViewModel: ObservableObject {
    @Published var objects: [MarchObject] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private var cancellables = Set<AnyCancellable>()
    private let apiClient = APIClient.shared
    
    init() {
        // Auto-refresh when app becomes active
        NotificationCenter.default.publisher(for: UIApplication.didBecomeActiveNotification)
            .sink { [weak self] _ in
                Task {
                    await self?.refreshObjects()
                }
            }
            .store(in: &cancellables)
    }
    
    func loadObjects() async {
        guard !isLoading else { return }
        
        isLoading = true
        errorMessage = nil
        
        apiClient.getInboxObjects()
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    self?.isLoading = false
                    switch completion {
                    case .finished:
                        break
                    case .failure(let error):
                        self?.errorMessage = error.localizedDescription
                    }
                },
                receiveValue: { [weak self] objects in
                    self?.objects = objects
                }
            )
            .store(in: &cancellables)
    }
    
    func refreshObjects() async {
        await loadObjects()
    }
    
    func toggleCompletion(for object: MarchObject) {
        guard let index = objects.firstIndex(where: { $0.id == object.id }) else { return }
        
        // Optimistically update UI
        objects[index].isCompleted.toggle()
        objects[index].status = objects[index].isCompleted ? .done : .todo
        
        let newStatus = objects[index].status
        let updates: [String: Any] = [
            "status": newStatus.rawValue,
            "isCompleted": objects[index].isCompleted
        ]
        
        apiClient.updateObject(id: object.id, updates: updates)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    switch completion {
                    case .finished:
                        break
                    case .failure(let error):
                        // Revert optimistic update
                        if let index = self?.objects.firstIndex(where: { $0.id == object.id }) {
                            self?.objects[index].isCompleted.toggle()
                            self?.objects[index].status = object.status
                        }
                        self?.errorMessage = "Failed to update object: \(error.localizedDescription)"
                    }
                },
                receiveValue: { [weak self] updatedObject in
                    // Update with server response
                    if let index = self?.objects.firstIndex(where: { $0.id == object.id }) {
                        self?.objects[index] = updatedObject
                    }
                }
            )
            .store(in: &cancellables)
    }
    
    func deleteObject(_ object: MarchObject) {
        // Optimistically remove from UI
        objects.removeAll { $0.id == object.id }
        
        apiClient.deleteObject(id: object.id)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    switch completion {
                    case .finished:
                        break
                    case .failure(let error):
                        // Revert optimistic delete
                        self?.objects.append(object)
                        self?.errorMessage = "Failed to delete object: \(error.localizedDescription)"
                    }
                },
                receiveValue: { _ in
                    // Successfully deleted
                }
            )
            .store(in: &cancellables)
    }
    
    func archiveObject(_ object: MarchObject) {
        guard let index = objects.firstIndex(where: { $0.id == object.id }) else { return }
        
        // Optimistically update UI
        objects[index].isArchived = true
        objects[index].status = .archive
        
        let updates: [String: Any] = [
            "isArchived": true,
            "status": ObjectStatus.archive.rawValue
        ]
        
        apiClient.updateObject(id: object.id, updates: updates)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    switch completion {
                    case .finished:
                        break
                    case .failure(let error):
                        // Revert optimistic update
                        if let index = self?.objects.firstIndex(where: { $0.id == object.id }) {
                            self?.objects[index].isArchived = false
                            self?.objects[index].status = object.status
                        }
                        self?.errorMessage = "Failed to archive object: \(error.localizedDescription)"
                    }
                },
                receiveValue: { [weak self] updatedObject in
                    // Update with server response
                    if let index = self?.objects.firstIndex(where: { $0.id == object.id }) {
                        self?.objects[index] = updatedObject
                    }
                }
            )
            .store(in: &cancellables)
    }
    
    func createObject(_ request: CreateObjectRequest) async {
        apiClient.createObject(request)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    switch completion {
                    case .finished:
                        break
                    case .failure(let error):
                        self?.errorMessage = "Failed to create object: \(error.localizedDescription)"
                    }
                },
                receiveValue: { [weak self] newObject in
                    // Add to beginning of list
                    self?.objects.insert(newObject, at: 0)
                }
            )
            .store(in: &cancellables)
    }
    
    func clearError() {
        errorMessage = nil
    }
} 