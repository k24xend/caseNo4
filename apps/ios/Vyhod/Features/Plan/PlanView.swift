import SwiftUI

struct PlanView: View {
    @Environment(AppModel.self) private var model
    @State private var showingExplanation = false
    var body: some View { List {
        if let plan = model.plan {
            Section("plan.current") { Label(LocalizedStringKey("state.\(plan.state)"), systemImage: "location.fill"); LabeledContent("plan.free_cash", value: MoneyFormatter.string(plan.snapshot.monthlyFreeCashFlow, currency: plan.currency)); LabeledContent("plan.buffer", value: MoneyFormatter.string(plan.snapshot.minimumBufferTarget, currency: plan.currency)) }
            Section("plan.priority") { Text(plan.action.title).font(.headline); if let amount = plan.action.amount { AmountText(amount: amount, currency: plan.currency) } }
            Section { Button("plan.explain") { showingExplanation = true; Task { await model.loadExplanation() } } }
            Section("debts.title") { NavigationLink { DebtsView() } label: { Label("debts.manage", systemImage: "creditcard") } }
        } else { StateView(icon: "map", title: "empty.title", message: "empty.message") }
    }.navigationTitle("tab.plan").refreshable { await model.reload() }.sheet(isPresented: $showingExplanation) { ExplanationView() } }
}

struct ExplanationView: View {
    @Environment(AppModel.self) private var model; @Environment(\.dismiss) private var dismiss
    var body: some View { NavigationStack { Group { if let value = model.explanation { ScrollView { VStack(alignment: .leading, spacing: 18) { Text(value.headline).font(.title2.bold()); Text(value.explanation); ForEach(value.reasons, id: \.self) { Label($0, systemImage: "checkmark.circle") }; ForEach(value.nextSteps, id: \.title) { step in FinanceCard { Text(step.title).font(.headline); Text(step.description).foregroundStyle(.secondary) } }; if !value.uncertainties.isEmpty { Text("explanation.limitations").font(.headline); ForEach(value.uncertainties, id: \.self) { Text($0).foregroundStyle(.secondary) } }; Text("explanation.disclaimer").font(.footnote).foregroundStyle(.secondary) }.padding() } } else { ProgressView("explanation.loading") } }.navigationTitle("explanation.title").toolbar { Button("done") { dismiss() } }.refreshable { await model.loadExplanation() } } }
}
