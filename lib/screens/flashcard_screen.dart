import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../controllers/study_controller.dart';
import '../models/review_models.dart';
import '../theme/app_theme.dart';

class FlashcardRouteArgs {
  const FlashcardRouteArgs({
    required this.level,
    this.mode = StudyQueueMode.all,
  });

  final int level;
  final StudyQueueMode mode;
}

class FlashcardScreen extends StatefulWidget {
  const FlashcardScreen({
    super.key,
    required this.level,
    this.mode = StudyQueueMode.all,
  });

  static const routeName = '/flashcards';
  final int level;
  final StudyQueueMode mode;

  @override
  State<FlashcardScreen> createState() => _FlashcardScreenState();
}

class _FlashcardScreenState extends State<FlashcardScreen> {
  static const double _wordListHeaderExtent = 44;
  static const double _wordListTileExtent = 80;

  bool _showBack = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<StudyController>().startLevel(
        widget.level,
        mode: widget.mode,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<StudyController>();
    final entry = controller.currentCard;

    return Scaffold(
      appBar: AppBar(
        title: Text('HSK${widget.level} - ${widget.mode.shortLabel}'),
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [AppTheme.blush50, AppTheme.blush100],
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: entry == null
              ? const Center(
                  child: Text(
                    'Hôm nay không còn từ đến hạn. Bạn đã hoàn thành rất tốt!',
                    textAlign: TextAlign.center,
                  ),
                )
              : Column(
                  children: [
                    _StatusBadge(
                      entry: entry,
                      positionText: _positionText(controller, entry),
                      onOpenList: () => _openWordList(context, controller),
                    ),
                    const SizedBox(height: 10),
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _showBack = !_showBack),
                        child: AnimatedSwitcher(
                          duration: const Duration(milliseconds: 350),
                          transitionBuilder: (child, animation) {
                            final rotate = Tween<double>(
                              begin: math.pi,
                              end: 0,
                            ).animate(animation);
                            return AnimatedBuilder(
                              animation: rotate,
                              child: child,
                              builder: (context, widgetChild) {
                                final isUnder =
                                    (ValueKey(_showBack) != child.key);
                                var tilt = (animation.value - 0.5).abs() - 0.5;
                                tilt *= isUnder ? -0.003 : 0.003;
                                final value = isUnder
                                    ? math.min(rotate.value, math.pi / 2)
                                    : rotate.value;
                                return Transform(
                                  transform: Matrix4.rotationY(value)
                                    ..setEntry(3, 0, tilt),
                                  alignment: Alignment.center,
                                  child: widgetChild,
                                );
                              },
                            );
                          },
                          child: _showBack
                              ? _CardBack(
                                  key: const ValueKey(true),
                                  hanzi: entry.vocabulary.hanzi,
                                  pinyin: entry.vocabulary.pinyin,
                                  meaning: entry.vocabulary.meaning,
                                  example: entry.vocabulary.example,
                                )
                              : _CardFront(
                                  key: const ValueKey(false),
                                  hanzi: entry.vocabulary.hanzi,
                                ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: _AnswerButton(
                            label: 'Đã thuộc',
                            icon: Icons.check_rounded,
                            color: AppTheme.answerKnown,
                            iconColor: AppTheme.ink,
                            iconSize: 30,
                            onTap: () async {
                              setState(() => _showBack = false);
                              await controller.answerCurrentCard(
                                ReviewAnswer.known,
                              );
                            },
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _AnswerButton(
                            label: 'Chưa chắc',
                            icon: Icons.help_rounded,
                            color: AppTheme.answerNotSure,
                            iconColor: AppTheme.ink,
                            iconSize: 30,
                            onTap: () async {
                              setState(() => _showBack = false);
                              await controller.answerCurrentCard(
                                ReviewAnswer.unknown,
                              );
                            },
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _AnswerButton(
                            label: 'Không thuộc',
                            icon: Icons.close_rounded,
                            color: AppTheme.answerNotLearned,
                            iconColor: Colors.white,
                            iconSize: 30,
                            onTap: () async {
                              setState(() => _showBack = false);
                              await controller.answerCurrentCard(
                                ReviewAnswer.hard,
                              );
                            },
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
        ),
      ),
    );
  }

  String _positionText(StudyController controller, FlashcardEntry entry) {
    final cards = controller.currentPoolCards;
    final index = cards.indexWhere(
      (card) => card.vocabulary.id == entry.vocabulary.id,
    );
    if (cards.isEmpty || index < 0) {
      return '';
    }
    return '${index + 1}/${cards.length}';
  }

  Future<void> _openWordList(
    BuildContext context,
    StudyController controller,
  ) async {
    var didAutoScroll = false;
    final selectedKey = GlobalKey();
    final scrollController = ScrollController(
      initialScrollOffset: _wordListInitialOffset(controller),
    );
    try {
      await showModalBottomSheet<void>(
        context: context,
        showDragHandle: true,
        builder: (sheetContext) {
          return Consumer<StudyController>(
            builder: (context, listController, _) {
              final cards = listController.currentPoolCards;
              final currentId = listController.currentCard?.vocabulary.id;
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (didAutoScroll || currentId == null) {
                  return;
                }
                didAutoScroll = true;
                final selectedContext = selectedKey.currentContext;
                if (selectedContext != null) {
                  Scrollable.ensureVisible(
                    selectedContext,
                    duration: const Duration(milliseconds: 250),
                    alignment: 0.3,
                  );
                }
              });
              return SafeArea(
                child: Stack(
                  children: [
                    ListView.builder(
                      controller: scrollController,
                      physics: const BouncingScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      itemCount: cards.length + 1,
                      itemBuilder: (context, index) {
                        if (index == 0) {
                          return SizedBox(
                            height: _wordListHeaderExtent,
                            child: Padding(
                              padding: const EdgeInsets.fromLTRB(4, 0, 4, 8),
                              child: Align(
                                alignment: Alignment.centerLeft,
                                child: Text(
                                  'Danh sách từ - ${widget.mode.shortLabel}',
                                  style: Theme.of(sheetContext)
                                      .textTheme
                                      .titleMedium
                                      ?.copyWith(fontWeight: FontWeight.w800),
                                ),
                              ),
                            ),
                          );
                        }

                        final card = cards[index - 1];
                        final selected = card.vocabulary.id == currentId;
                        return SizedBox(
                          height: _wordListTileExtent,
                          child: Card(
                            key: selected ? selectedKey : null,
                            margin: const EdgeInsets.symmetric(vertical: 4),
                            color: selected ? AppTheme.blush100 : null,
                            elevation: selected ? 4 : 1,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                              side: BorderSide(
                                color: selected
                                    ? AppTheme.blush400
                                    : AppTheme.blush100,
                              ),
                            ),
                            child: ListTile(
                              dense: true,
                              leading: CircleAvatar(
                                radius: 16,
                                backgroundColor: selected
                                    ? AppTheme.blush400
                                    : AppTheme.blush200,
                                foregroundColor: Colors.white,
                                child: Text('$index'),
                              ),
                              title: Text(
                                card.vocabulary.hanzi,
                                style: TextStyle(
                                  fontWeight: selected
                                      ? FontWeight.w800
                                      : FontWeight.w600,
                                  color: AppTheme.ink,
                                ),
                              ),
                              subtitle: Text(
                                [
                                  card.vocabulary.pinyin,
                                  card.vocabulary.meaning,
                                ].where((part) => part.isNotEmpty).join(' - '),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              trailing: selected
                                  ? const Icon(Icons.play_arrow_rounded)
                                  : null,
                              onTap: () {
                                Navigator.of(sheetContext).pop();
                                setState(() => _showBack = false);
                                listController.jumpToCard(card.vocabulary.id);
                              },
                            ),
                          ),
                        );
                      },
                    ),
                    Positioned(
                      right: 16,
                      bottom: 16,
                      child: Column(
                        children: [
                          _ListJumpButton(
                            tooltip: 'Về đầu danh sách',
                            icon: Icons.keyboard_arrow_up_rounded,
                            onTap: () {
                              if (!scrollController.hasClients) {
                                return;
                              }
                              scrollController.animateTo(
                                0,
                                duration: const Duration(milliseconds: 250),
                                curve: Curves.easeOut,
                              );
                            },
                          ),
                          const SizedBox(height: 10),
                          _ListJumpButton(
                            tooltip: 'Đến cuối danh sách',
                            icon: Icons.keyboard_arrow_down_rounded,
                            onTap: () {
                              if (!scrollController.hasClients) {
                                return;
                              }
                              scrollController.animateTo(
                                scrollController.position.maxScrollExtent,
                                duration: const Duration(milliseconds: 250),
                                curve: Curves.easeOut,
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          );
        },
      );
    } finally {
      scrollController.dispose();
    }
  }

  double _wordListInitialOffset(StudyController controller) {
    final currentId = controller.currentCard?.vocabulary.id;
    if (currentId == null) {
      return 0;
    }
    final index = controller.currentPoolCards.indexWhere(
      (card) => card.vocabulary.id == currentId,
    );
    if (index <= 1) {
      return 0;
    }
    return _wordListHeaderExtent + ((index - 1) * _wordListTileExtent);
  }
}

class _CardFront extends StatelessWidget {
  const _CardFront({super.key, required this.hanzi});

  final String hanzi;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: const Color(0xFFFFF8FA),
      elevation: 3,
      shadowColor: AppTheme.blush200.withValues(alpha: 0.55),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Text(
            hanzi,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.displaySmall?.copyWith(
              fontSize: 88,
              color: AppTheme.ink,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({
    required this.entry,
    required this.positionText,
    required this.onOpenList,
  });

  final FlashcardEntry entry;
  final String positionText;
  final VoidCallback onOpenList;

  @override
  Widget build(BuildContext context) {
    final reviewState = entry.reviewState;
    final label = _labelFor(reviewState);
    final background = _colorFor(reviewState);
    final lapses = reviewState?.lapses ?? 0;
    final subtitle = lapses > 0 ? 'Quên liên tiếp: $lapses' : null;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(14, 8, 8, 8),
      decoration: BoxDecoration(
        color: background.withValues(alpha: 0.17),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: background.withValues(alpha: 0.45)),
      ),
      child: Row(
        children: [
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(
              color: background,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppTheme.ink,
                  ),
                ),
                if (subtitle != null)
                  Text(
                    subtitle,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: const Color(0xFF7A5260),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
              ],
            ),
          ),
          if (positionText.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(right: 4),
              child: Text(
                positionText,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppTheme.ink,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          IconButton(
            tooltip: 'Mở danh sách từ',
            onPressed: onOpenList,
            icon: const Icon(Icons.menu_rounded),
            color: AppTheme.ink,
          ),
        ],
      ),
    );
  }

  String _labelFor(ReviewState? state) {
    if (state == null) {
      return 'Trạng thái: Từ mới';
    }
    if (state.lastQuality >= 4) {
      return 'Trạng thái: Đã thuộc';
    }
    if (state.lastQuality == 3) {
      return 'Trạng thái: Chưa chắc';
    }
    return 'Trạng thái: Chưa thuộc';
  }

  Color _colorFor(ReviewState? state) {
    if (state == null) {
      return AppTheme.newWord;
    }
    if (state.lastQuality >= 4) {
      return AppTheme.known;
    }
    if (state.lastQuality == 3) {
      return AppTheme.notSure;
    }
    return AppTheme.notLearned;
  }
}

class _CardBack extends StatelessWidget {
  const _CardBack({
    super.key,
    required this.hanzi,
    required this.pinyin,
    required this.meaning,
    required this.example,
  });

  final String hanzi;
  final String pinyin;
  final String meaning;
  final String example;

  List<String> _exampleLines() {
    final trimmed = example.trim();
    if (trimmed.isEmpty) {
      return const ['Ví dụ: (không có)'];
    }

    final parts = trimmed
        .split('|')
        .map((part) => part.trim())
        .where((part) => part.isNotEmpty)
        .toList();

    if (parts.length <= 1) {
      final line = parts.isEmpty ? '(không có)' : parts.first;
      return [line.startsWith('Ví dụ:') ? line : 'Ví dụ: $line'];
    }

    return parts;
  }

  @override
  Widget build(BuildContext context) {
    final detailStyle = Theme.of(context).textTheme.titleMedium?.copyWith(
      fontSize: 16,
      fontWeight: FontWeight.w600,
      color: AppTheme.ink,
    );
    final labelStyle = detailStyle?.copyWith(fontWeight: FontWeight.w700);
    final exampleLines = _exampleLines();

    return Card(
      color: const Color(0xFFFFF8FA),
      elevation: 3,
      shadowColor: AppTheme.blush200.withValues(alpha: 0.55),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              hanzi,
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                fontSize: 72,
                fontWeight: FontWeight.w700,
                color: AppTheme.ink,
              ),
            ),
            const SizedBox(height: 12),
            Text.rich(
              TextSpan(
                children: [
                  TextSpan(text: 'Pinyin: ', style: labelStyle),
                  TextSpan(
                    text: pinyin.isEmpty ? '(không có)' : pinyin,
                    style: detailStyle,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Text.rich(
              TextSpan(
                children: [
                  TextSpan(text: 'Nghĩa: ', style: labelStyle),
                  TextSpan(text: meaning, style: detailStyle),
                ],
              ),
            ),
            const SizedBox(height: 12),
            for (var i = 0; i < exampleLines.length; i++)
              Padding(
                padding: EdgeInsets.only(
                  bottom: i == exampleLines.length - 1 ? 0 : 6,
                ),
                child: Text(
                  exampleLines[i],
                  style: detailStyle,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _AnswerButton extends StatelessWidget {
  const _AnswerButton({
    required this.label,
    required this.color,
    required this.icon,
    required this.iconColor,
    required this.iconSize,
    required this.onTap,
  });

  final String label;
  final Color color;
  final IconData icon;
  final Color iconColor;
  final double iconSize;
  final Future<void> Function() onTap;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: label,
      child: Semantics(
        label: label,
        button: true,
        child: FilledButton(
          style: FilledButton.styleFrom(
            backgroundColor: color,
            foregroundColor: iconColor,
            minimumSize: const Size.fromHeight(62),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
            ),
          ),
          onPressed: onTap,
          child: Icon(icon, size: iconSize, color: iconColor),
        ),
      ),
    );
  }
}

class _ListJumpButton extends StatelessWidget {
  const _ListJumpButton({
    required this.tooltip,
    required this.icon,
    required this.onTap,
  });

  final String tooltip;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: AppTheme.blush100,
        shape: const CircleBorder(),
        elevation: 2,
        shadowColor: AppTheme.blush200.withValues(alpha: 0.5),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(6),
            child: Icon(icon, color: AppTheme.ink, size: 22),
          ),
        ),
      ),
    );
  }
}
