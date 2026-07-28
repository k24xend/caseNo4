import 'package:flutter_secure_storage/flutter_secure_storage.dart';

abstract interface class AppStorage {
  Future<String?> read(String key);
  Future<void> write(String key, String value);
  Future<void> delete(String key);
}
class SecureAppStorage implements AppStorage {
  const SecureAppStorage([this.delegate = const FlutterSecureStorage()]);
  final FlutterSecureStorage delegate;
  @override Future<String?> read(String key) => delegate.read(key: key);
  @override Future<void> write(String key, String value) => delegate.write(key: key, value: value);
  @override Future<void> delete(String key) => delegate.delete(key: key);
}
