import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, AlertTriangle } from 'lucide-react';

const SOURCE_TYPES = [
    { value: 'tasks', label: 'Auto: Tugas (Individu + Kelompok)' },
    { value: 'quizzes', label: 'Auto: Ulangan Harian (Quiz)' },
    { value: 'participation', label: 'Auto: Keaktifan' },
    { value: 'manual', label: 'Manual (Input / CSV)' },
];

export default function GradeConfigModal({ isOpen, onClose, config, onSave }) {
    const [components, setComponents] = useState([]);
    const [kkm, setKkm] = useState(75);
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (config) {
            setComponents(config.components?.length > 0 ? config.components.map(c => ({ ...c })) : [
                { name: 'Tugas Harian', weight: 30, source_type: 'tasks' },
                { name: 'Ulangan Harian', weight: 25, source_type: 'quizzes' },
                { name: 'UTS', weight: 20, source_type: 'manual' },
                { name: 'UAS', weight: 15, source_type: 'manual' },
                { name: 'Keaktifan', weight: 10, source_type: 'participation' },
            ]);
            setKkm(config.kkm || 75);
            setShowBreakdown(config.show_grade_breakdown === 1);
        }
    }, [config, isOpen]);

    if (!isOpen) return null;

    const totalWeight = components.reduce((sum, c) => sum + (parseInt(c.weight) || 0), 0);
    const isValid = totalWeight === 100 && components.length > 0 && components.every(c => c.name.trim());

    const addComponent = () => {
        setComponents([...components, { name: '', weight: 0, source_type: 'manual' }]);
    };

    const removeComponent = (index) => {
        setComponents(components.filter((_, i) => i !== index));
    };

    const updateComponent = (index, field, value) => {
        const updated = [...components];
        updated[index] = { ...updated[index], [field]: field === 'weight' ? parseInt(value) || 0 : value };
        setComponents(updated);
    };

    const handleSave = async () => {
        if (!isValid) return;
        setSaving(true);
        const success = await onSave({
            kkm: parseInt(kkm) || 75,
            show_grade_breakdown: showBreakdown ? 1 : 0,
            components: components.map(c => ({
                name: c.name.trim(),
                weight: c.weight,
                source_type: c.source_type
            }))
        });
        setSaving(false);
        if (success) onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
                    <h2 className="text-lg font-bold text-zinc-900">⚙️ Konfigurasi Komponen Nilai</h2>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition">
                        <X size={18} />
                    </button>
                </div>

                <div className="overflow-y-auto max-h-[70vh] p-6 space-y-6">
                    {/* KKM Setting */}
                    <div className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <div className="flex-1">
                            <label className="text-sm font-bold text-amber-800">KKM (Kriteria Ketuntasan Minimal)</label>
                            <p className="text-xs text-amber-600 mt-0.5">Siswa di bawah KKM akan mendapat peringatan</p>
                        </div>
                        <input
                            type="number"
                            value={kkm}
                            onChange={e => setKkm(e.target.value)}
                            className="w-20 px-3 py-2 text-center font-bold text-amber-900 bg-white border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                            min="0" max="100"
                        />
                    </div>

                    {/* Component List */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-zinc-700 uppercase tracking-wider">Komponen Penilaian</h3>
                            <span className={`text-sm font-bold px-3 py-1 rounded-full ${totalWeight === 100
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                Total: {totalWeight}%
                            </span>
                        </div>

                        <div className="space-y-3">
                            {components.map((comp, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded-xl group hover:border-zinc-300 transition">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            placeholder="Nama komponen..."
                                            value={comp.name}
                                            onChange={e => updateComponent(i, 'name', e.target.value)}
                                            className="w-full px-3 py-1.5 text-sm font-medium bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                                        />
                                    </div>
                                    <select
                                        value={comp.source_type}
                                        onChange={e => updateComponent(i, 'source_type', e.target.value)}
                                        className="py-1.5 px-2 text-xs bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                    >
                                        {SOURCE_TYPES.map(st => (
                                            <option key={st.value} value={st.value}>{st.label}</option>
                                        ))}
                                    </select>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            value={comp.weight}
                                            onChange={e => updateComponent(i, 'weight', e.target.value)}
                                            className="w-16 px-2 py-1.5 text-center text-sm font-bold bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                            min="0" max="100"
                                        />
                                        <span className="text-xs text-zinc-500 font-bold">%</span>
                                    </div>
                                    <button
                                        onClick={() => removeComponent(i)}
                                        className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={addComponent}
                            className="mt-3 w-full py-2.5 flex items-center justify-center gap-2 text-sm font-medium text-zinc-500 border-2 border-dashed border-zinc-300 rounded-xl hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50/50 transition"
                        >
                            <Plus size={16} /> Tambah Komponen
                        </button>
                    </div>

                    {/* Student Breakdown Toggle */}
                    <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <input
                            type="checkbox"
                            checked={showBreakdown}
                            onChange={e => setShowBreakdown(e.target.checked)}
                            className="w-4 h-4 accent-blue-600"
                            id="showBreakdown"
                        />
                        <label htmlFor="showBreakdown" className="text-sm text-blue-800 cursor-pointer">
                            <span className="font-bold">Tampilkan breakdown nilai ke siswa</span>
                            <p className="text-xs text-blue-600 mt-0.5">Jika aktif, siswa bisa melihat detail per komponen, bukan hanya nilai akhir</p>
                        </label>
                    </div>

                    {/* Warnings */}
                    {totalWeight !== 100 && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                            <AlertTriangle size={16} />
                            Total bobot harus 100%. Saat ini {totalWeight}%.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 bg-zinc-50">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-200 rounded-lg transition">
                        Batal
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!isValid || saving}
                        className={`px-6 py-2 text-sm font-bold text-white rounded-lg flex items-center gap-2 transition ${isValid && !saving ? 'bg-orange-600 hover:bg-orange-700' : 'bg-zinc-300 cursor-not-allowed'
                            }`}
                    >
                        <Save size={16} />
                        {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                    </button>
                </div>
            </div>
        </div>
    );
}
