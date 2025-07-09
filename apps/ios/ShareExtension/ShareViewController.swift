import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

class ShareViewController: UIViewController {
    
    @IBOutlet weak var titleTextField: UITextField!
    @IBOutlet weak var descriptionTextView: UITextView!
    @IBOutlet weak var typeSegmentedControl: UISegmentedControl!
    @IBOutlet weak var createButton: UIButton!
    @IBOutlet weak var cancelButton: UIButton!
    
    private var sharedContent: SharedContent?
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        processSharedContent()
    }
    
    private func setupUI() {
        view.backgroundColor = UIColor.systemBackground
        
        // Setup type segmented control
        typeSegmentedControl.removeAllSegments()
        ObjectType.allCases.enumerated().forEach { index, type in
            typeSegmentedControl.insertSegment(withTitle: type.displayName, at: index, animated: false)
        }
        
        // Default to appropriate type based on content
        typeSegmentedControl.selectedSegmentIndex = 0
        
        // Setup buttons
        createButton.addTarget(self, action: #selector(createObject), for: .touchUpInside)
        cancelButton.addTarget(self, action: #selector(cancelShare), for: .touchUpInside)
        
        // Setup text view
        descriptionTextView.layer.borderColor = UIColor.systemGray4.cgColor
        descriptionTextView.layer.borderWidth = 1
        descriptionTextView.layer.cornerRadius = 8
    }
    
    private func processSharedContent() {
        guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem else {
            return
        }
        
        guard let itemProvider = extensionItem.attachments?.first else {
            return
        }
        
        // Process different types of shared content
        if itemProvider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
            processURL(from: itemProvider)
        } else if itemProvider.hasItemConformingToTypeIdentifier(UTType.text.identifier) {
            processText(from: itemProvider)
        } else if itemProvider.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
            processImage(from: itemProvider)
        }
    }
    
    private func processURL(from itemProvider: NSItemProvider) {
        itemProvider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { [weak self] (item, error) in
            DispatchQueue.main.async {
                if let url = item as? URL {
                    self?.sharedContent = SharedContent(
                        type: .bookmark,
                        title: url.absoluteString,
                        content: url.absoluteString,
                        url: url
                    )
                    
                    self?.titleTextField.text = self?.extractTitleFromURL(url) ?? url.absoluteString
                    self?.descriptionTextView.text = url.absoluteString
                    self?.typeSegmentedControl.selectedSegmentIndex = ObjectType.allCases.firstIndex(of: .bookmark) ?? 0
                    
                    // Try to get page title
                    self?.fetchPageTitle(for: url)
                }
            }
        }
    }
    
    private func processText(from itemProvider: NSItemProvider) {
        itemProvider.loadItem(forTypeIdentifier: UTType.text.identifier, options: nil) { [weak self] (item, error) in
            DispatchQueue.main.async {
                if let text = item as? String {
                    self?.sharedContent = SharedContent(
                        type: .note,
                        title: String(text.prefix(50)),
                        content: text,
                        url: nil
                    )
                    
                    self?.titleTextField.text = String(text.prefix(50))
                    self?.descriptionTextView.text = text
                    self?.typeSegmentedControl.selectedSegmentIndex = ObjectType.allCases.firstIndex(of: .note) ?? 0
                }
            }
        }
    }
    
    private func processImage(from itemProvider: NSItemProvider) {
        itemProvider.loadItem(forTypeIdentifier: UTType.image.identifier, options: nil) { [weak self] (item, error) in
            DispatchQueue.main.async {
                self?.sharedContent = SharedContent(
                    type: .note,
                    title: "Shared Image",
                    content: "Image shared from another app",
                    url: nil
                )
                
                self?.titleTextField.text = "Shared Image"
                self?.descriptionTextView.text = "Image shared from another app"
                self?.typeSegmentedControl.selectedSegmentIndex = ObjectType.allCases.firstIndex(of: .note) ?? 0
            }
        }
    }
    
    private func extractTitleFromURL(_ url: URL) -> String? {
        // Extract domain name as fallback title
        return url.host?.replacingOccurrences(of: "www.", with: "")
    }
    
    private func fetchPageTitle(for url: URL) {
        URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            guard let data = data,
                  let html = String(data: data, encoding: .utf8) else { return }
            
            // Extract title from HTML
            if let titleRange = html.range(of: "<title>.*?</title>", options: .regularExpression),
               let title = html[titleRange].components(separatedBy: "<title>").last?.components(separatedBy: "</title>").first {
                DispatchQueue.main.async {
                    self?.titleTextField.text = String(title).trimmingCharacters(in: .whitespacesAndNewlines)
                }
            }
        }.resume()
    }
    
    @objc private func createObject() {
        guard let title = titleTextField.text?.trimmingCharacters(in: .whitespacesAndNewlines),
              !title.isEmpty else {
            showAlert(title: "Error", message: "Please enter a title")
            return
        }
        
        let selectedTypeIndex = typeSegmentedControl.selectedSegmentIndex
        let selectedType = ObjectType.allCases[selectedTypeIndex]
        
        let description = descriptionTextView.text?.trimmingCharacters(in: .whitespacesAndNewlines)
        
        let request = CreateObjectRequest(
            title: title,
            description: description?.isEmpty == true ? nil : description,
            type: selectedType,
            source: "march"
        )
        
        // Create object using API
        createButton.isEnabled = false
        createButton.setTitle("Creating...", for: .normal)
        
        APIClient.shared.createObject(request)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    switch completion {
                    case .finished:
                        self?.completeShare()
                    case .failure(let error):
                        self?.showAlert(title: "Error", message: "Failed to create object: \(error.localizedDescription)")
                        self?.createButton.isEnabled = true
                        self?.createButton.setTitle("Create", for: .normal)
                    }
                },
                receiveValue: { _ in
                    // Object created successfully
                }
            )
            .store(in: &APIClient.shared.cancellables)
    }
    
    @objc private func cancelShare() {
        extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    }
    
    private func completeShare() {
        // Show success and close
        let alert = UIAlertController(title: "Success", message: "Object created successfully!", preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { [weak self] _ in
            self?.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        })
        present(alert, animated: true)
    }
    
    private func showAlert(title: String, message: String) {
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
}

// MARK: - Shared Content Model
struct SharedContent {
    let type: ObjectType
    let title: String
    let content: String
    let url: URL?
}

// MARK: - Combine Support
import Combine

extension APIClient {
    fileprivate var cancellables: Set<AnyCancellable> {
        get {
            objc_getAssociatedObject(self, &AssociatedKeys.cancellables) as? Set<AnyCancellable> ?? Set<AnyCancellable>()
        }
        set {
            objc_setAssociatedObject(self, &AssociatedKeys.cancellables, newValue, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
        }
    }
}

private struct AssociatedKeys {
    static var cancellables = "cancellables"
}

import ObjectiveC 