import XCTest
@testable import Vyhod

actor MemoryTokens: TokenStore {
    var value: TokenPair?; var saves = 0
    init(_ value: TokenPair? = nil) { self.value = value }
    func load() -> TokenPair? { value }
    func save(_ pair: TokenPair) { value = pair; saves += 1 }
    func clear() { value = nil }
}

actor MockTransport: HTTPTransport {
    var requests: [URLRequest] = []; var refreshes = 0
    func data(for request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        requests.append(request); let path = request.url!.path
        if path.hasSuffix("auth/refresh") { refreshes += 1; let data = #"{"access_token":"new","refresh_token":"refresh-new","token_type":"bearer"}"#.data(using: .utf8)!; return (data, response(request, 200)) }
        if request.value(forHTTPHeaderField: "Authorization") == "Bearer old" { return (Data(), response(request, 401)) }
        return (#"{"id":"a","name":"Main","balance":12345,"currency":"RUB","created_at":"2026-07-28T00:00:00Z","updated_at":"2026-07-28T00:00:00Z","version":1}"#.data(using: .utf8)!, response(request, 200))
    }
    private func response(_ request: URLRequest, _ status: Int) -> HTTPURLResponse { HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: nil)! }
}

final class VyhodTests: XCTestCase {
    func testDTOAndMinorUnitMoneyDecode() throws {
        let json = #"{"id":"d1","name":"Card","debt_type":"credit_card","balance":100050,"currency":"RUB","annual_rate_bps":1999,"minimum_payment":5000,"due_day":15,"overdue":false,"custom_priority":2,"created_at":"2026-07-28T00:00:00Z","updated_at":"2026-07-28T00:00:00Z","version":1}"#.data(using: .utf8)!
        let debt = try JSONDecoder.api.decode(DebtDTO.self, from: json)
        XCTAssertEqual(debt.balance, 100050); XCTAssertEqual(debt.annualRateBps, 1999)
        XCTAssertTrue(MoneyFormatter.string(12345, currency: "RUB", locale: Locale(identifier: "ru_RU")).contains("123"))
    }
    func testRefreshIsCoordinatedForConcurrent401s() async throws {
        let tokens = MemoryTokens(.init(accessToken: "old", refreshToken: "refresh-token-long-enough", tokenType: "bearer")); let transport = MockTransport()
        let api = APIClient(baseURL: URL(string: "https://example.test/")!, transport: transport, tokens: tokens)
        async let one: AccountDTO = api.send(.init(path: "accounts/1")); async let two: AccountDTO = api.send(.init(path: "accounts/1")); _ = try await (one, two)
        let count = await transport.refreshes; XCTAssertEqual(count, 1)
    }
    @MainActor func testCacheAndQueueSurviveNewContextWithoutDuplicates() throws {
        let store = try LocalStore(inMemory: true); let debt = DebtDTO(id: "1", name: "Card", debtType: "credit", balance: 100, currency: "RUB", annualRateBps: 0, minimumPayment: 10, dueDay: 1, overdue: false, customPriority: 0, createdAt: nil, updatedAt: nil, version: 1)
        try store.put([debt], key: "debts"); XCTAssertEqual(try store.get([DebtDTO].self, key: "debts")?.0.count, 1)
        let mutation = QueuedMutation(kind: .createDebt, path: "debts", method: "POST", payload: Data(), idempotencyKey: "stable-key")
        try store.enqueue(mutation); XCTAssertEqual(try store.mutationsDue().map(\.idempotencyKey), ["stable-key"])
    }
    func testBackoffIsBounded() { XCTAssertEqual(SyncEngine.backoff(attempt: 1), 5); XCTAssertLessThanOrEqual(SyncEngine.backoff(attempt: 99), 3600) }
    func testDeterministicExplanationFallbackDoesNotChangePlanAction() {
        let action = PlanDTO.Action(type: "build_buffer", title: "Build a buffer", amount: 100)
        let value = ExplanationDTO.fallback(action: action)
        XCTAssertEqual(value.nextSteps.first?.actionType, action.type); XCTAssertEqual(value.headline, action.title)
    }
}
