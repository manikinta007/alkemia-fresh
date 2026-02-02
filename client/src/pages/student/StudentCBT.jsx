import React, { useState, useEffect, useRef } from 'react';

// --- GLOBAL STYLES (Injected as component) ---
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

// --- COMPONENT: CUSTOM ALERT ---
export const CustomAlert = ({ isOpen, title, message, type = 'info', onClose }) => {
    if (!isOpen) return null;

    let icon = "ℹ️";
    let colorClass = "bg-blue-600";
    let btnClass = "bg-blue-600 hover:bg-blue-700";

    if (type === 'error') { icon = "⛔"; colorClass = "bg-red-600"; btnClass = "bg-red-600 hover:bg-red-700"; }
    if (type === 'success') { icon = "✅"; colorClass = "bg-green-600"; btnClass = "bg-green-600 hover:bg-green-700"; }
    if (type === 'warning') { icon = "⚠️"; colorClass = "bg-orange-600"; btnClass = "bg-orange-600 hover:bg-orange-700"; }

    return (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-lg ${colorClass} text-white`}>
                    {icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                <p className="text-zinc-400 text-sm mb-6 leading-relaxed">{message}</p>
                <button onClick={onClose} className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition active:scale-95 ${btnClass}`}>
                    MENGERTI
                </button>
            </div>
        </div>
    );
};

// --- MODAL: WARNING (TIMER 5 DETIK) ---
const WarningModal = ({ isOpen, onClose }) => {
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
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-8 bg-orange-600 animate-in fade-in duration-200 text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl animate-bounce"><span className="text-4xl">⚠️</span></div>
            <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-wide">PERINGATAN!</h1>
            <p className="text-white/90 text-lg font-medium mb-8">Anda terdeteksi keluar dari aplikasi.<br />Mohon tetap di layar ujian.</p>
            <div className="bg-orange-800/50 p-4 rounded-xl border border-orange-400/30 mb-8 w-full max-w-xs">
                <p className="text-white text-sm">Jika keluar 1 kali lagi, ujian akan<br /><span className="font-bold text-yellow-300">DIHENTIKAN OTOMATIS</span>.</p>
            </div>
            <button
                onClick={onClose}
                disabled={seconds > 0}
                className={`w-full max-w-xs py-4 rounded-xl font-black text-lg shadow-lg transition-all ${seconds > 0 ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed' : 'bg-white text-orange-600 active:scale-95'}`}
            >
                {seconds > 0 ? `Tunggu... (${seconds})` : 'SAYA MENGERTI'}
            </button>
        </div>
    );
};

// --- SCREEN: DISQUALIFIED ---
const DisqualifiedScreen = ({ onExit }) => (
    <div className="fixed inset-0 z-[300] bg-red-900 flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-300">
        <div className="w-24 h-24 bg-red-800 border-4 border-red-500 rounded-full flex items-center justify-center mb-6 shadow-2xl">
            <span className="text-5xl">⛔</span>
        </div>
        <h1 className="text-3xl font-black text-white mb-4 uppercase tracking-wider">UJIAN DIHENTIKAN</h1>
        <p className="text-red-200 text-lg mb-8 max-w-md mx-auto">
            Sistem mendeteksi pelanggaran berulang (keluar aplikasi). Jawaban Anda telah <strong>dikunci dan dikirim paksa</strong> ke server.
        </p>
        <div className="bg-black/30 p-4 rounded-xl border border-red-500/30 mb-10 w-full max-w-sm">
            <p className="text-red-300 text-sm italic">Jawaban otomatis tersimpan.</p>
        </div>
        <button onClick={onExit} className="px-8 py-4 bg-white text-red-900 rounded-xl font-black text-lg shadow-xl hover:bg-zinc-100 transition active:scale-95">
            KEMBALI KE DASHBOARD
        </button>
    </div>
);

// --- COMPONENT: QUIZ CARD (List Item) ---
export const QuizCard = ({ quiz, onStart, onReview }) => {
    const [status, setStatus] = useState('LOADING');
    const [btnText, setBtnText] = useState('...');
    const quizRef = useRef(quiz);
    quizRef.current = quiz;

    useEffect(() => {
        const checkTime = () => {
            const q = quizRef.current;
            if (q.my_score !== null) { setStatus('DONE'); return; }

            if (q.is_locked_attendance) {
                setStatus('LOCKED_ATTENDANCE');
                setBtnText('ANDA TIDAK HADIR DAN TIDAK BERHAK MENGIKUTI QUIZ');
                return;
            }

            if (!q.scheduled_at) { setStatus('OPEN'); setBtnText('KERJAKAN'); return; }
            const now = new Date();
            const start = new Date(q.scheduled_at);
            const toleranceMs = (q.tolerance_minutes || 0) * 60000;
            const lateLimit = new Date(start.getTime() + toleranceMs);

            if (now < start) { setStatus('LOCKED'); setBtnText('BELUM DIMULAI'); }
            else if (now > lateLimit) { setStatus('LATE'); setBtnText('TERLAMBAT'); }
            else { setStatus('OPEN'); setBtnText('KERJAKAN'); }
        };
        checkTime();
        const interval = setInterval(checkTime, 1000);
        return () => clearInterval(interval);
    }, [quiz.my_score, quiz.is_locked_attendance]);

    const isBtnDisabled = ['LOCKED', 'LATE', 'DONE', 'LOADING', 'LOCKED_ATTENDANCE'].includes(status);

    let btnClass = "bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/20";
    if (status === 'LOCKED') btnClass = "bg-zinc-800 text-zinc-500 border border-zinc-700";
    if (status === 'LATE') btnClass = "bg-red-900/50 text-red-400 border border-red-900";
    if (status === 'DONE') btnClass = "bg-green-900/30 text-green-400 border border-green-900";
    if (status === 'LOCKED_ATTENDANCE') btnClass = "bg-zinc-900 text-red-600 border border-red-900/30 opacity-60 cursor-not-allowed";

    return (
        <div className="bg-zinc-900 rounded-2xl p-5 mb-4 relative border border-zinc-800/50 shadow-sm">
            {status === 'DONE' && <div className="absolute top-4 right-4"><div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div></div>}
            {status === 'LOCKED_ATTENDANCE' && <div className="absolute top-4 right-4"><div className="text-lg">🔒</div></div>}

            <h3 className="font-bold text-lg text-zinc-100 mb-1 leading-snug">{quiz.title}</h3>
            <p className="text-xs text-zinc-500 mb-4 line-clamp-2 leading-relaxed">{quiz.description || 'Tidak ada deskripsi tambahan.'}</p>

            <div className="flex gap-4 mb-5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 bg-black/40 px-2 py-1 rounded-md border border-zinc-800">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    {quiz.duration}m
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 bg-black/40 px-2 py-1 rounded-md border border-zinc-800">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                    {quiz.question_count} Soal
                </div>
            </div>

            {quiz.scheduled_at && status !== 'DONE' && (
                <div className="mb-4 text-xs flex justify-between items-center text-zinc-500 bg-zinc-950/50 p-2 rounded-lg">
                    <span>Jadwal:</span>
                    <span className="font-mono text-zinc-300">{new Date(quiz.scheduled_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            )}

            {status === 'DONE' ? (
                <div className="space-y-3">
                    <div className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                        <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Nilai Anda</span>
                        <span className="text-2xl font-bold text-white">{quiz.my_score}</span>
                    </div>
                    {quiz.show_results === 1 && (
                        <button onClick={() => onReview(quiz.id)} className="w-full py-3 border border-zinc-700 text-zinc-300 rounded-xl font-bold text-xs uppercase tracking-wide hover:bg-zinc-800 transition">
                            Lihat Pembahasan
                        </button>
                    )}
                </div>
            ) : (
                <button onClick={() => onStart(quiz.id)} disabled={isBtnDisabled} className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wide transition-all active:scale-[0.98] whitespace-normal leading-tight h-auto ${btnClass}`}>
                    {status === 'LOCKED_ATTENDANCE' && <div className="mb-1 text-lg">🚫</div>}
                    {btnText}
                </button>
            )}
        </div>
    );
};

// --- COMPONENT: QUIZ REVIEW ---
export const QuizReview = ({ quizId, onBack }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'error' });

    useEffect(() => {
        const fetchReview = async () => {
            const token = localStorage.getItem('student_token');
            const deviceId = localStorage.getItem('student_device_id');
            const headers = { 'Authorization': `Bearer ${token}`, 'X-Device-Id': deviceId };

            try {
                const res = await fetch(`/api/student/quiz/review?id=${quizId}`, { headers });
                if (!res.ok) {
                    setAlertConfig({ isOpen: true, title: "Akses Ditolak", message: "Tidak bisa memuat pembahasan atau pembahasan ditutup.", type: 'error' });
                    return;
                }
                const json = await res.json();
                setData(json);
            } catch (e) {
                setAlertConfig({ isOpen: true, title: "Error", message: "Gagal memuat data review.", type: 'error' });
            }
            setLoading(false);
        };
        fetchReview();
    }, [quizId]);

    const handleCloseAlert = () => {
        setAlertConfig({ ...alertConfig, isOpen: false });
        onBack();
    };

    if (loading) return <div className="flex items-center justify-center h-screen bg-black text-white">Memuat Pembahasan...</div>;

    if (alertConfig.isOpen) {
        return <CustomAlert isOpen={true} title={alertConfig.title} message={alertConfig.message} type={alertConfig.type} onClose={handleCloseAlert} />;
    }

    const questions = Array.isArray(data) ? data : (data.questions || []);
    const score = data.score !== undefined ? data.score : questions.reduce((acc, q) => acc + (q.my_answer === q.correct_answer ? 1 : 0), 0) / questions.length * 100;

    return (
        <div className="flex flex-col h-full bg-black text-white">
            <GlobalCBTStyles />
            <div className="px-4 pt-safe pt-4 pb-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between shadow-md z-10">
                <button onClick={onBack} className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-full font-bold">←</button>
                <div className="text-center"><h3 className="font-bold text-lg">Pembahasan</h3><p className="text-xs text-zinc-400">Skor: {Math.round(score)}</p></div><div className="w-8"></div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6 hide-scrollbar">
                {questions.map((q, idx) => {
                    const myAns = q.my_answer;
                    return (
                        <div key={q.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                            <div className="flex gap-3 mb-3">
                                <div className="flex-shrink-0 w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-sm font-bold text-zinc-400">{idx + 1}</div>
                                <div className="flex-1">
                                    <div className="soal-content text-base font-medium leading-relaxed mb-4 text-zinc-200" dangerouslySetInnerHTML={{ __html: q.question_text }}></div>
                                    <div className="space-y-2">
                                        {['A', 'B', 'C', 'D', 'E'].map(opt => {
                                            const text = q['option_' + opt.toLowerCase()];
                                            if (!text) return null;
                                            let style = "bg-zinc-950 border-zinc-800 text-zinc-500";
                                            let icon = "";
                                            if (opt === q.correct_answer) { style = "bg-green-900/30 border-green-600 text-green-400 font-bold"; icon = "✓"; }
                                            else if (opt === myAns) { style = "bg-red-900/30 border-red-600 text-red-400"; icon = "✕"; }
                                            return (
                                                <div key={opt} className={`p-3 rounded-lg border text-sm flex justify-between items-center ${style}`}>
                                                    <div className="flex gap-3 w-full">
                                                        <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full bg-black/20 text-xs">{opt}</span>
                                                        <span className="break-words soal-content" dangerouslySetInnerHTML={{ __html: text }}></span>
                                                    </div>
                                                    <span>{icon}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

// --- COMPONENT: QUIZ RUNNER ---
const StudentConfirm = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "YA", cancelText = "BATAL" }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm animate-in fade-in">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-xs w-full p-6 text-center shadow-2xl">
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-zinc-400 text-sm mb-6">{message}</p>
                <div className="flex gap-3">
                    {onCancel && <button onClick={onCancel} className="flex-1 py-3 border border-zinc-700 text-zinc-300 rounded-xl font-bold hover:bg-zinc-800">{cancelText}</button>}
                    <button onClick={onConfirm} className="flex-1 py-3 bg-white text-black rounded-xl font-bold hover:bg-zinc-200">{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

const QuestionGrid = ({ isOpen, questions, answers, currentIdx, onJump, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-sm flex flex-col animate-in fade-in">
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
                            <button key={q.id} onClick={() => onJump(idx)} className={`aspect-square rounded-xl font-bold text-sm flex items-center justify-center transition-all ${isCurrent ? 'bg-white text-black border-2 border-blue-500 scale-105' : isAnswered ? 'bg-green-600 text-white' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>{idx + 1}</button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
};

export const QuizRunner = ({ quizId, studentId, duration, onFinish }) => {
    const [questions, setQuestions] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // UI States
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
    const [showWarning, setShowWarning] = useState(false);
    const [showViolationEnd, setShowViolationEnd] = useState(false);
    const [showGrid, setShowGrid] = useState(false);

    // Custom Alert State
    const [customAlert, setCustomAlert] = useState({ isOpen: false, title: '', message: '', type: 'info', onOk: null });

    // Refs
    const violationCountRef = useRef(0);
    const hasSubmittedRef = useRef(false);
    const storageKey = `cbt_temp_${studentId}_${quizId}`;

    const triggerAlert = (title, message, type = 'info', onOk = null) => {
        setCustomAlert({ isOpen: true, title, message, type, onOk });
    };

    const handleCloseAlert = () => {
        const callback = customAlert.onOk;
        setCustomAlert({ ...customAlert, isOpen: false });
        if (callback) callback();
    };

    // --- START QUIZ & LOAD SAVED ANSWERS ---
    useEffect(() => {
        const start = async () => {
            try {
                const savedAnswers = localStorage.getItem(storageKey);
                if (savedAnswers) {
                    try { setAnswers(JSON.parse(savedAnswers)); } catch (e) { }
                }

                const token = localStorage.getItem('student_token');
                const deviceId = localStorage.getItem('student_device_id');
                const headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'X-Device-Id': deviceId
                };

                const resStart = await fetch(`/api/student/quiz/start?id=${quizId}`, { method: 'GET', headers });

                if (resStart.status === 403) {
                    triggerAlert("Info", "Ujian sudah diselesaikan.", "info", onFinish);
                    return;
                }

                const dataStart = await resStart.json();
                if (dataStart.error) {
                    triggerAlert("Gagal", dataStart.error, "error", onFinish);
                    return;
                }

                setQuestions(dataStart.questions);
                setTimeLeft((duration || 60) * 60);
                setLoading(false);
            } catch (e) {
                triggerAlert("Error", "Gagal memuat soal. Cek koneksi internet.", "error", onFinish);
            }
        };
        start();

        const handleVisibilityChange = () => {
            if (hasSubmittedRef.current) return;
            if (document.visibilityState === 'hidden') {
                violationCountRef.current += 1;
                if (violationCountRef.current === 1) { setShowWarning(true); }
                else if (violationCountRef.current >= 2) {
                    setShowWarning(false);
                    setShowViolationEnd(true);
                    handleSubmit(true);
                }
            }
        };

        const handleBeforeUnload = (e) => {
            if (!hasSubmittedRef.current) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("beforeunload", handleBeforeUnload);
        const preventContext = (e) => e.preventDefault();
        document.addEventListener("contextmenu", preventContext);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("beforeunload", handleBeforeUnload);
            document.removeEventListener("contextmenu", preventContext);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // --- TIMER ---
    useEffect(() => {
        if (timeLeft === null) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit(true); // Auto Submit
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleAnswer = (opt) => {
        const qId = questions[currentIdx].id;
        setAnswers(prev => {
            const newState = { ...prev, [qId]: opt };
            localStorage.setItem(storageKey, JSON.stringify(newState));
            return newState;
        });
    };

    const handleSubmit = async (auto = false) => {
        if (hasSubmittedRef.current) return;

        hasSubmittedRef.current = true;

        if (!auto) {
            setShowSubmitConfirm(false);
            setSubmitting(true);
        }

        const formattedAnswers = Object.keys(answers).map(qId => ({
            question_id: parseInt(qId),
            answer: answers[qId]
        }));

        const token = localStorage.getItem('student_token');
        const deviceId = localStorage.getItem('student_device_id');
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Device-Id': deviceId
        };

        try {
            if (auto) {
                // AUTO: Fire & Forget
                fetch('/api/student/quiz/submit', {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({ quizId, answers: formattedAnswers }),
                    keepalive: true
                });

                localStorage.removeItem(storageKey);

                triggerAlert("Waktu Habis", "Waktu pengerjaan selesai. Jawaban Anda otomatis tersimpan.", "warning", onFinish);

            } else {
                // MANUAL
                const res = await fetch('/api/student/quiz/submit', {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({ quizId, answers: formattedAnswers })
                });

                if (res.ok) {
                    localStorage.removeItem(storageKey);
                    onFinish(); // Langsung keluar jika manual (UX standar)
                } else {
                    throw new Error("Gagal menyimpan jawaban");
                }
            }

        } catch (e) {
            console.error("Submit fail", e);
            if (!auto) {
                setSubmitting(false);
                hasSubmittedRef.current = false;
                triggerAlert("Gagal Kirim", "Periksa koneksi internet Anda dan coba lagi.", "error");
            }
        }
    };

    if (loading) return <div className="flex items-center justify-center h-screen bg-black text-white">Memuat Soal...</div>;

    if (showViolationEnd) {
        return <DisqualifiedScreen onExit={onFinish} />;
    }

    const q = questions[currentIdx];
    const myAns = answers[q.id];

    return (
        <div className="flex flex-col h-full bg-white text-black font-sans">
            <GlobalCBTStyles />

            <CustomAlert
                isOpen={customAlert.isOpen}
                title={customAlert.title}
                message={customAlert.message}
                type={customAlert.type}
                onClose={handleCloseAlert}
            />

            <WarningModal isOpen={showWarning} onClose={() => setShowWarning(false)} />
            <StudentConfirm isOpen={showSubmitConfirm} title="Kumpulkan?" message="Jawaban tidak bisa diubah lagi." onConfirm={() => handleSubmit(false)} onCancel={() => setShowSubmitConfirm(false)} />
            <QuestionGrid isOpen={showGrid} questions={questions} answers={answers} currentIdx={currentIdx} onJump={(idx) => { setCurrentIdx(idx); setShowGrid(false); }} onClose={() => setShowGrid(false)} />

            {/* TOP BAR */}
            <div className="bg-zinc-900 text-white p-4 pt-safe flex justify-between items-center shadow-md z-10 sticky top-0">
                <div className="text-xs">
                    <p className="text-zinc-400 font-bold uppercase tracking-wider">Soal No</p>
                    <p className="text-2xl font-black leading-none">{currentIdx + 1} <span className="text-zinc-500 text-base font-normal">/ {questions.length}</span></p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Sisa Waktu</p>
                        <p className={`text-xl font-mono font-bold ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                        </p>
                    </div>
                    <button onClick={() => setShowGrid(true)} className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center hover:bg-zinc-700 active:scale-95 transition">
                        <span className="text-xl">☷</span>
                    </button>
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 overflow-y-auto p-6 bg-zinc-50">
                <div className="soal-content text-lg font-medium leading-relaxed mb-8 prose max-w-none text-zinc-900" dangerouslySetInnerHTML={{ __html: q.question_text }}></div>

                <div className="space-y-3 pb-20">
                    {['A', 'B', 'C', 'D', 'E'].map(opt => {
                        const text = q['option_' + opt.toLowerCase()];
                        if (!text) return null;
                        const isSelected = myAns === opt;
                        return (
                            <button key={opt} onClick={() => handleAnswer(opt)} className={`w-full text-left p-4 rounded-xl border-2 transition-all flex gap-4 items-start active:scale-[0.99] ${isSelected ? 'border-black bg-blue-50/50 ring-1 ring-black' : 'border-zinc-200 bg-white hover:bg-zinc-100 hover:border-zinc-300'}`}>
                                <span className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg font-bold text-sm shadow-sm ${isSelected ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-500'}`}>{opt}</span>
                                <span className="py-0.5 w-full soal-content text-base text-zinc-700" dangerouslySetInnerHTML={{ __html: text }}></span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* BOTTOM BAR */}
            <div className="p-4 pb-safe bg-white border-t border-zinc-200 flex gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                <button onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0} className="px-6 py-3 rounded-xl font-bold border-2 border-zinc-200 text-zinc-500 disabled:opacity-30 hover:bg-zinc-50">←</button>
                {currentIdx === questions.length - 1 ? (
                    <button onClick={() => setShowSubmitConfirm(true)} disabled={submitting} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-black text-lg shadow-lg shadow-green-200 hover:bg-green-700 active:scale-95 transition">
                        {submitting ? 'MENGIRIM...' : 'SELESAI ✓'}
                    </button>
                ) : (
                    <button onClick={() => setCurrentIdx(Math.min(questions.length - 1, currentIdx + 1))} className="flex-1 py-3 bg-black text-white rounded-xl font-bold text-lg shadow-lg hover:bg-zinc-800 active:scale-95 transition">
                        SELANJUTNYA →
                    </button>
                )}
            </div>
        </div>
    );
};
