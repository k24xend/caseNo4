import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vyhod/core/api/api_client.dart';
import 'package:vyhod/core/api/api_error.dart';
import 'package:vyhod/core/storage/app_storage.dart';

class MemoryStorage implements AppStorage {
  final values = <String, String>{};
  @override Future<void> delete(String key) async => values.remove(key);
  @override Future<String?> read(String key) async => values[key];
  @override Future<void> write(String key, String value) async => values[key] = value;
}

class FailingAdapter implements HttpClientAdapter {
  @override void close({bool force = false}) {}
  @override
  Future<ResponseBody> fetch(RequestOptions options,
      Stream<Uint8List>? requestStream, Future<void>? cancelFuture) async {
    throw DioException(requestOptions: options, type: DioExceptionType.connectionError);
  }
}

Map<String, dynamic> cachedPlan(String marker) => {
  'state': marker, 'currency': 'RUB',
  'snapshot': {
    'safe_to_spend': 1, 'safe_daily_amount': 1,
    'projected_balance_before_next_income': 1,
    'monthly_free_cash_flow': 1, 'minimum_buffer_target': 1,
  },
  'action': {'type': 'review_expense', 'title': marker, 'amount': 1},
  'debt_forecasts': <String, dynamic>{},
};

void main() {
  test('logout prevents account B from reading account A cached plan', () async {
    final storage = MemoryStorage();
    final dio = Dio()..httpClientAdapter = FailingAdapter();
    final api = ApiClient(dio, storage);
    await storage.write('current_user_id', 'account-a');
    await storage.write('cached_plan:account-a', jsonEncode(cachedPlan('account-a')));
    await storage.write('access_token', 'token-a');
    await storage.write('refresh_token', 'refresh-a');

    await api.clearSession();
    expect(await storage.read('cached_plan:account-a'), isNull);
    await storage.write('current_user_id', 'account-b');
    await storage.write('access_token', 'token-b');

    await expectLater(api.plan(), throwsA(isA<ApiError>()));
  });
}
