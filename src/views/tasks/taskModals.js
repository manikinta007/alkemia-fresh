// views/tasks/taskModals.js
// Komponen Modal terpisah untuk modul Tasks
// Berisi: CreateTaskModal, StudentModal (Remedial), WeightModal (Bobot), dan DiscussionModal (Master Key)

export const TASK_MODALS_COMPONENT = `
    // --- 1. MODAL BUAT TUGAS BARU (CREATE) ---
    const CreateTaskModal = ({ isOpen, onClose, form, setForm, students, onCreate, saving }) => {
        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95">
                    <h3 className="text-xl font-bold mb-4">Buat Tugas Baru</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-zinc-500">JUDUL</label>
                            <input type="text" className="w-full px-4 py-2 border rounded-lg font-bold" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-zinc-500">DESKRIPSI</label>
                            <textarea className="w-full px-4 py-2 border rounded-lg text-sm" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-zinc-500">DEADLINE (TANGGAL & JAM)</label>
                            {/* [UPDATE] Ganti type="date" ke "datetime-local" agar bisa set jam */}
                            <input type="datetime-local" className="w-full px-4 py-2 border rounded-lg" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} />
                        </div>
                        <div className="p-3 bg-zinc-50 border rounded-lg">
                            <div className="flex gap-4 mb-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="target" checked={form.targetType === 'all'} onChange={() => setForm({...form, targetType: 'all', allowedStudents: []})} />
                                    <span className="text-xs font-bold">Semua Siswa</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="target" checked={form.targetType === 'specific'} onChange={() => setForm({...form, targetType: 'specific'})} />
                                    <span className="text-xs font-bold text-orange-600">Remedial</span>
                                </label>
                            </div>
                            {form.targetType === 'specific' && (
                                <div className="h-24 overflow-y-auto border bg-white p-2 rounded text-xs grid grid-cols-2 gap-1">
                                    {students.map(s => (
                                        <label key={s.id} className="flex items-center gap-2 cursor-pointer hover:bg-zinc-50 p-1 rounded">
                                            <input type="checkbox" checked={form.allowedStudents.includes(s.id)} 
                                                onChange={(e) => { 
                                                    if(e.target.checked) setForm({...form, allowedStudents: [...form.allowedStudents, s.id]}); 
                                                    else setForm({...form, allowedStudents: form.allowedStudents.filter(id => id !== s.id)}); 
                                                }} 
                                            />
                                            <span className="truncate">{s.name}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                            {form.targetType === 'specific' && form.allowedStudents.length === 0 && <p className="text-[10px] text-red-500 mt-1 font-bold">* Wajib pilih minimal 1 siswa</p>}
                        </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button onClick={onClose} className="flex-1 py-2 text-zinc-500 font-bold hover:bg-zinc-100 rounded-lg">Batal</button>
                        <button onClick={onCreate} disabled={saving} className="flex-1 py-2 bg-black text-white font-bold rounded-lg hover:bg-zinc-800">
                            {saving ? '...' : 'Buat & Edit Soal'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // --- 2. MODAL EDIT SISWA REMEDIAL (DI EDITOR) ---
    const StudentModal = ({ isOpen, onClose, students, selectedIds, onChange }) => {
        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95">
                    <h3 className="text-lg font-bold mb-3">Edit Siswa Remedial</h3>
                    <div className="h-60 overflow-y-auto border border-zinc-200 rounded p-2 mb-4 space-y-1">
                        {students.map(s => (
                            <label key={s.id} className="flex items-center gap-2 cursor-pointer hover:bg-zinc-50 p-2 rounded">
                                <input type="checkbox" checked={selectedIds.includes(s.id)} 
                                    onChange={(e) => { 
                                        if(e.target.checked) onChange([...selectedIds, s.id]); 
                                        else onChange(selectedIds.filter(id => id !== s.id)); 
                                    }} 
                                    className="w-4 h-4" 
                                />
                                <span className="text-sm">{s.name}</span>
                            </label>
                        ))}
                    </div>
                    <button onClick={onClose} className="w-full py-2 bg-black text-white rounded-lg font-bold">SELESAI</button>
                </div>
            </div>
        );
    };

    // --- 3. MODAL KONFIGURASI BOBOT (DI GRADING) ---
    const WeightModal = ({ isOpen, onClose, pgWeight, setPgWeight, questions, onUpdateWeight, onDistribute, onSave, isValidWeight, totalWeight }) => {
        if (!isOpen) return null;

        // [SMART DETECTION] Hitung jumlah soal
        const pgCount = questions.filter(q => q.type === 'pg').length;
        const essayCount = questions.filter(q => q.type !== 'pg').length;

        // [LOGIC] Auto-Lock Input menggunakan React.useEffect
        React.useEffect(() => {
            if (isOpen) {
                // Jika tidak ada PG, bobot PG harus 0
                if (pgCount === 0 && pgWeight !== 0) {
                    setPgWeight(0);
                } 
                // Jika tidak ada Essay, bobot PG harus 100 (Otomatis Full PG)
                else if (essayCount === 0 && pgWeight !== 100) {
                    setPgWeight(100);
                }
            }
        }, [isOpen, pgCount, essayCount, pgWeight]);

        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                    <h3 className="text-xl font-bold mb-4">Konfigurasi Bobot Penilaian</h3>
                    <p className="text-sm text-zinc-500 mb-6">Total bobot harus 100%. Atur persentase untuk PG dan setiap soal Essay.</p>
                    
                    {/* INPUT BOBOT PG */}
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <div className="flex justify-between items-center mb-2">
                            <label className="font-bold text-blue-900">Bobot Total Pilihan Ganda (PG)</label>
                            <span className="text-xl font-black text-blue-600">{pgWeight}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            step="5" 
                            className={\`w-full accent-blue-600 \${(pgCount === 0 || essayCount === 0) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}\`} 
                            value={pgWeight} 
                            onChange={e => setPgWeight(parseInt(e.target.value))}
                            disabled={pgCount === 0 || essayCount === 0} 
                        />
                        <p className="text-xs text-blue-500 mt-1">
                            {pgCount === 0 ? "Tidak ada soal PG (Otomatis 0%)" : 
                             essayCount === 0 ? "Tidak ada soal Essay (Otomatis 100%)" :
                             \`Otomatis dibagi rata ke \${pgCount} soal PG.\`}
                        </p>
                    </div>

                    {/* LIST INPUT BOBOT ESSAY */}
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="font-bold text-zinc-700">Bobot Essay ({essayCount} Soal)</h4>
                            {essayCount > 0 && (
                                <button onClick={onDistribute} className="text-xs bg-zinc-200 px-3 py-1 rounded font-bold hover:bg-zinc-300">⚡ Bagi Rata Sisa {100 - pgWeight}%</button>
                            )}
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {questions.map((q, idx) => {
                                if(q.type === 'pg') return null;
                                return (
                                    <div key={idx} className="flex items-center gap-4 p-3 bg-zinc-50 border rounded-lg">
                                        <span className="text-xs font-bold text-zinc-500 w-16">SOAL {idx+1}</span>
                                        <p className="flex-1 text-sm truncate">{q.questionText || '(Tanpa Teks)'}</p>
                                        <div className="flex items-center gap-1">
                                            <input type="number" className="w-16 p-1 border rounded text-center font-bold" value={q.weight} onChange={e => onUpdateWeight(idx, parseInt(e.target.value) || 0)} />
                                            <span className="text-sm font-bold">%</span>
                                        </div>
                                    </div>
                                );
                            })}
                            {essayCount === 0 && <p className="text-sm text-zinc-400 italic text-center">Tidak ada soal essay.</p>}
                        </div>
                    </div>

                    {/* FOOTER & VALIDATION */}
                    <div className="flex flex-col gap-2 pt-4 border-t">
                        {/* Custom Smart Alert (Red Text) */}
                        {!isValidWeight && (
                            <div className="text-center bg-red-50 text-red-600 p-2 rounded-lg text-xs font-bold animate-pulse border border-red-100">
                                ⚠️ Total bobot harus 100% (Saat ini: {totalWeight}%)
                            </div>
                        )}

                        <div className="flex justify-between items-center mt-2">
                            <div className={\`text-lg font-bold \${isValidWeight ? 'text-green-600' : 'text-zinc-400'}\`}>Total: {totalWeight}/100</div>
                            <div className="flex gap-2">
                                <button onClick={onClose} className="px-4 py-2 text-zinc-500 font-bold hover:bg-zinc-100 rounded-lg">Batal</button>
                                <button 
                                    onClick={onSave} 
                                    disabled={!isValidWeight} 
                                    className="px-6 py-2 bg-black text-white font-bold rounded-lg hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg"
                                >
                                    SIMPAN KONFIGURASI
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // --- 4. MODAL GLOBAL KEY & DISCUSSION (MASTER KEY) ---
    // [UPDATE] New Component for Global Key Management
    const DiscussionModal = ({ isOpen, onClose, task, onSave }) => {
        if (!isOpen || !task) return null;

        const [form, setForm] = React.useState({
            discussionText: '',
            discussionUrl: '',
            showDiscussion: false
        });

        // Load data saat modal dibuka
        React.useEffect(() => {
            if(task) {
                setForm({
                    discussionText: task.discussion_text || '',
                    discussionUrl: task.discussion_url || '',
                    showDiscussion: task.show_discussion || false
                });
            }
        }, [task]);

        const handleSubmit = () => {
            onSave(task.id, form);
        };

        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-zinc-900">Kunci & Pembahasan</h3>
                            <p className="text-xs text-zinc-500">Atur transparansi jawaban untuk siswa.</p>
                        </div>
                        <div className="p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                            <span className="text-2xl">🔑</span>
                        </div>
                    </div>

                    <div className="space-y-5">
                        {/* TOGGLE SAKLAR UTAMA */}
                        <div className={\`p-4 rounded-xl border-2 transition-all flex items-center justify-between cursor-pointer \${form.showDiscussion ? 'bg-green-50 border-green-500' : 'bg-zinc-50 border-zinc-200'}\`}
                             onClick={() => setForm({...form, showDiscussion: !form.showDiscussion})}
                        >
                            <div>
                                <h4 className={\`font-bold text-sm \${form.showDiscussion ? 'text-green-800' : 'text-zinc-500'}\`}>
                                    {form.showDiscussion ? 'KUNCI TERBUKA (ON)' : 'KUNCI TERTUTUP (OFF)'}
                                </h4>
                                <p className="text-[10px] text-zinc-500 mt-1 max-w-[200px]">
                                    {form.showDiscussion ? 'Siswa BISA melihat jawaban benar & pembahasan.' : 'Siswa HANYA melihat nilai akhir.'}
                                </p>
                            </div>
                            <div className={\`w-12 h-6 rounded-full p-1 transition-colors \${form.showDiscussion ? 'bg-green-500' : 'bg-zinc-300'}\`}>
                                <div className={\`w-4 h-4 bg-white rounded-full shadow-sm transition-transform \${form.showDiscussion ? 'translate-x-6' : 'translate-x-0'}\`}></div>
                            </div>
                        </div>

                        {/* INPUT FILE / LINK */}
                        <div>
                            <label className="text-xs font-bold text-zinc-500 mb-1 block">LINK FILE KUNCI / GAMBAR (Opsional)</label>
                            <input 
                                type="text" 
                                placeholder="https://..." 
                                className="w-full px-4 py-2 border rounded-lg text-sm bg-zinc-50 focus:bg-white transition"
                                value={form.discussionUrl}
                                onChange={e => setForm({...form, discussionUrl: e.target.value})}
                            />
                            <p className="text-[10px] text-zinc-400 mt-1">Tempel link Google Drive atau URL Gambar di sini.</p>
                        </div>

                        {/* INPUT TEXTAREA */}
                        <div>
                            <label className="text-xs font-bold text-zinc-500 mb-1 block">CATATAN / PEMBAHASAN GLOBAL</label>
                            <textarea 
                                className="w-full px-4 py-2 border rounded-lg text-sm bg-zinc-50 focus:bg-white transition h-32"
                                placeholder="Tulis pembahasan umum atau kunci jawaban manual di sini..."
                                value={form.discussionText}
                                onChange={e => setForm({...form, discussionText: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6 pt-4 border-t border-zinc-100">
                        <button onClick={onClose} className="flex-1 py-2 text-zinc-500 font-bold hover:bg-zinc-100 rounded-lg">Batal</button>
                        <button onClick={handleSubmit} className="flex-1 py-2 bg-black text-white font-bold rounded-lg hover:bg-zinc-800 shadow-lg">
                            SIMPAN PENGATURAN
                        </button>
                    </div>
                </div>
            </div>
        );
    };
`;