// StudentCBTOffline.jsx
// Offline Mode CBT Component - ISOLATED FILE
// Does not affect existing StudentCBT.jsx logic

import React, { useState, useEffect, useRef } from 'react';
import { processContentForDisplay, cacheQuestionsImages } from '../../utils/imageUtils';
import { useOfflineQuiz } from '../../hooks/useOfflineQuiz';
import { saveQuizPackage, getQuizPackage, hasQuizPackage } from '../../utils/offlineStorage';

// ========== STYLES ==========
const GlobalCBTStyles = () => (
    <style>{`
    html, body { overscroll-behavior-y: contain; }
    .soal-content img {
      display: block !important; margin: 15px auto !important;
      max-width: 100% !important; max-height: 400px !important;
      height: auto !important; border-radius: 8px; border: 1px solid #e4e4e7;
    }
    .soal-content a { pointer-events: none !important; text-decoration: none !important; color: inherit !important; }
    .soal-content p { margin-bottom: 0.8rem; }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `}</style>
);

// ========== CONNECTION WARNING OVERLAY (RED) ==========
const ConnectionWarning = ({ onDismiss }) => (
    <div className="fixed inset-0 z-[300] bg-red-600 flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-2xl">
            <span className="text-5xl">📶</span>
        </div>
        <h1 className="text-3xl font-black text-white mb-4 uppercase tracking-wide">JARINGAN TERDETEKSI!</h1>
        <p className="text-red-100 text-lg mb-8 max-w-md">
            Matikan WiFi/Data sekarang untuk melanjutkan ujian.
            <br />Pelanggaran ini akan dicatat.
        </p>
        <div className="animate-pulse text-white text-sm font-bold">
            Menunggu jaringan dimatikan...
        </div>
    </div>
);

// ========== TAB SWITCH WARNING (YELLOW - Level 1) ==========
const TabSwitchWarning = ({ isOpen, onClose }) => {
    const [seconds, setSeconds] = useState(5);

    useEffect(() => {
        if (!isOpen) return;
        setSeconds(5);
        const timer = setInterval(() => {
            setSeconds(prev => {
                if (prev <= 1) { clearInterval(timer); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-8 bg-orange-600 text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl animate-bounce">
                <span className="text-4xl">⚠️</span>
            </div>
            <h1 className="text-3xl font-black text-white mb-2 uppercase">PERINGATAN!</h1>
            <p className="text-white/90 text-lg mb-8">
                Anda terdeteksi keluar dari aplikasi.<br />Mohon tetap di layar ujian.
            </p>
            <div className="bg-orange-800/50 p-4 rounded-xl border border-orange-400/30 mb-8">
                <p className="text-white text-sm">
                    Jika keluar 1 kali lagi, ujian akan
                    <br /><span className="font-bold text-yellow-300">LANGSUNG DIKIRIM</span>.
                </p>
            </div>
            <button
                onClick={onClose}
                disabled={seconds > 0}
                className={`w-full max-w-xs py-4 rounded-xl font-black text-lg shadow-lg ${seconds > 0 ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed' : 'bg-white text-orange-600'
                    }`}
            >
                {seconds > 0 ? `Tunggu... (${seconds})` : 'SAYA MENGERTI'}
            </button>
        </div>
    );
};

// ========== QUESTION GRID ==========
const QuestionGrid = ({ isOpen, questions, answers, currentIdx, onJump, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-sm flex flex-col">
            <div className="p-4 pt-safe flex justify-between items-center bg-zinc-900 border-b border-zinc-800">
                <h3 className="font-bold text-lg text-white">Daftar Soal</h3>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-full font-bold text-white">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-5 gap-3">
                    {questions.map((q, idx) => {
                        const isAnswered = answers[q.id] !== undefined;
                        const isCurrent = idx === currentIdx;
                        return (
                            <button
                                key={q.id}
                                onClick={() => onJump(idx)}
                                className={`aspect-square rounded-xl font-bold text-sm flex items-center justify-center transition-all ${isCurrent ? 'bg-white text-black border-2 border-purple-500 scale-105' :
                                    isAnswered ? 'bg-green-600 text-white' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                    }`}
                            >
                                {idx + 1}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// ========== MAIN COMPONENT ==========
export const StudentCBTOffline = ({ quiz, onFinish }) => {
    // States
    const [phase, setPhase] = useState('PREPARING'); // PREPARING, DOWNLOADING, READY, IN_EXAM, FINISHED, SUBMITTING
    const [questions, setQuestions] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [showGrid, setShowGrid] = useState(false);
    const [showTabWarning, setShowTabWarning] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [error, setError] = useState(null);
    const [isStarting, setIsStarting] = useState(false);

    // Refs
    const violationLevel = useRef(0);
    const hasFinishedRef = useRef(false);
    const wasOnlineRef = useRef(false); // Track previous online state

    // Custom hook
    const {
        isOnline,
        timeLeft,
        isTimerRunning,
        startTimer,
        stopTimer,
        durationSeconds,
        answers,
        updateAnswer,
        getFormattedAnswers,
        violations,
        addViolation,
        clearData
    } = useOfflineQuiz(quiz.id, quiz.duration);

    // ========== DOWNLOAD PACKAGE ==========
    useEffect(() => {
        const downloadPackage = async () => {
            try {
                // Check if already cached
                const cached = await getQuizPackage(quiz.id);
                if (cached) {
                    setQuestions(cached.questions);
                    setPhase('READY');
                    return;
                }

                setPhase('DOWNLOADING');
                setDownloadProgress(10);

                const token = localStorage.getItem('student_token');
                const deviceId = localStorage.getItem('student_device_id');

                const res = await fetch(`/api/quiz/${quiz.id}/offline-package`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'X-Device-Id': deviceId
                    }
                });

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || 'Gagal download soal');
                }

                const data = await res.json();
                setDownloadProgress(30);

                // Cache images as base64 for offline display
                const cachedQuestions = await cacheQuestionsImages(data.questions, (progress) => {
                    // Progress from 30% to 90%
                    setDownloadProgress(30 + Math.floor(progress * 60));
                });

                // Save to IndexedDB with cached images
                const packageData = { ...data, questions: cachedQuestions };
                await saveQuizPackage(quiz.id, packageData);
                setDownloadProgress(100);

                setQuestions(cachedQuestions);
                setPhase('READY');
            } catch (e) {
                setError(e.message);
                setPhase('PREPARING');
            }
        };

        downloadPackage();
    }, [quiz.id]);

    // ========== UPDATE STATUS TO SERVER ==========
    const updateStatus = async (status) => {
        try {
            const token = localStorage.getItem('student_token');
            const deviceId = localStorage.getItem('student_device_id');

            await fetch('/api/quiz/offline/status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'X-Device-Id': deviceId
                },
                body: JSON.stringify({ quizId: quiz.id, status })
            });
        } catch (e) {
            console.error('Status update failed:', e);
        }
    };

    // ========== VISIBILITY CHANGE DETECTION ==========
    useEffect(() => {
        if (phase !== 'IN_EXAM' || hasFinishedRef.current) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden' && !hasFinishedRef.current) {
                const level = addViolation('TAB_SWITCH');
                violationLevel.current = level;

                if (level === 1) {
                    setShowTabWarning(true);
                } else if (level >= 2) {
                    // Level 2: Force finish
                    setShowTabWarning(false);
                    handleForceFinish();
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [phase]); // Removed addViolation from deps to prevent re-registration

    // ========== CONNECTION DURING EXAM (only on transition offline→online) ==========
    useEffect(() => {
        if (phase !== 'IN_EXAM' || hasFinishedRef.current) {
            wasOnlineRef.current = isOnline;
            return;
        }

        // Only add violation when transitioning from offline to online
        if (isOnline && !wasOnlineRef.current) {
            // Just log it, don't add to counter that triggers auto-submit
            console.log('Connection detected during exam');
            // Note: We still show the overlay but don't count towards auto-submit
        }

        wasOnlineRef.current = isOnline;
    }, [isOnline, phase]);

    // ========== START EXAM ==========
    const handleStart = () => {
        if (isStarting) return; // Prevent double-click
        setIsStarting(true);

        // Fire-and-forget: don't await network call (we're offline anyway)
        updateStatus('in_exam').catch(() => { });

        // Start immediately without waiting for network
        startTimer();
        setPhase('IN_EXAM');
    };

    // ========== FINISH EXAM (Normal) ==========
    const handleFinish = () => {
        if (hasFinishedRef.current) return;
        hasFinishedRef.current = true;
        stopTimer();
        setPhase('FINISHED');
    };

    // ========== FORCE FINISH (Violation Level 2) ==========
    const handleForceFinish = () => {
        if (hasFinishedRef.current) return;
        hasFinishedRef.current = true;
        stopTimer();
        setPhase('FINISHED');
    };

    // ========== TIMER TIMEOUT ==========
    useEffect(() => {
        if (timeLeft === 0 && isTimerRunning) {
            handleForceFinish();
        }
    }, [timeLeft, isTimerRunning]);

    // ========== SUBMIT ==========
    const handleSubmit = async () => {
        setPhase('SUBMITTING');

        try {
            const token = localStorage.getItem('student_token');
            const deviceId = localStorage.getItem('student_device_id');

            const res = await fetch('/api/quiz/offline/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'X-Device-Id': deviceId
                },
                body: JSON.stringify({
                    quizId: quiz.id,
                    answers: getFormattedAnswers(),
                    durationSeconds,
                    violations
                })
            });

            const data = await res.json();

            if (res.ok) {
                await clearData();
                onFinish();
            } else {
                throw new Error(data.error || 'Gagal mengirim jawaban');
            }
        } catch (e) {
            setError(e.message);
            setPhase('FINISHED');
        }
    };

    // ========== RENDER: PREPARING ==========
    if (phase === 'PREPARING') {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-8 text-center">
                <GlobalCBTStyles />
                <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center mb-6 shadow-xl">
                    <span className="text-4xl">🛫</span>
                </div>
                <h1 className="text-2xl font-black mb-4">Mode Offline</h1>
                {error ? (
                    <>
                        <p className="text-red-400 mb-6">{error}</p>
                        <button onClick={onFinish} className="px-8 py-3 bg-white text-black rounded-xl font-bold">
                            Kembali
                        </button>
                    </>
                ) : (
                    <p className="text-zinc-400 mb-6">Mempersiapkan ujian...</p>
                )}
            </div>
        );
    }

    // ========== RENDER: DOWNLOADING ==========
    if (phase === 'DOWNLOADING') {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-8 text-center">
                <GlobalCBTStyles />
                <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mb-6 shadow-xl animate-pulse">
                    <span className="text-4xl">📥</span>
                </div>
                <h1 className="text-2xl font-black mb-4">Mengunduh Soal...</h1>
                <div className="w-64 h-2 bg-zinc-800 rounded-full overflow-hidden mb-4">
                    <div className="h-full bg-blue-500 transition-all" style={{ width: `${downloadProgress}%` }} />
                </div>
                <p className="text-zinc-500 text-sm">Pastikan koneksi stabil</p>
            </div>
        );
    }

    // ========== RENDER: READY (Waiting Offline) ==========
    if (phase === 'READY') {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-8 text-center">
                <GlobalCBTStyles />
                <div className="w-24 h-24 bg-purple-600 rounded-full flex items-center justify-center mb-6 shadow-xl">
                    <span className="text-5xl">✈️</span>
                </div>
                <h1 className="text-2xl font-black mb-2">Matikan Jaringan</h1>
                <p className="text-zinc-400 mb-8 max-w-sm">
                    Aktifkan <strong className="text-purple-400">Mode Pesawat</strong> atau matikan WiFi/Data untuk memulai ujian.
                </p>

                <div className={`w-full max-w-xs p-4 rounded-xl mb-8 ${isOnline ? 'bg-red-900/50 border border-red-700' : 'bg-green-900/50 border border-green-700'}`}>
                    <div className="flex items-center justify-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                        <span className={`font-bold ${isOnline ? 'text-red-400' : 'text-green-400'}`}>
                            {isOnline ? 'Jaringan Aktif' : 'Jaringan Mati ✓'}
                        </span>
                    </div>
                </div>

                <button
                    onClick={handleStart}
                    disabled={isOnline || isStarting}
                    className={`w-full max-w-xs py-4 rounded-xl font-black text-lg shadow-lg transition ${isOnline || isStarting ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-white text-black hover:scale-105 active:scale-95'
                        }`}
                >
                    {isStarting ? 'Memulai...' : isOnline ? 'Matikan Jaringan Dulu' : 'MULAI UJIAN →'}
                </button>

                <button onClick={onFinish} className="mt-4 text-zinc-500 hover:text-white text-sm font-bold">
                    ← Batal
                </button>
            </div>
        );
    }

    // ========== RENDER: IN_EXAM ==========
    if (phase === 'IN_EXAM') {
        const q = questions[currentIdx];
        const myAns = answers[q?.id];

        // Show connection warning overlay
        if (isOnline) {
            return <ConnectionWarning />;
        }

        return (
            <div className="flex flex-col h-full bg-white text-black font-sans">
                <GlobalCBTStyles />
                <TabSwitchWarning isOpen={showTabWarning} onClose={() => setShowTabWarning(false)} />
                <QuestionGrid
                    isOpen={showGrid}
                    questions={questions}
                    answers={answers}
                    currentIdx={currentIdx}
                    onJump={(idx) => { setCurrentIdx(idx); setShowGrid(false); }}
                    onClose={() => setShowGrid(false)}
                />

                {/* TOP BAR */}
                <div className="bg-purple-900 text-white p-4 pt-safe flex justify-between items-center shadow-md z-10 sticky top-0">
                    <div className="text-xs">
                        <p className="text-purple-300 font-bold uppercase tracking-wider">Soal No</p>
                        <p className="text-2xl font-black leading-none">{currentIdx + 1} <span className="text-purple-400 text-base font-normal">/ {questions.length}</span></p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-[10px] text-purple-300 font-bold uppercase tracking-widest">Sisa Waktu</p>
                            <p className={`text-xl font-mono font-bold ${timeLeft < 300 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                            </p>
                        </div>
                        <button onClick={() => setShowGrid(true)} className="w-10 h-10 bg-purple-800 rounded-xl flex items-center justify-center hover:bg-purple-700">
                            <span className="text-xl">☷</span>
                        </button>
                    </div>
                </div>

                {/* OFFLINE INDICATOR */}
                <div className="bg-purple-100 px-4 py-2 flex items-center justify-center gap-2 text-purple-800 text-xs font-bold border-b border-purple-200">
                    <span>✈️</span> Mode Offline Aktif
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 bg-zinc-50">
                    {q && (
                        <>
                            <div className="soal-content text-lg font-medium leading-relaxed mb-8" dangerouslySetInnerHTML={{ __html: processContentForDisplay(q.question_text) }} />
                            <div className="space-y-3 pb-20">
                                {['A', 'B', 'C', 'D', 'E'].map(opt => {
                                    const text = q['option_' + opt.toLowerCase()];
                                    if (!text) return null;
                                    const isSelected = myAns === opt;
                                    return (
                                        <button
                                            key={opt}
                                            onClick={() => updateAnswer(q.id, opt)}
                                            className={`w-full text-left p-4 rounded-xl border-2 transition-all flex gap-4 items-start ${isSelected ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-600' : 'border-zinc-200 bg-white hover:bg-zinc-100'
                                                }`}
                                        >
                                            <span className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg font-bold text-sm shadow-sm ${isSelected ? 'bg-purple-600 text-white' : 'bg-zinc-100 text-zinc-500'}`}>{opt}</span>
                                            <span className="py-0.5 w-full soal-content text-base text-zinc-700" dangerouslySetInnerHTML={{ __html: processContentForDisplay(text) }} />
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* BOTTOM BAR */}
                <div className="p-4 pb-safe bg-white border-t border-zinc-200 flex gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                    <button
                        onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                        disabled={currentIdx === 0}
                        className="px-6 py-3 rounded-xl font-bold border-2 border-zinc-200 text-zinc-500 disabled:opacity-30"
                    >
                        ←
                    </button>
                    {currentIdx === questions.length - 1 ? (
                        <button onClick={handleFinish} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-black text-lg shadow-lg hover:bg-green-700 active:scale-95">
                            SELESAI ✓
                        </button>
                    ) : (
                        <button onClick={() => setCurrentIdx(Math.min(questions.length - 1, currentIdx + 1))} className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-purple-700 active:scale-95">
                            SELANJUTNYA →
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // ========== RENDER: FINISHED (Waiting Online to Submit) ==========
    if (phase === 'FINISHED') {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-8 text-center">
                <GlobalCBTStyles />
                <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center mb-6 shadow-xl">
                    <span className="text-5xl">✅</span>
                </div>
                <h1 className="text-2xl font-black mb-2">Ujian Selesai!</h1>
                <p className="text-zinc-400 mb-8 max-w-sm">
                    Aktifkan <strong className="text-green-400">WiFi/Data</strong> untuk mengirim jawaban ke server.
                </p>

                {error && <p className="text-red-400 mb-4 text-sm">{error}</p>}

                <div className={`w-full max-w-xs p-4 rounded-xl mb-8 ${!isOnline ? 'bg-red-900/50 border border-red-700' : 'bg-green-900/50 border border-green-700'}`}>
                    <div className="flex items-center justify-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${!isOnline ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                        <span className={`font-bold ${!isOnline ? 'text-red-400' : 'text-green-400'}`}>
                            {!isOnline ? 'Jaringan Mati' : 'Jaringan Aktif ✓'}
                        </span>
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={!isOnline}
                    className={`w-full max-w-xs py-4 rounded-xl font-black text-lg shadow-lg transition ${!isOnline ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-white text-black hover:scale-105 active:scale-95'
                        }`}
                >
                    {!isOnline ? 'Aktifkan Jaringan Dulu' : 'KIRIM JAWABAN →'}
                </button>

                <p className="text-zinc-600 text-xs mt-4">
                    Waktu: {Math.floor(durationSeconds / 60)}m {durationSeconds % 60}s
                    {violations.length > 0 && <span className="text-red-400 ml-2">• {violations.length} pelanggaran</span>}
                </p>
            </div>
        );
    }

    // ========== RENDER: SUBMITTING ==========
    if (phase === 'SUBMITTING') {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-8 text-center">
                <GlobalCBTStyles />
                <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mb-6 shadow-xl animate-pulse">
                    <span className="text-4xl">📤</span>
                </div>
                <h1 className="text-2xl font-black mb-4">Mengirim Jawaban...</h1>
                <p className="text-zinc-500 text-sm">Mohon tunggu</p>
            </div>
        );
    }

    return null;
};

export default StudentCBTOffline;
