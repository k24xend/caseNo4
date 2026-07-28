import SwiftUI

struct TodayView: View {
    @Environment(AppModel.self) private var model
    var body: some View { ScrollView { LazyVStack(spacing: DS.spacing) {
        if case .offline(let date) = model.state { OfflineBanner(date: date) }
        if let plan = model.plan {
            FinanceCard { Label("today.action", systemImage: "sparkles").font(.caption).foregroundStyle(.secondary); Text(plan.action.title).font(.title2.bold()).padding(.top, 4) }
            HStack(spacing: DS.spacing) { FinanceCard { Text("today.safe").font(.caption).foregroundStyle(.secondary); AmountText(amount: plan.snapshot.safeToSpend, currency: plan.currency) }; FinanceCard { Text("today.daily").font(.caption).foregroundStyle(.secondary); AmountText(amount: plan.snapshot.safeDailyAmount, currency: plan.currency) } }
            FinanceCard { Label(LocalizedStringKey("state.\(plan.state)"), systemImage: plan.state == "critical" ? "exclamationmark.triangle" : "figure.walk").font(.headline).foregroundStyle(plan.state == "critical" ? .red : .primary); Divider(); LabeledContent("today.available", value: MoneyFormatter.string(plan.snapshot.availableNow, currency: plan.currency)); LabeledContent("today.mandatory", value: MoneyFormatter.string(plan.snapshot.mandatoryBeforeNextIncome, currency: plan.currency)); LabeledContent("today.debt_minimum", value: MoneyFormatter.string(plan.snapshot.minimumDebtPaymentsBeforeNextIncome, currency: plan.currency)); if plan.snapshot.projectedBalanceBeforeNextIncome < 0 { Text("today.shortfall").foregroundStyle(.red).font(.callout.bold()) } }
        } else if case .loading = model.state { ForEach(0..<3) { _ in RoundedRectangle(cornerRadius: DS.radius).fill(.secondary.opacity(0.12)).frame(height: 120).redacted(reason: .placeholder) } }
        else { StateView(icon: "tray", title: "empty.title", message: "empty.message", retry: { Task { await model.reload() } }) }
    }.padding() }.navigationTitle("tab.today").refreshable { await model.reload() }.toolbar { ToolbarItem(placement: .topBarTrailing) { Button { Task { await model.syncNow(); await model.reload() } } label: { Image(systemName: "arrow.triangle.2.circlepath").symbolEffect(.rotate, isActive: model.isSyncing) }.accessibilityLabel("sync.manual") } } }
}

#Preview("Offline") { NavigationStack { TodayView() } }
