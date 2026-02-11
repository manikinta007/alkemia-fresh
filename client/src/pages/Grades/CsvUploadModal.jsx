import React, { useState, useCallback } from 'react';
import { X, Upload, FileSpreadsheet, Check, AlertTriangle, Download } from 'lucide-react';

export default function CsvUploadModal({ isOpen, onClose, components, onPreview, onUpload, studentNames }) {
    const [selectedComponent, setSelectedComponent] = useState(null);
    const [csvText, setCsvText] = useState('');
    const [preview, setPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [step, setStep] = useState(1); // 1=select+paste, 2=preview

    const manualComponents = (components || []).filter(c => c.source_type === 'manual');

    const resetState = () => {
        setSelectedComponent(null);
        setCsvText('');
        setPreview(null);
        setStep(1);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const parseCsv = (text) => {
        const lines = text.trim().split('\n');
        const rows = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            // Skip header row
            if (i === 0 && (line.toLowerCase().includes('nama') || line.toLowerCase().includes('name'))) continue;
            const parts = line.split(',');
            if (parts.length >= 2) {
                rows.push({
                    name: parts[0].trim(),
                    value: parts[1].trim()
                });
            }
        }
        return rows;
    };

    const handlePreview = async () => {
        if (!csvText.trim() || !selectedComponent) return;
        const rows = parseCsv(csvText);
        if (rows.length === 0) return;
        const result = await onPreview(rows);
        if (result) {
            setPreview(result);
            setStep(2);
        }
    };

    const handleUpload = async () => {
        if (!preview || !selectedComponent) return;
        setUploading(true);
        const entries = preview.preview.filter(p => p.matched).map(p => ({
            student_id: p.student_id,
            value: p.csv_value
        }));
        const success = await onUpload(selectedComponent.id, entries);
        setUploading(false);
        if (success) handleClose();
    };

    const handleFileDrop = useCallback((e) => {
        e.preventDefault();
        const file = e.dataTransfer?.files[0] || e.target?.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => setCsvText(ev.target.result);
            reader.readAsText(file);
        }
    }, []);

    const downloadTemplate = () => {
        const names = studentNames || [];
        const csv = 'Nama,Nilai\n' + names.map(n => `${n},`).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `template_nilai_${selectedComponent?.name || 'komponen'}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
                    <h2 className="text-lg font-bold text-zinc-900">📄 Upload CSV</h2>
                    <button onClick={handleClose} className="p-2 hover:bg-zinc-100 rounded-full transition">
                        <X size={18} />
                    </button>
                </div>

                <div className="overflow-y-auto max-h-[70vh] p-6 space-y-4">
                    {step === 1 && (
                        <>
                            {/* Component selector */}
                            <div>
                                <label className="text-sm font-bold text-zinc-700 mb-2 block">Pilih Komponen Tujuan</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {manualComponents.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => setSelectedComponent(c)}
                                            className={`p-3 text-sm font-medium rounded-xl border-2 transition ${selectedComponent?.id === c.id
                                                ? 'border-orange-500 bg-orange-50 text-orange-700'
                                                : 'border-zinc-200 hover:border-zinc-300 text-zinc-600'
                                                }`}
                                        >
                                            {c.name} ({c.weight}%)
                                        </button>
                                    ))}
                                </div>
                                {manualComponents.length === 0 && (
                                    <p className="text-sm text-zinc-400 italic mt-2">Tidak ada komponen manual. Tambahkan di Konfigurasi.</p>
                                )}
                            </div>

                            {/* CSV Input */}
                            <div>
                                <label className="text-sm font-bold text-zinc-700 mb-2 block">Data CSV</label>
                                <p className="text-xs text-zinc-500 mb-2">Format: <code className="bg-zinc-100 px-1 rounded">Nama,Nilai</code> per baris</p>
                                <textarea
                                    value={csvText}
                                    onChange={e => setCsvText(e.target.value)}
                                    placeholder="Nama,Nilai&#10;Ahmad Fauzi,75&#10;Budi Santoso,80&#10;Citra Dewi,65"
                                    className="w-full h-40 px-3 py-2 text-sm font-mono bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none"
                                />
                            </div>

                            {/* Or drop file */}
                            <div
                                onDragOver={e => e.preventDefault()}
                                onDrop={handleFileDrop}
                                className="border-2 border-dashed border-zinc-300 rounded-xl p-4 text-center hover:border-orange-400 transition cursor-pointer"
                            >
                                <input type="file" accept=".csv,.txt" onChange={handleFileDrop} className="hidden" id="csvFile" />
                                <label htmlFor="csvFile" className="cursor-pointer flex flex-col items-center gap-2">
                                    <FileSpreadsheet size={24} className="text-zinc-400" />
                                    <span className="text-xs text-zinc-500">Atau seret file CSV ke sini</span>
                                </label>
                            </div>

                            {/* Download Template */}
                            <button
                                onClick={downloadTemplate}
                                disabled={!selectedComponent}
                                className={`w-full py-2.5 flex items-center justify-center gap-2 text-sm font-medium rounded-xl border transition ${selectedComponent ? 'text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100' : 'text-zinc-400 border-zinc-200 cursor-not-allowed'
                                    }`}
                            >
                                <Download size={16} /> Download Template CSV
                            </button>
                        </>
                    )}

                    {step === 2 && preview && (
                        <>
                            {/* Preview Results */}
                            <div className="flex items-center gap-4 text-sm">
                                <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 font-bold">
                                    ✅ {preview.matched} cocok
                                </span>
                                {preview.unmatched > 0 && (
                                    <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 font-bold">
                                        ❌ {preview.unmatched} tidak cocok
                                    </span>
                                )}
                            </div>

                            <div className="border border-zinc-200 rounded-xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-zinc-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs text-zinc-500 font-bold">Nama CSV</th>
                                            <th className="px-4 py-2 text-center text-xs text-zinc-500 font-bold">Nilai</th>
                                            <th className="px-4 py-2 text-center text-xs text-zinc-500 font-bold">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100">
                                        {preview.preview.map((row, i) => (
                                            <tr key={i} className={row.matched ? '' : 'bg-red-50'}>
                                                <td className="px-4 py-2 font-medium">{row.csv_name}</td>
                                                <td className="px-4 py-2 text-center">{row.csv_value}</td>
                                                <td className="px-4 py-2 text-center">
                                                    {row.matched ? (
                                                        <span className="text-green-600 flex items-center justify-center gap-1"><Check size={14} /> {row.student_name}</span>
                                                    ) : (
                                                        <span className="text-red-500 flex items-center justify-center gap-1"><AlertTriangle size={14} /> Tidak ditemukan</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 bg-zinc-50">
                    {step === 2 ? (
                        <button onClick={() => setStep(1)} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-200 rounded-lg transition">
                            ← Kembali
                        </button>
                    ) : <div />}
                    <div className="flex gap-2">
                        <button onClick={handleClose} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-200 rounded-lg transition">
                            Batal
                        </button>
                        {step === 1 ? (
                            <button
                                onClick={handlePreview}
                                disabled={!csvText.trim() || !selectedComponent}
                                className={`px-6 py-2 text-sm font-bold text-white rounded-lg flex items-center gap-2 transition ${csvText.trim() && selectedComponent ? 'bg-orange-600 hover:bg-orange-700' : 'bg-zinc-300 cursor-not-allowed'
                                    }`}
                            >
                                Preview
                            </button>
                        ) : (
                            <button
                                onClick={handleUpload}
                                disabled={uploading || !preview || preview.matched === 0}
                                className={`px-6 py-2 text-sm font-bold text-white rounded-lg flex items-center gap-2 transition ${!uploading && preview?.matched > 0 ? 'bg-green-600 hover:bg-green-700' : 'bg-zinc-300 cursor-not-allowed'
                                    }`}
                            >
                                <Upload size={16} />
                                {uploading ? 'Mengimpor...' : `Import ${preview?.matched || 0} Nilai`}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
