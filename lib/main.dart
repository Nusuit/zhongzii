import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'app.dart';
import 'controllers/study_controller.dart';
import 'services/local_database.dart';
import 'services/notification_service.dart';
import 'services/study_repository.dart';
import 'services/supabase_service.dart';
import 'services/sync_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await SupabaseService.init();

  final database = LocalDatabase();
  final notificationService = NotificationService();
  final syncService = SyncService(database);
  final repository = StudyRepository(database, syncService: syncService);

  runApp(
    ChangeNotifierProvider(
      create: (_) => StudyController(
        repository: repository,
        notificationService: notificationService,
      )..bootstrap(),
      child: const ZhongziiApp(),
    ),
  );
}
