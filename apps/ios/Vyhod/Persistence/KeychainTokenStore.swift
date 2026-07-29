import Foundation
import Security

actor KeychainTokenStore: TokenStore {
    private let service = "app.vyhod.ios.session", account = "token-pair"
    func load() throws -> TokenPair? {
        var query = base; query[kSecReturnData as String] = true; query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?; let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }; guard status == errSecSuccess, let data = result as? Data else { throw APIError.unauthorized }
        return try JSONDecoder().decode(TokenPair.self, from: data)
    }
    func save(_ pair: TokenPair) throws {
        let data = try JSONEncoder().encode(pair); SecItemDelete(base as CFDictionary)
        var query = base; query[kSecValueData as String] = data; query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        guard SecItemAdd(query as CFDictionary, nil) == errSecSuccess else { throw APIError.unauthorized }
    }
    func clear() throws { let status = SecItemDelete(base as CFDictionary); guard status == errSecSuccess || status == errSecItemNotFound else { throw APIError.unauthorized } }
    private var base: [String: Any] { [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: account] }
}
