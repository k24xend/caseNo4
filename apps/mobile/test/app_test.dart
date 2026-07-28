import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vyhod/core/api/api_client.dart';
import 'package:vyhod/core/storage/app_storage.dart';
import 'package:vyhod/main.dart';

class MemoryStorage implements AppStorage {
  final values = <String,String>{};
  @override Future<String?> read(String key) async => values[key];
  @override Future<void> write(String key,String value) async { values[key]=value; }
  @override Future<void> delete(String key) async { values.remove(key); }
}
void main(){
  testWidgets('welcome exposes login and demo paths',(tester)async{await tester.pumpWidget(ProviderScope(overrides:[storageProvider.overrideWithValue(MemoryStorage())],child:const VyhodApp()));await tester.pumpAndSettle();expect(find.text('ВЫХОД'),findsOneWidget);expect(find.text('Начать'),findsOneWidget);expect(find.text('Посмотреть демо'),findsOneWidget);});
  testWidgets('start opens explicit login and registration',(tester)async{await tester.pumpWidget(ProviderScope(overrides:[storageProvider.overrideWithValue(MemoryStorage())],child:const VyhodApp()));await tester.pumpAndSettle();await tester.tap(find.text('Начать'));await tester.pumpAndSettle();expect(find.text('Вход'),findsOneWidget);expect(find.text('Создать аккаунт и пройти онбординг'),findsOneWidget);expect(find.byType(TextField),findsNWidgets(2));});
}
