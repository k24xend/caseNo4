import Foundation

typealias MinorUnits = Int64

struct TokenPair: Codable, Equatable, Sendable {
    let accessToken: String
    let refreshToken: String
    let tokenType: String
}

struct AccountDTO: Codable, Identifiable, Equatable, Sendable {
    let id: String; let name: String; let balance: MinorUnits; let currency: String
    let createdAt: Date?; let updatedAt: Date?; let version: Int?
}

struct DebtDTO: Codable, Identifiable, Equatable, Sendable {
    let id: String; var name: String; var debtType: String; var balance: MinorUnits
    var currency: String; var annualRateBps: Int; var minimumPayment: MinorUnits
    var dueDay: Int; var overdue: Bool; var customPriority: Int
    let createdAt: Date?; let updatedAt: Date?; let version: Int?
}

struct TransactionDTO: Codable, Identifiable, Equatable, Sendable {
    let id: String; let accountId: String; let kind: String; let amount: MinorUnits
    let currency: String; let category: String; let description: String
    let occurredAt: Date; let createdAt: Date?; let updatedAt: Date?; let version: Int?
    var syncState: SyncState?
}

struct TransactionPage: Codable, Sendable { let items: [TransactionDTO]; let limit: Int; let offset: Int }

struct PlanDTO: Codable, Equatable, Sendable {
    struct Action: Codable, Equatable, Sendable { let type: String; let title: String; let amount: MinorUnits? }
    struct Snapshot: Codable, Equatable, Sendable {
        let availableNow: MinorUnits; let mandatoryBeforeNextIncome: MinorUnits
        let minimumDebtPaymentsBeforeNextIncome: MinorUnits; let projectedBalanceBeforeNextIncome: MinorUnits
        let safeToSpend: MinorUnits; let safeDailyAmount: MinorUnits; let monthlyFreeCashFlow: MinorUnits
        let minimumBufferTarget: MinorUnits
    }
    let state: String; let currency: String; let snapshot: Snapshot; let nextIncomeDate: String?
    let incomeConfirmed: Bool; let action: Action; let generatedAt: String; let calculationVersion: Int
}

struct ExplanationDTO: Codable, Equatable, Sendable {
    struct Step: Codable, Equatable, Sendable { let title: String; let description: String; let actionType: String }
    let headline: String; let explanation: String; let reasons: [String]; let nextSteps: [Step]; let uncertainties: [String]
    static func fallback(action: PlanDTO.Action) -> Self {
        .init(headline: action.title,
              explanation: String(localized: "explanation.fallback"),
              reasons: [String(localized: "explanation.deterministic_reason")],
              nextSteps: [.init(title: action.title, description: String(localized: "explanation.follow_plan"), actionType: action.type)],
              uncertainties: [String(localized: "explanation.ai_unavailable")])
    }
}

struct OnboardingDraft: Codable, Equatable, Sendable {
    struct Scheduled: Codable, Equatable, Identifiable, Sendable {
        var id = UUID(); var name = ""; var amount: MinorUnits = 0; var dueDate = Date(); var confirmed = true; var recurring = false
        enum CodingKeys: String, CodingKey { case name, amount, dueDate, confirmed, recurring }
    }
    var step = 0; var language = "ru"; var currency = "RUB"; var availableNow: MinorUnits = 0
    var minimumBuffer: MinorUnits = 0; var incomes: [Scheduled] = []; var expenses: [Scheduled] = []
}

enum SyncState: String, Codable, Sendable { case pending, failed, synced }
enum MutationKind: String, Codable, Sendable { case createTransaction, createDebt, updateDebt, deleteDebt, onboarding }

enum MoneyFormatter {
    static func string(_ amount: MinorUnits, currency: String, locale: Locale = .current) -> String {
        let value = Decimal(amount) / 100
        return value.formatted(.currency(code: currency).locale(locale))
    }
}
