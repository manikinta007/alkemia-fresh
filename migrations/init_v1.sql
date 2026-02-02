
-- 1. DROP TABLES (Reverse Order)
DROP TABLE IF EXISTS task_answers;
DROP TABLE IF EXISTS task_submissions;
DROP TABLE IF EXISTS task_questions;
DROP TABLE IF EXISTS quiz_attempts;
DROP TABLE IF EXISTS quiz_questions;
DROP TABLE IF EXISTS grades;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS class_schedules;
DROP TABLE IF EXISTS teacher_subjects;
DROP TABLE IF EXISTS admin_sessions;
DROP TABLE IF EXISTS student_sessions;
DROP TABLE IF EXISTS class_qr_codes;
DROP TABLE IF EXISTS materials;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS quizzes;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS academic_periods;
DROP TABLE IF EXISTS school_profile;
DROP TABLE IF EXISTS users;

-- 2. CREATE TABLES (Core)
CREATE TABLE users (
    username TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    salt TEXT NOT NULL,
    name TEXT NOT NULL,
    nip TEXT,
    subject TEXT
);

CREATE TABLE teacher_subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    FOREIGN KEY (username) REFERENCES users(username)
);

CREATE TABLE admin_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_token TEXT UNIQUE NOT NULL,
    csrf_token TEXT NOT NULL,
    username TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL
);

CREATE TABLE school_profile (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    headmaster TEXT
);

CREATE TABLE academic_periods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year TEXT NOT NULL,
    semester TEXT NOT NULL,
    is_active INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    show_grades INTEGER DEFAULT 0,
    FOREIGN KEY (period_id) REFERENCES academic_periods(id)
);

CREATE TABLE students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    qr_token TEXT NOT NULL,
    FOREIGN KEY (period_id) REFERENCES academic_periods(id),
    FOREIGN KEY (class_id) REFERENCES classes(id)
);

CREATE TABLE attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE class_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    day INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    subject TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (period_id) REFERENCES academic_periods(id),
    FOREIGN KEY (class_id) REFERENCES classes(id)
);

CREATE TABLE grades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    uh REAL DEFAULT 0,
    uts REAL DEFAULT 0,
    uas REAL DEFAULT 0,
    tugas REAL DEFAULT 0,
    final_grade REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (period_id) REFERENCES academic_periods(id),
    FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT,
    file_type TEXT,
    is_visible INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (period_id) REFERENCES academic_periods(id),
    FOREIGN KEY (class_id) REFERENCES classes(id)
);

CREATE TABLE student_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    device_token TEXT UNIQUE NOT NULL,
    device_info TEXT,
    device_uuid_hash TEXT,
    device_uuid_salt TEXT,
    user_agent TEXT,
    claimed_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_access TEXT DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE class_qr_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    qr_token TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id)
);

CREATE TABLE quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    duration INTEGER DEFAULT 60,
    tolerance_minutes INTEGER DEFAULT 0,
    show_limit INTEGER DEFAULT 0,
    is_random INTEGER DEFAULT 0,
    show_results INTEGER DEFAULT 0,
    scheduled_at TEXT,
    is_active INTEGER DEFAULT 0,
    check_attendance INTEGER DEFAULT 0,
    allowed_students TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (period_id) REFERENCES academic_periods(id),
    FOREIGN KEY (class_id) REFERENCES classes(id)
);

CREATE TABLE quiz_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    option_e TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
);

CREATE TABLE quiz_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    questions_order TEXT,
    student_answers TEXT,
    start_time TEXT,
    finish_time TEXT,
    score REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id),
    FOREIGN KEY (student_id) REFERENCES students(id)
);

-- 3. CREATE TABLES (Tasks Module)
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period_id INTEGER,
    class_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    deadline TEXT,
    target_type TEXT DEFAULT 'all',
    allowed_students TEXT,
    is_active INTEGER DEFAULT 0,
    pg_weight INTEGER DEFAULT 0,
    allow_gallery INTEGER DEFAULT 0,
    discussion_text TEXT,
    discussion_url TEXT,
    show_discussion INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (period_id) REFERENCES academic_periods(id),
    FOREIGN KEY (class_id) REFERENCES classes(id)
);

CREATE TABLE task_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    type TEXT NOT NULL,
    question_text TEXT,
    question_image_url TEXT,
    options TEXT,
    correct_key TEXT,
    char_limit INTEGER DEFAULT 500,
    weight INTEGER DEFAULT 0,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE TABLE task_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    student_id INTEGER,
    grade REAL DEFAULT 0,
    feedback TEXT,
    is_published INTEGER DEFAULT 0,
    is_graded INTEGER DEFAULT 0,
    submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE task_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER,
    question_id INTEGER,
    answer_text TEXT,
    answer_image_url TEXT,
    score REAL DEFAULT 0,
    FOREIGN KEY (submission_id) REFERENCES task_submissions(id),
    FOREIGN KEY (question_id) REFERENCES task_questions(id)
);

-- 4. SEED DATA
INSERT INTO users (username, password, salt, name, nip, subject)
VALUES ('admin', 'b3f67b0616c6ec31ca00a074286c15c93add32fbb6fc8ce2f7051f6b4d4eeabc', '0cb3cc8c8b37c4eb', 'Bapak Guru', '-', 'Kimia');

INSERT INTO teacher_subjects (username, subject_name) VALUES ('admin', 'Kimia');

INSERT INTO school_profile (id, name, address, headmaster)
VALUES (1, 'SMA Harapan Bangsa', 'Jl. Pendidikan No. 1', 'Dr. Kepala Sekolah');

-- Default Active Period (Optional, user can create later)
INSERT INTO academic_periods (year, semester, is_active)
VALUES ('2025/2026', 'Ganjil', 1);
