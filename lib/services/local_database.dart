import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';

class LocalDatabase {
  Database? _database;

  Future<Database> get instance async {
    if (_database != null) {
      return _database!;
    }

    final documents = await getApplicationDocumentsDirectory();
    final dbPath = p.join(documents.path, 'zhongzii.db');
      _database = await openDatabase(
      dbPath,
      version: 4,
      onCreate: (db, _) async {
        await db.execute('''
          CREATE TABLE vocabularies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            level INTEGER NOT NULL,
            hanzi TEXT NOT NULL,
            pinyin TEXT,
            meaning TEXT NOT NULL,
            example TEXT,
            UNIQUE(level, hanzi, meaning)
          )
        ''');

        await db.execute('''
          CREATE TABLE review_states (
            vocab_id INTEGER PRIMARY KEY,
            repetition INTEGER NOT NULL DEFAULT 0,
            interval_days INTEGER NOT NULL DEFAULT 0,
            ease_factor REAL NOT NULL DEFAULT 2.5,
            due_date TEXT,
            last_reviewed TEXT,
            last_quality INTEGER NOT NULL DEFAULT 0,
            lapses INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY(vocab_id) REFERENCES vocabularies(id) ON DELETE CASCADE
          )
        ''');

        await db.execute('''
          CREATE TABLE study_sessions (
            study_date TEXT PRIMARY KEY,
            reviewed_count INTEGER NOT NULL DEFAULT 0,
            accessed_count INTEGER NOT NULL DEFAULT 0,
            known_count INTEGER NOT NULL DEFAULT 0,
            unknown_count INTEGER NOT NULL DEFAULT 0,
            hard_count INTEGER NOT NULL DEFAULT 0
          )
        ''');
      },
      onUpgrade: (db, oldVersion, newVersion) async {
        if (oldVersion < 2) {
          await db.execute('''
            ALTER TABLE study_sessions
            ADD COLUMN accessed_count INTEGER NOT NULL DEFAULT 0
          ''');
        }
        if (oldVersion < 3) {
          await db.execute('''
            ALTER TABLE review_states
            ADD COLUMN lapses INTEGER NOT NULL DEFAULT 0
          ''');
        }
        if (oldVersion < 4) {
          await db.execute('''
            ALTER TABLE study_sessions
            ADD COLUMN known_count INTEGER NOT NULL DEFAULT 0
          ''');
          await db.execute('''
            ALTER TABLE study_sessions
            ADD COLUMN unknown_count INTEGER NOT NULL DEFAULT 0
          ''');
          await db.execute('''
            ALTER TABLE study_sessions
            ADD COLUMN hard_count INTEGER NOT NULL DEFAULT 0
          ''');
        }
      },
    );

    return _database!;
  }
}
