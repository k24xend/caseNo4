import SwiftUI

struct DebtsView: View {
    @Environment(AppModel.self) private var model
    @State private var deleteCandidate: DebtDTO?
    var body: some View {
        Group {
            if model.debts.isEmpty {
                StateView(icon: "creditcard", title: "debts.empty", message: "debts.empty_message")
            } else {
                List(model.debts) { debt in
                    NavigationLink { DebtDetailView(debt: debt) } label: {
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text(debt.name).font(.headline)
                                if debt.overdue { Text("debts.overdue").foregroundStyle(.red).font(.caption.bold()) }
                            }
                            Text(MoneyFormatter.string(debt.balance, currency: debt.currency)).font(.title3.bold()).monospacedDigit()
                            HStack {
                                Text("debts.rate \(Decimal(debt.annualRateBps) / 100)%")
                                Spacer()
                                Text("debts.minimum \(MoneyFormatter.string(debt.minimumPayment, currency: debt.currency))")
                            }.font(.caption).foregroundStyle(.secondary)
                        }.swipeActions {
                            Button(role: .destructive) { deleteCandidate = debt } label: { Label("delete", systemImage: "trash") }
                        }
                    }
                }
            }
        }
        .navigationTitle("debts.title")
        .toolbar { NavigationLink { DebtEditorView() } label: { Image(systemName: "plus") }.accessibilityLabel("debts.add") }
        .confirmationDialog("debts.delete_confirm", isPresented: .init(get: { deleteCandidate != nil }, set: { if !$0 { deleteCandidate = nil } }), titleVisibility: .visible) {
            Button("delete", role: .destructive) { if let debt = deleteCandidate { Task { await model.deleteDebt(debt) } }; deleteCandidate = nil }
            Button("cancel", role: .cancel) {}
        }
    }
}

struct DebtDetailView: View {
    let debt: DebtDTO
    var body: some View { List { LabeledContent("debts.balance", value: MoneyFormatter.string(debt.balance, currency: debt.currency)); LabeledContent("debts.minimum_label", value: MoneyFormatter.string(debt.minimumPayment, currency: debt.currency)); LabeledContent("debts.rate_label", value: "\(Decimal(debt.annualRateBps) / 100)%"); LabeledContent("debts.due", value: "\(debt.dueDay)"); LabeledContent("debts.priority", value: "\(debt.customPriority)") }.navigationTitle(debt.name).toolbar { NavigationLink("edit") { DebtEditorView(existing: debt) } } }
}

struct DebtEditorView: View {
    @Environment(AppModel.self) private var model; @Environment(\.dismiss) private var dismiss
    var existing: DebtDTO?; @State private var name = "", balance = 0, rate = 0, minimum = 0, due = 1, priority = 0
    var body: some View { Form { TextField("debts.name", text: $name); TextField("debts.balance", value: $balance, format: .number).keyboardType(.numberPad); TextField("debts.rate_label", value: $rate, format: .number).keyboardType(.numberPad); TextField("debts.minimum_label", value: $minimum, format: .number).keyboardType(.numberPad); Stepper("debts.due \(due)", value: $due, in: 1...31); Stepper("debts.priority \(priority)", value: $priority, in: 0...100); Button("save") { save() }.disabled(name.isEmpty || balance <= 0) }.navigationTitle(existing == nil ? "debts.add" : "edit").onAppear { if let existing { name = existing.name; balance = Int(existing.balance); rate = existing.annualRateBps; minimum = Int(existing.minimumPayment); due = existing.dueDay; priority = existing.customPriority } } }
    private func save() { struct Body: Encodable { let name, debtType: String; let balance: Int; let currency: String; let annualRateBps, minimumPayment, dueDay: Int; let overdue: Bool; let customPriority: Int }; guard let currency = model.plan?.currency else { return }; let body = Body(name: name, debtType: existing?.debtType ?? "credit", balance: balance, currency: currency, annualRateBps: rate, minimumPayment: minimum, dueDay: due, overdue: existing?.overdue ?? false, customPriority: priority); Task { if let data = try? body.apiData() { try? model.sync.enqueue(kind: existing == nil ? .createDebt : .updateDebt, path: existing.map { "debts/\($0.id)" } ?? "debts", method: existing == nil ? "POST" : "PUT", payload: data); await model.syncNow(); await model.reload(); dismiss() } } }
}
