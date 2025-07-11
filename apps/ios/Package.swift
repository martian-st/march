// swift-tools-version: 5.7
import PackageDescription

let package = Package(
    name: "MarchApp",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(
            name: "MarchCore",
            targets: ["MarchCore"]
        ),
    ],
    dependencies: [
        // Add external dependencies here if needed
    ],
    targets: [
        .target(
            name: "MarchCore",
            dependencies: [],
            path: "Shared",
            sources: [
                "Models.swift",
                "AuthManager.swift"
            ]
        ),
        .testTarget(
            name: "MarchCoreTests",
            dependencies: ["MarchCore"],
            path: "Tests"
        ),
    ]
) 