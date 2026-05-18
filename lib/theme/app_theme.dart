import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static const blush50 = Color(0xFFFFE5EC);
  static const blush100 = Color(0xFFFFC2D1);
  static const blush200 = Color(0xFFFFB3C6);
  static const blush300 = Color(0xFFFF8FAB);
  static const blush400 = Color(0xFFFB6F92);
  static const ink = Color(0xFF39242B);

  static const known = Color(0xFF38B48B);
  static const notSure = Color(0xFFF6C75E);
  static const notLearned = blush400;
  static const newWord = Color(0xFFC879FF);

  static const answerKnown = blush200;
  static const answerNotSure = blush300;
  static const answerNotLearned = blush400;

  static ThemeData get lightTheme {
    final baseTextTheme = GoogleFonts.plusJakartaSansTextTheme();

    return ThemeData(
      colorScheme: ColorScheme.fromSeed(
        seedColor: blush300,
        brightness: Brightness.light,
        primary: blush400,
        secondary: blush300,
        surface: const Color(0xFFFFF8FA),
        error: blush400,
      ),
      scaffoldBackgroundColor: blush50,
      textTheme: baseTextTheme
          .apply(
            bodyColor: ink,
            displayColor: ink,
          )
          .copyWith(
            headlineMedium: baseTextTheme.headlineMedium?.copyWith(
              fontSize: 24,
              fontWeight: FontWeight.w700,
            ),
            headlineSmall: baseTextTheme.headlineSmall?.copyWith(fontSize: 20),
            titleLarge: baseTextTheme.titleLarge?.copyWith(fontSize: 19),
            titleMedium: baseTextTheme.titleMedium?.copyWith(fontSize: 15),
            bodyMedium: baseTextTheme.bodyMedium?.copyWith(fontSize: 13),
            bodySmall: baseTextTheme.bodySmall?.copyWith(fontSize: 11),
          ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: ink,
      ),
      cardTheme: CardThemeData(
        color: const Color(0xFFFFF8FA),
        elevation: 3,
        shadowColor: blush200.withValues(alpha: 0.55),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: blush100),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: blush50,
        selectedColor: blush300,
        side: const BorderSide(color: blush100),
        labelStyle: const TextStyle(
          color: ink,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: blush400,
          foregroundColor: Colors.white,
          textStyle: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: Color(0xFFFFF8FA),
        surfaceTintColor: Color(0xFFFFF8FA),
      ),
      useMaterial3: true,
    );
  }
}
