import React, { useRef, useState } from 'react';
import { Upload, Download, Trash2, Link as LinkIcon, Eye } from 'lucide-react';
import { useAlertContext } from '../../components/Alert';

export const QuestionEditor = ({ activeQuiz, questions, setQuestions, onSave, onCancel }) => {
    const { showAlert, showConfirm } = useAlertContext();
    const fileInputRef = useRef(null);
    const [urlModal, setUrlModal] = useState({ isOpen: false, targetIdx: null });

    const addEmptyQuestion = () => setQuestions([...questions, { question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', option_e: '', correct_answer: 'A' }]);
    const updateQuestion = (idx, field, value) => { const newQ = [...questions]; newQ[idx][field] = value; setQuestions(newQ); };
    const removeQuestion = (idx) => {
        const newQ = [...questions];
        newQ.splice(idx, 1);
        setQuestions(newQ);
    };

    const handleDownloadTemplate = () => {
        const csvContent = "Pertanyaan;Opsi A;Opsi B;Opsi C;Opsi D;Opsi E;Jawaban Benar (A/B/C/D/E)\nSiapa presiden pertama RI?;Soeharto;Soekarno;Habibie;Megawati;Jokowi;B";
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
        link.download = "Template_Soal.csv";
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
                        question_text: parts[0]?.trim() || '',
                        option_a: parts[1]?.trim() || '',
                        option_b: parts[2]?.trim() || '',
                        option_c: parts[3]?.trim() || '',
                        option_d: parts[4]?.trim() || '',
                        option_e: parts[5]?.trim() || '',
                        correct_answer: (parts[6]?.trim() || 'A').toUpperCase()
                    });
                }
            }
            if (newQuestions.length > 0) {
                setQuestions([...questions, ...newQuestions]);
                showAlert('Berhasil membaca ' + newQuestions.length + ' soal dari CSV.', 'success');
            } else { showAlert('Gagal membaca CSV atau file kosong.', 'error'); }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    // URL Modal Logic handled inside here for simplicity, or we can make it a small inline modal
    const handleOpenUrlModal = (idx) => setUrlModal({ isOpen: true, targetIdx: idx });

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in pb-20">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-zinc-50 z-20 py-4 border-b border-zinc-200">
                <div>
                    <h2 className="text-2xl font-bold text-zinc-900">Editor Soal</h2>
                    <p className="text-zinc-500 text-sm">Quiz: <span className="font-bold text-black">{activeQuiz.title}</span> • {questions.length} Soal</p>
                </div>
                <div className="space-x-2">
                    <button onClick={onCancel} className="px-4 py-2 text-sm font-bold text-zinc-500 hover:text-black transition">BATAL</button>
                    <button onClick={onSave} className="px-6 py-2 bg-black text-white text-sm font-bold rounded-lg hover:bg-zinc-800 shadow-md transition transform active:scale-95">SIMPAN SEMUA</button>
                </div>
            </div>

            <div className="bg-white border border-zinc-200 p-4 rounded-xl mb-8 flex flex-col sm:flex-row justify-between items-center shadow-sm gap-4">
                <div className="text-xs">
                    <span className="font-bold text-zinc-700 block mb-1">IMPORT DARI EXCEL/CSV</span>
                    <span className="text-zinc-400">Gunakan fitur ini untuk upload banyak soal sekaligus.</span>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={handleDownloadTemplate} className="flex-1 sm:flex-none px-3 py-1.5 bg-zinc-50 border border-zinc-300 rounded-lg text-xs font-bold hover:bg-zinc-100 transition flex items-center justify-center gap-2">
                        <Download size={14} /> Template
                    </button>
                    <div className="relative flex-1 sm:flex-none">
                        <input type="file" ref={fileInputRef} onChange={handleUploadCsv} accept=".csv" className="absolute inset-0 opacity-0 cursor-pointer w-full" />
                        <button className="w-full px-3 py-1.5 bg-zinc-800 text-white rounded-lg text-xs font-bold hover:bg-black transition flex items-center justify-center gap-2">
                            <Upload size={14} /> Upload CSV
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                {questions.map((q, idx) => {
                    return (
                        <div key={idx} className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm transition hover:shadow-md">
                            <div className="bg-zinc-50 border-b border-zinc-200 p-3 flex justify-between items-center">
                                <span className="text-xs font-bold text-zinc-500 tracking-widest">PERTANYAAN NO {idx + 1}</span>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => {
                                            // Quick prompt for now
                                            const url = prompt("Masukkan URL Gambar:");
                                            if (url) {
                                                let finalUrl = url;
                                                if (url.includes('drive.google.com') && url.includes('/view')) {
                                                    const idMatch = url.match(/\/d\/([^/]+)/);
                                                    if (idMatch && idMatch[1]) finalUrl = `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1000`;
                                                }
                                                const imgHtml = `<br><img src="${finalUrl}" class="w-full max-w-sm rounded-lg border border-zinc-200 my-2 shadow-sm"><br>`;
                                                updateQuestion(idx, 'question_text', q.question_text + imgHtml);
                                            }
                                        }}
                                        className="flex items-center gap-2 bg-white border border-zinc-300 hover:border-blue-500 hover:text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm group"
                                        title="Paste Link dari Google"
                                    >
                                        <LinkIcon size={14} /> <span>Sisipkan URL Gambar</span>
                                    </button>
                                    <button onClick={() => removeQuestion(idx)} className="text-zinc-400 hover:text-red-500 transition" title="Hapus Soal">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                            <div className="p-0">
                                <textarea
                                    className="w-full p-4 border-0 focus:ring-0 text-base font-mono bg-transparent resize-y min-h-[100px] placeholder-zinc-300 focus:bg-yellow-50/30 transition outline-none"
                                    rows="3"
                                    value={q.question_text}
                                    onChange={e => updateQuestion(idx, 'question_text', e.target.value)}
                                    placeholder="Ketik soal di sini... (HTML Allowed)"
                                ></textarea>
                            </div>
                            {q.question_text && (
                                <div className="bg-blue-50/30 p-4 border-t border-dashed border-blue-200">
                                    <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-1">
                                        <Eye size={12} /> Live Preview
                                    </p>
                                    <div className="prose prose-sm max-w-none text-zinc-800" dangerouslySetInnerHTML={{ __html: q.question_text }}></div>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-zinc-50 border-t border-zinc-200">
                                {['A', 'B', 'C', 'D', 'E'].map(opt => {
                                    const badgeClass = q.correct_answer === opt ? 'bg-green-500 text-white shadow-green-200 shadow-md transform scale-105' : 'bg-zinc-200 text-zinc-500 hover:bg-zinc-300';
                                    const fieldName = 'option_' + opt.toLowerCase();
                                    return (
                                        <div key={opt} className="flex items-center gap-2 group">
                                            <div
                                                className={'w-8 h-8 flex flex-shrink-0 items-center justify-center text-xs font-bold rounded-lg cursor-pointer transition ' + badgeClass}
                                                onClick={() => updateQuestion(idx, 'correct_answer', opt)}
                                                title="Klik untuk set sebagai Kunci Jawaban"
                                            >
                                                {opt}
                                            </div>
                                            <input
                                                type="text"
                                                className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:border-black focus:outline-none transition group-hover:border-zinc-400"
                                                value={q[fieldName]}
                                                onChange={e => updateQuestion(idx, fieldName, e.target.value)}
                                                placeholder={'Pilihan ' + opt}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            <button onClick={addEmptyQuestion} className="w-full py-4 mt-8 border-2 border-dashed border-zinc-300 rounded-xl text-zinc-400 font-bold hover:border-black hover:text-black hover:bg-zinc-50 transition">+ TAMBAH SOAL BARU</button>
        </div>
    );
};
