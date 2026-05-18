import 'package:flutter/material.dart';

import '../controllers/study_controller.dart';
import '../models/review_models.dart';
import '../theme/app_theme.dart';
import 'flashcard_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key, required this.controller});

  final StudyController controller;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Future<void> _openStudyFromLegend(StudyQueueMode mode) async {
    final controller = widget.controller;
    if (controller.importedLevels.isEmpty) {
      return;
    }

    int? level = controller.selectedDashboardLevel;
    level ??= await showModalBottomSheet<int>(
      context: context,
      showDragHandle: true,
      builder: (sheetContext) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
                child: Text(
                  'Chọn cấp độ để học ${mode.label}',
                  style: Theme.of(sheetContext).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              ...controller.importedLevels.map(
                (itemLevel) => ListTile(
                  leading: const Icon(Icons.menu_book_rounded),
                  title: Text('HSK$itemLevel'),
                  onTap: () => Navigator.of(sheetContext).pop(itemLevel),
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );

    if (level == null || !mounted) {
      return;
    }

    Navigator.of(context).pushNamed(
      FlashcardScreen.routeName,
      arguments: FlashcardRouteArgs(level: level, mode: mode),
    );
  }

  @override
  Widget build(BuildContext context) {
    final controller = widget.controller;
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
              Text(
                'Đang khởi tạo dữ liệu: ${(progress * 100).toStringAsFixed(0)}%',
              ),
            ],
          ),
        ),
      );
    }

    if (controller.error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text('Lỗi: ${controller.error}'),
        ),
      );
    }

    final stats = controller.stats;
    final totalWords =
        stats.known + stats.unknown + stats.hard + stats.newWords;
    final legendItems = <_LegendItemData>[
      _LegendItemData(
        label: 'Đã thuộc',
        value: stats.known,
        color: AppTheme.known,
        studyMode: StudyQueueMode.known,
      ),
      _LegendItemData(
        label: 'Không thuộc',
        value: stats.hard,
        color: AppTheme.notLearned,
        studyMode: StudyQueueMode.notLearned,
      ),
      _LegendItemData(
        label: 'Chưa chắc',
        value: stats.unknown,
        color: AppTheme.notSure,
        studyMode: StudyQueueMode.notSure,
      ),
      _LegendItemData(
        label: 'Từ mới',
        value: stats.newWords,
        color: AppTheme.newWord,
        studyMode: StudyQueueMode.newWords,
      ),
    ];

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      children: [
        _FilterCard(
          importedLevels: controller.importedLevels,
          selectedLevel: controller.selectedDashboardLevel,
          onChanged: (value) => controller.updateDashboardLevel(value),
        ),
        const SizedBox(height: 12),
        _OverviewCard(
          totalWords: totalWords,
          items: legendItems,
          onStudyModeTap: _openStudyFromLegend,
        ),
        const SizedBox(height: 12),
        _ProgressCard(activity: stats.activity),
      ],
    );
  }
}

class _FilterCard extends StatelessWidget {
  const _FilterCard({
    required this.importedLevels,
    required this.selectedLevel,
    required this.onChanged,
  });

  final List<int> importedLevels;
  final int? selectedLevel;
  final ValueChanged<int?> onChanged;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        child: DropdownButtonHideUnderline(
          child: DropdownButton<int?>(
            value: selectedLevel,
            isExpanded: true,
            borderRadius: BorderRadius.circular(14),
            items: [
              const DropdownMenuItem<int?>(
                value: null,
                child: Text('Tất cả cấp độ'),
              ),
              ...importedLevels.map(
                (level) => DropdownMenuItem<int?>(
                  value: level,
                  child: Text('HSK$level'),
                ),
              ),
            ],
            onChanged: onChanged,
          ),
        ),
      ),
    );
  }
}

class _OverviewCard extends StatelessWidget {
  const _OverviewCard({
    required this.totalWords,
    required this.items,
    required this.onStudyModeTap,
  });

  final int totalWords;
  final List<_LegendItemData> items;
  final ValueChanged<StudyQueueMode> onStudyModeTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFFFF8FA),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppTheme.blush100),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            SizedBox(
              width: 122,
              height: 122,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  CustomPaint(
                    size: const Size.square(122),
                    painter: _DonutPainter(items: items),
                  ),
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '$totalWords',
                        style: Theme.of(context).textTheme.headlineMedium
                            ?.copyWith(
                              color: AppTheme.ink,
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      Text(
                        'từ',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: const Color(0xFF7A5260),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                children: items
                    .map(
                      (item) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        child: _LegendItem(
                          item: item,
                          onStudyModeTap: onStudyModeTap,
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LegendItemData {
  const _LegendItemData({
    required this.label,
    required this.value,
    required this.color,
    this.studyMode,
  });

  final String label;
  final int value;
  final Color color;
  final StudyQueueMode? studyMode;
}

class _LegendItem extends StatelessWidget {
  const _LegendItem({required this.item, required this.onStudyModeTap});

  final _LegendItemData item;
  final ValueChanged<StudyQueueMode> onStudyModeTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => onStudyModeTap(item.studyMode!),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: item.color,
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: Text(
                  '${item.value}',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  '${item.label}  >',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: AppTheme.ink,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DonutPainter extends CustomPainter {
  _DonutPainter({required this.items});

  final List<_LegendItemData> items;

  @override
  void paint(Canvas canvas, Size size) {
    final stroke = 16.0;
    final center = size.center(Offset.zero);
    final radius = (size.shortestSide - stroke) / 2;
    final rect = Rect.fromCircle(center: center, radius: radius);
    final total = items.fold<int>(0, (sum, item) => sum + item.value);

    final basePaint = Paint()
      ..color = AppTheme.blush100.withValues(alpha: 0.55)
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(rect, 0, 6.28318, false, basePaint);

    if (total == 0) {
      return;
    }

    const gap = 0.08;
    var start = -1.5708;

    for (final item in items) {
      if (item.value <= 0) {
        continue;
      }
      final sweep = (item.value / total) * (6.28318 - (gap * items.length));
      final paint = Paint()
        ..color = item.color
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..strokeCap = StrokeCap.round;
      canvas.drawArc(rect, start, sweep, false, paint);
      start += sweep + gap;
    }
  }

  @override
  bool shouldRepaint(covariant _DonutPainter oldDelegate) {
    return oldDelegate.items != items;
  }
}

class _ProgressCard extends StatefulWidget {
  const _ProgressCard({required this.activity});

  final List<StudyActivityPoint> activity;

  @override
  State<_ProgressCard> createState() => _ProgressCardState();
}

class _ProgressCardState extends State<_ProgressCard> {
  static const List<int> _rangeOptions = [5, 7, 14];
  int _selectedDays = 5;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final normalizedNow = DateTime(now.year, now.month, now.day);
    final byDate = <DateTime, StudyActivityPoint>{
      for (final entry in widget.activity)
        DateTime(entry.date.year, entry.date.month, entry.date.day): entry,
    };
    final todayPoint = byDate[normalizedNow];
    final today = _ActivityDay(
      date: normalizedNow,
      reviewedCount: todayPoint?.reviewedCount ?? 0,
      accessedCount: todayPoint?.accessedCount ?? 0,
      knownCount: todayPoint?.knownCount ?? 0,
      unknownCount: todayPoint?.unknownCount ?? 0,
      hardCount: todayPoint?.hardCount ?? 0,
    );
    final todayTotal = today.knownCount + today.unknownCount + today.hardCount;
    final todayDisplayTotal =
        todayTotal == 0 ? today.reviewedCount : todayTotal;

    final days = List<_ActivityDay>.generate(_selectedDays, (index) {
      final date = normalizedNow.subtract(
        Duration(days: (_selectedDays - 1) - index),
      );
      final point = byDate[date];
      return _ActivityDay(
        date: date,
        reviewedCount: point?.reviewedCount ?? 0,
        accessedCount: point?.accessedCount ?? 0,
        knownCount: point?.knownCount ?? 0,
        unknownCount: point?.unknownCount ?? 0,
        hardCount: point?.hardCount ?? 0,
      );
    });

    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Hôm nay',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
                color: AppTheme.ink,
              ),
            ),
            const SizedBox(height: 8),
            _TodaySummary(
              day: today,
              displayTotal: todayDisplayTotal,
            ),
            const SizedBox(height: 12),
            Text(
              '$_selectedDays ngày gần nhất',
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(color: const Color(0xFF7A5260)),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: _rangeOptions
                  .map(
                    (daysOption) => ChoiceChip(
                      label: Text('$daysOption ngày'),
                      selected: _selectedDays == daysOption,
                      onSelected: (_) =>
                          setState(() => _selectedDays = daysOption),
                    ),
                  )
                  .toList(),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 170,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: days
                    .map(
                      (day) => Expanded(
                        child: _ProgressBar(day: day),
                      ),
                    )
                    .toList(),
              ),
            ),
            const SizedBox(height: 10),
            const Row(
              children: [
                _LegendDot(color: AppTheme.known, label: 'Đã thuộc'),
                SizedBox(width: 14),
                _LegendDot(color: AppTheme.notSure, label: 'Chưa chắc'),
                SizedBox(width: 14),
                _LegendDot(color: AppTheme.notLearned, label: 'Không thuộc'),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _TodaySummary extends StatelessWidget {
  const _TodaySummary({
    required this.day,
    required this.displayTotal,
  });

  final _ActivityDay day;
  final int displayTotal;

  @override
  Widget build(BuildContext context) {
    const barHeight = 92.0;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF8FA),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.blush100),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          SizedBox(
            width: 26,
            height: barHeight,
            child: Stack(
              alignment: Alignment.bottomCenter,
              children: [
                Container(
                  width: 16,
                  height: barHeight,
                  decoration: BoxDecoration(
                    color: AppTheme.blush100.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(9),
                  ),
                ),
                _StackedBar(
                  height: barHeight,
                  day: day,
                  fallbackTotal: displayTotal,
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Tổng: $displayTotal từ',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: AppTheme.ink,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 6),
                _TodayStatRow(
                  color: AppTheme.known,
                  label: 'Đã thuộc',
                  value: day.knownCount,
                ),
                const SizedBox(height: 4),
                _TodayStatRow(
                  color: AppTheme.notSure,
                  label: 'Chưa chắc',
                  value: day.unknownCount,
                ),
                const SizedBox(height: 4),
                _TodayStatRow(
                  color: AppTheme.notLearned,
                  label: 'Không thuộc',
                  value: day.hardCount,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TodayStatRow extends StatelessWidget {
  const _TodayStatRow({
    required this.color,
    required this.label,
    required this.value,
  });

  final Color color;
  final String label;
  final int value;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Text(
          '$label: $value',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: const Color(0xFF7A5260),
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

class _ActivityDay {
  const _ActivityDay({
    required this.date,
    required this.reviewedCount,
    required this.accessedCount,
    required this.knownCount,
    required this.unknownCount,
    required this.hardCount,
  });

  final DateTime date;
  final int reviewedCount;
  final int accessedCount;
  final int knownCount;
  final int unknownCount;
  final int hardCount;
}

class _ProgressBar extends StatelessWidget {
  const _ProgressBar({required this.day});

  final _ActivityDay day;

  @override
  Widget build(BuildContext context) {
    final total = day.knownCount + day.unknownCount + day.hardCount;
    final displayTotal = total == 0 ? day.reviewedCount : total;
    final height = displayTotal == 0 ? 6.0 : 118.0;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 2),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          Text(
            displayTotal == 0 ? '' : '$displayTotal',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: AppTheme.ink,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          SizedBox(
            height: 118,
            child: Stack(
              alignment: Alignment.bottomCenter,
              children: [
                Container(
                  width: 16,
                  height: 118,
                  decoration: BoxDecoration(
                    color: AppTheme.blush100.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(9),
                  ),
                ),
                _StackedBar(
                  height: height,
                  day: day,
                  fallbackTotal: displayTotal,
                ),
              ],
            ),
          ),
          const SizedBox(height: 6),
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: day.accessedCount > 0
                  ? AppTheme.blush400
                  : AppTheme.blush100,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '${day.date.day}',
            style: Theme.of(
              context,
            ).textTheme.bodySmall?.copyWith(color: const Color(0xFF8A5A69)),
          ),
        ],
      ),
    );
  }
}

class _StackedBar extends StatelessWidget {
  const _StackedBar({
    required this.height,
    required this.day,
    required this.fallbackTotal,
  });

  final double height;
  final _ActivityDay day;
  final int fallbackTotal;

  @override
  Widget build(BuildContext context) {
    final barHeight = height < 8 ? 8.0 : height;
    final total = day.knownCount + day.unknownCount + day.hardCount;
    if (fallbackTotal == 0) {
      return AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        width: 16,
        height: 6,
        decoration: BoxDecoration(
          color: AppTheme.blush100,
          borderRadius: BorderRadius.circular(9),
        ),
      );
    }

    if (total == 0) {
      return AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        width: 16,
        height: barHeight,
        decoration: BoxDecoration(
          color: AppTheme.blush200,
          borderRadius: BorderRadius.circular(9),
        ),
      );
    }

    final segments = [
      (count: day.knownCount, color: AppTheme.known),
      (count: day.unknownCount, color: AppTheme.notSure),
      (count: day.hardCount, color: AppTheme.notLearned),
    ].where((item) => item.count > 0).toList();

    if (segments.isEmpty) {
      return AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        width: 16,
        height: barHeight,
        decoration: BoxDecoration(
          color: AppTheme.blush200,
          borderRadius: BorderRadius.circular(9),
        ),
      );
    }

    const minSegmentHeight = 6.0;
    final totalCount = segments.fold<int>(0, (sum, item) => sum + item.count);
    final available = barHeight - (minSegmentHeight * segments.length);
    final usable = available < 0 ? 0.0 : available;

    final heights = segments
        .map(
          (segment) => minSegmentHeight +
              (totalCount == 0 ? 0 : (segment.count / totalCount) * usable),
        )
        .toList();

    final sumHeights = heights.fold<double>(0, (sum, value) => sum + value);
    if (sumHeights != barHeight) {
      var maxIndex = 0;
      for (var i = 1; i < heights.length; i++) {
        if (heights[i] > heights[maxIndex]) {
          maxIndex = i;
        }
      }
      heights[maxIndex] = (heights[maxIndex] + (barHeight - sumHeights))
          .clamp(minSegmentHeight, barHeight);
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(9),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        width: 16,
        height: barHeight,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            for (var i = 0; i < segments.length; i++)
              SizedBox(
                height: heights[i],
                width: double.infinity,
                child: ColoredBox(color: segments[i].color),
              ),
          ],
        ),
      ),
    );
  }
}

class _LegendDot extends StatelessWidget {
  const _LegendDot({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: const Color(0xFF7A5260),
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
