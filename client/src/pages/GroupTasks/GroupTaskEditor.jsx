import React, { useState } from 'react';
import {
    X, Plus, Trash2, Image as ImageIcon, Link, LayoutList, AlignLeft,
    CheckCircle2, HelpCircle, Save, ArrowLeft, Users, FileDown, FileUp
} from 'lucide-react';

// --- KOMPONEN UTAMA EDITOR (Fork dari TaskEditor.jsx) ---
export const GroupTaskEditor = ({
    headerForm,
    setHeaderForm,
    questions,
    setQuestions,
    saving,
    onSaveFull,
    onSaveIdentity,
    onCancel,
    onOpenUrlModal
}) => {
    const fileInputRef = React.useRef(null);
    const [isIdentityOpen, setIsIdentityOpen] = useState(false);

    // --- INTERNAL HELPERS ---
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
        const csvContent = "Pertanyaan;Opsi A;Opsi B;Opsi C;Opsi D;Opsi E;Jawaban Benar (A/B/C/D/E)\nContoh Soal?;Pilihan A;Pilihan B;Pilihan C;Pilihan D;Pilihan E;A";
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
        link.download = "Template_Soal_Tugas_Kelompok.csv";
        link.click();
    };

    const handleUploadCsv = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target.result;
            const lines = text.split('\n');
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
                alert('Berhasil mengimpor ' + newQuestions.length + ' soal.');
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in pb-20 w-full px-4 md:px-8 bg-zinc-50 min-h-screen">

            {/* 1. HEADER EDITOR & ACTIONS */}
            <div className="flex justify-between items-center mb-6 pt-8">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-zinc-900">Editor Soal Kelompok</h2>
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
                    <button onClick={handleDownloadTemplate} className="px-3 py-1.5 bg-zinc-50 border border-zinc-300 rounded text-xs font-bold hover:bg-zinc-100 transition flex items-center gap-1">
                        <FileDown size={14} /> Template
                    </button>
                    <div className="relative">
                        <input type="file" ref={fileInputRef} onChange={handleUploadCsv} accept=".csv" className="absolute inset-0 opacity-0 cursor-pointer" />
                        <button className="px-3 py-1.5 bg-zinc-800 text-white rounded text-xs font-bold hover:bg-black transition flex items-center gap-1">
                            <FileUp size={14} /> Upload CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. IDENTITAS TUGAS (COLLAPSIBLE) */}
            <div className="bg-white border border-zinc-200 p-4 rounded-xl mb-8 flex justify-between items-center shadow-sm relative">
                <div className="text-xs">
                    <span className="font-bold text-zinc-700 block mb-1">IDENTITAS TUGAS KELOMPOK</span>
                    <span className="text-zinc-400">Edit Judul, Deadline & Deskripsi</span>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setIsIdentityOpen(!isIdentityOpen)}
                        className="px-3 py-1.5 bg-zinc-50 border border-zinc-300 rounded text-xs font-bold hover:bg-zinc-100 transition cursor-pointer flex items-center gap-2"
                    >
                        <span>⚙️ Edit Identitas</span>
                    </button>

                    {isIdentityOpen && (
                        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-zinc-200 shadow-xl rounded-xl p-4 z-50 animate-in zoom-in-95">
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase">JUDUL</label>
                                    <input type="text" className="w-full px-2 py-1 border rounded text-sm font-bold focus:outline-none focus:border-black" value={headerForm.title} onChange={e => setHeaderForm({ ...headerForm, title: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase">DEADLINE</label>
                                    <input type="datetime-local" className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:border-black" value={headerForm.deadline} onChange={e => setHeaderForm({ ...headerForm, deadline: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase">DESKRIPSI</label>
                                    <textarea className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:border-black" rows="2" value={headerForm.description} onChange={e => setHeaderForm({ ...headerForm, description: e.target.value })} />
                                </div>

                                <button onClick={() => { onSaveIdentity(); setIsIdentityOpen(false); }} className="w-full py-1.5 bg-black text-white text-xs font-bold rounded mt-2 hover:bg-zinc-800">Simpan Perubahan Identitas</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 4. DAFTAR SOAL */}
            <div className="space-y-8">
                {questions.map((q, idx) => (
                    <div key={idx} className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition">
                        {/* Question Header */}
                        <div className="bg-zinc-50 border-b border-zinc-200 p-3 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-zinc-500 tracking-widest uppercase">PERTANYAAN NO {idx + 1}</span>
                                <span className="text-[10px] font-bold bg-black text-white px-2 py-0.5 rounded uppercase">{q.type.replace('_', ' ').replace('text', 'teks')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => onOpenUrlModal(idx)} className="flex items-center gap-2 bg-white border border-zinc-300 hover:border-black hover:text-black text-zinc-600 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm" title="Sisipkan Gambar">
                                    <ImageIcon size={14} /> Sisipkan Gambar
                                </button>
                                <button onClick={() => removeQuestion(idx)} className="text-zinc-400 hover:text-red-500 transition px-2">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Question Editor */}
                        <div className="p-4 bg-white relative">
                            <div
                                className="w-full min-h-[120px] p-4 border border-zinc-200 rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black/5 transition leading-relaxed prose max-w-none"
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => updateQuestion(idx, 'questionText', e.currentTarget.innerHTML)}
                                dangerouslySetInnerHTML={{ __html: q.questionText || 'Ketik soal di sini...' }}
                                onFocus={(e) => {
                                    if (e.currentTarget.innerHTML === 'Ketik soal di sini...') {
                                        e.currentTarget.innerHTML = '';
                                    }
                                }}
                            ></div>
                            <p className="mt-2 text-[10px] text-zinc-400 text-right">
                                * Editor ini mendukung tampilan langsung. Sisipkan gambar menggunakan tombol di atas.
                            </p>
                        </div>

                        {/* Detected Images Manager */}
                        {(() => {
                            const htmlContent = q.questionText || '';
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(htmlContent, 'text/html');
                            const images = Array.from(doc.querySelectorAll('img')).map(img => img.src);

                            if (images.length === 0) return null;

                            return (
                                <div className="mx-4 mt-2 bg-zinc-50 border border-zinc-200 rounded-lg p-3">
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase mb-2">Gambar Terdeteksi ({images.length})</p>
                                    <div className="flex flex-wrap gap-3">
                                        {images.map((src, imgIdx) => (
                                            <div key={imgIdx} className="relative group bg-white p-1 rounded border border-zinc-200 shadow-sm">
                                                <img src={src} className="h-16 w-16 object-cover rounded bg-zinc-100" title="Klik tombol X untuk menghapus" />
                                                <button
                                                    onClick={() => {
                                                        const tempDiv = document.createElement('div');
                                                        tempDiv.innerHTML = q.questionText || '';
                                                        const imgs = tempDiv.getElementsByTagName('img');
                                                        let removed = false;
                                                        for (let i = 0; i < imgs.length; i++) {
                                                            if (imgs[i].src === src) {
                                                                imgs[i].remove();
                                                                removed = true;
                                                                break;
                                                            }
                                                        }
                                                        if (removed) {
                                                            updateQuestion(idx, 'questionText', tempDiv.innerHTML);
                                                        }
                                                    }}
                                                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-md hover:bg-red-700 transition opacity-0 group-hover:opacity-100"
                                                    title="Hapus Gambar"
                                                >
                                                    <X size={12} strokeWidth={3} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Options Area */}
                        <div className="bg-white p-4">
                            {/* Pilihan Ganda */}
                            {q.type === 'pg' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                    {q.options.map((opt, oIdx) => (
                                        <div key={oIdx} className="flex items-center gap-0 group">
                                            <div
                                                onClick={() => updateQuestion(idx, 'correctKey', String.fromCharCode(65 + oIdx))}
                                                className={`w-10 h-10 flex-shrink-0 flex items-center justify-center font-bold rounded-l-lg cursor-pointer transition border border-r-0 ${q.correctKey === String.fromCharCode(65 + oIdx) ? 'bg-green-500 text-white border-green-600' : 'bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200'}`}
                                                title="Klik untuk set sebagai Kunci Jawaban"
                                            >
                                                {String.fromCharCode(65 + oIdx)}
                                            </div>
                                            <input
                                                type="text"
                                                className="flex-1 h-10 px-3 border border-zinc-200 rounded-r-lg text-sm focus:border-black focus:z-10 focus:outline-none transition"
                                                value={opt}
                                                onChange={(e) => updateOption(idx, oIdx, e.target.value)}
                                                placeholder={`Pilihan ${String.fromCharCode(65 + oIdx)}`}
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
                                            value={q.charLimit || 500}
                                            onChange={(e) => updateQuestion(idx, 'charLimit', parseInt(e.target.value))}
                                        />
                                    </div>
                                    <p className="text-xs text-zinc-400">Siswa akan menjawab dengan teks panjang (Maksimal 1000 karakter).</p>
                                </div>
                            )}

                            {/* Essay Image */}
                            {q.type === 'essay_image' && (
                                <div className="mt-4 p-4 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center gap-3 text-zinc-500">
                                    <ImageIcon size={24} />
                                    <p className="text-xs font-bold uppercase">Tipe Soal: Upload Gambar (Siswa akan diminta mengupload foto jawaban dari Kamera/Galeri).</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* 5. TOMBOL TAMBAH SOAL */}
            <div className="mt-8 border-2 border-dashed border-zinc-200 rounded-xl p-2 hover:border-black transition cursor-pointer group bg-zinc-50/50 hover:bg-white text-center">
                <div className="flex gap-4 justify-center p-4">
                    <button onClick={() => addQuestion('pg')} className="px-6 py-2 bg-white border border-zinc-300 text-zinc-600 font-bold rounded-lg text-xs hover:border-black hover:text-black transition shadow-sm uppercase flex items-center gap-2">
                        + Pilihan Ganda
                    </button>
                    <button onClick={() => addQuestion('essay_text')} className="px-6 py-2 bg-white border border-zinc-300 text-zinc-600 font-bold rounded-lg text-xs hover:border-black hover:text-black transition shadow-sm uppercase flex items-center gap-2">
                        + Essay Teks
                    </button>
                    <button onClick={() => addQuestion('essay_image')} className="px-6 py-2 bg-white border border-zinc-300 text-zinc-600 font-bold rounded-lg text-xs hover:border-black hover:text-black transition shadow-sm uppercase flex items-center gap-2">
                        + Essay Gambar
                    </button>
                </div>
                <p className="text-center text-[10px] text-zinc-400 font-bold uppercase pb-2 group-hover:text-black transition">+ TAMBAH SOAL BARU</p>
            </div>
        </div>
    );
};
