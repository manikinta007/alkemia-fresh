// views/tasks/taskGrading.js
// Komponen Tampilan: Mode Penilaian (Grading)
// Menangani Split Screen UI, Kalkulasi Nilai Lokal, dan Input Feedback
// Update V7: Traffic Light Sidebar (Merge Students & Submissions) + Publish Validation
// Update: Image Lightbox Preview (No New Tab)

export const TASK_GRADING_COMPONENT = `
    const TaskGrading = ({
        task,
        students, // [NEW PROP] Data Master Siswa untuk Traffic Light
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
        // [UPDATE] Tambah useState untuk Lightbox
        const { useMemo, useState } = React;
        
        // State untuk Lightbox Gambar
        const [previewImage, setPreviewImage] = useState(null);

        // --- 1. CALCULATOR: Hitung Nilai Real-time di sisi Client ---
        const currentTotalScore = useMemo(() => {
            if(!selectedSubmission) return 0;
            let total = 0;
            
            // Hitung Pilihan Ganda (PG)
            const pgQs = selectedSubmission.answers.filter(a => a.type === 'pg');
            const pgCorrect = pgQs.filter(a => a.answer_text === a.correct_key).length;
            const pgTotalQs = questions.filter(q => q.type === 'pg').length;
            
            if(pgTotalQs > 0) {
                const pgScore = (pgCorrect / pgTotalQs) * pgWeight;
                total += pgScore;
            }

            // Hitung Essay (Input 0-100 -> Dikonversi ke Poin Bobot)
            selectedSubmission.answers.forEach(a => {
                if(a.type !== 'pg') {
                    const quality = gradeInput.essayScores[a.answer_id] || 0; // Skala 0-100
                    const weight = a.weight || 0; // Poin maksimal soal ini
                    const score = (quality / 100) * weight;
                    total += score;
                }
            });

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

            // B. Merge dengan Data Pengumpulan
            return targets.map(student => {
                const sub = submissions.find(s => s.student_id === student.id);
                
                // Tentukan Status Warna
                let status = 'GRAY'; // Default: Belum Mengerjakan
                if (sub) {
                    // Logic V7: Jika needs_review true (dari backend), warna Kuning.
                    if (sub.needs_review) status = 'YELLOW'; 
                    else status = 'GREEN';
                }

                return { student, sub, status };
            });
        }, [task, students, submissions]);

        // --- 3. VALIDASI PUBLISH MASSAL ---
        const handlePublishAll = () => {
            // Cek apakah ada yang masih kuning?
            const pendingCount = studentList.filter(item => item.status === 'YELLOW').length;
            
            if (pendingCount > 0) {
                alert(\`Masih ada \${pendingCount} siswa yang belum selesai diperiksa (Status Kuning). Harap selesaikan penilaian essay dan isi feedback terlebih dahulu.\`);
                return; 
            }
            
            if (confirm('Terbitkan semua nilai siswa yang sudah selesai?')) {
                onPublish(task.id, true, 'TASK');
            }
        };

        return (
            <div className="w-full h-full flex flex-col bg-zinc-50 animate-in fade-in relative">
                {/* FULL PAGE CONTAINER */}
                <div className="flex-1 flex overflow-hidden">
                    
                    {/* LEFT SIDEBAR: Daftar Siswa & Status (TRAFFIC LIGHT UI) */}
                    <div className="w-80 bg-white border-r border-zinc-200 flex flex-col shadow-lg z-10">
                        <div className="p-4 border-b border-zinc-100">
                            <button onClick={onBack} className="text-xs font-bold text-zinc-400 hover:text-black mb-2 transition">
                                ← KEMBALI KE MENU
                            </button>
                            <h3 className="font-bold text-lg truncate" title={task.title}>{task.title}</h3>
                            <div className="flex justify-between items-center mt-2 gap-2">
                                <span className="text-xs text-zinc-500">{submissions.length} / {studentList.length} Submit</span>
                                <div className="flex gap-1">
                                    <button onClick={onOpenWeightModal} className="text-[10px] bg-zinc-50 text-zinc-600 px-2 py-1 rounded font-bold border border-zinc-200 hover:bg-zinc-100 transition" title="Atur Bobot">
                                        ⚙️ BOBOT
                                    </button>
                                    {/* Tombol Publish Massal dengan Validasi */}
                                    <button onClick={handlePublishAll} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold border border-blue-100 hover:bg-blue-100 transition" title="Terbitkan Semua Nilai">
                                        📢 TERBITKAN
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        {/* LIST SISWA */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {studentList.map(({ student, sub, status }) => (
                                <div 
                                    key={student.id} 
                                    className={\`p-3 rounded-lg border transition flex items-center justify-between group \${
                                        status === 'GRAY' ? 'opacity-60 bg-zinc-50 border-transparent cursor-default' : 
                                        selectedSubmission?.submission?.id === sub?.id ? 'bg-blue-50 border-blue-200 shadow-sm cursor-pointer' : 
                                        'hover:bg-zinc-50 border-transparent cursor-pointer bg-white'
                                    }\`}
                                    onClick={() => {
                                        if (status !== 'GRAY' && sub) onSelectSubmission(sub.id);
                                    }}
                                >
                                    <div className="flex-1 min-w-0 mr-2">
                                        <p className={\`font-bold text-sm truncate \${status === 'GRAY' ? 'text-zinc-400' : 'text-zinc-900'}\`}>
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
                                            className={\`w-8 h-8 flex items-center justify-center rounded-full transition z-20 \${sub.is_published ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-zinc-100 text-zinc-300 hover:bg-zinc-200 hover:text-zinc-500'}\`}
                                            title={sub.is_published ? "Status: TERBIT" : "Status: TERSEMBUNYI"}
                                        >
                                            {sub.is_published ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                            )}
                                        </button>
                                    )}
                                </div>
                            ))}
                            {studentList.length === 0 && (
                                <div className="p-8 text-center text-xs text-zinc-400">Data siswa tidak ditemukan.</div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT AREA: Lembar Kerja Siswa */}
                    <div className="flex-1 flex flex-col bg-zinc-50 relative">
                        {!selectedSubmission ? (
                            <div className="flex-1 flex items-center justify-center text-zinc-300 flex-col">
                                <svg className="w-24 h-24 mb-4 opacity-20" fill="currentColor" viewBox="0 0 256 256"><path d="M224,176a8,8,0,0,1-8,8H168a8,8,0,0,1,0-16h48A8,8,0,0,1,224,176Z" opacity="0.2"></path><path d="M224,48H48a8,8,0,0,0-8,8V208a24,24,0,0,0,24,24H192a24,24,0,0,0,24-24V56A8,8,0,0,0,224,48Zm8,160a8,8,0,0,1-8,8H64a8,8,0,0,1-8-8V64H216V208Zm-40-24a8,8,0,0,1-8,8H120a8,8,0,0,1,0-16h56A8,8,0,0,1,192,184Zm0-32a8,8,0,0,1-8,8H120a8,8,0,0,1,0-16h56A8,8,0,0,1,192,152Zm0-32a8,8,0,0,1-8,8H120a8,8,0,0,1,0-16h56A8,8,0,0,1,192,120Z"></path></svg>
                                <p>Pilih siswa dari panel kiri untuk mulai menilai.</p>
                            </div>
                        ) : (
                            <>
                                {/* Sticky Header Nilai */}
                                <div className="bg-white border-b border-zinc-200 p-4 flex justify-between items-center shadow-sm sticky top-0 z-20">
                                    <div>
                                        <h2 className="text-xl font-bold text-zinc-900">{selectedSubmission.submission.student_name}</h2>
                                        <p className="text-xs text-zinc-500">Dikumpulkan: {new Date(selectedSubmission.submission.submitted_at).toLocaleString()}</p>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">NILAI AKHIR</div>
                                            <div className="text-3xl font-black text-blue-600">{currentTotalScore}</div>
                                        </div>
                                        <div className="h-10 w-px bg-zinc-200"></div>
                                        {/* Pass calculated score to onSave */}
                                        <button onClick={() => onSave(currentTotalScore, true)} className="px-6 py-3 bg-black text-white font-bold rounded-xl hover:bg-zinc-800 shadow-lg transition active:scale-95">
                                            SIMPAN & LANJUT →
                                        </button>
                                    </div>
                                </div>

                                {/* Scrollable Content */}
                                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                                    
                                    {/* Feedback Box */}
                                    <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6">
                                        <label className="text-xs font-bold text-orange-800 uppercase tracking-widest mb-2 block">CATATAN GURU (FEEDBACK)</label>
                                        <textarea 
                                            className="w-full bg-white border border-orange-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" 
                                            rows="3" 
                                            placeholder="Berikan masukan menyemangati..." 
                                            value={gradeInput.feedback} 
                                            onChange={e => setGradeInput({...gradeInput, feedback: e.target.value})}
                                        ></textarea>
                                    </div>

                                    {/* Question List Iterator */}
                                    {selectedSubmission.answers.map((ans, idx) => {
                                        const isPG = ans.type === 'pg';
                                        const isCorrect = isPG && ans.answer_text === ans.correct_key;
                                        
                                        // Hitung nilai tersimpan untuk display indikator
                                        const savedScore = ans.score || 0;
                                        
                                        return (
                                            <div key={idx} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
                                                {/* Soal Header */}
                                                <div className="p-6 border-b border-zinc-50 bg-zinc-50/50">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <span className="bg-zinc-200 text-zinc-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                                                            NO {idx + 1} • {ans.type.toUpperCase()}
                                                        </span>
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-xs font-bold text-zinc-400">
                                                                Bobot: {isPG ? 'Auto' : ans.weight + '%'}
                                                            </span>
                                                            {!isPG && (
                                                                <span className="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded mt-1 border border-green-100">
                                                                    Tersimpan: {savedScore.toFixed(1)} Poin
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="prose prose-sm max-w-none text-zinc-800 font-medium" dangerouslySetInnerHTML={{__html: ans.question_text}}></div>
                                                    {/* [UPDATE] Image Lightbox Trigger for Question Image */}
                                                    {ans.question_image_url && (
                                                        <div 
                                                            className="mt-4 inline-block cursor-zoom-in group relative"
                                                            onClick={() => setPreviewImage(ans.question_image_url)}
                                                        >
                                                            <img src={ans.question_image_url} className="max-h-60 rounded-lg border border-zinc-200" />
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition rounded-lg">
                                                                <span className="opacity-0 group-hover:opacity-100 bg-black/70 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm font-bold">🔍 ZOOM</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Jawaban & Input Nilai */}
                                                <div className="p-6 flex flex-col md:flex-row gap-6">
                                                    <div className="flex-1">
                                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">JAWABAN SISWA</p>
                                                        {isPG ? (
                                                            <div className="flex items-center gap-3">
                                                                <div className={\`text-2xl font-bold w-12 h-12 flex items-center justify-center rounded-xl \${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}\`}>
                                                                    {ans.answer_text}
                                                                </div>
                                                                <div>
                                                                    <p className={\`font-bold \${isCorrect ? 'text-green-700' : 'text-red-700'}\`}>
                                                                        {isCorrect ? 'JAWABAN BENAR' : 'JAWABAN SALAH'}
                                                                    </p>
                                                                    {!isCorrect && <p className="text-xs text-zinc-500">Kunci: <span className="font-bold text-black">{ans.correct_key}</span></p>}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                                                                {ans.type === 'essay_image' && ans.answer_image_url ? (
                                                                    // [UPDATE] Image Lightbox for Student Answer
                                                                    <div 
                                                                        className="group relative cursor-zoom-in inline-block" 
                                                                        onClick={() => setPreviewImage(ans.answer_image_url)}
                                                                    >
                                                                        <img src={ans.answer_image_url} className="max-h-64 rounded border bg-white shadow-sm group-hover:shadow-md transition" />
                                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition rounded flex items-center justify-center">
                                                                            <span className="opacity-0 group-hover:opacity-100 bg-black/75 text-white text-[10px] px-2 py-1 rounded font-bold backdrop-blur-sm">🔍 PERBESAR</span>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <p className="whitespace-pre-wrap font-mono text-sm text-zinc-800">{ans.answer_text || '-'}</p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Input Nilai Essay Manual */}
                                                    {!isPG && (
                                                        <div className="w-full md:w-48 bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-col justify-center">
                                                            <label className="text-[10px] font-bold text-blue-800 uppercase mb-2 text-center">KUALITAS JAWABAN (0-100)</label>
                                                            <div className="flex gap-2">
                                                                <input 
                                                                    type="number" min="0" max="100" 
                                                                    className="text-center text-2xl font-bold p-2 rounded-lg border border-blue-200 focus:border-blue-500 outline-none w-full" 
                                                                    value={gradeInput.essayScores[ans.answer_id] || 0} 
                                                                    onChange={e => {
                                                                        const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                                                        setGradeInput({...gradeInput, essayScores: {...gradeInput.essayScores, [ans.answer_id]: val}});
                                                                    }} 
                                                                />
                                                                {/* Tombol Simpan Mini */}
                                                                <button 
                                                                    onClick={() => onSave(currentTotalScore, false)}
                                                                    className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 shadow-sm"
                                                                    title="Simpan Nilai Soal Ini"
                                                                >
                                                                    💾
                                                                </button>
                                                            </div>
                                                            <p className="text-center text-blue-400 mt-2 text-[10px]">
                                                                Skor: <span className="font-bold">
                                                                    {( (gradeInput.essayScores[ans.answer_id]||0) / 100 * (ans.weight||0) ).toFixed(1)}
                                                                </span> Poin
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* [UPDATE] LIGHTBOX MODAL (IMAGE PREVIEW) */}
                {previewImage && (
                    <div 
                        className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
                        onClick={() => setPreviewImage(null)}
                    >
                        {/* Tombol Close */}
                        <button 
                            onClick={() => setPreviewImage(null)}
                            className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition z-[201]"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                        
                        {/* Gambar Fullscreen */}
                        <img 
                            src={previewImage} 
                            className="max-w-full max-h-full rounded-lg shadow-2xl animate-in zoom-in-95 duration-200 select-none object-contain"
                            onClick={(e) => e.stopPropagation()} 
                        />
                    </div>
                )}
            </div>
        );
    };
`;