import 'package:flutter_test/flutter_test.dart';
import 'package:zhongzii_flashcards/services/chunking.dart';

void main() {
  group('chunkRanges', () {
    test('splits total into fixed-size chunks with tail', () {
      final ranges = chunkRanges(1000, 400);

      expect(ranges.length, 3);
      expect(ranges[0].start, 0);
      expect(ranges[0].endExclusive, 400);
      expect(ranges[1].start, 400);
      expect(ranges[1].endExclusive, 800);
      expect(ranges[2].start, 800);
      expect(ranges[2].endExclusive, 1000);
    });

    test('returns empty list for zero items', () {
      expect(chunkRanges(0, 400), isEmpty);
    });

    test('throws for invalid chunk size', () {
      expect(() => chunkRanges(10, 0), throwsArgumentError);
    });
  });
}
