import 'package:flutter/material.dart';

abstract final class AppTokens {
  static const space = 16.0;
  static const radius = 20.0;
  static const seed = Color(0xff6842d9);
}

abstract final class AppTheme {
  static ThemeData light = _make(Brightness.light);
  static ThemeData dark = _make(Brightness.dark);
  static ThemeData _make(Brightness brightness) => ThemeData(
    brightness: brightness,
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(seedColor: AppTokens.seed, brightness: brightness),
    cardTheme: const CardThemeData(margin: EdgeInsets.symmetric(vertical: 8), elevation: 0),
    inputDecorationTheme: const InputDecorationTheme(border: OutlineInputBorder()),
  );
}
