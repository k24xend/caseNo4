import Foundation
import SwiftData

@Model final class CachedRecord {
    @Attribute(.unique) var key: String; var payload: Data; var updatedAt: Date
    init(key: String, payload: Data, updatedAt: Date = .now) { self.key = key; self.payload = payload; self.updatedAt = updatedAt }
}

@Model final class QueuedMutation {
    @Attribute(.unique) var id: UUID; var kindRaw: String; var path: String; var method: String
    var payload: Data; var idempotencyKey: String; var stateRaw: String; var attempts: Int
    var nextAttemptAt: Date; var createdAt: Date; var serverID: String?; var lastError: String?
    init(id: UUID = UUID(), kind: MutationKind, path: String, method: String, payload: Data, idempotencyKey: String = UUID().uuidString) {
        self.id = id; kindRaw = kind.rawValue; self.path = path; self.method = method; self.payload = payload
        self.idempotencyKey = idempotencyKey; stateRaw = SyncState.pending.rawValue; attempts = 0
        nextAttemptAt = .now; createdAt = .now
    }
    var state: SyncState { get { SyncState(rawValue: stateRaw) ?? .failed } set { stateRaw = newValue.rawValue } }
}

@MainActor final class LocalStore {
    let container: ModelContainer; var context: ModelContext { container.mainContext }
    init(inMemory: Bool = false) throws {
        let config = ModelConfiguration(isStoredInMemoryOnly: inMemory)
        container = try ModelContainer(for: CachedRecord.self, QueuedMutation.self, configurations: config)
    }
    func put<T: Encodable>(_ value: T, key: String) throws {
        let data = try JSONEncoder.api.encode(value); let descriptor = FetchDescriptor<CachedRecord>(predicate: #Predicate { $0.key == key })
        if let record = try context.fetch(descriptor).first { record.payload = data; record.updatedAt = .now }
        else { context.insert(CachedRecord(key: key, payload: data)) }
        try context.save()
    }
    func get<T: Decodable>(_ type: T.Type, key: String) throws -> (T, Date)? {
        let descriptor = FetchDescriptor<CachedRecord>(predicate: #Predicate { $0.key == key })
        guard let record = try context.fetch(descriptor).first else { return nil }
        return (try JSONDecoder.api.decode(type, from: record.payload), record.updatedAt)
    }
    func removeSensitiveData() throws {
        try context.delete(model: CachedRecord.self); try context.delete(model: QueuedMutation.self); try context.save()
    }
    func enqueue(_ mutation: QueuedMutation) throws { context.insert(mutation); try context.save() }
    func mutationsDue(now: Date = .now) throws -> [QueuedMutation] {
        let values = try context.fetch(FetchDescriptor<QueuedMutation>(sortBy: [SortDescriptor(\.createdAt)]))
        return values.filter { $0.state != .synced && $0.nextAttemptAt <= now }
    }
}

extension JSONEncoder {
    static var api: JSONEncoder { let value = JSONEncoder(); value.keyEncodingStrategy = .convertToSnakeCase; value.dateEncodingStrategy = .iso8601; return value }
}
extension JSONDecoder {
    static var api: JSONDecoder { let value = JSONDecoder(); value.keyDecodingStrategy = .convertFromSnakeCase; value.dateDecodingStrategy = .iso8601; return value }
}

@MainActor final class SyncEngine {
    private let store: LocalStore; private let api: APIClient; private var syncing = false
    init(store: LocalStore, api: APIClient) { self.store = store; self.api = api }
    func enqueue(kind: MutationKind, path: String, method: String, payload: Data, key: String = UUID().uuidString) throws {
        try store.enqueue(QueuedMutation(kind: kind, path: path, method: method, payload: payload, idempotencyKey: key))
    }
    func synchronize() async {
        guard !syncing else { return }; syncing = true; defer { syncing = false }
        guard let due = try? store.mutationsDue() else { return }
        for item in due {
            do {
                try await api.sendVoid(.init(path: item.path, method: item.method, body: item.payload, idempotencyKey: item.idempotencyKey))
                item.state = .synced; item.lastError = nil
            } catch APIError.server(let code, _) where code == 409 {
                item.state = .failed; item.lastError = "conflict"
            } catch {
                item.attempts += 1; item.state = item.attempts >= 5 ? .failed : .pending
                item.nextAttemptAt = .now.addingTimeInterval(Self.backoff(attempt: item.attempts)); item.lastError = "sync_failed"
            }
            try? store.context.save()
        }
    }
    static func backoff(attempt: Int) -> TimeInterval { min(3600, pow(2, Double(max(0, attempt - 1))) * 5) }
}
