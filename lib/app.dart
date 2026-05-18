import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'controllers/study_controller.dart';
import 'screens/dashboard_screen.dart';
import 'screens/flashcard_screen.dart';
import 'screens/learning_screen.dart';
import 'theme/app_theme.dart';

class ZhongziiApp extends StatelessWidget {
  const ZhongziiApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Zhongzii Flashcards',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const HomeShell(),
      routes: {
        FlashcardScreen.routeName: (context) {
          final arguments = ModalRoute.of(context)?.settings.arguments;
          if (arguments is FlashcardRouteArgs) {
            return FlashcardScreen(
              level: arguments.level,
              mode: arguments.mode,
            );
          }
          final level = arguments as int;
          return FlashcardScreen(level: level);
        },
      },
    );
  }
}

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<StudyController>();

    final pages = [
      DashboardScreen(controller: controller),
      LearningScreen(controller: controller),
    ];

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFFFFE5EC), Color(0xFFFFC2D1)],
          ),
        ),
        child: SafeArea(child: pages[_index]),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (index) => setState(() => _index = index),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Tổng quan',
          ),
          NavigationDestination(
            icon: Icon(Icons.menu_book_outlined),
            selectedIcon: Icon(Icons.menu_book),
            label: 'Học tập',
          ),
        ],
      ),
    );
  }
}
