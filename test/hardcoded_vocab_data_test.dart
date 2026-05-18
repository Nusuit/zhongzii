import 'package:flutter_test/flutter_test.dart';
import 'package:zhongzii_flashcards/data/hsk_vocab_data.dart';

void main() {
  group('Hardcoded vocabulary data', () {
    test('contains data and covers all HSK levels', () {
      expect(hardcodedVocabulary, isNotEmpty);

      final levels = hardcodedVocabulary.map((e) => e.level).toSet();
      expect(levels, equals({1, 2, 3, 4, 5, 6}));
    });

    test('every record has mandatory text fields', () {
      for (final record in hardcodedVocabulary) {
        expect(record.hanzi.trim(), isNotEmpty);
        expect(record.meaning.trim(), isNotEmpty);
      }
    });
  });
}
