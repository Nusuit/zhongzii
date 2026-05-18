import 'package:flutter_test/flutter_test.dart';
import 'package:zhongzii_flashcards/models/review_models.dart';

void main() {
  group('StudyQueueModeText', () {
    test('labels are not empty for all modes', () {
      for (final mode in StudyQueueMode.values) {
        expect(mode.label, isNotEmpty);
        expect(mode.shortLabel, isNotEmpty);
      }
    });
  });
}
