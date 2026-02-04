import React, { useState, useEffect, useRef } from 'react';
import { processContentForDisplay } from '../../utils/imageUtils';

// --- COLOR GRADING HELPER ---
// 0-50: Red, 51-69: Yellow, 70-79: Blue, 80-100: Green
const getGradeColor = (percentage) => {
    if (percentage <= 50) return 'text-red-500';
    if (percentage <= 69) return 'text-yellow-500';
    if (percentage <= 79) return 'text-blue-500';
    return 'text-green-500';
};

const getGradeBorderColor = (percentage) => {
    if (percentage <= 50) return 'border-red-900/50';
    if (percentage <= 69) return 'border-yellow-900/50';
    if (percentage <= 79) return 'border-blue-900/50';
    return 'border-green-900/50';
};

// --- UTILS ---
const compressImage = async (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1000;
                const scaleSize = MAX_WIDTH / img.width;
                const width = (scaleSize < 1) ? MAX_WIDTH : img.width;
                const height = (scaleSize < 1) ? img.height * scaleSize : img.height;
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg', lastModified: Date.now() }));
                }, 'image/jpeg', 0.7);
            };
        };
    });
};

const getHeaders = () => {
    const token = localStorage.getItem('student_token');
    const deviceId = localStorage.getItem('student_device_id');
    return { 'Authorization': `Bearer ${token}`, 'X-Device-Id': deviceId };
};

export default function StudentTasks({ student, onBack }) {
    // VIEW MODES: 'LIST', 'DETAIL'
    const [viewMode, setViewMode] = useState('LIST');
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    // DETAIL STATE
    const [activeTask, setActiveTask] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [uploading, setUploading] = useState({});
    const [submitting, setSubmitting] = useState(false);

    // LOGIC STATE
    const [timeLeft, setTimeLeft] = useState(null);
    const [isExpired, setIsExpired] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);

    // [NEW] DISCUSSION STATE
    const [showGlobalDiscussion, setShowGlobalDiscussion] = useState(false);

    // CUSTOM MODAL STATE
    const [modal, setModal] = useState({ show: false, type: 'info', title: '', msg: '' });
    const modalCallbackRef = useRef(null);
    const timerRef = useRef(null);

    const showAlert = (title, msg, type = 'info', onClose = null) => {
        modalCallbackRef.current = onClose;
        setModal({ show: true, type, title, msg });
    };
    const showConfirm = (title, msg, onConfirm) => {
        modalCallbackRef.current = onConfirm;
        setModal({ show: true, type: 'confirm', title, msg });
    };
    const closeModal = () => setModal({ show: false, type: 'info', title: '', msg: '' });

    // --- DATA FETCHING ---
    const fetchTasks = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/student/tasks?class_id=${student.class_id}&student_id=${student.id}`, { headers: getHeaders() });
            if (res.ok) setTasks(await res.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const openTask = async (taskId, status) => {
        const isDone = status !== 'BELUM_DIKERJAKAN';
        setIsReadOnly(isDone);

        try {
            const res = await fetch(`/api/student/task-detail?task_id=${taskId}&student_id=${student.id}`, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();

                setActiveTask({
                    id: taskId,
                    ...data.task,
                    my_grade: data.my_grade,
                    feedback: data.feedback
                });

                setQuestions(data.questions);

                // Load Answers (Server / LocalStorage Draft)
                let loadedAnswers = {};
                if (data.existing_answers && Object.keys(data.existing_answers).length > 0) {
                    loadedAnswers = data.existing_answers;
                } else if (!isDone) {
                    // Cek Draft Lokal
                    const draftKey = `draft_task_${student.id}_${taskId}`;
                    const saved = localStorage.getItem(draftKey);
                    if (saved) loadedAnswers = JSON.parse(saved);
                }

                setAnswers(loadedAnswers);
                setViewMode('DETAIL');
            }
        } catch (e) { showAlert('Error', 'Gagal memuat soal.'); }
    };

    // --- TIMER & AUTO SAVE ---
    useEffect(() => {
        if (viewMode === 'DETAIL' && activeTask?.deadline && !isReadOnly) {
            const deadlineTime = new Date(activeTask.deadline).getTime();
            const updateTimer = () => {
                const now = new Date().getTime();
                const diff = deadlineTime - now;
                if (diff <= 0) {
                    setTimeLeft("00:00:00");
                    setIsExpired(true);
                    clearInterval(timerRef.current);
                } else {
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                    setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
                    setIsExpired(false);
                }
            };
            updateTimer();
            timerRef.current = setInterval(updateTimer, 1000);
            return () => clearInterval(timerRef.current);
        }
    }, [viewMode, activeTask, isReadOnly]);

    useEffect(() => {
        if (activeTask && Object.keys(answers).length > 0 && !isReadOnly) {
            const draftKey = `draft_task_${student.id}_${activeTask.id}`;
            localStorage.setItem(draftKey, JSON.stringify(answers));
        }
    }, [answers, activeTask, isReadOnly, student.id]);

    useEffect(() => { fetchTasks(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // --- HANDLERS ---
    const handleAnswerChange = (qId, field, value) => {
        if (isReadOnly || isExpired) return;
        setAnswers(prev => ({ ...prev, [qId]: { ...prev[qId], [field]: value } }));
    };

    // [UPDATED] Multi-image upload handler (max 5 images)
    const handleFileUpload = async (qId, files) => {
        if (!files || files.length === 0 || isReadOnly || isExpired) return;

        const currentImages = answers[qId]?.answerImages || [];
        const remainingSlots = 5 - currentImages.length;

        if (remainingSlots <= 0) {
            return showAlert('Batas Tercapai', 'Maksimal 5 gambar per soal.', 'error');
        }

        const filesToProcess = Array.from(files).slice(0, remainingSlots);

        setUploading(prev => ({ ...prev, [qId]: true }));

        try {
            const uploadedUrls = [];

            for (const file of filesToProcess) {
                if (file.size > 10 * 1024 * 1024) {
                    showAlert('Peringatan', `File ${file.name} terlalu besar (Max 10MB), dilewati.`, 'error');
                    continue;
                }

                const compressedFile = await compressImage(file);
                const formData = new FormData();
                formData.append('file', compressedFile);

                const token = localStorage.getItem('student_token');
                const res = await fetch('/api/student/upload', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });

                if (res.ok) {
                    const data = await res.json();
                    uploadedUrls.push(data.url);
                }
            }

            if (uploadedUrls.length > 0) {
                const newImages = [...currentImages, ...uploadedUrls];
                handleAnswerChange(qId, 'answerImages', newImages);
                // Also set answerImage for backward compatibility (first image)
                if (!answers[qId]?.answerImage) {
                    handleAnswerChange(qId, 'answerImage', newImages[0]);
                }
            }
        } catch (e) {
            showAlert('Error', 'Terjadi kesalahan koneksi.', 'error');
        }

        setUploading(prev => ({ ...prev, [qId]: false }));
    };

    // Handler to remove a single image from array
    const handleRemoveImage = (qId, imageIndex) => {
        const currentImages = answers[qId]?.answerImages || [];
        const newImages = currentImages.filter((_, idx) => idx !== imageIndex);
        handleAnswerChange(qId, 'answerImages', newImages);
        // Update answerImage for backward compatibility
        handleAnswerChange(qId, 'answerImage', newImages[0] || null);
    };

    const handleSubmit = async (isDraft = false) => {
        if (isExpired && !isDraft) return showAlert('Waktu Habis', 'Maaf, batas waktu pengerjaan sudah habis.', 'error');
        const confirmMsg = isDraft ? 'Simpan jawaban sementara? Anda bisa melanjutkannya nanti.' : 'Kirim jawaban final? Anda TIDAK BISA mengubahnya lagi setelah ini.';

        showConfirm(isDraft ? 'Simpan Draft' : 'Kumpul Tugas', confirmMsg, async () => {
            setSubmitting(true);
            // [FIX] Kirim SEMUA soal, bukan hanya yang ada di state answers
            // Ini memastikan jawaban kosong juga dikirim ke backend
            const payloadAnswers = questions.map(q => ({
                questionId: q.id,
                answerText: answers[q.id]?.answerText || '',
                answerImage: answers[q.id]?.answerImage || null,
                answerImages: answers[q.id]?.answerImages || []  // [NEW] Multi-image array
            }));

            try {
                const res = await fetch('/api/student/submit', {
                    method: 'POST',
                    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
                    body: JSON.stringify({ taskId: activeTask.id, studentId: student.id, answers: payloadAnswers, isDraft })
                });
                if (res.ok) {
                    // Both draft and final: clear local draft
                    localStorage.removeItem(`draft_task_${student.id}_${activeTask.id}`);

                    // Show success alert FIRST
                    // Pass redirect logic as callback to be executed when "Tutup" is clicked
                    showAlert(
                        'Berhasil',
                        isDraft ? 'Draft berhasil disimpan! Anda dapat melanjutkan pengerjaan.' : 'Tugas berhasil dikumpulkan!',
                        'success',
                        () => {
                            if (isDraft) {
                                fetchTasks();
                                closeModal();
                            } else {
                                setViewMode('LIST');
                                fetchTasks();
                                closeModal();
                            }
                        }
                    );
                } else {
                    const err = await res.json();
                    showAlert('Gagal', err.error || 'Gagal mengirim.', 'error');
                }
            } catch (e) { showAlert('Error', 'Masalah koneksi internet.', 'error'); }
            setSubmitting(false);
        });
    };

    // --- COMPONENTS MOVED OUTSIDE ---
    // (See External Definitions at bottom)

    // 1. LIST VIEW (DARK MODE)
    if (viewMode === 'LIST') {
        return (
            <div className="flex flex-col h-full bg-zinc-950 text-white animate-in fade-in">
                <CustomModal modal={modal} closeModal={closeModal} modalCallbackRef={modalCallbackRef} />
                <div className="bg-zinc-900 border-b border-zinc-800 p-4 pt-safe sticky top-0 z-10 shadow-lg flex items-center gap-3">
                    <button onClick={onBack} className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-full font-bold text-zinc-400 hover:text-white hover:bg-zinc-700">←</button>
                    <h2 className="font-bold text-lg text-white">Daftar Tugas</h2>
                </div>

                <div className="p-4 space-y-3 pb-24 overflow-y-auto flex-1">
                    {loading && <div className="text-center p-8 text-zinc-500 animate-pulse">Memuat tugas...</div>}
                    {!loading && tasks.length === 0 && <div className="text-center p-8 text-zinc-600 italic">Tidak ada tugas aktif.</div>}

                    {tasks.map(t => {
                        const isDone = t.status !== 'BELUM_DIKERJAKAN';
                        const deadlineDate = t.deadline ? new Date(t.deadline) : null;
                        const isExpiredList = deadlineDate && new Date() > deadlineDate;
                        const isLocked = isExpiredList && !isDone;

                        // [UPDATE] Cek Local Draft untuk ubah tombol
                        const hasDraft = !isDone && localStorage.getItem(`draft_task_${student.id}_${t.id}`);

                        const statusColor = t.status === 'DINILAI' ? 'bg-green-900/30 text-green-400 border-green-800' :
                            t.status === 'NILAI_DALAM_PROSES' ? 'bg-purple-900/30 text-purple-400 border-purple-800' :
                                t.status === 'SEDANG_DIPERIKSA' ? 'bg-blue-900/30 text-blue-400 border-blue-800' :
                                    t.status === 'MENUNGGU_NILAI' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800' :
                                        'bg-zinc-800 text-zinc-400 border-zinc-700';

                        return (
                            <div key={t.id} onClick={() => !isLocked && openTask(t.id, t.status)} className={`p-4 rounded-xl border transition-all relative overflow-hidden group ${isLocked ? 'bg-zinc-900/50 border-zinc-800 opacity-60 cursor-not-allowed' : 'bg-zinc-900 border-zinc-800 hover:border-orange-900 cursor-pointer active:scale-[0.98]'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${statusColor}`}>
                                        {t.status.replace('_', ' ')}
                                    </span>
                                    {t.my_grade !== null && <span className={`text-xl font-black ${getGradeColor(t.my_grade)}`}>{t.my_grade}</span>}
                                </div>
                                <h3 className="font-bold text-white mb-1 text-lg">{t.title}</h3>
                                <div className="flex gap-3 text-xs text-zinc-400">
                                    <span>📅 {deadlineDate ? deadlineDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Tanpa Deadline'}</span>
                                    <span>📝 {t.question_count} Soal</span>
                                </div>

                                <div className="mt-4">
                                    {isDone ? (
                                        <button className="w-full py-2 bg-zinc-800 text-zinc-300 rounded-lg font-bold text-xs border border-zinc-700">👁️ LIHAT HASIL / REVIEW</button>
                                    ) : isLocked ? (
                                        <button disabled className="w-full py-2 bg-red-900/20 text-red-500 rounded-lg font-bold text-xs border border-red-900/30 flex items-center justify-center gap-2">🔒 DITUTUP (WAKTU HABIS)</button>
                                    ) : hasDraft ? (
                                        // [UPDATE] Tombol Lanjutkan jika ada draft
                                        <button className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold text-xs shadow-lg shadow-blue-900/20 hover:bg-blue-500 transition border border-blue-500">➜ LANJUTKAN PENGERJAAN</button>
                                    ) : (
                                        <button className="w-full py-2 bg-orange-600 text-white rounded-lg font-bold text-xs shadow-lg shadow-orange-900/20 group-hover:bg-orange-500 transition">KERJAKAN SEKARANG →</button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // 2. WORKSHEET VIEW (DETAIL) - DARK MODE
    if (viewMode === 'DETAIL' && activeTask) {
        // [LOGIC] Hitung Poin PG per Soal (Estimasi Transparansi)
        // Rumus: Total Bobot PG / Jumlah Soal PG
        const pgCount = questions.filter(q => q.type === 'pg').length;
        const pgScorePerItem = pgCount > 0 ? (activeTask.pg_weight / pgCount) : 0;
        const showKey = activeTask.show_discussion; // Saklar Kunci

        return (
            <div className="flex flex-col h-full bg-zinc-950 animate-in slide-in-from-bottom-4 duration-300 text-white">
                <CustomModal modal={modal} closeModal={closeModal} modalCallbackRef={modalCallbackRef} />
                <DiscussionGlobalModal
                    show={showGlobalDiscussion}
                    onClose={() => setShowGlobalDiscussion(false)}
                    activeTask={activeTask}
                />

                {/* Header Fixed */}
                <div className="bg-zinc-900 border-b border-zinc-800 p-3 pt-safe sticky top-0 z-20 shadow-lg flex justify-between items-center">
                    <button onClick={() => setViewMode('LIST')} className="text-zinc-400 font-bold text-sm hover:text-white px-2">Batal</button>
                    <div className="text-center">
                        <h3 className="font-bold text-sm max-w-[150px] truncate text-white">{activeTask.title}</h3>
                        {!isReadOnly && activeTask.deadline && (
                            <div className={`text-[10px] font-mono font-bold mt-0.5 ${isExpired ? 'text-red-500 animate-pulse' : 'text-orange-500'}`}>
                                ⏱️ {timeLeft || '--:--:--'}
                            </div>
                        )}
                        {isReadOnly && <span className="text-[10px] text-green-500 font-bold">MODE REVIEW</span>}
                    </div>
                    <div className="w-8"></div>
                </div>

                {/* Content Scroll */}
                <div className="flex-1 overflow-y-auto p-5 pb-40 space-y-6">

                    {/* SCORE CARD (Review Mode Only) */}
                    {isReadOnly && activeTask.my_grade !== null && (
                        <div className="space-y-4">
                            {/* Kartu Nilai Utama */}
                            <div className={`bg-zinc-900 border ${getGradeBorderColor(activeTask.my_grade)} p-5 rounded-2xl relative overflow-hidden`}>
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <svg className={`w-24 h-24 ${getGradeColor(activeTask.my_grade)}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                </div>
                                <div className="relative z-10">
                                    <p className="text-xs font-bold text-zinc-500 uppercase mb-1">Nilai Akhir</p>
                                    <p className={`text-4xl font-black ${getGradeColor(activeTask.my_grade)} mb-2`}>{activeTask.my_grade}<span className="text-lg text-zinc-600 font-medium">/100</span></p>

                                    {/* Breakdown Sederhana */}
                                    <div className="flex gap-4 text-xs text-zinc-400 mt-2">
                                        <span>PG Weight: {activeTask.pg_weight}%</span>
                                        <span>Essay Weight: {100 - activeTask.pg_weight}%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Tombol Buka Kunci Global (Jika Show Key ON) */}
                            {showKey && (activeTask.discussion_text || activeTask.discussion_url) && (
                                <button
                                    onClick={() => setShowGlobalDiscussion(true)}
                                    className="w-full py-3 bg-blue-900/30 text-blue-400 border border-blue-800 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-900/50 transition"
                                >
                                    <span>📖</span> LIHAT KUNCI & PEMBAHASAN GLOBAL
                                </button>
                            )}
                        </div>
                    )}

                    {/* Instruksi */}
                    {activeTask.description && (
                        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-sm text-zinc-300">
                            <p className="font-bold text-white mb-1">Instruksi:</p>
                            {activeTask.description}
                        </div>
                    )}

                    {questions.map((q, idx) => (
                        <div key={q.id} className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-sm">
                            {/* Header Soal */}
                            <div className="mb-4">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="bg-zinc-800 text-zinc-400 px-2 py-1 rounded text-[10px] font-bold">NO {idx + 1}</span>
                                    {/* [TRANSPARANSI POIN] - Tampilkan Bobot + Poin dengan warna */}
                                    {isReadOnly && (
                                        <span className="text-[10px] font-bold">
                                            {activeTask.my_grade !== null && answers[q.id]?.earnedScore !== undefined ? (
                                                // Setelah dinilai: tampilkan Bobot + Poin earned dengan warna
                                                (() => {
                                                    const earned = answers[q.id].earnedScore || 0;
                                                    const maxPoin = q.type === 'pg' ? pgScorePerItem : (q.weight || 0);
                                                    const percentage = maxPoin > 0 ? (earned / maxPoin) * 100 : 0;
                                                    return (
                                                        <span>
                                                            <span className="text-zinc-500">Bobot: {q.type === 'pg' ? pgScorePerItem.toFixed(0) : q.weight}%</span>
                                                            <span className="text-zinc-600 mx-1">•</span>
                                                            <span className={getGradeColor(percentage)}>Poin: {earned.toFixed(1)}</span>
                                                        </span>
                                                    );
                                                })()
                                            ) : (
                                                // Sebelum dinilai: tampilkan Max saja
                                                <span className="text-zinc-500">
                                                    {q.type === 'pg' ? `Max: ${pgScorePerItem.toFixed(1)} Poin` : `Bobot: ${q.weight || 0}%`}
                                                </span>
                                            )}
                                        </span>
                                    )}
                                </div>
                                <div className="prose prose-sm prose-invert max-w-none font-medium" dangerouslySetInnerHTML={{ __html: processContentForDisplay(q.questionText) }}></div>
                                {q.questionImageUrl && <img src={q.questionImageUrl} className="mt-3 rounded-lg border border-zinc-700 max-h-60 object-contain bg-black" />}
                            </div>

                            {/* Input Jawaban */}
                            <div className="mt-4 pt-4 border-t border-zinc-800">
                                {/* TIPE PG */}
                                {q.type === 'pg' && (
                                    <div className="space-y-2">
                                        {q.options.map((opt, oIdx) => {
                                            if (!opt) return null;
                                            const char = String.fromCharCode(65 + oIdx);
                                            const isSelected = answers[q.id]?.answerText === char;

                                            // [LOGIC WARNA PG]
                                            let itemClass = "bg-black border-zinc-800 text-zinc-400"; // Default
                                            let badgeClass = "border-zinc-700 bg-zinc-900 text-zinc-500";

                                            if (isReadOnly) {
                                                if (showKey) {
                                                    // FASE 2: Buka-bukaan
                                                    const isCorrect = q.correctKey === char;
                                                    if (isCorrect) {
                                                        itemClass = "bg-green-900/20 border-green-600 text-green-400";
                                                        badgeClass = "border-green-500 bg-green-900 text-green-400";
                                                    } else if (isSelected && !isCorrect) {
                                                        itemClass = "bg-red-900/20 border-red-800 text-red-500";
                                                        badgeClass = "border-red-800 bg-red-900 text-red-400";
                                                    }
                                                } else {
                                                    // FASE 1: Rahasia (Cuma kasih tau pilihan user)
                                                    if (isSelected) {
                                                        itemClass = "bg-blue-900/20 border-blue-800 text-blue-400";
                                                        badgeClass = "border-blue-700 bg-blue-900 text-blue-400";
                                                    }
                                                }
                                            } else {
                                                // Mode Pengerjaan
                                                if (isSelected) {
                                                    itemClass = "bg-orange-600 border-orange-500 text-white";
                                                    badgeClass = "border-white bg-white text-orange-600";
                                                } else {
                                                    itemClass = "bg-black border-zinc-800 text-zinc-400 hover:bg-zinc-800 cursor-pointer active:scale-[0.98]";
                                                }
                                            }

                                            return (
                                                <div key={oIdx} onClick={() => !isReadOnly && !isExpired && handleAnswerChange(q.id, 'answerText', char)}
                                                    className={`flex items-center gap-3 p-3 rounded-xl border transition ${itemClass}`}>
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${badgeClass}`}>
                                                        {char}
                                                    </div>
                                                    <span className="text-sm font-medium">{opt}</span>
                                                </div>
                                            );
                                        })}
                                        {/* [NEW] Summary Card: Jawaban Kamu (hanya tampil saat showKey true) */}
                                        {isReadOnly && showKey && (() => {
                                            const myAns = answers[q.id]?.answerText || null;
                                            const isCorrect = myAns === q.correctKey;
                                            return (
                                                <div className={`mt-4 p-3 rounded-xl border text-sm font-bold flex items-center gap-2 ${!myAns ? 'bg-yellow-900/20 border-yellow-700 text-yellow-400' :
                                                    isCorrect ? 'bg-green-900/20 border-green-700 text-green-400' :
                                                        'bg-red-900/20 border-red-700 text-red-400'
                                                    }`}>
                                                    <span>{!myAns ? '⚠️' : isCorrect ? '✅' : '❌'}</span>
                                                    <span>
                                                        {!myAns ? 'Tidak Dijawab' : `Jawaban Kamu: ${myAns}`}
                                                        {myAns && !isCorrect && <span className="text-zinc-400 font-normal ml-2">• Jawaban Benar: {q.correctKey}</span>}
                                                        {isCorrect && <span className="ml-2">• BENAR</span>}
                                                        {!myAns && <span className="text-zinc-400 font-normal ml-2">• Jawaban Benar: {q.correctKey}</span>}
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                {/* TIPE ESSAY TEXT */}
                                {q.type === 'essay_text' && (
                                    <div>
                                        <textarea
                                            className="w-full p-3 bg-black border border-zinc-700 rounded-xl focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition text-sm min-h-[120px] text-zinc-100 placeholder-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                            placeholder={isReadOnly ? "Tidak ada jawaban" : "Ketik jawaban Anda di sini..."}
                                            maxLength={q.charLimit || 500}
                                            value={answers[q.id]?.answerText || ''}
                                            onChange={(e) => handleAnswerChange(q.id, 'answerText', e.target.value)}
                                            disabled={isReadOnly || isExpired}
                                        />
                                        {/* [TRANSPARANSI NILAI ESSAY] */}
                                        {isReadOnly && (
                                            <div className="mt-2 text-right">
                                                <span className="text-[10px] text-zinc-500">
                                                    {activeTask.feedback ? "Cek Feedback Global di atas" : "Menunggu penilaian guru"}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TIPE ESSAY IMAGE - Multi-Image Support (Max 5) */}
                                {q.type === 'essay_image' && (() => {
                                    const images = answers[q.id]?.answerImages || [];
                                    const canAddMore = !isReadOnly && !isExpired && images.length < 5;

                                    return (
                                        <div>
                                            {/* Image Gallery Grid */}
                                            {images.length > 0 && (
                                                <div className="grid grid-cols-3 gap-2 mb-3">
                                                    {images.map((imgUrl, imgIdx) => (
                                                        <div key={imgIdx} className="relative group aspect-square">
                                                            <img
                                                                src={imgUrl}
                                                                className="w-full h-full object-cover rounded-lg border border-zinc-700 bg-black"
                                                                alt={`Jawaban ${imgIdx + 1}`}
                                                            />
                                                            {!isReadOnly && !isExpired && (
                                                                <button
                                                                    onClick={() => handleRemoveImage(q.id, imgIdx)}
                                                                    className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold text-[10px] shadow-md hover:bg-red-700 transition opacity-0 group-hover:opacity-100"
                                                                >
                                                                    ✕
                                                                </button>
                                                            )}
                                                            <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                                                                {imgIdx + 1}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Add More Button / Initial Upload */}
                                            {canAddMore && (
                                                <div>
                                                    <input
                                                        type="file"
                                                        id={`file-${q.id}`}
                                                        className="hidden"
                                                        accept="image/*"
                                                        multiple
                                                        capture={activeTask.allow_gallery ? undefined : "environment"}
                                                        onChange={(e) => handleFileUpload(q.id, e.target.files)}
                                                        disabled={isReadOnly || isExpired}
                                                    />
                                                    <label
                                                        htmlFor={`file-${q.id}`}
                                                        className={`w-full py-4 border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-1 transition cursor-pointer hover:bg-zinc-900 hover:border-orange-900/50`}
                                                    >
                                                        <span className="text-xl">{uploading[q.id] ? '⏳' : images.length > 0 ? '➕' : '📷'}</span>
                                                        <span className="text-xs font-bold text-zinc-500">
                                                            {uploading[q.id] ? 'Mengupload...' : images.length > 0 ? `Tambah Foto (${images.length}/5)` : 'Ambil Foto Jawaban'}
                                                        </span>
                                                    </label>
                                                </div>
                                            )}

                                            {/* Read-only: No images */}
                                            {isReadOnly && images.length === 0 && (
                                                <div className="py-6 border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-1 opacity-50">
                                                    <span className="text-xl">🖼️</span>
                                                    <span className="text-xs font-bold text-zinc-500">Tidak ada gambar</span>
                                                </div>
                                            )}

                                            {/* Max reached indicator */}
                                            {!isReadOnly && !isExpired && images.length >= 5 && (
                                                <p className="text-[10px] text-zinc-500 text-center mt-2">Maksimal 5 gambar tercapai</p>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* [PEMBAHASAN ESSAY - FASE 2] */}
                                {isReadOnly && showKey && q.type !== 'pg' && q.explanation && (
                                    <div className="mt-4 p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                                        <p className="text-[10px] font-bold text-green-500 mb-1 uppercase">PEMBAHASAN GURU</p>
                                        <p className="text-sm text-zinc-300 whitespace-pre-wrap">{q.explanation}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Fixed */}
                {!isReadOnly && (
                    <div className="p-4 bg-zinc-900 border-t border-zinc-800 sticky bottom-0 z-20 pb-safe flex gap-3">
                        <button
                            onClick={() => handleSubmit(true)}
                            disabled={submitting || isExpired}
                            className="flex-1 py-3.5 bg-zinc-800 text-zinc-300 rounded-xl font-bold text-sm hover:bg-zinc-700 disabled:opacity-50"
                        >
                            💾 SIMPAN DRAFT
                        </button>
                        <button
                            onClick={() => handleSubmit(false)}
                            disabled={submitting || isExpired}
                            className="flex-[2] py-3.5 bg-orange-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-900/20 hover:bg-orange-500 active:scale-95 transition disabled:opacity-50 disabled:bg-zinc-700"
                        >
                            {submitting ? <span className="animate-spin">⏳</span> : <span>✈️ KIRIM FINAL</span>}
                        </button>
                    </div>
                )}

                {/* Footer Read Only */}
                {isReadOnly && (
                    <div className="p-4 bg-zinc-900 border-t border-zinc-800 sticky bottom-0 z-20 pb-safe">
                        <button onClick={() => setViewMode('LIST')} className="w-full py-3.5 bg-zinc-800 text-white rounded-xl font-bold text-sm hover:bg-zinc-700">
                            KEMBALI KE DAFTAR
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return null;
}

// --- EXTERNAL COMPONENTS ---
const CustomModal = ({ modal, closeModal, modalCallbackRef }) => {
    if (!modal.show) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95">
                <div className="flex flex-col items-center text-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 text-2xl ${modal.type === 'error' ? 'bg-red-900/30 text-red-500' : modal.type === 'success' ? 'bg-green-900/30 text-green-500' : 'bg-blue-900/30 text-blue-500'}`}>
                        {modal.type === 'error' ? '⚠️' : modal.type === 'success' ? '✅' : modal.type === 'confirm' ? '❓' : 'ℹ️'}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{modal.title}</h3>
                    <p className="text-sm text-zinc-400 mb-6">{modal.msg}</p>
                    {modal.type === 'confirm' ? (
                        <div className="flex gap-3 w-full">
                            <button onClick={closeModal} className="flex-1 py-2.5 bg-zinc-800 text-zinc-300 font-bold rounded-xl hover:bg-zinc-700">Batal</button>
                            <button onClick={() => { const cb = modalCallbackRef.current; closeModal(); if (cb) setTimeout(cb, 100); }} className="flex-1 py-2.5 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700">Ya, Lanjut</button>
                        </div>
                    ) : (
                        <button onClick={() => {
                            const cb = modalCallbackRef.current;
                            if (cb) cb();
                            else closeModal();
                        }} className="w-full py-2.5 bg-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-700">Tutup</button>
                    )}
                </div>
            </div>
        </div>
    );
};

const DiscussionGlobalModal = ({ show, onClose, activeTask }) => {
    if (!show) return null;
    const { discussion_text, discussion_url } = activeTask;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 max-h-[85vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><span>🔑</span> Kunci & Pembahasan</h3>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-zinc-800 text-zinc-400 rounded-full hover:bg-zinc-700">✕</button>
                </div>

                <div className="space-y-6">
                    {discussion_url && (
                        <div>
                            <label className="text-xs font-bold text-zinc-500 mb-2 block uppercase">FILE / GAMBAR KUNCI</label>
                            <div className="p-1 bg-zinc-950 rounded-xl border border-zinc-800">
                                <img src={discussion_url} className="w-full rounded-lg" alt="Kunci Jawaban" onError={(e) => { e.target.style.display = 'none'; }} />
                                <a href={discussion_url} target="_blank" className="block text-center py-3 text-sm text-blue-400 font-bold hover:underline">
                                    🔗 Buka File / Link Eksternal
                                </a>
                            </div>
                        </div>
                    )}

                    {discussion_text && (
                        <div>
                            <label className="text-xs font-bold text-zinc-500 mb-2 block uppercase">PEMBAHASAN TERTULIS</label>
                            <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed">
                                {discussion_text}
                            </div>
                        </div>
                    )}

                    {!discussion_url && !discussion_text && (
                        <p className="text-center text-zinc-500 italic py-4">Tidak ada data pembahasan yang tersedia.</p>
                    )}
                </div>

                <button onClick={onClose} className="w-full mt-6 py-3 bg-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-700">
                    Tutup
                </button>
            </div>
        </div>
    );
};
