import SwiftUI

struct OnboardingView: View {
    @Environment(AppModel.self) private var model
    @State private var amount = "", buffer = "", submitting = false, error: String?
    var body: some View { @Bindable var model = model; NavigationStack { Form {
        Section { Picker("onboarding.currency", selection: $model.draft.currency) { Text("RUB").tag("RUB"); Text("USD").tag("USD"); Text("EUR").tag("EUR") } }
        Section("onboarding.available") { TextField("onboarding.amount", text: $amount).keyboardType(.decimalPad).onChange(of: amount) { _, value in model.draft.availableNow = parse(value); model.saveDraft() } }
        Section("onboarding.buffer") { TextField("onboarding.amount", text: $buffer).keyboardType(.decimalPad).onChange(of: buffer) { _, value in model.draft.minimumBuffer = parse(value); model.saveDraft() } }
        Section("onboarding.income") { ForEach($model.draft.incomes) { $item in TextField("onboarding.name", text: $item.name); TextField("onboarding.amount", value: $item.amount, format: .number).keyboardType(.numberPad); DatePicker("onboarding.date", selection: $item.dueDate, displayedComponents: .date); Toggle("onboarding.confirmed", isOn: $item.confirmed); Toggle("onboarding.recurring", isOn: $item.recurring) }; Button("onboarding.add_income") { model.draft.incomes.append(.init()); model.saveDraft() } }
        Section("onboarding.expense") { ForEach($model.draft.expenses) { $item in TextField("onboarding.name", text: $item.name); TextField("onboarding.amount", value: $item.amount, format: .number).keyboardType(.numberPad); DatePicker("onboarding.date", selection: $item.dueDate, displayedComponents: .date); Toggle("onboarding.recurring", isOn: $item.recurring) }; Button("onboarding.add_expense") { model.draft.expenses.append(.init()); model.saveDraft() } }
        if let error { Text(error).foregroundStyle(.red) }
        Button { submit() } label: { submitting ? AnyView(ProgressView()) : AnyView(Text("onboarding.finish").frame(maxWidth: .infinity)) }.buttonStyle(.borderedProminent).disabled(submitting)
    }.navigationTitle("onboarding.title").onDisappear { model.saveDraft() } } }
    private func parse(_ text: String) -> MinorUnits { let normalized = text.replacingOccurrences(of: ",", with: "."); return NSDecimalNumber(decimal: Decimal(string: normalized) ?? 0).multiplying(byPowerOf10: 2).int64Value }
    private func submit() { submitting = true; Task { do { try await model.submitOnboarding() } catch { self.error = error.localizedDescription }; submitting = false } }
}
