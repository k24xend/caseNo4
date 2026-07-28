import Foundation
import SwiftUI

@MainActor @Observable final class AppModel {
    enum Session { case restoring, anonymous, onboarding, authenticated }
    enum LoadState: Equatable { case idle, loading, loaded, offline(Date), failed(String) }
    var session: Session = .restoring; var state: LoadState = .idle
    var plan: PlanDTO?; var debts: [DebtDTO] = []; var transactions: [TransactionDTO] = []; var accounts: [AccountDTO] = []
    var explanation: ExplanationDTO?; var draft = OnboardingDraft(); var isSyncing = false
    let api: APIClient; let tokens: TokenStore; let store: LocalStore; let sync: SyncEngine
    init(api: APIClient, tokens: TokenStore, store: LocalStore) { self.api = api; self.tokens = tokens; self.store = store; sync = SyncEngine(store: store, api: api) }
    func restore() async {
        if let saved = try? store.get(OnboardingDraft.self, key: "onboarding.draft")?.0 { draft = saved }
        guard (try? await tokens.load()) != nil else { session = .anonymous; return }
        do { let me: MeDTO = try await api.send(.init(path: "me")); session = me.settings.onboardingComplete ? .authenticated : .onboarding; if me.settings.onboardingComplete { await reload() } }
        catch APIError.unauthorized { try? await tokens.clear(); session = .anonymous }
        catch { session = (try? store.get(PlanDTO.self, key: "plan")) == nil ? .onboarding : .authenticated; await loadCache() }
    }
    func authenticate(email: String, password: String, register: Bool) async throws {
        struct Credentials: Encodable { let email: String; let password: String }
        let pair: TokenPair = try await api.send(.init(path: register ? "auth/register" : "auth/login", method: "POST", body: try Credentials(email: email, password: password).apiData()), authenticated: false)
        try await tokens.save(pair)
        if register { session = .onboarding } else { await restore() }
    }
    func logout() async {
        if let pair = try? await tokens.load() { try? await api.sendVoid(.init(path: "auth/logout", method: "POST", body: try? ["refresh_token": pair.refreshToken].apiData()), authenticated: false) }
        try? await tokens.clear(); try? store.removeSensitiveData(); session = .anonymous
    }
    func reload() async {
        state = .loading
        do {
            async let p: PlanDTO = api.send(.init(path: "plan")); async let d: [DebtDTO] = api.send(.init(path: "debts"))
            async let t: TransactionPage = api.send(.init(path: "transactions?limit=50")); async let a: [AccountDTO] = api.send(.init(path: "accounts"))
            let values = try await (p, d, t, a); plan = values.0; debts = values.1; transactions = values.2.items; accounts = values.3
            try store.put(plan, key: "plan"); try store.put(debts, key: "debts"); try store.put(transactions, key: "transactions"); try store.put(accounts, key: "accounts")
            state = .loaded; await syncNow()
        } catch { await loadCache(error: error) }
    }
    func loadCache(error: Error? = nil) async {
        if let cached = try? store.get(PlanDTO.self, key: "plan") { plan = cached.0; debts = (try? store.get([DebtDTO].self, key: "debts")?.0) ?? []; transactions = (try? store.get([TransactionDTO].self, key: "transactions")?.0) ?? []; accounts = (try? store.get([AccountDTO].self, key: "accounts")?.0) ?? []; state = .offline(cached.1) }
        else { state = .failed(error?.localizedDescription ?? String(localized: "error.generic")) }
    }
    func submitOnboarding() async throws {
        struct Income: Encodable { let name: String; let amount: MinorUnits; let dueDate: String; let confirmed, recurring: Bool }
        struct Expense: Encodable { let name: String; let amount: MinorUnits; let dueDate: String; let recurring: Bool }
        struct Body: Encodable { let language, currency: String; let availableNow, minimumBuffer: MinorUnits; let incomes: [Income]; let expenses: [Expense]; let debts: [String] = [] }
        let formatter = DateFormatter(); formatter.calendar = Calendar(identifier: .gregorian); formatter.locale = Locale(identifier: "en_US_POSIX"); formatter.dateFormat = "yyyy-MM-dd"
        let incomes = draft.incomes.map { Income(name: $0.name, amount: $0.amount, dueDate: formatter.string(from: $0.dueDate), confirmed: $0.confirmed, recurring: $0.recurring) }
        let expenses = draft.expenses.map { Expense(name: $0.name, amount: $0.amount, dueDate: formatter.string(from: $0.dueDate), recurring: $0.recurring) }
        let key = UUID().uuidString; let body = try Body(language: draft.language, currency: draft.currency, availableNow: draft.availableNow, minimumBuffer: draft.minimumBuffer, incomes: incomes, expenses: expenses).apiData()
        try await api.sendVoid(.init(path: "onboarding", method: "POST", body: body, idempotencyKey: key)); session = .authenticated; await reload()
    }
    func saveDraft() { try? store.put(draft, key: "onboarding.draft") }
    func addTransaction(kind: String, amount: MinorUnits, category: String, description: String, recurring: Bool) async throws {
        guard let account = accounts.first else { throw APIError.server(422, "No account") }
        struct Body: Encodable { let accountId, kind: String; let amount: MinorUnits; let currency, category, description: String; let occurredAt: Date }
        let data = try Body(accountId: account.id, kind: kind, amount: amount, currency: account.currency, category: recurring ? "recurring:\(category)" : category, description: description, occurredAt: .now).apiData()
        let local = TransactionDTO(id: UUID().uuidString, accountId: account.id, kind: kind, amount: amount, currency: account.currency, category: category, description: description, occurredAt: .now, createdAt: .now, updatedAt: .now, version: 0, syncState: .pending)
        transactions.insert(local, at: 0); try store.put(transactions, key: "transactions")
        try sync.enqueue(kind: .createTransaction, path: "transactions", method: "POST", payload: data); await syncNow()
    }
    func deleteDebt(_ debt: DebtDTO) async { try? sync.enqueue(kind: .deleteDebt, path: "debts/\(debt.id)", method: "DELETE", payload: Data()); debts.removeAll { $0.id == debt.id }; await syncNow() }
    func syncNow() async { isSyncing = true; await sync.synchronize(); isSyncing = false }
    func loadExplanation() async {
        do { let result: ExplanationDTO = try await api.send(.init(path: "plan/explanation")); explanation = result; try store.put(result, key: "explanation") }
        catch { explanation = (try? store.get(ExplanationDTO.self, key: "explanation")?.0) ?? plan.map { .fallback(action: $0.action) } }
    }
}

struct MeDTO: Codable, Sendable { let id: String; let email: String; let settings: Settings; struct Settings: Codable, Sendable { let onboardingComplete: Bool } }
