import Foundation

protocol TokenStore: Sendable {
    func load() async throws -> TokenPair?
    func save(_ pair: TokenPair) async throws
    func clear() async throws
}

enum APIError: Error, LocalizedError, Equatable {
    case invalidURL, transport, unauthorized, server(Int, String), decoding, cancelled
    var errorDescription: String? {
        switch self { case .unauthorized: String(localized: "error.session_expired"); case .transport: String(localized: "error.offline"); case .cancelled: String(localized: "error.cancelled"); default: String(localized: "error.generic") }
    }
}

struct APIRequest: Sendable {
    var path: String; var method = "GET"; var body: Data?; var idempotencyKey: String?
}

protocol HTTPTransport: Sendable { func data(for request: URLRequest) async throws -> (Data, HTTPURLResponse) }
struct URLSessionTransport: HTTPTransport {
    let session: URLSession
    func data(for request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError.transport }
        return (data, http)
    }
}

actor RefreshCoordinator {
    private var task: Task<TokenPair, Error>?
    func refresh(using operation: @escaping @Sendable () async throws -> TokenPair) async throws -> TokenPair {
        if let task { return try await task.value }
        let created = Task { try await operation() }; task = created
        defer { task = nil }
        return try await created.value
    }
}

actor APIClient {
    private let baseURL: URL; private let transport: HTTPTransport; private let tokens: TokenStore
    private let refreshCoordinator = RefreshCoordinator(); private let encoder = JSONEncoder(); private let decoder = JSONDecoder()
    init(baseURL: URL, transport: HTTPTransport, tokens: TokenStore) {
        self.baseURL = baseURL; self.transport = transport; self.tokens = tokens
        encoder.keyEncodingStrategy = .convertToSnakeCase
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
    }
    func send<T: Decodable & Sendable>(_ request: APIRequest, as type: T.Type = T.self, authenticated: Bool = true) async throws -> T {
        do { return try await perform(request, as: type, authenticated: authenticated) }
        catch APIError.unauthorized where authenticated {
            _ = try await refreshCoordinator.refresh { [self] in try await refreshTokens() }
            return try await perform(request, as: type, authenticated: true)
        }
    }
    func sendVoid(_ request: APIRequest, authenticated: Bool = true) async throws {
        let _: EmptyResponse = try await send(request, authenticated: authenticated)
    }
    private func perform<T: Decodable & Sendable>(_ input: APIRequest, as: T.Type, authenticated: Bool) async throws -> T {
        var request = URLRequest(url: baseURL.appending(path: input.path)); request.httpMethod = input.method
        request.timeoutInterval = 20; request.httpBody = input.body; request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let key = input.idempotencyKey { request.setValue(key, forHTTPHeaderField: "Idempotency-Key") }
        if authenticated, let pair = try await tokens.load() { request.setValue("Bearer \(pair.accessToken)", forHTTPHeaderField: "Authorization") }
        do {
            let (data, response) = try await transport.data(for: request)
            if response.statusCode == 401 { throw APIError.unauthorized }
            guard 200..<300 ~= response.statusCode else { throw APIError.server(response.statusCode, Self.message(data)) }
            if T.self == EmptyResponse.self { return EmptyResponse() as! T }
            do { return try decoder.decode(T.self, from: data) } catch { throw APIError.decoding }
        } catch is CancellationError { throw APIError.cancelled }
        catch let error as APIError { throw error }
        catch { throw APIError.transport }
    }
    private func refreshTokens() async throws -> TokenPair {
        guard let current = try await tokens.load() else { throw APIError.unauthorized }
        let body = try encoder.encode(["refresh_token": current.refreshToken])
        let pair: TokenPair = try await perform(.init(path: "auth/refresh", method: "POST", body: body), as: TokenPair.self, authenticated: false)
        try await tokens.save(pair); return pair
    }
    private static func message(_ data: Data) -> String { (try? JSONSerialization.jsonObject(with: data) as? [String: Any]).flatMap { ($0["error"] as? [String: Any])?["message"] as? String } ?? "Server error" }
    struct EmptyResponse: Codable, Sendable { init() {} }
}

extension Encodable {
    func apiData() throws -> Data { let e = JSONEncoder(); e.keyEncodingStrategy = .convertToSnakeCase; e.dateEncodingStrategy = .iso8601; return try e.encode(self) }
}
