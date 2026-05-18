import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest.dart' as tz;
import 'package:timezone/timezone.dart' as tz;

class NotificationService {
  NotificationService() : _plugin = FlutterLocalNotificationsPlugin();

  final FlutterLocalNotificationsPlugin _plugin;
  bool _isReady = false;

  Future<void> initialize() async {
    if (_isReady) {
      return;
    }

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    await _plugin.initialize(
      const InitializationSettings(android: androidSettings),
    );
    tz.initializeTimeZones();
    tz.setLocalLocation(tz.getLocation('Asia/Ho_Chi_Minh'));

    final android = _plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    await android?.requestNotificationsPermission();

    _isReady = true;
  }

  Future<void> scheduleDaily8amReminder() async {
    await initialize();

    await _plugin.zonedSchedule(
      800,
      'Zhongzii nhắc học bài',
      'Đến giờ ôn tập flashcard HSK hôm nay rồi.',
      _next8am(),
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'daily_study_reminder',
          'Nhắc học hằng ngày',
          channelDescription: 'Nhắc ôn tập flashcard tiếng Trung mỗi ngày',
          importance: Importance.high,
          priority: Priority.high,
        ),
      ),
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      matchDateTimeComponents: DateTimeComponents.time,
    );
  }

  tz.TZDateTime _next8am() {
    final now = tz.TZDateTime.now(tz.local);
    var schedule = tz.TZDateTime(tz.local, now.year, now.month, now.day, 8);
    if (schedule.isBefore(now)) {
      schedule = schedule.add(const Duration(days: 1));
    }
    return schedule;
  }
}
