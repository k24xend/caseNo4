import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vyhod/main.dart';

void main() {
  testWidgets('welcome exposes a real onboarding and demo path', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: VyhodApp()));
    await tester.pumpAndSettle();

    expect(find.text('ВЫХОД'), findsOneWidget);
    expect(find.text('Создать мой план'), findsOneWidget);
    expect(find.text('Посмотреть демо'), findsOneWidget);
  });

  testWidgets('onboarding progresses one question at a time', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: VyhodApp()));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Создать мой план'));
    await tester.pumpAndSettle();

    expect(find.text('Какая у вас базовая валюта?'), findsOneWidget);
    expect(find.text('1 из 6'), findsOneWidget);
    expect(find.byType(LinearProgressIndicator), findsOneWidget);
  });
}

