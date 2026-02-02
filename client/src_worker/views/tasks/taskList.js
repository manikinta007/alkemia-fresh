// views/tasks/taskList.js
// Komponen Tampilan: Grid Kelas & List Tugas
// Memisahkan logika tampilan (UI) dari logika bisnis utama
// Update V7: Disable Edit button when task is published
// Update V8: Validation Publish (Must have Deadline)
// Update V9: Master Key Button (Discussion Logic)

export const TASK_LIST_COMPONENT = `
    // --- 1. TAMPILAN PILIH KELAS (Saat belum pilih kelas) ---
    const ClassGrid = ({ classes, onSelect }) => {
        return (
            <div className="w-full h-full flex flex-col animate-in">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-zinc-900">Tugas & Remedial</h2>
                    <p className="text-zinc-500 mt-2">Buat lembar kerja siswa dan remedial.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {classes.map(cls => (
                        <div key={cls.id} onClick={() => onSelect(cls)} className="card-mono p-6 cursor-pointer hover:border-orange-500 transition group bg-white">
                            <h4 className="text-xl font-bold mb-2 text-zinc-900 group-hover:text-orange-600">{cls.name}</h4>
                            <p className="text-xs text-zinc-500">Klik untuk kelola →</p>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // --- 2. TAMPILAN DAFTAR TUGAS (Saat sudah pilih kelas) ---
    const TaskList = ({ 
        selectedClass, 
        tasks, 
        loading, 
        onBack, 
        onCreate, 
        onEdit, 
        onGrade, 
        onDelete, 
        onToggleStatus,
        onDiscussion // [UPDATE] Prop baru untuk buka modal kunci
    }) => {
        // [UPDATE] State untuk pesan error validasi (Custom Alert)
        const [errorMsg, setErrorMsg] = React.useState(null);

        // [UPDATE] Handler untuk validasi sebelum Terbit
        const handleToggle = (task) => {
            // Jika status sekarang DRAFT (0) dan mau diterbitkan...
            if (!task.is_active) {
                // Cek apakah deadline kosong
                if (!task.deadline) {
                    setErrorMsg(\`Gagal Terbit: Tugas "\${task.title}" wajib memiliki deadline! Edit dulu.\`);
                    setTimeout(() => setErrorMsg(null), 4000); // Hilang dalam 4 detik
                    return; // STOP, jangan jalankan onToggleStatus
                }
            }
            // Jika lolos validasi (atau jika mau menarik kembali), lanjut
            onToggleStatus(task);
        };

        return (
            <div className="w-full h-full flex flex-col animate-in relative">
                {/* [UPDATE] Custom Error Toast */}
                {errorMsg && (
                    <div className="fixed bottom-6 right-6 z-50 bg-red-600 text-white px-6 py-4 rounded-xl shadow-2xl animate-in slide-in-from-bottom flex items-center gap-3">
                        <span className="text-2xl">⚠️</span>
                        <div>
                            <h4 className="font-bold text-sm">PERHATIAN</h4>
                            <p className="text-xs opacity-90">{errorMsg}</p>
                        </div>
                    </div>
                )}

                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-xl border border-zinc-200 hover:bg-zinc-100 transition">←</button>
                        <div>
                            <h2 className="text-2xl font-bold text-zinc-900">{selectedClass.name}</h2>
                            <p className="text-xs text-zinc-500">Daftar Tugas</p>
                        </div>
                    </div>
                    <button onClick={onCreate} className="px-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition shadow-lg">+ BUAT TUGAS</button>
                </div>

                <div className="grid gap-4">
                    {tasks.map(task => (
                        <div key={task.id} className={\`card-mono p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white \${task.is_active ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-zinc-300 opacity-90'}\`}>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    {task.is_active ? <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold border border-green-200">TERBIT</span> : <span className="bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded text-[10px] font-bold border border-zinc-200">DRAFT</span>}
                                    {task.target_type === 'specific' && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-bold border border-orange-200">REMEDIAL</span>}
                                    
                                    {/* [UPDATE] Badge Indikator Kunci */}
                                    {task.show_discussion && (
                                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-200 flex items-center gap-1">
                                            <span>🔑</span> KUNCI TERBUKA
                                        </span>
                                    )}
                                </div>
                                <h3 className="font-bold text-lg text-zinc-900">{task.title}</h3>
                                <div className="flex gap-4 text-xs text-zinc-500 mt-1">
                                    <span>Soal: <b>{task.question_count}</b></span>
                                    <span>Pengumpulan: <b>{task.submission_count}</b></span>
                                    {/* [UPDATE] Tampilkan tanggal dan JAM agar guru sadar */}
                                    <span>Deadline: <b>{task.deadline ? new Date(task.deadline).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}</b></span>
                                </div>
                            </div>
                            <div className="flex flex-col md:flex-row items-end md:items-center gap-3">
                                {/* [UPDATE] Ganti onClick langsung ke handleToggle untuk validasi */}
                                <button onClick={() => handleToggle(task)} className={\`px-3 py-1.5 rounded text-[10px] font-bold transition w-full md:w-auto \${task.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' : 'bg-green-600 text-white hover:bg-green-700 shadow-md'}\`}>
                                    {task.is_active ? '⛔ TARIK KEMBALI' : '🚀 TERBITKAN'}
                                </button>
                                <div className="flex gap-2">
                                    {/* [UPDATE] Tombol Master Key */}
                                    <button 
                                        onClick={() => onDiscussion && onDiscussion(task)}
                                        className={\`px-3 py-1.5 border rounded text-xs font-bold transition flex items-center gap-1 \${task.show_discussion ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-zinc-300 hover:border-black'}\`}
                                        title="Atur Kunci Jawaban & Pembahasan"
                                    >
                                        <span>🔑</span>
                                    </button>

                                    {/* [UPDATE V7] Tombol EDIT disabled jika status AKTIF/TERBIT */}
                                    <button 
                                        onClick={() => onEdit(task.id)} 
                                        disabled={task.is_active === 1}
                                        title={task.is_active === 1 ? "Tarik kembali tugas untuk mengedit soal" : "Edit Soal"}
                                        className={\`px-3 py-1.5 border rounded text-xs font-bold transition \${
                                            task.is_active === 1 
                                            ? 'bg-zinc-100 border-zinc-200 text-zinc-400 cursor-not-allowed' 
                                            : 'bg-white border-zinc-300 hover:border-black hover:text-black'
                                        }\`}
                                    >
                                        EDIT
                                    </button>
                                    
                                    <button onClick={() => onGrade(task.id)} className="px-3 py-1.5 bg-zinc-100 text-zinc-700 rounded text-xs font-bold hover:bg-zinc-200 transition">NILAI</button>
                                    <button onClick={() => onDelete(task.id)} className="p-1.5 text-zinc-300 hover:text-red-600 transition">{ICONS.trash}</button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {tasks.length === 0 && !loading && (
                        <div className="text-center py-12 border-2 border-dashed border-zinc-200 rounded-2xl">
                            <p className="text-zinc-400 font-bold">Belum ada tugas.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };
`;