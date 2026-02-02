import React, { useMemo, useState } from 'react';
import { X, CheckCircle2, XCircle, Search, ChevronRight, Image as ImageIcon, ZoomIn, Save, Clock } from 'lucide-react';

// --- KOMPONEN UTAMA GRADING ---
export const TaskGrading = ({
    task,
    students, // Data Master Siswa untuk Traffic Light
    questions,
    submissions,
    selectedSubmission,
    gradeInput,
    setGradeInput,
    onSelectSubmission,
    onSave,
    onPublish,
    onBack,
    onOpenWeightModal,
    pgWeight
}) => {
    // State untuk Lightbox Gambar
    const [previewImage, setPreviewImage] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // --- 1. CALCULATOR: Hitung Nilai Real-time di sisi Client ---
    const currentTotalScore = useMemo(() => {
        if (!selectedSubmission) return 0;
        let total = 0;

        // Hitung Pilihan Ganda (PG)
        // Note: selectedSubmission.answers contains the student answers.
        // We assume 'start_truth' logic is handled here via matching text to key
        // Or if backend sends 'score' for PG we use that. 
        // Legacy code recalculates it: (pgCorrect / pgTotalQs) * pgWeight

        const pgQs = selectedSubmission.answers.filter(a => a.type === 'pg');
        const pgCorrect = pgQs.filter(a => a.answer_text === a.correct_key).length;
        const pgTotalQs = questions.filter(q => q.type === 'pg').length;

        if (pgTotalQs > 0) {
            const pgScore = (pgCorrect / pgTotalQs) * pgWeight;
            total += pgScore;
        }

        // Hitung Essay (Input 0-100 -> Dikonversi ke Poin Bobot)
        selectedSubmission.answers.forEach(a => {
            if (a.type !== 'pg') {
                const quality = gradeInput.essayScores[a.answer_id] || 0; // Skala 0-100
                const weight = a.weight || 0; // Poin maksimal soal ini
                const score = (quality / 100) * weight;
                total += score;
            }
        });

        // Round to 1 decimal
        return Math.round(total * 10) / 10;
    }, [selectedSubmission, gradeInput, pgWeight, questions]);

    // --- 2. TRAFFIC LIGHT LOGIC: Merge Students + Submissions ---
    const studentList = useMemo(() => {
        if (!students) return [];

        // A. Tentukan Target Siswa (Semua atau Remedial?)
        let targets = students;
        if (task.targetType === 'specific' && Array.isArray(task.allowedStudents)) {
            // Filter hanya siswa yang masuk whitelist remedial
            targets = students.filter(s => task.allowedStudents.includes(s.id));
        }

        // Filter by Search
        if (searchTerm) {
            targets = targets.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        // B. Merge dengan Data Pengumpulan
        return targets.map(student => {
            const sub = submissions.find(s => s.student_id === student.id);

            // Tentukan Status Warna
            let status = 'GRAY'; // Default: Belum Mengerjakan
            if (sub) {
                // Logic: Jika needs_review true (dari backend - biasanya jika ada essay yg belum dinilai), warna Kuning.
                // Atau simplenya: jika ada essay dan belum dinilai (gradeInput?) -> butuh logic backend 'needs_review' or 'is_graded'
                // Legacy backend returns needs_review boolean.
                if (sub.needs_review) status = 'YELLOW';
                else status = 'GREEN';
            }

            return { student, sub, status };
        });
    }, [task, students, submissions, searchTerm]);

    // --- 3. VALIDASI PUBLISH MASSAL ---
    const handlePublishAll = () => {
        // Cek apakah ada yang masih kuning?
        const pendingCount = studentList.filter(item => item.status === 'YELLOW').length;

        if (pendingCount > 0) {
            alert(`Masih ada ${pendingCount} siswa yang belum selesai diperiksa (Status Kuning). Harap selesaikan penilaian essay dan isi feedback terlebih dahulu.`);
            return;
        }

        if (confirm('Terbitkan semua nilai siswa yang sudah selesai?')) {
            onPublish(task.id, true, 'TASK');
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-zinc-50 animate-in fade-in relative">
            {/* FULL PAGE CONTAINER */}
            < div className="flex-1 flex overflow-hidden" >

                {/* LEFT SIDEBAR: Daftar Siswa & Status (TRAFFIC LIGHT UI) */}
                < div className="w-80 bg-white border-r border-zinc-200 flex flex-col shadow-xl z-20" >
                    <div className="p-4 border-b border-zinc-100 bg-zinc-50/50">
                        <button onClick={onBack} className="text-xs font-bold text-zinc-400 hover:text-black mb-3 transition flex items-center gap-1">
                            <span className="text-sm">←</span> KEMBALI LIST
                        </button>
                        <h3 className="font-bold text-lg truncate leading-tight" title={task.title}>{task.title}</h3>
                        <div className="flex justify-between items-center mt-3 gap-2">
                            <span className="text-xs text-zinc-500 font-medium">{submissions.length} / {studentList.length} Submit</span>
                            <div className="flex gap-1">
                                <button onClick={onOpenWeightModal} className="text-[10px] bg-white text-zinc-600 px-3 py-1.5 rounded-lg font-bold border border-zinc-200 hover:bg-zinc-50 transition shadow-sm" title="Atur Bobot">
                                    ⚙️ BOBOT
                                </button>
                                {/* Tombol Publish Massal dengan Validasi */}
                                <button onClick={handlePublishAll} className="text-[10px] bg-black text-white px-3 py-1.5 rounded-lg font-bold hover:bg-zinc-800 transition shadow-sm border border-black" title="Terbitkan Semua Nilai">
                                    📢 TERBITKAN
                                </button>
                            </div>
                        </div>
                        {/* Search Bar */}
                        <div className="mt-3 relative">
                            <Search className="absolute left-3 top-2.5 text-zinc-400" size={14} />
                            <input
                                type="text"
                                placeholder="Cari siswa..."
                                className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-400"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* LIST SISWA */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {studentList.map(({ student, sub, status }) => (
                            <div
                                key={student.id}
                                className={`p-3 rounded-lg border transition flex items-center justify-between group ${status === 'GRAY' ? 'opacity-60 bg-zinc-50/50 border-transparent cursor-default' :
                                    selectedSubmission?.submission?.id === sub?.id ? 'bg-blue-50 border-blue-200 shadow-sm cursor-pointer ring-1 ring-blue-200' :
                                        'hover:bg-zinc-50 border-transparent cursor-pointer bg-white'
                                    }`}
                                onClick={() => {
                                    if (status !== 'GRAY' && sub) onSelectSubmission(sub.id);
                                }}
                            >
                                <div className="flex-1 min-w-0 mr-2">
                                    <p className={`font-bold text-sm truncate ${status === 'GRAY' ? 'text-zinc-400' : 'text-zinc-900'}`}>
                                        {student.name}
                                    </p>
                                    <div className="flex justify-between items-center mt-1">
                                        {/* Status Badge Traffic Light */}
                                        {status === 'GRAY' && <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded">BELUM KUMPUL</span>}

                                        {status === 'YELLOW' && (
                                            <div className="flex items-center gap-1">
                                                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                                                <span className="text-[10px] font-bold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded border border-yellow-200">BUTUH REVIEW</span>
                                            </div>
                                        )}

                                        {status === 'GREEN' && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded border border-green-200">
                                                    NILAI: {sub.grade}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Tombol Mata (Hanya jika sudah ada submission) */}
                                {sub && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onPublish(sub.id, sub.is_published ? false : true, 'SUBMISSION');
                                        }}
                                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition z-20 border ${sub.is_published ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100' : 'bg-white text-zinc-300 border-zinc-200 hover:border-zinc-400 hover:text-zinc-500'}`}
                                        title={sub.is_published ? "Status: TERBIT" : "Status: TERSEMBUNYI"}
                                    >
                                        {sub.is_published ? (
                                            <CheckCircle2 size={16} />
                                        ) : (
                                            <div className="w-4 h-4 rounded-full border-2 border-zinc-300"></div>
                                        )}
                                    </button>
                                )}
                            </div>
                        ))}
                        {studentList.length === 0 && (
                            <div className="p-8 text-center text-xs text-zinc-400">Data siswa tidak ditemukan.</div>
                        )}
                    </div>
                </div >

                {/* RIGHT AREA: Lembar Kerja Siswa */}
                < div className="flex-1 flex flex-col bg-zinc-50 relative h-full" >
                    {!selectedSubmission ? (
                        <div className="flex-1 flex items-center justify-center text-zinc-300 flex-col">
                            <div className="p-8 bg-zinc-100 rounded-full mb-4">
                                <Search size={48} className="opacity-20" />
                            </div>
                            <p className="font-bold">Pilih siswa dari panel kiri untuk mulai menilai.</p>
                        </div>
                    ) : (
                        <>
                            {/* Sticky Header Nilai */}
                            <div className="bg-white border-b border-zinc-200 p-4 flex justify-between items-center shadow-lg shadow-zinc-200/50 sticky top-0 z-30">
                                <div>
                                    <h2 className="text-xl font-bold text-zinc-900">{selectedSubmission.submission.student_name}</h2>
                                    <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                                        <Clock size={12} /> Dikumpulkan: {new Date(selectedSubmission.submission.submitted_at).toLocaleString('id-ID')}
                                    </p>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">PROYEKSI NILAI AKHIR</div>
                                        <div className="text-3xl font-black text-blue-600 leading-none">{currentTotalScore}</div>
                                    </div>
                                    <div className="h-10 w-px bg-zinc-200"></div>
                                    {/* Pass calculated score to onSave */}
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

                                {/* Feedback Box */}
                                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 shadow-sm">
                                    <label className="text-xs font-bold text-orange-800 uppercase tracking-widest mb-3 block">CATATAN GURU (FEEDBACK)</label>
                                    <textarea
                                        className="w-full bg-white border border-orange-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 transition resize-none shadow-sm"
                                        rows="3"
                                        placeholder="Berikan masukan menyemangati..."
                                        value={gradeInput.feedback}
                                        onChange={e => setGradeInput({ ...gradeInput, feedback: e.target.value })}
                                    ></textarea>
                                </div>

                                {/* Question List Iterator */}
                                {selectedSubmission.answers.map((ans, idx) => {
                                    const isPG = ans.type === 'pg';
                                    const isCorrect = isPG && ans.answer_text === ans.correct_key;

                                    // Hitung nilai tersimpan untuk display indikator
                                    const savedScore = ans.score || 0;

                                    return (
                                        <div key={idx} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm hover:shadow-md transition">
                                            {/* Soal Header */}
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
                                                                Tersimpan: {savedScore.toFixed(1)} Poin
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="prose prose-sm max-w-none text-zinc-800 font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: ans.question_text }}></div>

                                                {/* [UPDATE] Image Lightbox Trigger for Question Image */}
                                                {ans.question_image_url && (
                                                    <div
                                                        className="mt-4 inline-block cursor-zoom-in group relative"
                                                        onClick={() => setPreviewImage(ans.question_image_url)}
                                                    >
                                                        <img src={ans.question_image_url} className="max-h-60 rounded-xl border border-zinc-200 bg-white" alt="Soal" />
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition rounded-xl">
                                                            <span className="opacity-0 group-hover:opacity-100 bg-black/70 text-white text-[10px] px-3 py-1.5 rounded-full backdrop-blur-sm font-bold flex items-center gap-1 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition">
                                                                <ZoomIn size={12} /> ZOOM
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Jawaban & Input Nilai */}
                                            <div className="p-6 flex flex-col md:flex-row gap-6">
                                                <div className="flex-1">
                                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">JAWABAN SISWA</p>
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
                                                            {ans.type === 'essay_image' && ans.answer_image_url ? (
                                                                // [UPDATE] Image Lightbox for Student Answer
                                                                <div
                                                                    className="group relative cursor-zoom-in inline-block"
                                                                    onClick={() => setPreviewImage(ans.answer_image_url)}
                                                                >
                                                                    <img src={ans.answer_image_url} className="max-h-64 rounded-lg border bg-white shadow-sm group-hover:shadow-md transition" alt="Jawaban Siswa" />
                                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition rounded-lg flex items-center justify-center">
                                                                        <span className="opacity-0 group-hover:opacity-100 bg-black/75 text-white text-[10px] px-3 py-1.5 rounded-full font-bold backdrop-blur-sm flex items-center gap-1">
                                                                            <ZoomIn size={12} /> PERBESAR
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <p className="whitespace-pre-wrap font-mono text-sm text-zinc-800 leading-relaxed">{ans.answer_text || '-'}</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Input Nilai Essay Manual */}
                                                {!isPG && (
                                                    <div className="w-full md:w-56 bg-blue-50/50 p-5 rounded-xl border border-blue-100 flex flex-col justify-center shrink-0">
                                                        <label className="text-[10px] font-bold text-blue-800 uppercase mb-3 text-center">KUALITAS JAWABAN (0-100)</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="number" min="0" max="100"
                                                                className="text-center text-3xl font-black p-2 rounded-xl border border-blue-200 focus:border-blue-500 outline-none w-full shadow-inner bg-white text-blue-900"
                                                                value={gradeInput.essayScores[ans.answer_id] || 0}
                                                                onChange={e => {
                                                                    const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                                                    setGradeInput({ ...gradeInput, essayScores: { ...gradeInput.essayScores, [ans.answer_id]: val } });
                                                                }}
                                                            />
                                                            {/* Tombol Simpan Mini */}
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
                                                                {((gradeInput.essayScores[ans.answer_id] || 0) / 100 * (ans.weight || 0)).toFixed(1)}
                                                            </span> Poin
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                <div className="h-20"></div> {/* Spacer bottom */}
                            </div>
                        </>
                    )}
                </div >
            </div >

            {/* [UPDATE] LIGHTBOX MODAL (IMAGE PREVIEW) */}
            {
                previewImage && (
                    <div
                        className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
                        onClick={() => setPreviewImage(null)}
                    >
                        {/* Tombol Close */}
                        <button
                            onClick={() => setPreviewImage(null)}
                            className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition z-[201]"
                        >
                            <X size={24} />
                        </button>

                        {/* Gambar Fullscreen */}
                        <img
                            src={previewImage}
                            className="max-w-full max-h-full rounded-lg shadow-2xl animate-in zoom-in-95 duration-200 select-none object-contain"
                            onClick={(e) => e.stopPropagation()}
                            alt="Preview"
                        />
                    </div>
                )
            }
        </div >
    );
};
