import SwiftUI

struct InboxView: View {
    @ObservedObject var viewModel: InboxViewModel
    @State private var searchText = ""
    
    var body: some View {
        VStack(spacing: 0) {
            // Custom header with title and count
            HStack {
                HStack(spacing: 4) {
                    Text("Inbox")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundColor(.white)
                    
                    Text("\(viewModel.objects.count)")
                        .font(.system(size: 18, weight: .regular))
                        .foregroundColor(.gray)
                }
                
                Spacer()
                
                Button(action: { viewModel.refresh() }) {
                    Image(systemName: "arrow.clockwise")
                        .foregroundColor(.gray)
                }
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 4)
            
            // Search bar
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.gray)
                    .font(.system(size: 16))
                
                TextField("Find objects, notes, etc.", text: $searchText)
                    .textFieldStyle(PlainTextFieldStyle())
                    .foregroundColor(.white)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Color.black.opacity(0.6))
            .cornerRadius(12)
            .padding(.horizontal, 24)
            .padding(.top, 4)
            .padding(.bottom, 4)
            
            // Object list
            ScrollView {
                LazyVStack(spacing: 12) {
                    ForEach(filteredObjects) { object in
                        ObjectRowView(object: object) {
                            viewModel.toggleComplete(object.id)
                        }
                    }
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 20)
            }
        }
        .background(Color.black)
    }
    
    private var filteredObjects: [MarchObject] {
        if searchText.isEmpty {
            return viewModel.objects
        } else {
            return viewModel.objects.filter {
                $0.title.localizedCaseInsensitiveContains(searchText) ||
                $0.description.localizedCaseInsensitiveContains(searchText)
            }
        }
    }
}

struct ObjectRowView: View {
    let object: MarchObject
    let onToggleComplete: () -> Void
    
    var body: some View {
        HStack(spacing: 12) {
            // Completion button
            Button(action: onToggleComplete) {
                Circle()
                    .stroke(object.isCompleted ? Color.green : Color.gray.opacity(0.3), lineWidth: 1.5)
                    .fill(object.isCompleted ? Color.green : Color.clear)
                    .frame(width: 20, height: 20)
                    .overlay(
                        Image(systemName: "checkmark")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(.black)
                            .opacity(object.isCompleted ? 1 : 0)
                    )
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(object.title)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(object.isCompleted ? .gray : .white)
                    .strikethrough(object.isCompleted)
                
                if !object.description.isEmpty {
                    Text(object.description)
                        .font(.system(size: 14))
                        .foregroundColor(.gray)
                        .lineLimit(2)
                }
                
                HStack {
                    Text(object.type.capitalized)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.gray)
                    
                    Spacer()
                    
                    Text(timeAgo(from: object.createdAt))
                        .font(.system(size: 12))
                        .foregroundColor(.gray.opacity(0.7))
                }
            }
            
            Spacer()
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 16)
        .background(Color.black.opacity(0.3))
        .cornerRadius(12)
    }
    
    private func timeAgo(from date: Date) -> String {
        let now = Date()
        let diff = now.timeIntervalSince(date)
        let hours = Int(diff / 3600)
        
        if hours < 1 {
            return "now"
        } else if hours < 24 {
            return "\(hours)h"
        } else {
            let days = hours / 24
            return "\(days)d"
        }
    }
}

#Preview {
    InboxView(viewModel: InboxViewModel())
} 