class VocabularyItem {
  const VocabularyItem({
    required this.id,
    required this.level,
    required this.hanzi,
    required this.pinyin,
    required this.meaning,
    required this.example,
  });

  final int id;
  final int level;
  final String hanzi;
  final String pinyin;
  final String meaning;
  final String example;
}
