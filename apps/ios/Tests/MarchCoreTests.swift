import XCTest
@testable import MarchCore

final class MarchCoreTests: XCTestCase {
    func testObjectCreation() {
        let object = MarchObject(
            id: "test",
            title: "Test Object",
            description: "Test Description",
            type: .todo,
            source: "test",
            status: .inbox,
            dueDate: nil,
            createdAt: Date(),
            updatedAt: Date(),
            isCompleted: false,
            isArchived: false
        )
        
        XCTAssertEqual(object.title, "Test Object")
        XCTAssertEqual(object.type, .todo)
        XCTAssertFalse(object.isCompleted)
    }
}
