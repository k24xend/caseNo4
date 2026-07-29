import SwiftUI

enum DS { static let spacing: CGFloat = 16; static let radius: CGFloat = 18 }

struct FinanceCard<Content: View>: View {
    let content: Content
    init(@ViewBuilder content: () -> Content) { self.content = content() }
    var body: some View { content.frame(maxWidth: .infinity, alignment: .leading).padding(DS.spacing).background(Color(uiColor: .secondarySystemBackground), in: RoundedRectangle(cornerRadius: DS.radius)).accessibilityElement(children: .contain) }
}

struct OfflineBanner: View {
    let date: Date
    var body: some View { Label { Text("offline.updated \(date.formatted(date: .abbreviated, time: .shortened))") } icon: { Image(systemName: "wifi.slash") }.font(.footnote).foregroundStyle(.secondary).padding(10).frame(maxWidth: .infinity).background(.orange.opacity(0.12)) }
}

struct StateView: View {
    let icon: String; let title: LocalizedStringKey; let message: LocalizedStringKey; var retry: (() -> Void)?
    var body: some View { ContentUnavailableView { Label(title, systemImage: icon) } description: { Text(message) } actions: { if let retry { Button("retry", action: retry).buttonStyle(.bordered) } } }
}

struct StatusBadge: View {
    let state: SyncState
    var body: some View { Text(LocalizedStringKey("sync.\(state.rawValue)")).font(.caption.weight(.semibold)).padding(.horizontal, 8).padding(.vertical, 4).background(state == .failed ? Color.red.opacity(0.12) : Color.secondary.opacity(0.12), in: Capsule()).accessibilityLabel(Text("sync.status")).accessibilityValue(Text(LocalizedStringKey("sync.\(state.rawValue)"))) }
}

struct AmountText: View {
    let amount: MinorUnits; let currency: String
    var body: some View { Text(MoneyFormatter.string(amount, currency: currency)).font(.title2.bold()).monospacedDigit().accessibilityLabel(Text("amount")).accessibilityValue(MoneyFormatter.string(amount, currency: currency)) }
}
