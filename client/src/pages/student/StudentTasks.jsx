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
    // VIEW MODES: 'LIST', 'DETAIL', 'GROUP_DETAIL'
    const [viewMode, setViewMode] = useState('LIST');
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    // [NEW] TAB STATE
    const [taskTab, setTaskTab] = useState('INDIVIDU'); // 'INDIVIDU' | 'KELOMPOK'
    const [groupTasks, setGroupTasks] = useState([]);
    const [loadingGroup, setLoadingGroup] = useState(false);

    // [NEW] GROUP TASK DETAIL STATE
    const [groupDetail, setGroupDetail] = useState(null);
    const [groupQuestions, setGroupQuestions] = useState([]);
    const [groupGroup, setGroupGroup] = useState(null);
    const [groupSubmission, setGroupSubmission] = useState(null);
    const [groupAnswers, setGroupAnswers] = useState({});
    const [groupIsLeader, setGroupIsLeader] = useState(false);
    const [groupLeaderName, setGroupLeaderName] = useState('');
    const [groupActivityLogs, setGroupActivityLogs] = useState([]);
    const [showGroupDiscussion, setShowGroupDiscussion] = useState(false);
    const [groupUploading, setGroupUploading] = useState({});
    const [showGroupLogs, setShowGroupLogs] = useState(false);

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

    // [NEW] Fetch Group Tasks
    const fetchGroupTasks = async () => {
        setLoadingGroup(true);
        try {
            const res = await fetch('/api/student/group-tasks', { headers: getHeaders() });
            if (res.ok) setGroupTasks(await res.json());
        } catch (e) { console.error(e); }
        setLoadingGroup(false);
    };

    // [NEW] Open Group Task Detail
    const openGroupTask = async (taskId) => {
        try {
            const res = await fetch(`/api/student/group-task-detail?taskId=${taskId}`, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                setGroupDetail(data.task);
                setGroupQuestions(data.questions);
                setGroupGroup(data.group);
                setGroupSubmission(data.submission);

                // Leader logic
                const myId = data.currentStudentId;
                setGroupIsLeader(myId === data.group.leader_id);
                if (data.group.leader_id) {
                    const leader = data.group.members.find(m => m.id === data.group.leader_id);
                    setGroupLeaderName(leader ? leader.name : 'Unknown');
                } else {
                    setGroupLeaderName('');
                }

                // Map answers
                if (data.answers) {
                    const mapped = {};
                    data.answers.forEach(a => {
                        // Parse multi-image: answer_image_url may be a JSON array or a single URL
                        let answerImages = [];
                        if (a.answer_image_url) {
                            try {
                                const parsed = JSON.parse(a.answer_image_url);
                                answerImages = Array.isArray(parsed) ? parsed : [a.answer_image_url];
                            } catch {
                                answerImages = [a.answer_image_url];
                            }
                        }
                        mapped[a.question_id] = {
                            text: a.answer_text,
                            image: a.answer_image_url,
                            option: a.answer_text,
                            answerImages,
                            score: a.score,
                            is_graded: a.is_graded
                        };
                    });
                    setGroupAnswers(mapped);
                } else {
                    setGroupAnswers({});
                }

                // Load activity logs
                setGroupActivityLogs(data.activityLogs || []);
                setShowGroupLogs(false);
                setShowGroupDiscussion(false);
                setViewMode('GROUP_DETAIL');
            } else {
                const err = await res.json();
                showAlert('Error', err.error || 'Gagal memuat tugas kelompok.');
            }
        } catch (e) { showAlert('Error', 'Gagal memuat tugas kelompok.'); }
    };

    // [NEW] Submit Group Task
    const handleGroupSubmit = async (isDraft = false) => {
        if (!isDraft && !groupIsLeader) {
            return showAlert('Ditolak', 'Hanya Ketua Kelompok yang dapat mengirim tugas!', 'error');
        }
        showConfirm(
            isDraft ? 'Simpan Draft' : 'Kirim Tugas',
            isDraft ? 'Simpan jawaban sementara?' : 'Kirim jawaban final? Tidak bisa diubah lagi setelah ini.',
            async () => {
                setSubmitting(true);
                try {
                    const res = await fetch('/api/student/group-tasks/submit', {
                        method: 'POST',
                        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
                        body: JSON.stringify({ taskId: groupDetail.id, responses: groupAnswers, isDraft })
                    });
                    if (res.ok) {
                        showAlert('Berhasil', isDraft ? 'Draft tersimpan!' : 'Tugas berhasil dikirim!', 'success', () => {
                            if (!isDraft) { setViewMode('LIST'); fetchGroupTasks(); }
                            else { openGroupTask(groupDetail.id); }
                            closeModal();
                        });
                    } else {
                        const err = await res.json();
                        showAlert('Gagal', err.error || 'Gagal mengirim tugas.', 'error');
                    }
                } catch (e) { showAlert('Error', 'Masalah koneksi.', 'error'); }
                setSubmitting(false);
            }
        );
    };

    // [NEW] Select Leader
    const handleSelectLeader = async (studentId) => {
        showConfirm('Pilih Ketua', 'Yakin memilih anggota ini sebagai Ketua Kelompok?', async () => {
            try {
                const res = await fetch(`/api/groups/${groupGroup.id}/leader`, {
                    method: 'POST',
                    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
                    body: JSON.stringify({ studentId })
                });
                if (res.ok) {
                    showAlert('Berhasil', 'Ketua kelompok berhasil dipilih!', 'success', () => {
                        openGroupTask(groupDetail.id);
                        closeModal();
                    });
                } else {
                    const err = await res.json();
                    showAlert('Gagal', err.error || 'Gagal memilih ketua.', 'error');
                }
            } catch (e) { showAlert('Error', 'Masalah koneksi.', 'error'); }
        });
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

    useEffect(() => { fetchTasks(); fetchGroupTasks(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        const isIndividu = taskTab === 'INDIVIDU';
        const currentLoading = isIndividu ? loading : loadingGroup;
        const currentTasks = isIndividu ? tasks : groupTasks;

        return (
            <div className="flex flex-col h-full bg-zinc-950 text-white animate-in fade-in">
                <CustomModal modal={modal} closeModal={closeModal} modalCallbackRef={modalCallbackRef} />
                <div className="bg-zinc-900 border-b border-zinc-800 p-4 pt-safe sticky top-0 z-10 shadow-lg">
                    <div className="flex items-center gap-3 mb-3">
                        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-full font-bold text-zinc-400 hover:text-white hover:bg-zinc-700">←</button>
                        <h2 className="font-bold text-lg text-white">Daftar Tugas</h2>
                    </div>
                    {/* TAB SWITCHER */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setTaskTab('INDIVIDU')}
                            className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${taskTab === 'INDIVIDU' ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/30' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                        >📝 Individu</button>
                        <button
                            onClick={() => { setTaskTab('KELOMPOK'); if (groupTasks.length === 0 && !loadingGroup) fetchGroupTasks(); }}
                            className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${taskTab === 'KELOMPOK' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                        >👥 Kelompok</button>
                    </div>
                </div>

                <div className="p-4 space-y-3 pb-24 overflow-y-auto flex-1">
                    {currentLoading && <div className="text-center p-8 text-zinc-500 animate-pulse">Memuat tugas...</div>}
                    {!currentLoading && currentTasks.length === 0 && <div className="text-center p-8 text-zinc-600 italic">{isIndividu ? 'Tidak ada tugas individu aktif.' : 'Tidak ada tugas kelompok aktif.'}</div>}

                    {/* INDIVIDUAL TASKS */}
                    {isIndividu && tasks.map(t => {
                        const isDone = t.status !== 'BELUM_DIKERJAKAN';
                        const deadlineDate = t.deadline ? new Date(t.deadline) : null;
                        const isExpiredList = deadlineDate && new Date() > deadlineDate;
                        const isLocked = isExpiredList && !isDone;
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
                                        <button className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold text-xs shadow-lg shadow-blue-900/20 hover:bg-blue-500 transition border border-blue-500">➜ LANJUTKAN PENGERJAAN</button>
                                    ) : (
                                        <button className="w-full py-2 bg-orange-600 text-white rounded-lg font-bold text-xs shadow-lg shadow-orange-900/20 group-hover:bg-orange-500 transition">KERJAKAN SEKARANG →</button>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* GROUP TASKS */}
                    {!isIndividu && groupTasks.map(t => {
                        const deadlineDate = t.deadline ? new Date(t.deadline) : null;
                        const isExpiredList = deadlineDate && new Date() > deadlineDate;
                        const hasSubmission = !!t.submission_id;
                        const isDraft = t.is_graded === -1;
                        const isSubmitted = hasSubmission && !isDraft; // final submitted
                        const isGraded = t.is_graded === 1 && t.is_published == 1; // graded AND published
                        const isBeingReviewed = t.is_graded === 1 && t.is_published != 1; // graded but NOT published
                        const isLocked = isExpiredList && !hasSubmission;

                        let statusText, statusColor;
                        if (isDraft) {
                            statusText = 'DRAFT'; statusColor = 'bg-zinc-800 text-zinc-400 border-zinc-600';
                        } else if (isGraded) {
                            statusText = 'DINILAI'; statusColor = 'bg-green-900/30 text-green-400 border-green-800';
                        } else if (isBeingReviewed) {
                            statusText = 'DIPERIKSA'; statusColor = 'bg-blue-900/30 text-blue-400 border-blue-800';
                        } else if (isSubmitted) {
                            statusText = 'DIKUMPULKAN'; statusColor = 'bg-yellow-900/30 text-yellow-400 border-yellow-800';
                        } else {
                            statusText = 'BELUM DIKERJAKAN'; statusColor = 'bg-zinc-800 text-zinc-400 border-zinc-700';
                        }

                        return (
                            <div key={t.id} onClick={() => !isLocked && openGroupTask(t.id)} className={`p-4 rounded-xl border transition-all relative overflow-hidden group ${isLocked ? 'bg-zinc-900/50 border-zinc-800 opacity-60 cursor-not-allowed' : 'bg-zinc-900 border-zinc-800 hover:border-purple-900 cursor-pointer active:scale-[0.98]'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${statusColor}`}>{statusText}</span>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-900/30 text-purple-400 border border-purple-800">👥 {t.my_group_name}</span>
                                    </div>
                                    {isGraded && t.grade !== null && <span className={`text-xl font-black ${getGradeColor(t.grade)}`}>{t.grade}</span>}
                                </div>
                                <h3 className="font-bold text-white mb-1 text-lg">{t.title}</h3>
                                <div className="flex gap-3 text-xs text-zinc-400">
                                    <span>📅 {deadlineDate ? deadlineDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Tanpa Deadline'}</span>
                                    <span>📎 {t.group_set_name}</span>
                                </div>
                                <div className="mt-4">
                                    {isGraded ? (
                                        <button className="w-full py-2 bg-zinc-800 text-zinc-300 rounded-lg font-bold text-xs border border-zinc-700">👁️ LIHAT HASIL</button>
                                    ) : isLocked ? (
                                        <button disabled className="w-full py-2 bg-red-900/20 text-red-500 rounded-lg font-bold text-xs border border-red-900/30">🔒 DITUTUP</button>
                                    ) : isDraft ? (
                                        <button className="w-full py-2 bg-purple-600 text-white rounded-lg font-bold text-xs shadow-lg shadow-purple-900/20 group-hover:bg-purple-500 transition">📝 LANJUTKAN →</button>
                                    ) : isSubmitted ? (
                                        <button className="w-full py-2 bg-zinc-800 text-zinc-300 rounded-lg font-bold text-xs border border-zinc-700">📋 LIHAT JAWABAN</button>
                                    ) : (
                                        <button className="w-full py-2 bg-purple-600 text-white rounded-lg font-bold text-xs shadow-lg shadow-purple-900/20 group-hover:bg-purple-500 transition">KERJAKAN BERSAMA →</button>
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
                <div className="flex-1 overflow-y-auto px-3 py-4 pb-40 space-y-4">

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

                    {activeTask.description && (
                        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-base text-zinc-300">
                            <p className="font-bold text-white mb-2 text-lg">Instruksi:</p>
                            <div className="leading-relaxed">{activeTask.description}</div>
                        </div>
                    )}

                    {questions.map((q, idx) => (
                        <div key={q.id} className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 shadow-sm">
                            {/* Header Soal */}
                            <div className="mb-4">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="bg-orange-900/30 border border-orange-800/50 text-orange-500 px-3 py-1.5 rounded-lg text-sm font-black tracking-wide">NO {idx + 1}</span>
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
                                <div className="prose prose-lg prose-invert max-w-none font-medium text-zinc-100 leading-relaxed" dangerouslySetInnerHTML={{ __html: processContentForDisplay(q.questionText) }}></div>
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
                                                    className={`flex items-center gap-4 p-4 rounded-xl border transition ${itemClass}`}>
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${badgeClass}`}>
                                                        {char}
                                                    </div>
                                                    <span className="text-base font-medium">{opt}</span>
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
                                            className="w-full p-4 bg-black border border-zinc-700 rounded-xl focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition text-base min-h-[120px] text-zinc-100 placeholder-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed"
                                            placeholder={isReadOnly ? "Tidak ada jawaban" : "Ketik jawaban Anda di sini..."}
                                            maxLength={q.charLimit || 500}
                                            value={answers[q.id]?.answerText || ''}
                                            onChange={(e) => handleAnswerChange(q.id, 'answerText', e.target.value)}
                                            disabled={isReadOnly || isExpired}
                                        />
                                        {/* [TRANSPARANSI NILAI ESSAY] - Hanya tampil jika BELUM dinilai */}
                                        {isReadOnly && answers[q.id]?.earnedScore === undefined && (
                                            <div className="mt-2 text-right">
                                                <span className="text-xs text-zinc-500 animate-pulse">
                                                    ⏳ Menunggu penilaian guru...
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

    // 3. GROUP TASK DETAIL VIEW (DARK MODE)
    if (viewMode === 'GROUP_DETAIL' && groupDetail) {
        const grpReadOnly = groupSubmission?.submitted_at && !groupSubmission?.is_draft;
        const grpShowKey = groupDetail.show_discussion;
        const grpPgCount = groupQuestions.filter(q => q.type === 'pg').length;
        const grpPgScorePerItem = grpPgCount > 0 ? (groupDetail.pg_weight / grpPgCount) : 0;

        // Group image upload handler
        const handleGroupFileUpload = async (qId, files) => {
            if (!files || files.length === 0 || grpReadOnly) return;
            const currentImages = groupAnswers[qId]?.answerImages || [];
            const remainingSlots = 5 - currentImages.length;
            if (remainingSlots <= 0) return showAlert('Batas Tercapai', 'Maksimal 5 gambar per soal.', 'error');
            const filesToProcess = Array.from(files).slice(0, remainingSlots);
            setGroupUploading(prev => ({ ...prev, [qId]: true }));
            try {
                const uploadedUrls = [];
                for (const file of filesToProcess) {
                    if (file.size > 10 * 1024 * 1024) { showAlert('Peringatan', `File ${file.name} terlalu besar (Max 10MB).`, 'error'); continue; }
                    const compressedFile = await compressImage(file);
                    const formData = new FormData();
                    formData.append('file', compressedFile);
                    const token = localStorage.getItem('student_token');
                    const res = await fetch('/api/student/upload', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
                    if (res.ok) { const data = await res.json(); uploadedUrls.push(data.url); }
                    else { const errData = await res.json().catch(() => ({})); showAlert('Upload Gagal', errData.error || 'Gagal upload gambar.', 'error'); }
                }
                if (uploadedUrls.length > 0) {
                    const newImages = [...currentImages, ...uploadedUrls];
                    setGroupAnswers(prev => ({ ...prev, [qId]: { ...prev[qId], answerImages: newImages, image: newImages[0] } }));
                }
            } catch (e) { showAlert('Error', 'Gagal upload gambar.', 'error'); }
            setGroupUploading(prev => ({ ...prev, [qId]: false }));
        };

        const handleGroupRemoveImage = (qId, imageIndex) => {
            const currentImages = groupAnswers[qId]?.answerImages || [];
            const newImages = currentImages.filter((_, idx) => idx !== imageIndex);
            setGroupAnswers(prev => ({ ...prev, [qId]: { ...prev[qId], answerImages: newImages, image: newImages[0] || null } }));
        };

        return (
            <div className="flex flex-col h-full bg-zinc-950 animate-in slide-in-from-bottom-4 duration-300 text-white">
                <CustomModal modal={modal} closeModal={closeModal} modalCallbackRef={modalCallbackRef} />
                <DiscussionGlobalModal
                    show={showGroupDiscussion}
                    onClose={() => setShowGroupDiscussion(false)}
                    activeTask={groupDetail}
                />

                {/* Header */}
                <div className="bg-zinc-900 border-b border-zinc-800 p-3 pt-safe sticky top-0 z-20 shadow-lg flex justify-between items-center">
                    <button onClick={() => { setViewMode('LIST'); setTaskTab('KELOMPOK'); }} className="text-zinc-400 font-bold text-sm hover:text-white px-2">← Kembali</button>
                    <div className="text-center">
                        <h3 className="font-bold text-sm max-w-[150px] truncate text-white">{groupDetail.title}</h3>
                        <span className="text-[10px] text-purple-400 font-bold">👥 {groupGroup?.name}</span>
                    </div>
                    <div className="w-8"></div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-3 py-4 pb-40 space-y-4">

                    {/* Score card if graded */}
                    {groupSubmission?.is_graded === 1 && groupSubmission?.grade !== null && (
                        <div className="space-y-4">
                            <div className={`bg-zinc-900 border ${getGradeBorderColor(groupSubmission.grade)} p-5 rounded-2xl relative overflow-hidden`}>
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <svg className={`w-24 h-24 ${getGradeColor(groupSubmission.grade)}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                </div>
                                <div className="relative z-10">
                                    <p className="text-xs font-bold text-zinc-500 uppercase mb-1">Nilai Kelompok</p>
                                    <p className={`text-4xl font-black ${getGradeColor(groupSubmission.grade)} mb-2`}>{groupSubmission.grade}<span className="text-lg text-zinc-600 font-medium">/100</span></p>
                                    <div className="flex gap-4 text-xs text-zinc-400 mt-2">
                                        <span>PG Weight: {groupDetail.pg_weight}%</span>
                                        <span>Essay Weight: {100 - groupDetail.pg_weight}%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Pembahasan Button */}
                            {grpShowKey && (groupDetail.discussion_text || groupDetail.discussion_url) && (
                                <button
                                    onClick={() => setShowGroupDiscussion(true)}
                                    className="w-full py-3 bg-blue-900/30 text-blue-400 border border-blue-800 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-900/50 transition"
                                >
                                    <span>📖</span> LIHAT KUNCI & PEMBAHASAN GLOBAL
                                </button>
                            )}
                        </div>
                    )}

                    {/* Group Members & Leader */}
                    <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                        <p className="text-xs font-bold text-zinc-500 uppercase mb-3">👑 Ketua Kelompok</p>
                        {groupGroup?.leader_id ? (
                            <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3 text-sm">
                                <span className="text-yellow-400 font-bold">{groupLeaderName} {groupIsLeader && '(Anda)'}</span>
                            </div>
                        ) : (
                            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                                <p className="text-red-400 text-xs font-bold mb-3">⚠️ Belum ada ketua! Pilih salah satu anggota:</p>
                                <div className="flex flex-wrap gap-2">
                                    {groupGroup?.members?.map(m => (
                                        <button key={m.id} onClick={() => handleSelectLeader(m.id)} className="text-xs bg-zinc-800 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-zinc-700 transition border border-zinc-700">
                                            Pilih {m.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="mt-3">
                            <p className="text-xs font-bold text-zinc-500 uppercase mb-2">Anggota ({groupGroup?.members?.length || 0})</p>
                            <div className="flex flex-wrap gap-2">
                                {groupGroup?.members?.map(m => (
                                    <span key={m.id} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded-lg border border-zinc-700">
                                        {m.name} {m.id === groupGroup.leader_id && '👑'}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    {groupDetail.description && (
                        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                            <p className="font-bold text-white mb-2">Instruksi:</p>
                            <p className="text-sm text-zinc-300">{groupDetail.description}</p>
                        </div>
                    )}

                    {/* Questions */}
                    {groupQuestions.map((q, idx) => {
                        const qType = q.type || 'essay_text';
                        return (
                            <div key={q.id} className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                                <div className="mb-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="bg-purple-900/30 border border-purple-800/50 text-purple-400 px-3 py-1.5 rounded-lg text-sm font-black">NO {idx + 1}</span>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${qType === 'pg' ? 'bg-blue-900/30 text-blue-400 border border-blue-800' : qType === 'essay_image' ? 'bg-purple-900/30 text-purple-400 border border-purple-800' : 'bg-green-900/30 text-green-400 border border-green-800'}`}>
                                                {qType === 'pg' ? 'PG' : qType === 'essay_image' ? '📷 Gambar' : '📝 Teks'}
                                            </span>
                                            {grpReadOnly && groupSubmission?.is_graded === 1 && groupAnswers[q.id]?.score !== undefined ? (
                                                (() => {
                                                    const earned = Number(groupAnswers[q.id].score) || 0;
                                                    const maxPoin = qType === 'pg' ? grpPgScorePerItem : (q.weight || 0);
                                                    const percentage = maxPoin > 0 ? (earned / maxPoin) * 100 : 0;
                                                    return (
                                                        <span className="text-[10px] font-bold">
                                                            <span className="text-zinc-500">Bobot: {qType === 'pg' ? grpPgScorePerItem.toFixed(0) : q.weight}%</span>
                                                            <span className="text-zinc-600 mx-1">·</span>
                                                            <span className={getGradeColor(percentage)}>Poin: {earned.toFixed(1)}</span>
                                                        </span>
                                                    );
                                                })()
                                            ) : (
                                                <span className="text-[10px] font-bold text-zinc-500">Bobot: {qType === 'pg' ? grpPgScorePerItem.toFixed(0) : q.weight}%</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-zinc-100 font-medium" dangerouslySetInnerHTML={{ __html: q.question_text }}></div>
                                    {q.question_image_url && <img src={q.question_image_url} className="mt-3 rounded-lg border border-zinc-700 max-h-60 object-contain bg-black" />}
                                </div>

                                {/* Answer Input */}
                                <div className="border-t border-zinc-800 pt-4">
                                    {/* PG TYPE */}
                                    {qType === 'pg' && q.options ? (
                                        <div className="space-y-2">
                                            {(typeof q.options === 'string' ? JSON.parse(q.options) : q.options).map((opt, oIdx) => {
                                                if (!opt) return null;
                                                const char = String.fromCharCode(65 + oIdx);
                                                const isSelected = groupAnswers[q.id]?.option === char;

                                                let itemClass = 'bg-black border-zinc-800 text-zinc-400 hover:bg-zinc-800 cursor-pointer';
                                                let badgeClass = 'border-zinc-700 bg-zinc-900 text-zinc-500';

                                                if (grpReadOnly) {
                                                    if (grpShowKey) {
                                                        const isCorrect = q.correct_key === char;
                                                        if (isCorrect) {
                                                            itemClass = 'bg-green-900/20 border-green-600 text-green-400';
                                                            badgeClass = 'border-green-500 bg-green-900 text-green-400';
                                                        } else if (isSelected && !isCorrect) {
                                                            itemClass = 'bg-red-900/20 border-red-800 text-red-500';
                                                            badgeClass = 'border-red-800 bg-red-900 text-red-400';
                                                        }
                                                    } else {
                                                        if (isSelected) {
                                                            itemClass = 'bg-blue-900/20 border-blue-800 text-blue-400';
                                                            badgeClass = 'border-blue-700 bg-blue-900 text-blue-400';
                                                        }
                                                    }
                                                } else {
                                                    if (isSelected) {
                                                        itemClass = 'bg-purple-600 border-purple-500 text-white';
                                                        badgeClass = 'border-white bg-white text-purple-600';
                                                    }
                                                }

                                                return (
                                                    <div key={oIdx}
                                                        onClick={() => !grpReadOnly && setGroupAnswers(prev => ({ ...prev, [q.id]: { ...prev[q.id], option: char, text: char } }))}
                                                        className={`flex items-center gap-4 p-4 rounded-xl border transition ${itemClass} ${grpReadOnly ? 'pointer-events-none' : ''}`}
                                                    >
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${badgeClass}`}>{char}</div>
                                                        <span className="text-base font-medium">{opt}</span>
                                                    </div>
                                                );
                                            })}
                                            {/* PG Summary Card when show_discussion */}
                                            {grpReadOnly && grpShowKey && (() => {
                                                const myAns = groupAnswers[q.id]?.option || null;
                                                const isCorrect = myAns === q.correct_key;
                                                return (
                                                    <div className={`mt-4 p-3 rounded-xl border text-sm font-bold flex items-center gap-2 ${!myAns ? 'bg-yellow-900/20 border-yellow-700 text-yellow-400' : isCorrect ? 'bg-green-900/20 border-green-700 text-green-400' : 'bg-red-900/20 border-red-700 text-red-400'}`}>
                                                        <span>{!myAns ? '⚠️' : isCorrect ? '✅' : '❌'}</span>
                                                        <span>
                                                            {!myAns ? 'Tidak Dijawab' : `Jawaban: ${myAns}`}
                                                            {myAns && !isCorrect && <span className="text-zinc-400 font-normal ml-2">• Jawaban Benar: {q.correct_key}</span>}
                                                            {isCorrect && <span className="ml-2">• BENAR</span>}
                                                        </span>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    ) : null}

                                    {/* ESSAY TEXT TYPE */}
                                    {(qType === 'essay' || qType === 'essay_text') && (
                                        <div>
                                            <textarea
                                                className="w-full p-4 bg-black border border-zinc-700 rounded-xl focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none text-base min-h-[120px] text-zinc-100 placeholder-zinc-600 disabled:opacity-50"
                                                placeholder={grpReadOnly ? 'Tidak ada jawaban' : 'Tulis jawaban kelompok...'}
                                                value={groupAnswers[q.id]?.text || ''}
                                                onChange={(e) => setGroupAnswers(prev => ({ ...prev, [q.id]: { ...prev[q.id], text: e.target.value } }))}
                                                disabled={grpReadOnly}
                                            />
                                            {grpReadOnly && !groupAnswers[q.id]?.is_graded && groupSubmission?.is_graded !== 1 && (
                                                <div className="mt-2 text-right"><span className="text-xs text-zinc-500 animate-pulse">⏳ Menunggu penilaian guru...</span></div>
                                            )}
                                        </div>
                                    )}

                                    {/* ESSAY IMAGE TYPE */}
                                    {qType === 'essay_image' && (() => {
                                        const images = groupAnswers[q.id]?.answerImages || [];
                                        const canAddMore = !grpReadOnly && images.length < 5;
                                        return (
                                            <div>
                                                {images.length > 0 && (
                                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                                        {images.map((imgUrl, imgIdx) => (
                                                            <div key={imgIdx} className="relative group aspect-square">
                                                                <img src={imgUrl} className="w-full h-full object-cover rounded-lg border border-zinc-700 bg-black" alt={`Jawaban ${imgIdx + 1}`} />
                                                                {!grpReadOnly && (
                                                                    <button onClick={() => handleGroupRemoveImage(q.id, imgIdx)} className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold text-[10px] shadow-md hover:bg-red-700 transition opacity-0 group-hover:opacity-100">✕</button>
                                                                )}
                                                                <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">{imgIdx + 1}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {canAddMore && (
                                                    <div>
                                                        <input type="file" id={`grp-file-${q.id}`} className="hidden" accept="image/*" multiple capture={groupDetail.allow_gallery ? undefined : "environment"} onChange={(e) => handleGroupFileUpload(q.id, e.target.files)} disabled={grpReadOnly} />
                                                        <label htmlFor={`grp-file-${q.id}`} className="w-full py-4 border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-1 transition cursor-pointer hover:bg-zinc-900 hover:border-purple-900/50">
                                                            <span className="text-xl">{groupUploading[q.id] ? '⏳' : images.length > 0 ? '➕' : '📷'}</span>
                                                            <span className="text-xs font-bold text-zinc-500">{groupUploading[q.id] ? 'Mengupload...' : images.length > 0 ? `Tambah Foto (${images.length}/5)` : 'Ambil Foto Jawaban'}</span>
                                                        </label>
                                                    </div>
                                                )}
                                                {grpReadOnly && images.length === 0 && (
                                                    <div className="py-6 border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-1 opacity-50">
                                                        <span className="text-xl">🖼️</span>
                                                        <span className="text-xs font-bold text-zinc-500">Tidak ada gambar</span>
                                                    </div>
                                                )}
                                                {!grpReadOnly && images.length >= 5 && <p className="text-[10px] text-zinc-500 text-center mt-2">Maksimal 5 gambar tercapai</p>}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        );
                    })}

                    {/* Feedback / Catatan Guru */}
                    {groupSubmission?.feedback && (
                        <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-4">
                            <p className="text-xs font-bold text-blue-400 uppercase mb-2">📝 Catatan Guru</p>
                            <p className="text-sm text-blue-300 whitespace-pre-wrap">{groupSubmission.feedback}</p>
                        </div>
                    )}

                    {/* Activity Log */}
                    {groupActivityLogs.length > 0 && (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
                            <button onClick={() => setShowGroupLogs(!showGroupLogs)} className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-800/50 transition rounded-xl">
                                <div className="flex items-center gap-2">
                                    <span className="text-zinc-500">🕐</span>
                                    <span className="font-bold text-sm text-zinc-400">Riwayat Aktivitas ({groupActivityLogs.length})</span>
                                </div>
                                <span className="text-zinc-500 text-xs">{showGroupLogs ? '▲' : '▼'}</span>
                            </button>
                            {showGroupLogs && (
                                <div className="border-t border-zinc-800 max-h-60 overflow-y-auto">
                                    {groupActivityLogs.map((log, idx) => (
                                        <div key={log.id || idx} className="flex items-start gap-3 px-4 py-3 border-b border-zinc-800/50 last:border-0">
                                            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${log.action === 'final_submit' ? 'bg-green-500' : 'bg-blue-400'}`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm">
                                                    <span className="font-bold text-zinc-200">{log.student_name || 'Siswa'}</span>
                                                    <span className="text-zinc-500 ml-1 text-xs">{log.detail}</span>
                                                </p>
                                                <p className="text-[10px] text-zinc-600 mt-0.5">
                                                    {new Date(log.created_at + (log.created_at.endsWith('Z') ? '' : 'Z')).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}
                                                </p>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${log.action === 'final_submit' ? 'bg-green-900/30 text-green-400' : 'bg-blue-900/30 text-blue-400'}`}>
                                                {log.action === 'final_submit' ? 'Dikirim' : 'Draft'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {!grpReadOnly && (
                    <div className="p-4 bg-zinc-900 border-t border-zinc-800 sticky bottom-0 z-20 pb-safe flex gap-3">
                        <button onClick={() => handleGroupSubmit(true)} disabled={submitting} className="flex-1 py-3.5 bg-zinc-800 text-zinc-300 rounded-xl font-bold text-sm hover:bg-zinc-700 disabled:opacity-50">
                            💾 SIMPAN DRAFT
                        </button>
                        <button
                            onClick={() => handleGroupSubmit(false)}
                            disabled={submitting || !groupGroup?.leader_id || !groupIsLeader}
                            className={`flex-[2] py-3.5 rounded-xl font-bold text-sm shadow-lg transition disabled:opacity-50 ${!groupGroup?.leader_id || !groupIsLeader ? 'bg-zinc-700 text-zinc-400' : 'bg-purple-600 text-white hover:bg-purple-500 active:scale-95'}`}
                        >
                            {submitting ? '⏳' : !groupGroup?.leader_id ? '⚠️ PILIH KETUA DULU' : !groupIsLeader ? '🔒 MENUNGGU KETUA' : '✈️ KIRIM FINAL'}
                        </button>
                    </div>
                )}

                {/* Footer Read Only */}
                {grpReadOnly && (
                    <div className="p-4 bg-zinc-900 border-t border-zinc-800 sticky bottom-0 z-20 pb-safe">
                        <button onClick={() => { setViewMode('LIST'); setTaskTab('KELOMPOK'); }} className="w-full py-3.5 bg-zinc-800 text-white rounded-xl font-bold text-sm hover:bg-zinc-700">
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
