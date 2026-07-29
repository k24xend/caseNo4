import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vyhod/main.dart';

void main() {
  testWidgets('welcome exposes a real onboarding and demo path', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: VyhodApp()));
    await tester.pumpAndSettle();

    expect(find.text('ВЫХОД'), findsOneWidget);
    expect(find.text('Создать аккаунт'), findsOneWidget);
    expect(find.text('У меня есть аккаунт'), findsOneWidget);
    expect(find.text('Посмотреть демо'), findsOneWidget);
  });

  testWidgets('registration is required before onboarding', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: VyhodApp()));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Создать аккаунт'));
    await tester.pumpAndSettle();

    expect(find.text('Регистрация'), findsOneWidget);
    expect(find.text('Email'), findsOneWidget);
    expect(find.text('Пароль'), findsOneWidget);
  });
}
