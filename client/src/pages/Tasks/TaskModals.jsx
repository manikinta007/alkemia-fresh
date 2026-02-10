import React, { useEffect } from 'react';
import { X, Search, Check, AlertTriangle } from 'lucide-react';

// --- 1. MODAL BUAT TUGAS BARU (CREATE) ---
export const CreateTaskModal = ({ isOpen, onClose, form, setForm, students, onCreate, saving }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Buat Tugas Baru</h3>
                    <button onClick={onClose} className="p-1 hover:bg-zinc-100 rounded-full"><X size={20} /></button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-zinc-500">JUDUL</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 border border-zinc-300 rounded-lg font-bold focus:outline-none focus:border-black"
                            value={form.title}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                            placeholder="Contoh: Latihan Soal Stoikiometri"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-zinc-500">DESKRIPSI</label>
                        <textarea
                            className="w-full px-4 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:border-black"
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            placeholder="Petunjuk pengerjaan..."
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-zinc-500">DEADLINE (TANGGAL & JAM)</label>
                        <input
                            type="datetime-local"
                            className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-black"
                            value={form.deadline}
                            onChange={e => setForm({ ...form, deadline: e.target.value })}
                        />
                    </div>
                    <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
                        <div className="flex gap-4 mb-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="target"
                                    checked={form.targetType === 'all'}
                                    onChange={() => setForm({ ...form, targetType: 'all', allowedStudents: [] })}
                                />
                                <span className="text-xs font-bold">Semua Siswa</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="target"
                                    checked={form.targetType === 'specific'}
                                    onChange={() => setForm({ ...form, targetType: 'specific' })}
                                />
                                <span className="text-xs font-bold text-orange-600">Remedial / Khusus</span>
                            </label>
                        </div>
                        {form.targetType === 'specific' && (
                            <div className="h-32 overflow-y-auto border border-zinc-200 bg-white p-2 rounded text-xs grid grid-cols-2 gap-1 mt-2">
                                {students.map(s => (
                                    <label key={s.id} className="flex items-center gap-2 cursor-pointer hover:bg-zinc-50 p-1 rounded">
                                        <input
                                            type="checkbox"
                                            checked={form.allowedStudents.includes(s.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setForm({ ...form, allowedStudents: [...form.allowedStudents, s.id] });
                                                else setForm({ ...form, allowedStudents: form.allowedStudents.filter(id => id !== s.id) });
                                            }}
                                        />
                                        <span className="truncate">{s.name}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                        {form.targetType === 'specific' && form.allowedStudents.length === 0 && (
                            <p className="text-[10px] text-red-500 mt-1 font-bold flex items-center gap-1">
                                <AlertTriangle size={12} /> Wajib pilih minimal 1 siswa
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={onClose} className="flex-1 py-3 text-zinc-500 font-bold hover:bg-zinc-100 rounded-lg transition">Batal</button>
                    <button
                        onClick={onCreate}
                        disabled={saving}
                        className="flex-1 py-3 bg-black text-white font-bold rounded-lg hover:bg-zinc-800 disabled:opacity-50 transition"
                    >
                        {saving ? 'Menyimpan...' : 'Buat & Edit Soal'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- 2. MODAL EDIT SISWA REMEDIAL (DI EDITOR) ---
export const StudentModal = ({ isOpen, onClose, students, selectedIds, onChange }) => {
    if (!isOpen) return null;

    const [search, setSearch] = React.useState('');

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 flex flex-col max-h-[80vh]">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">Edit Siswa Remedial</h3>
                    <button onClick={onClose}><X size={20} /></button>
                </div>

                <div className="relative mb-3">
                    <Search className="absolute left-3 top-2.5 text-zinc-400" size={16} />
                    <input
                        type="text"
                        placeholder="Cari siswa..."
                        className="w-full pl-9 pr-4 py-2 border border-zinc-200 rounded-lg text-sm bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex-1 overflow-y-auto border border-zinc-200 rounded-lg p-2 space-y-1 custom-scrollbar">
                    {filteredStudents.map(s => (
                        <label key={s.id} className="flex items-center gap-3 cursor-pointer hover:bg-zinc-50 p-2 rounded transition">
                            <input
                                type="checkbox"
                                checked={selectedIds.includes(s.id)}
                                onChange={(e) => {
                                    if (e.target.checked) onChange([...selectedIds, s.id]);
                                    else onChange(selectedIds.filter(id => id !== s.id));
                                }}
                                className="w-4 h-4 rounded border-zinc-300 text-black focus:ring-black"
                            />
                            <span className="text-sm font-medium">{s.name}</span>
                        </label>
                    ))}
                    {filteredStudents.length === 0 && (
                        <p className="text-center text-xs text-zinc-400 py-4">Siswa tidak ditemukan</p>
                    )}
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-zinc-500">{selectedIds.length} Siswa Terpilih</span>
                    <button onClick={onClose} className="px-6 py-2 bg-black text-white rounded-lg font-bold hover:bg-zinc-800 transition">
                        SELESAI
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- 3. MODAL KONFIGURASI BOBOT (DI GRADING) ---
export const WeightModal = ({ isOpen, onClose, pgWeight, setPgWeight, questions, onUpdateWeight, onDistribute, onSave, isValidWeight, totalWeight }) => {
    if (!isOpen) return null;

    // [SMART DETECTION] Hitung jumlah soal
    const pgCount = questions.filter(q => q.type === 'pg').length;
    const essayCount = questions.filter(q => q.type !== 'pg').length;

    // [LOGIC] Auto-Lock Input — only adjusts once when modal opens or counts change
    const lastApplied = React.useRef('');
    useEffect(() => {
        if (!isOpen) { lastApplied.current = ''; return; }
        const key = `${pgCount}-${essayCount}`;
        if (key === lastApplied.current) return;
        lastApplied.current = key;

        // Jika tidak ada PG, bobot PG harus 0
        if (pgCount === 0) {
            setPgWeight(0);
        }
        // Jika tidak ada Essay, bobot PG harus 100 (Otomatis Full PG)
        else if (essayCount === 0) {
            setPgWeight(100);
        }
    }, [isOpen, pgCount, essayCount]);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto flex flex-col">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="text-xl font-bold">Bobot Penilaian</h3>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                <p className="text-sm text-zinc-500 mb-6">Total bobot harus 100%. Atur persentase untuk PG dan setiap soal Essay.</p>

                {/* INPUT BOBOT PG */}
                <div className="mb-6 p-5 bg-blue-50 border border-blue-100 rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                        <label className="font-bold text-blue-900">Bobot Total Pilihan Ganda (PG)</label>
                        <span className="text-xl font-black text-blue-600">{pgWeight}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        className={`w-full accent-blue-600 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer ${(pgCount === 0 || essayCount === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        value={pgWeight}
                        onChange={e => setPgWeight(parseInt(e.target.value))}
                        disabled={pgCount === 0 || essayCount === 0}
                    />
                    <p className="text-xs text-blue-500 mt-2 font-medium flex items-center gap-1">
                        <Check size={12} />
                        {pgCount === 0 ? "Tidak ada soal PG (Otomatis 0%)" :
                            essayCount === 0 ? "Tidak ada soal Essay (Otomatis 100%)" :
                                `Otomatis dibagi rata ke ${pgCount} soal PG.`}
                    </p>
                </div>

                {/* LIST INPUT BOBOT ESSAY */}
                <div className="mb-4 flex-1 overflow-y-auto min-h-0">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-zinc-700">Bobot Essay ({essayCount} Soal)</h4>
                        {essayCount > 0 && (
                            <button
                                onClick={onDistribute}
                                className="text-xs bg-zinc-100 text-zinc-600 px-3 py-1.5 rounded-lg font-bold hover:bg-zinc-200 transition border border-zinc-200"
                            >
                                ⚡ Bagi Rata Sisa {100 - pgWeight}%
                            </button>
                        )}
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {questions.map((q, idx) => {
                            if (q.type === 'pg') return null;
                            return (
                                <div key={idx} className="flex items-center gap-4 p-3 bg-zinc-50 border border-zinc-100 rounded-xl hover:border-zinc-300 transition-colors">
                                    <span className="text-xs font-bold text-zinc-500 w-16">SOAL {idx + 1}</span>
                                    <p className="flex-1 text-sm truncate font-medium text-zinc-700">{q.questionText || '(Tanpa Teks)'}</p>
                                    <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-black/5">
                                        <input
                                            type="number"
                                            className="w-12 text-center font-bold outline-none text-sm"
                                            value={q.weight}
                                            onChange={e => onUpdateWeight(idx, parseInt(e.target.value) || 0)}
                                        />
                                        <span className="text-xs font-bold text-zinc-400">%</span>
                                    </div>
                                </div>
                            );
                        })}
                        {essayCount === 0 && <p className="text-sm text-zinc-400 italic text-center py-4 bg-zinc-50 rounded-xl">Tidak ada soal essay.</p>}
                    </div>
                </div>

                {/* FOOTER & VALIDATION */}
                <div className="flex flex-col gap-3 pt-4 border-t border-zinc-100 mt-auto">
                    {/* Custom Smart Alert (Red Text) */}
                    {!isValidWeight && (
                        <div className="text-center bg-red-50 text-red-600 p-2 rounded-lg text-xs font-bold animate-pulse border border-red-100 flex items-center justify-center gap-2">
                            <AlertTriangle size={14} /> Total bobot harus 100% (Saat ini: {totalWeight}%)
                        </div>
                    )}

                    <div className="flex justify-between items-center">
                        <div className={`text-lg font-bold ${isValidWeight ? 'text-green-600' : 'text-zinc-400'}`}>Total: {totalWeight}/100</div>
                        <div className="flex gap-2">
                            <button onClick={onClose} className="px-5 py-2.5 text-zinc-500 font-bold hover:bg-zinc-100 rounded-xl transition">Batal</button>
                            <button
                                onClick={onSave}
                                disabled={!isValidWeight}
                                className="px-6 py-2.5 bg-black text-white font-bold rounded-xl hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg flex items-center gap-2"
                            >
                                <Check size={18} /> SIMPAN
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- 4. MODAL GLOBAL KEY & DISCUSSION (MASTER KEY) ---
export const DiscussionModal = ({ isOpen, onClose, task, onSave }) => {
    if (!isOpen || !task) return null;

    const [form, setForm] = React.useState({
        discussionText: '',
        discussionUrl: '',
        showDiscussion: false
    });

    // Load data saat modal dibuka
    useEffect(() => {
        if (task) {
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
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
                    <div
                        className={`p-4 rounded-xl border-2 transition-all flex items-center justify-between cursor-pointer ${form.showDiscussion ? 'bg-green-50 border-green-500' : 'bg-zinc-50 border-zinc-200'}`}
                        onClick={() => setForm({ ...form, showDiscussion: !form.showDiscussion })}
                    >
                        <div>
                            <h4 className={`font-bold text-sm ${form.showDiscussion ? 'text-green-800' : 'text-zinc-500'}`}>
                                {form.showDiscussion ? 'KUNCI TERBUKA (ON)' : 'KUNCI TERTUTUP (OFF)'}
                            </h4>
                            <p className="text-[10px] text-zinc-500 mt-1 max-w-[200px]">
                                {form.showDiscussion ? 'Siswa BISA melihat jawaban benar & pembahasan.' : 'Siswa HANYA melihat nilai akhir.'}
                            </p>
                        </div>
                        <div className={`w-12 h-6 rounded-full p-1 transition-colors ${form.showDiscussion ? 'bg-green-500' : 'bg-zinc-300'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${form.showDiscussion ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </div>
                    </div>

                    {/* INPUT FILE / LINK */}
                    <div>
                        <label className="text-xs font-bold text-zinc-500 mb-1 block">LINK FILE KUNCI / GAMBAR (Opsional)</label>
                        <input
                            type="text"
                            placeholder="https://..."
                            className="w-full px-4 py-2 border border-zinc-300 rounded-lg text-sm bg-zinc-50 focus:bg-white focus:border-black transition outline-none"
                            value={form.discussionUrl}
                            onChange={e => setForm({ ...form, discussionUrl: e.target.value })}
                        />
                        <p className="text-[10px] text-zinc-400 mt-1">Tempel link Google Drive atau URL Gambar di sini.</p>
                    </div>

                    {/* INPUT TEXTAREA */}
                    <div>
                        <label className="text-xs font-bold text-zinc-500 mb-1 block">CATATAN / PEMBAHASAN GLOBAL</label>
                        <textarea
                            className="w-full px-4 py-2 border border-zinc-300 rounded-lg text-sm bg-zinc-50 focus:bg-white focus:border-black transition h-32 outline-none resize-none"
                            placeholder="Tulis pembahasan umum atau kunci jawaban manual di sini..."
                            value={form.discussionText}
                            onChange={e => setForm({ ...form, discussionText: e.target.value })}
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t border-zinc-100">
                    <button onClick={onClose} className="flex-1 py-3 text-zinc-500 font-bold hover:bg-zinc-100 rounded-xl transition">Batal</button>
                    <button onClick={handleSubmit} className="flex-1 py-3 bg-black text-white font-bold rounded-xl hover:bg-zinc-800 shadow-lg transition">
                        SIMPAN PENGATURAN
                    </button>
                </div>
            </div>
        </div>
    );
};
