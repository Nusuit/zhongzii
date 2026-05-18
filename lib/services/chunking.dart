class ChunkRange {
  const ChunkRange({required this.start, required this.endExclusive});

  final int start;
  final int endExclusive;
}

List<ChunkRange> chunkRanges(int total, int chunkSize) {
  if (total <= 0) {
    return const [];
  }
  if (chunkSize <= 0) {
    throw ArgumentError.value(chunkSize, 'chunkSize', 'chunkSize must be > 0');
  }

  final ranges = <ChunkRange>[];
  for (var start = 0; start < total; start += chunkSize) {
    final end = (start + chunkSize > total) ? total : start + chunkSize;
    ranges.add(ChunkRange(start: start, endExclusive: end));
  }
  return ranges;
}
