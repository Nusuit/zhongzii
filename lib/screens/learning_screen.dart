import 'package:flutter/material.dart';

import '../controllers/study_controller.dart';
import '../models/review_models.dart';
import '../theme/app_theme.dart';
import 'flashcard_screen.dart';

class LearningScreen extends StatelessWidget {
  const LearningScreen({super.key, required this.controller});

  final StudyController controller;

  @override
  Widget build(BuildContext context) {
    if (controller.loading) {
      final progress = controller.seedProgress.clamp(0.0, 1.0);
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(value: progress == 0 ? null : progress),
              const SizedBox(height: 12),
              Text('Đang nạp dữ liệu: ${(progress * 100).toStringAsFixed(0)}%'),
            ],
          ),
        ),
      );
    }

    if (controller.error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text('Lỗi khởi tạo dữ liệu: ${controller.error}'),
        ),
      );
    }

    final available = controller.importedLevels.toSet();
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: const [
                Icon(Icons.dataset_linked_rounded, color: AppTheme.blush400),
                SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Dữ liệu từ vựng đã được nạp sẵn trong app.',
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        for (var level = 1; level <= 6; level++)
          Card(
            child: ListTile(
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 8,
              ),
              title: Text('HSK$level'),
              subtitle: Text(
                available.contains(level)
                    ? 'Sẵn sàng học - ${controller.levelWordCounts[level] ?? 0} từ'
                    : 'Chưa có dữ liệu',
              ),
              trailing: Icon(
                available.contains(level)
                    ? Icons.arrow_forward_ios
                    : Icons.lock_outline,
                size: 18,
              ),
              onTap: available.contains(level)
                  ? () => _openStudyModePicker(context, level)
                  : null,
            ),
          ),
      ],
    );
  }

  Future<void> _openStudyModePicker(BuildContext context, int level) async {
    final mode = await showModalBottomSheet<StudyQueueMode>(
      context: context,
      showDragHandle: true,
      builder: (sheetContext) {
        final textTheme = Theme.of(sheetContext).textTheme;
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
                child: Text(
                  'Chọn kiểu học cho HSK$level',
                  style: textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              _StudyModeTile(
                icon: Icons.layers_rounded,
                color: AppTheme.blush400,
                title: 'Học tất cả',
                subtitle: 'Học toàn bộ từ trong HSK$level',
                mode: StudyQueueMode.all,
              ),
              const _StudyModeTile(
                icon: Icons.check_circle_rounded,
                color: AppTheme.known,
                title: 'Đã thuộc',
                subtitle: 'Ôn lại các từ đã nhớ',
                mode: StudyQueueMode.known,
              ),
              const _StudyModeTile(
                icon: Icons.auto_awesome_rounded,
                color: AppTheme.newWord,
                title: 'Từ mới',
                subtitle: 'Học các từ chưa gặp',
                mode: StudyQueueMode.newWords,
              ),
              const _StudyModeTile(
                icon: Icons.help_rounded,
                color: AppTheme.notSure,
                title: 'Chưa chắc',
                subtitle: 'Tập trung các từ đã bấm ?',
                mode: StudyQueueMode.notSure,
              ),
              const _StudyModeTile(
                icon: Icons.cancel_rounded,
                color: AppTheme.notLearned,
                title: 'Không thuộc',
                subtitle: 'Tập trung các từ đã bấm X',
                mode: StudyQueueMode.notLearned,
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );

    if (mode == null || !context.mounted) {
      return;
    }

    Navigator.of(context).pushNamed(
      FlashcardScreen.routeName,
      arguments: FlashcardRouteArgs(level: level, mode: mode),
    );
  }
}

class _StudyModeTile extends StatelessWidget {
  const _StudyModeTile({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
    required this.mode,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;
  final StudyQueueMode mode;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: color),
      title: Text(title),
      subtitle: Text(subtitle),
      onTap: () => Navigator.of(context).pop(mode),
    );
  }
}
