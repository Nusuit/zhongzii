class QueueCandidate {
  const QueueCandidate({
    required this.vocabId,
    required this.dueDate,
  });

  final int vocabId;
  final DateTime? dueDate;
}

class QueueSelector {
  QueueCandidate? nextCandidate({
    required List<QueueCandidate> candidates,
    required Set<int> seenVocabIds,
    required DateTime now,
  }) {
    final today = DateTime(now.year, now.month, now.day);
    final due = candidates.where((item) {
      if (seenVocabIds.contains(item.vocabId)) {
        return false;
      }
      if (item.dueDate == null) {
        return true;
      }
      final dateOnly = DateTime(item.dueDate!.year, item.dueDate!.month, item.dueDate!.day);
      return !dateOnly.isAfter(today);
    }).toList();

    if (due.isEmpty) {
      return null;
    }

    due.sort((a, b) {
      if (a.dueDate == null && b.dueDate != null) return 1;
      if (a.dueDate != null && b.dueDate == null) return -1;
      if (a.dueDate == null && b.dueDate == null) return a.vocabId.compareTo(b.vocabId);
      final cmp = a.dueDate!.compareTo(b.dueDate!);
      if (cmp != 0) return cmp;
      return a.vocabId.compareTo(b.vocabId);
    });

    return due.first;
  }
}
