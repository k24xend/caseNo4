import 'package:dio/dio.dart';

class ApiError implements Exception {
  const ApiError(this.code, this.message, [this.status]);
  factory ApiError.fromDio(DioException error) {
    final data = error.response?.data;
    final envelope = data is Map<String, dynamic> ? data['error'] : null;
    if (envelope is Map<String, dynamic>) {
      return ApiError(envelope['code'] as String? ?? 'api_error',
        envelope['message'] as String? ?? 'Request failed', error.response?.statusCode);
    }
    return ApiError(error.type.name, error.message ?? 'Network request failed', error.response?.statusCode);
  }
  final String code, message;
  final int? status;
  @override String toString() => message;
}
