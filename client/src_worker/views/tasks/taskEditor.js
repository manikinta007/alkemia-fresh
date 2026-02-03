// views/tasks/taskEditor.js
// Komponen Tampilan: Editor Soal (Input, Preview, CSV Import)
// Mengelola logika lokal untuk manipulasi array soal dan form identitas

export const TASK_EDITOR_COMPONENT = `
    const TaskEditor = ({ 
        headerForm, setHeaderForm, 
        questions, setQuestions, 
        saving, 
        onSaveFull, 
        onSaveIdentity, 
        onCancel, 
        onOpenUrlModal, 
        onOpenStudentModal 
    }) => {
        const { useRef } = React;
        const fileInputRef = useRef(null);

        // --- INTERNAL HELPERS (Manipulasi State Soal) ---
        
        const addQuestion = (type) => {
            const base = { type, questionText: '', questionImageUrl: '', weight: 0 };
            if (type === 'pg') { base.options = ['', '', '', '', '']; base.correctKey = 'A'; }
            if (type === 'essay_text') { base.charLimit = 500; }
            setQuestions([...questions, base]);
        };

        const updateQuestion = (index, field, value) => {
            const newQ = [...questions];
            newQ[index][field] = value;
            setQuestions(newQ);
        };

        const updateOption = (qIndex, optIndex, value) => {
            const newQ = [...questions];
            newQ[qIndex].options[optIndex] = value;
            setQuestions(newQ);
        };

        const removeQuestion = (index) => {
            const newQ = [...questions];
            newQ.splice(index, 1);
            setQuestions(newQ);
        };

        // --- CSV HANDLERS ---

        const handleDownloadTemplate = () => {
            const csvContent = "Pertanyaan;Opsi A;Opsi B;Opsi C;Opsi D;Opsi E;Jawaban Benar (A/B/C/D/E)\\nContoh Soal?;Pilihan A;Pilihan B;Pilihan C;Pilihan D;Pilihan E;A";
            const link = document.createElement("a");
            link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
            link.download = "Template_Soal_Tugas.csv";
            link.click();
        };

        const handleUploadCsv = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                const text = evt.target.result;
                const lines = text.split('\\n'); 
                const newQuestions = [];
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;
                    const parts = line.split(';');
                    if (parts.length >= 2) {
                        newQuestions.push({
                            type: 'pg',
                            questionText: parts[0]?.trim() || '',
                            options: [parts[1]?.trim() || '', parts[2]?.trim() || '', parts[3]?.trim() || '', parts[4]?.trim() || '', parts[5]?.trim() || ''],
                            correctKey: (parts[6]?.trim() || 'A').toUpperCase(),
                            questionImageUrl: '',
                            weight: 0
                        });
                    }
                }
                if (newQuestions.length > 0) {
                    setQuestions([...questions, ...newQuestions]);
                    // Menggunakan alert bawaan sementara karena CustomAlert ada di Parent, 
                    // tapi idealnya parent yang handle notifikasi sukses.
                    // Di sini kita biarkan silent success atau gunakan prop onAlert jika ada.
                }
                if(fileInputRef.current) fileInputRef.current.value = '';
            };
            reader.readAsText(file);
        };

        return (
            <div className="max-w-6xl mx-auto animate-in fade-in pb-20 w-full px-4 md:px-8">
                
                {/* 1. HEADER EDITOR & ACTIONS */}
                <div className="flex justify-between items-center mb-6 pt-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Editor Soal</h2>
                        <p className="text-zinc-500 text-sm mt-1">
                            Tugas: <span className="font-bold text-black">{headerForm.title}</span> • {questions.length} Soal • <span className="italic text-zinc-400">Status: DRAFT</span>
                        </p>
                    </div>
                    <div className="space-x-2">
                        <button onClick={onCancel} className="px-4 py-2 text-sm font-bold text-zinc-500 hover:text-black transition uppercase tracking-wide">
                            Batal
                        </button>
                        <button onClick={onSaveFull} disabled={saving} className="px-6 py-2 bg-black text-white text-sm font-bold rounded hover:bg-zinc-800 shadow-lg transition transform active:scale-95 uppercase tracking-wide">
                            {saving ? 'Menyimpan...' : 'Simpan Semua'}
                        </button>
                    </div>
                </div>

                {/* 2. BOX IMPORT CSV */}
                <div className="bg-white border border-zinc-200 p-4 rounded-xl mb-6 flex justify-between items-center shadow-sm">
                    <div className="text-xs">
                        <span className="font-bold text-zinc-700 block mb-1">IMPORT DARI EXCEL/CSV</span>
                        <span className="text-zinc-400">Gunakan fitur ini untuk upload banyak soal pilihan ganda sekaligus.</span>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleDownloadTemplate} className="px-3 py-1.5 bg-zinc-50 border border-zinc-300 rounded text-xs font-bold hover:bg-zinc-100 transition">⬇ Template</button>
                        <div className="relative">
                            <input type="file" ref={fileInputRef} onChange={handleUploadCsv} accept=".csv" className="absolute inset-0 opacity-0 cursor-pointer" />
                            <button className="px-3 py-1.5 bg-zinc-800 text-white rounded text-xs font-bold hover:bg-black transition">⬆ Upload CSV</button>
                        </div>
                    </div>
                </div>

                {/* 3. IDENTITAS TUGAS (COLLAPSIBLE) */}
                <div className="bg-white border border-zinc-200 p-4 rounded-xl mb-8 flex justify-between items-center shadow-sm">
                    <div className="text-xs">
                        <span className="font-bold text-zinc-700 block mb-1">IDENTITAS TUGAS</span>
                        <span className="text-zinc-400">Edit Judul, Deadline & Target Siswa</span>
                    </div>
                    <details className="relative group">
                        <summary className="px-3 py-1.5 bg-zinc-50 border border-zinc-300 rounded text-xs font-bold hover:bg-zinc-100 transition cursor-pointer list-none flex items-center gap-2">
                            <span>⚙️ Edit Identitas</span>
                            {headerForm.targetType === 'specific' && <span className="bg-orange-100 text-orange-700 px-1.5 rounded text-[10px]">REMEDIAL</span>}
                        </summary>
                        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-zinc-200 shadow-xl rounded-xl p-4 z-50">
                            <div className="space-y-3">
                                <div><label className="text-[10px] font-bold text-zinc-500 uppercase">JUDUL</label><input type="text" className="w-full px-2 py-1 border rounded text-sm font-bold" value={headerForm.title} onChange={e => setHeaderForm({...headerForm, title: e.target.value})} /></div>
                                <div><label className="text-[10px] font-bold text-zinc-500 uppercase">DEADLINE</label><input type="date" className="w-full px-2 py-1 border rounded text-sm" value={headerForm.deadline} onChange={e => setHeaderForm({...headerForm, deadline: e.target.value})} /></div>
                                <div><label className="text-[10px] font-bold text-zinc-500 uppercase">DESKRIPSI</label><textarea className="w-full px-2 py-1 border rounded text-sm" rows="2" value={headerForm.description} onChange={e => setHeaderForm({...headerForm, description: e.target.value})} /></div>
                                
                                {headerForm.targetType === 'specific' && (
                                    <div className="pt-2 border-t border-zinc-100">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-bold text-orange-600">TARGET: {headerForm.allowedStudents.length} SISWA</span>
                                            <button onClick={onOpenStudentModal} className="text-[10px] font-bold text-blue-600 underline">Edit Siswa</button>
                                        </div>
                                        <p className="text-[10px] text-zinc-400">Klik 'Edit Siswa' untuk mengubah daftar remedial.</p>
                                    </div>
                                )}

                                <button onClick={onSaveIdentity} className="w-full py-1.5 bg-black text-white text-xs font-bold rounded mt-2 hover:bg-zinc-800">Simpan Perubahan Identitas</button>
                            </div>
                        </div>
                    </details>
                </div>

                {/* 4. DAFTAR SOAL */}
                <div className="space-y-8">
                    {questions.map((q, idx) => (
                        <div key={idx} className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition">
                            {/* Question Header */}
                            <div className="bg-zinc-50 border-b border-zinc-200 p-3 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-zinc-500 tracking-widest uppercase">PERTANYAAN NO {idx + 1}</span>
                                    <span className="text-[10px] font-bold bg-black text-white px-2 py-0.5 rounded uppercase">{q.type.replace('_', ' ')}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenUrlModal(idx); }} className="flex items-center gap-2 bg-white border border-zinc-300 hover:border-black hover:text-black text-zinc-600 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm z-10 relative cursor-pointer" title="Sisipkan URL Gambar">
                                        <span>🔗 Sisipkan URL Gambar</span>
                                    </button>
                                    <button onClick={() => removeQuestion(idx)} className="text-zinc-400 hover:text-red-500 transition px-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor"><path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"></path></svg>
                                    </button>
                                </div>
                            </div>
                            
                            {/* Question Text Area */}
                            <div className="p-0 border-b border-zinc-100">
                                <textarea 
                                    className="w-full p-4 border-0 focus:ring-0 text-base font-mono bg-transparent resize-y min-h-[120px] placeholder-zinc-300 focus:bg-yellow-50/30 transition leading-relaxed" 
                                    rows="3" 
                                    value={q.questionText} 
                                    onChange={e => updateQuestion(idx, 'questionText', e.target.value)} 
                                    placeholder="Ketik soal di sini... (HTML Allowed)" 
                                />
                            </div>
                            
                            {/* LIVE PREVIEW */}
                            {q.questionText && (
                                <div className="p-4 bg-blue-50/30 border-b border-dashed border-blue-200">
                                    <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-1">
                                        <span>👁️</span> LIVE PREVIEW
                                    </p>
                                    <div className="prose prose-sm max-w-none text-zinc-800" dangerouslySetInnerHTML={{__html: q.questionText}}></div>
                                </div>
                            )}
                            
                            {/* Options Area */}
                            <div className="bg-white p-4">
                                {/* Pilihan Ganda */}
                                {q.type === 'pg' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                        {q.options.map((opt, oIdx) => (
                                            <div key={oIdx} className="flex items-center gap-0 group">
                                                <div 
                                                    onClick={() => updateQuestion(idx, 'correctKey', String.fromCharCode(65 + oIdx))} 
                                                    className={\`w-10 h-10 flex-shrink-0 flex items-center justify-center font-bold rounded-l-lg cursor-pointer transition border border-r-0 \${q.correctKey === String.fromCharCode(65 + oIdx) ? 'bg-green-500 text-white border-green-600' : 'bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200'}\`}
                                                    title="Klik untuk set sebagai Kunci Jawaban"
                                                >
                                                    {String.fromCharCode(65 + oIdx)}
                                                </div>
                                                <input 
                                                    type="text" 
                                                    className="flex-1 h-10 px-3 border border-zinc-200 rounded-r-lg text-sm focus:border-black focus:z-10 focus:outline-none transition"
                                                    value={opt} 
                                                    onChange={(e) => updateOption(idx, oIdx, e.target.value)} 
                                                    placeholder={\`Pilihan \${String.fromCharCode(65 + oIdx)}\`} 
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Essay Text */}
                                {q.type === 'essay_text' && (
                                    <div className="mt-4 p-4 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-zinc-500 uppercase">Batas Karakter:</span>
                                            <input 
                                                type="number" max="1000" 
                                                className="w-24 px-2 py-1 text-sm font-bold border border-zinc-300 rounded text-center focus:border-black outline-none"
                                                value={q.charLimit} 
                                                onChange={(e) => updateQuestion(idx, 'charLimit', parseInt(e.target.value))} 
                                            />
                                        </div>
                                        <p className="text-xs text-zinc-400">Siswa akan menjawab dengan teks panjang (Maksimal 1000 karakter).</p>
                                    </div>
                                )}

                                {/* Essay Image */}
                                {q.type === 'essay_image' && (
                                    <div className="mt-4 p-4 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center gap-3 text-zinc-500">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 256 256" fill="currentColor"><path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM156,88a12,12,0,1,1-12,12A12,12,0,0,1,156,88Zm60,112H40V56H216V200Zm-16-16H56V168l42.66-42.66a16,16,0,0,1,22.63,0L136,140l34.34-34.34a16,16,0,0,1,22.63,0L200,113Z"></path></svg>
                                        <p className="text-xs font-bold uppercase">Tipe Soal: Upload Gambar (Siswa akan diminta mengupload foto jawaban).</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* 5. TOMBOL TAMBAH SOAL */}
                <div className="mt-8 border-2 border-dashed border-zinc-200 rounded-xl p-2 hover:border-black transition cursor-pointer group bg-zinc-50/50 hover:bg-white">
                    <div className="flex gap-4 justify-center p-4">
                        <button onClick={() => addQuestion('pg')} className="px-6 py-2 bg-white border border-zinc-300 text-zinc-600 font-bold rounded-lg text-xs hover:border-black hover:text-black transition shadow-sm uppercase">+ Pilihan Ganda</button>
                        <button onClick={() => addQuestion('essay_text')} className="px-6 py-2 bg-white border border-zinc-300 text-zinc-600 font-bold rounded-lg text-xs hover:border-black hover:text-black transition shadow-sm uppercase">+ Essay Teks</button>
                        <button onClick={() => addQuestion('essay_image')} className="px-6 py-2 bg-white border border-zinc-300 text-zinc-600 font-bold rounded-lg text-xs hover:border-black hover:text-black transition shadow-sm uppercase">+ Essay Gambar</button>
                    </div>
                    <p className="text-center text-[10px] text-zinc-400 font-bold uppercase pb-2 group-hover:text-black transition">+ TAMBAH SOAL BARU</p>
                </div>
            </div>
        );
    };
`;