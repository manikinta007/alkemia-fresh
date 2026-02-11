import React, { useMemo, useState, useRef, useEffect } from 'react';
import { X, CheckCircle2, XCircle, Search, ChevronRight, Image as ImageIcon, ZoomIn, Save, Clock, ChevronUp, ChevronDown, Users, Crown } from 'lucide-react';

// --- KOMPONEN UTAMA GRADING KELOMPOK ---
export const GroupTaskGrading = ({
    task,
    questions,
    groupSubmissions, // Array of { group_id, group_name, submission, status, members }
    selectedSubmission,
    gradeInput,
    setGradeInput,
    onSelectSubmission,
    onSave,
    onPublish,
    onBack,
    onOpenWeightModal,
    pgWeight,
    showConfirm
}) => {
    const [previewImage, setPreviewImage] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
    const [activeQuestionIdx, setActiveQuestionIdx] = useState(null);
    const [expandedGroups, setExpandedGroups] = useState({});
    const questionRefs = useRef({});

    // Essay Questions
    const essayQuestions = useMemo(() => {
        if (!selectedSubmission) return [];
        return selectedSubmission.answers
            .map((ans, idx) => ({ ...ans, originalIndex: idx }))
            .filter(ans => ans.type !== 'pg');
    }, [selectedSubmission]);

    // Essay Progress
    const essayProgress = useMemo(() => {
        const total = essayQuestions.length;
        const graded = essayQuestions.filter(ans => {
            const scoreKey = ans.answer_id || `q_${ans.question_id}`;
            const inputVal = gradeInput.essayScores[scoreKey];
            return inputVal !== undefined && inputVal !== '';
        }).length;
        return { graded, total };
    }, [essayQuestions, gradeInput]);

    // Scroll to question
    const scrollToQuestion = (idx) => {
        setActiveQuestionIdx(idx);
        const ref = questionRefs.current[idx];
        if (ref) ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    // Calculate current score
    const currentTotalScore = useMemo(() => {
        if (!selectedSubmission) return 0;
        let total = 0;

        const pgQs = selectedSubmission.answers.filter(a => a.type === 'pg');
        const pgCorrect = pgQs.filter(a => a.answer_text === a.correct_key).length;
        const pgTotalQs = questions.filter(q => q.type === 'pg').length;

        if (pgTotalQs > 0) {
            total += (pgCorrect / pgTotalQs) * pgWeight;
        }

        selectedSubmission.answers.forEach(a => {
            if (a.type !== 'pg') {
                const quality = gradeInput.essayScores[a.answer_id || `q_${a.question_id}`] || 0;
                const weight = a.weight || 0;
                total += (quality / 100) * weight;
            }
        });

        return Math.round(total * 10) / 10;
    }, [selectedSubmission, gradeInput, pgWeight, questions]);

    // Filtered groups
    const filteredGroups = useMemo(() => {
        if (!groupSubmissions) return [];
        let filtered = groupSubmissions;
        if (searchTerm) {
            filtered = filtered.filter(g =>
                g.group_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (g.members && g.members.some(m => m.name.toLowerCase().includes(searchTerm.toLowerCase())))
            );
        }
        return filtered;
    }, [groupSubmissions, searchTerm]);

    // Toggle group expansion
    const toggleGroupExpand = (groupId) => {
        setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    // Publish All
    const handlePublishAll = () => {
        const readyCount = filteredGroups.filter(g => g.status === 'DINILAI').length;
        const waitingCount = filteredGroups.filter(g => g.status === 'MENUNGGU_NILAI').length;
        const notSubmittedCount = filteredGroups.filter(g => g.status === 'BELUM_DIKERJAKAN').length;

        if (readyCount === 0) {
            alert('Tidak ada kelompok yang sudah selesai dinilai.');
            return;
        }

        let warningMessage = '';
        if (waitingCount > 0) {
            warningMessage = `⚠️ Perhatian:\n\n• ${waitingCount} kelompok belum diperiksa\n\nHanya ${readyCount} kelompok yang nilainya akan dipublish.\n\nLanjutkan?`;
        } else {
            warningMessage = notSubmittedCount > 0
                ? `Terbitkan nilai ${readyCount} kelompok yang sudah dinilai?\n\n(${notSubmittedCount} kelompok belum mengumpulkan)`
                : `Terbitkan nilai semua ${readyCount} kelompok?`;
        }

        if (confirm(warningMessage)) {
            onPublish(task.id, true);
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-zinc-50 animate-in fade-in relative">
            <div className="flex-1 flex overflow-hidden">

                {/* LEFT SIDEBAR: Groups & Status */}
                <div className="w-80 bg-white border-r border-zinc-200 flex flex-col shadow-xl z-20">
                    <div className="p-4 border-b border-zinc-100 bg-zinc-50/50">
                        <button onClick={onBack} className="text-xs font-bold text-zinc-400 hover:text-black mb-3 transition flex items-center gap-1">
                            <span className="text-sm">←</span> KEMBALI LIST
                        </button>
                        <h3 className="font-bold text-lg truncate leading-tight" title={task.title}>{task.title}</h3>
                        <div className="flex justify-between items-center mt-3 gap-2">
                            <span className="text-xs text-zinc-500 font-medium">
                                {filteredGroups.filter(g => g.submission).length} / {filteredGroups.length} Submit
                            </span>
                            <div className="flex gap-1">
                                <button onClick={onOpenWeightModal} className="text-[10px] bg-white text-zinc-600 px-3 py-1.5 rounded-lg font-bold border border-zinc-200 hover:bg-zinc-50 transition shadow-sm" title="Atur Bobot">
                                    ⚙️ BOBOT
                                </button>
                                <button onClick={handlePublishAll} className="text-[10px] bg-black text-white px-3 py-1.5 rounded-lg font-bold hover:bg-zinc-800 transition shadow-sm border border-black" title="Terbitkan Semua Nilai">
                                    📢 TERBITKAN
                                </button>
                            </div>
                        </div>
                        {/* Search */}
                        <div className="mt-3 relative">
                            <Search className="absolute left-3 top-2.5 text-zinc-400" size={14} />
                            <input
                                type="text"
                                placeholder="Cari kelompok / anggota..."
                                className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-400"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* GROUP LIST */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {filteredGroups.map(({ group_id, group_name, submission, status, members }) => {
                            const isExpanded = expandedGroups[group_id];
                            const isSelected = selectedSubmission?.submission?.group_id === group_id;

                            return (
                                <div key={group_id} className="rounded-lg overflow-hidden">
                                    {/* Group Header */}
                                    <div
                                        className={`p-3 border transition flex items-center justify-between group cursor-pointer ${status === 'BELUM_DIKERJAKAN'
                                            ? 'opacity-60 bg-zinc-50/50 border-transparent'
                                            : isSelected
                                                ? 'bg-purple-50 border-purple-200 shadow-sm ring-1 ring-purple-200'
                                                : 'hover:bg-zinc-50 border-transparent bg-white'
                                            }`}
                                        onClick={() => {
                                            if (status !== 'BELUM_DIKERJAKAN' && submission) {
                                                onSelectSubmission(submission.id);
                                            }
                                        }}
                                    >
                                        <div className="flex-1 min-w-0 mr-2">
                                            <div className="flex items-center gap-2">
                                                <Users size={14} className="text-purple-500 shrink-0" />
                                                <p className={`font-bold text-sm truncate ${status === 'BELUM_DIKERJAKAN' ? 'text-zinc-400' : 'text-zinc-900'}`}>
                                                    {group_name}
                                                </p>
                                                {/* Expand toggle */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleGroupExpand(group_id); }}
                                                    className="text-zinc-400 hover:text-zinc-600 transition shrink-0"
                                                >
                                                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                </button>
                                            </div>
                                            <div className="flex justify-between items-center mt-1">
                                                {status === 'BELUM_DIKERJAKAN' && <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded">BELUM KUMPUL</span>}
                                                {status === 'MENUNGGU_NILAI' && (
                                                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
                                                        SUDAH KUMPUL
                                                    </span>
                                                )}
                                                {status === 'DINILAI' && (
                                                    <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded border border-green-200">
                                                        NILAI: {submission?.grade}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Publish toggle */}
                                        {submission && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Individual publish not supported for groups, just visual indicator
                                                }}
                                                className={`w-8 h-8 flex items-center justify-center rounded-lg transition z-20 border ${submission.is_published
                                                    ? 'bg-green-50 text-green-600 border-green-200'
                                                    : 'bg-white text-zinc-300 border-zinc-200'
                                                    }`}
                                                title={submission.is_published ? "Status: TERBIT" : "Status: TERSEMBUNYI"}
                                            >
                                                {submission.is_published ? (
                                                    <CheckCircle2 size={16} />
                                                ) : (
                                                    <div className="w-4 h-4 rounded-full border-2 border-zinc-300"></div>
                                                )}
                                            </button>
                                        )}
                                    </div>

                                    {/* Expanded Members */}
                                    {isExpanded && members && members.length > 0 && (
                                        <div className="bg-zinc-50 border-x border-b border-zinc-100 rounded-b-lg px-3 py-2 space-y-1">
                                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Anggota ({members.length})</p>
                                            {members.map(m => (
                                                <div key={m.id} className="flex items-center gap-2 text-xs text-zinc-600 py-0.5">
                                                    {submission && submission.submitted_by === m.id ? (
                                                        <Crown size={12} className="text-yellow-500 shrink-0" />
                                                    ) : (
                                                        <div className="w-3 h-3 rounded-full bg-zinc-200 shrink-0"></div>
                                                    )}
                                                    <span className={submission && submission.submitted_by === m.id ? 'font-bold' : ''}>
                                                        {m.name}
                                                    </span>
                                                    {submission && submission.submitted_by === m.id && (
                                                        <span className="text-[10px] text-yellow-600 bg-yellow-50 px-1 rounded">Pengirim</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {filteredGroups.length === 0 && (
                            <div className="p-8 text-center text-xs text-zinc-400">Data kelompok tidak ditemukan.</div>
                        )}
                    </div>
                </div>

                {/* RIGHT AREA: Answer Sheet */}
                <div className="flex-1 flex flex-col bg-zinc-50 relative h-full">
                    {!selectedSubmission ? (
                        <div className="flex-1 flex items-center justify-center text-zinc-300 flex-col">
                            <div className="p-8 bg-zinc-100 rounded-full mb-4">
                                <Users size={48} className="opacity-20" />
                            </div>
                            <p className="font-bold">Pilih kelompok dari panel kiri untuk mulai menilai.</p>
                        </div>
                    ) : (
                        <>
                            {/* Sticky Header */}
                            <div className="bg-white border-b border-zinc-200 p-4 flex justify-between items-center shadow-lg shadow-zinc-200/50 sticky top-0 z-30">
                                <div>
                                    <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                                        <Users size={20} className="text-purple-500" />
                                        {selectedSubmission.submission.group_name}
                                    </h2>
                                    <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                                        <Clock size={12} /> Dikumpulkan oleh {selectedSubmission.submission.submitter_name} • {new Date(selectedSubmission.submission.submitted_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
                                    </p>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">PROYEKSI NILAI AKHIR</div>
                                        <div className="text-3xl font-black text-blue-600 leading-none">{currentTotalScore}</div>
                                    </div>
                                    <div className="h-10 w-px bg-zinc-200"></div>
                                    <button
                                        onClick={() => onSave(currentTotalScore, true)}
                                        className="px-6 py-3 bg-black text-white font-bold rounded-xl hover:bg-zinc-800 shadow-lg hover:shadow-xl transition active:scale-95 flex items-center gap-2"
                                    >
                                        <Save size={18} />
                                        SIMPAN & LANJUT →
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                                {/* Feedback */}
                                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 shadow-sm">
                                    <label className="text-xs font-bold text-orange-800 uppercase tracking-widest mb-3 block">CATATAN GURU (FEEDBACK)</label>
                                    <textarea
                                        className="w-full bg-white border border-orange-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 transition resize-none shadow-sm"
                                        rows="3"
                                        placeholder="Berikan masukan untuk kelompok ini..."
                                        value={gradeInput.feedback}
                                        onChange={e => setGradeInput({ ...gradeInput, feedback: e.target.value })}
                                    ></textarea>
                                </div>

                                {/* Questions */}
                                {selectedSubmission.answers.map((ans, idx) => {
                                    const isPG = ans.type === 'pg';
                                    const isCorrect = isPG && ans.answer_text === ans.correct_key;
                                    const savedScore = ans.score || 0;

                                    return (
                                        <div
                                            key={idx}
                                            ref={el => questionRefs.current[idx] = el}
                                            className={`bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition ${activeQuestionIdx === idx ? 'border-blue-400 ring-2 ring-blue-100' : 'border-zinc-200'}`}
                                        >
                                            {/* Question Header */}
                                            <div className="p-6 border-b border-zinc-50 bg-zinc-50/30">
                                                <div className="flex justify-between items-start mb-3">
                                                    <span className="bg-zinc-100 text-zinc-600 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-zinc-200">
                                                        NO {idx + 1} • {ans.type.toUpperCase().replace('_TEXT', '')}
                                                    </span>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-xs font-bold text-zinc-400">
                                                            Bobot: {isPG ? 'Auto' : ans.weight + '%'}
                                                        </span>
                                                        {!isPG && (
                                                            <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-lg mt-1 border border-green-100">
                                                                Tersimpan: {savedScore.toFixed ? savedScore.toFixed(1) : savedScore} Poin
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="prose prose-sm max-w-none text-zinc-800 font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: ans.question_text }}></div>
                                                {ans.question_image_url && (
                                                    <div className="mt-4 inline-block cursor-zoom-in group relative" onClick={() => setPreviewImage(ans.question_image_url)}>
                                                        <img src={ans.question_image_url} className="max-h-60 rounded-xl border border-zinc-200 bg-white" alt="Soal" />
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition rounded-xl">
                                                            <span className="opacity-0 group-hover:opacity-100 bg-black/70 text-white text-[10px] px-3 py-1.5 rounded-full backdrop-blur-sm font-bold flex items-center gap-1 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition">
                                                                <ZoomIn size={12} /> ZOOM
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Answer + Grade */}
                                            <div className="p-6 flex flex-col md:flex-row gap-6">
                                                <div className="flex-1">
                                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">JAWABAN KELOMPOK</p>
                                                    {isPG ? (
                                                        <div className="flex items-center gap-4 bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                                                            <div className={`text-2xl font-bold w-12 h-12 flex items-center justify-center rounded-xl shrink-0 shadow-sm ${isCorrect ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                                                                {ans.answer_text}
                                                            </div>
                                                            <div>
                                                                <p className={`font-bold text-sm ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                                                                    {isCorrect ? 'JAWABAN BENAR' : 'JAWABAN SALAH'}
                                                                </p>
                                                                {!isCorrect && <p className="text-xs text-zinc-500 mt-0.5">Kunci Jawaban: <span className="font-bold text-black bg-zinc-200 px-1.5 rounded ml-1">{ans.correct_key}</span></p>}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-zinc-50 p-5 rounded-xl border border-zinc-100">
                                                            {ans.type === 'essay_image' && ans.answer_image_url ? (() => {
                                                                let images = [];
                                                                try {
                                                                    if (ans.answer_image_url.startsWith('[')) images = JSON.parse(ans.answer_image_url);
                                                                    else images = [ans.answer_image_url];
                                                                } catch (e) { images = [ans.answer_image_url]; }

                                                                return (
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {images.map((imgUrl, imgIdx) => (
                                                                            <div key={imgIdx} className="group relative cursor-zoom-in" onClick={() => setPreviewImage(imgUrl)}>
                                                                                <img src={imgUrl} className="h-32 w-32 object-cover rounded-lg border bg-white shadow-sm group-hover:shadow-md transition" alt={`Jawaban ${imgIdx + 1}`} />
                                                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition rounded-lg flex items-center justify-center">
                                                                                    <span className="opacity-0 group-hover:opacity-100 bg-black/75 text-white text-[10px] px-2 py-1 rounded-full font-bold backdrop-blur-sm flex items-center gap-1">
                                                                                        <ZoomIn size={10} />
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                );
                                                            })() : (
                                                                <p className="whitespace-pre-wrap font-mono text-sm text-zinc-800 leading-relaxed">{ans.answer_text || '-'}</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* No answer submitted */}
                                                {!isPG && !ans.answer_text && !ans.answer_image_url && (
                                                    <div className="py-4 text-center">
                                                        <span className="text-zinc-400 italic text-sm">Belum dijawab oleh kelompok</span>
                                                    </div>
                                                )}
                                                {/* Essay Grade Input */}
                                                {!isPG && (
                                                    <div className="w-full md:w-56 bg-blue-50/50 p-5 rounded-xl border border-blue-100 flex flex-col justify-center shrink-0">
                                                        <label className="text-[10px] font-bold text-blue-800 uppercase mb-3 text-center">KUALITAS JAWABAN (0-100)</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="number" min="0" max="100"
                                                                className="text-center text-3xl font-black p-2 rounded-xl border border-blue-200 focus:border-blue-500 outline-none w-full shadow-inner bg-white text-blue-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                placeholder="-"
                                                                value={gradeInput.essayScores[ans.answer_id || `q_${ans.question_id}`] ?? ''}
                                                                onWheel={(e) => e.target.blur()}
                                                                onChange={e => {
                                                                    const rawVal = e.target.value;
                                                                    const scoreKey = ans.answer_id || `q_${ans.question_id}`;
                                                                    const val = rawVal === '' ? '' : Math.min(100, Math.max(0, parseInt(rawVal) || 0));
                                                                    setGradeInput({ ...gradeInput, essayScores: { ...gradeInput.essayScores, [scoreKey]: val } });
                                                                }}
                                                            />
                                                            <button
                                                                onClick={() => onSave(currentTotalScore, false)}
                                                                className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 shadow-md transition active:scale-95 flex items-center justify-center aspect-square"
                                                                title="Simpan Nilai Soal Ini"
                                                            >
                                                                <Save size={20} />
                                                            </button>
                                                        </div>
                                                        <div className="text-center text-blue-400 mt-3 text-[10px] font-medium bg-blue-100/50 py-1.5 rounded-lg border border-blue-100">
                                                            Konversi: <span className="font-bold text-blue-700">
                                                                {((gradeInput.essayScores[ans.answer_id || `q_${ans.question_id}`] || 0) / 100 * (ans.weight || 0)).toFixed(1)}
                                                            </span> Poin
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                <div className="h-20"></div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* FLOATING ESSAY NAV PANEL */}
            {selectedSubmission && essayQuestions.length > 0 && (
                <div className={`fixed bottom-6 right-6 z-[100] transition-all duration-300 ${isPanelCollapsed ? 'w-auto' : 'w-80'}`}>
                    <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden">
                        <button
                            onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
                            className="w-full flex items-center justify-between p-4 bg-zinc-50 border-b border-zinc-100 hover:bg-zinc-100 transition"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-lg">📝</span>
                                <span className="font-bold text-sm text-zinc-700">
                                    {essayProgress.graded}/{essayProgress.total} Essay Dinilai
                                </span>
                            </div>
                            {isPanelCollapsed ? <ChevronUp size={18} className="text-zinc-400" /> : <ChevronDown size={18} className="text-zinc-400" />}
                        </button>

                        {!isPanelCollapsed && (
                            <div className="p-4 space-y-4">
                                <div className="flex flex-wrap gap-2">
                                    {essayQuestions.map((ans) => {
                                        const isGraded = ans.is_graded === 1;
                                        const isActive = activeQuestionIdx === ans.originalIndex;
                                        return (
                                            <button
                                                key={ans.answer_id || `q_${ans.question_id}`}
                                                onClick={() => scrollToQuestion(ans.originalIndex)}
                                                className={`w-10 h-10 rounded-lg font-bold text-sm transition border-2 ${isActive
                                                    ? 'bg-zinc-700 text-white border-zinc-700'
                                                    : isGraded
                                                        ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200'
                                                        : 'bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200'
                                                    }`}
                                                title={`Soal ${ans.originalIndex + 1} ${isGraded ? '(Sudah Dinilai)' : '(Belum Dinilai)'}`}
                                            >
                                                {ans.originalIndex + 1}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Skor Sementara</p>
                                    <p className="text-2xl font-black text-blue-700">{currentTotalScore}<span className="text-sm text-blue-400">/100</span></p>
                                </div>

                                <button
                                    onClick={async () => {
                                        if (essayProgress.graded < essayProgress.total) {
                                            const confirmed = await showConfirm(
                                                `Masih ada ${essayProgress.total - essayProgress.graded} soal essay yang belum diperiksa. Tetap simpan?`
                                            );
                                            if (!confirmed) return;
                                        }
                                        onSave(currentTotalScore, true);
                                    }}
                                    className="w-full py-3 bg-black text-white font-bold rounded-xl hover:bg-zinc-800 transition flex items-center justify-center gap-2 shadow-lg"
                                >
                                    <Save size={18} />
                                    Simpan Semua & Lanjut
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* LIGHTBOX */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setPreviewImage(null)}
                >
                    <button onClick={() => setPreviewImage(null)} className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition z-[201]">
                        <X size={24} />
                    </button>
                    <img src={previewImage} className="max-w-full max-h-full rounded-lg shadow-2xl animate-in zoom-in-95 duration-200 select-none object-contain" onClick={(e) => e.stopPropagation()} alt="Preview" />
                </div>
            )}
        </div>
    );
};
