import React, { useState } from 'react';
import { useGradesData } from '../hooks/useGradesData';
import { Card, Spinner } from '../components/UI';
import { GridSkeleton } from '../components/Skeleton';
import { ChevronRight, ArrowLeft, Settings, Upload, RefreshCw, AlertTriangle, CheckCircle, Undo2 } from 'lucide-react';
import GradeConfigModal from './Grades/GradeConfigModal';
import CsvUploadModal from './Grades/CsvUploadModal';
import { useAlertContext } from '../components/Alert';

export default function Grades() {
    const {
        loading,
        classes,
        activePeriod,
        selectedClass,
        config,
        gradeRecap,
        savingCell,
        selectClass,
        setSelectedClass,
        saveConfig,
        saveCellValue,
        resetOverride,
        applyRemedial,
        undoRemedial,
        csvPreview,
        csvUpload,
        reloadRecap
    } = useGradesData();

    const { showConfirm } = useAlertContext();

    const [configModalOpen, setConfigModalOpen] = useState(false);
    const [csvModalOpen, setCsvModalOpen] = useState(false);
    const [editingCell, setEditingCell] = useState(null); // `${compId}_${studentId}`
    const [editValue, setEditValue] = useState('');

    // Inline cell editing
    const startEdit = (compId, studentId, currentValue) => {
        setEditingCell(`${compId}_${studentId}`);
        setEditValue(currentValue !== null ? String(currentValue) : '');
    };

    const cancelEdit = () => {
        setEditingCell(null);
        setEditValue('');
    };

    const saveEdit = async (compId, studentId, comp, cv) => {
        const isOverride = comp.source_type !== 'manual';
        await saveCellValue(compId, studentId, editValue, isOverride);
        cancelEdit();
    };

    const handleKeyDown = (e, compId, studentId, comp, cv) => {
        if (e.key === 'Enter') saveEdit(compId, studentId, comp, cv);
        if (e.key === 'Escape') cancelEdit();
    };

    const handleRemedial = (student) => {
        showConfirm(
            `Terapkan remedial untuk ${student.student_name}?\nNilai akhir akan diset menjadi ${gradeRecap.kkm} (KKM).`,
            () => applyRemedial(student.student_id)
        );
    };

    const handleUndoRemedial = (student) => {
        showConfirm(
            `Batalkan remedial untuk ${student.student_name}?`,
            () => undoRemedial(student.student_id)
        );
    };

    // ====== RENDER: Class Selected → Grade Table ======
    if (selectedClass) {
        const { components, students, kkm } = gradeRecap;
        const hasManualComponents = components.some(c => c.source_type === 'manual');

        return (
            <div className="animate-in fade-in duration-300">
                {/* Top Bar */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => setSelectedClass(null)}
                        className="flex items-center text-sm font-medium text-zinc-500 hover:text-orange-600 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Kembali
                    </button>
                    <div className="flex items-center gap-2">
                        <button onClick={reloadRecap} className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-lg transition" title="Refresh">
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                        {hasManualComponents && (
                            <button
                                onClick={() => setCsvModalOpen(true)}
                                className="px-3 py-2 text-xs font-bold text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:border-orange-300 hover:text-orange-600 transition flex items-center gap-1.5"
                            >
                                <Upload size={14} /> Upload CSV
                            </button>
                        )}
                        <button
                            onClick={() => setConfigModalOpen(true)}
                            className="px-3 py-2 text-xs font-bold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition flex items-center gap-1.5"
                        >
                            <Settings size={14} /> Konfigurasi
                        </button>
                    </div>
                </div>

                {/* Class Header */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-zinc-900">{selectedClass.name}</h2>
                    <div className="flex items-center gap-4 mt-1">
                        <p className="text-zinc-500 text-sm">
                            {components.map(c => `${c.name} ${c.weight}%`).join(' • ')}
                        </p>
                        <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-700 rounded-full">
                            KKM: {kkm}
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="py-12 flex justify-center"><Spinner /></div>
                ) : components.length === 0 ? (
                    <div className="text-center p-12 bg-white rounded-2xl border border-zinc-200">
                        <p className="text-zinc-500">Belum ada komponen nilai.</p>
                        <button onClick={() => setConfigModalOpen(true)} className="mt-3 px-4 py-2 bg-orange-600 text-white text-sm font-bold rounded-lg hover:bg-orange-700 transition">
                            Buat Konfigurasi
                        </button>
                    </div>
                ) : (
                    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-zinc-50 border-b border-zinc-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs text-zinc-500 uppercase font-bold tracking-wider w-10">No</th>
                                        <th className="px-4 py-3 text-left text-xs text-zinc-500 uppercase font-bold tracking-wider min-w-[160px]">Nama</th>
                                        {components.map(c => (
                                            <th key={c.id} className="px-3 py-3 text-center text-xs text-zinc-500 uppercase font-bold w-20">
                                                <div>{c.name}</div>
                                                <div className="text-[10px] text-zinc-400 font-normal">({c.weight}%)</div>
                                            </th>
                                        ))}
                                        <th className="px-4 py-3 text-center text-xs text-zinc-500 uppercase font-bold w-20 bg-zinc-100">NA</th>
                                        <th className="px-4 py-3 text-center text-xs text-zinc-500 uppercase font-bold w-28">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100">
                                    {students.map((s, idx) => (
                                        <tr key={s.student_id} className="hover:bg-zinc-50 transition-colors">
                                            <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{idx + 1}</td>
                                            <td className="px-4 py-3 font-medium text-zinc-900 text-xs">{s.student_name}</td>

                                            {components.map((comp, ci) => {
                                                const cv = s.values[ci];
                                                const cellKey = `${comp.id}_${s.student_id}`;
                                                const isEditing = editingCell === cellKey;
                                                const isSaving = savingCell === cellKey;

                                                return (
                                                    <td key={comp.id} className="px-2 py-2 text-center">
                                                        {isEditing ? (
                                                            <input
                                                                type="number"
                                                                autoFocus
                                                                value={editValue}
                                                                onChange={e => setEditValue(e.target.value)}
                                                                onKeyDown={e => handleKeyDown(e, comp.id, s.student_id, comp, cv)}
                                                                onBlur={() => saveEdit(comp.id, s.student_id, comp, cv)}
                                                                className="w-16 px-1 py-1 text-center text-xs font-bold border-2 border-orange-400 rounded focus:ring-2 focus:ring-orange-500 outline-none"
                                                                min="0" max="100"
                                                            />
                                                        ) : isSaving ? (
                                                            <span className="text-xs text-zinc-400">...</span>
                                                        ) : (
                                                            <button
                                                                onClick={() => startEdit(comp.id, s.student_id, cv.effective_value)}
                                                                className={`w-full py-1 text-xs font-bold rounded transition cursor-pointer hover:bg-zinc-100 ${cv.is_overridden
                                                                    ? 'text-blue-600'
                                                                    : cv.effective_value !== null
                                                                        ? 'text-zinc-700'
                                                                        : 'text-zinc-300'
                                                                    }`}
                                                                title={cv.is_overridden ? `Auto: ${cv.auto_value ?? '-'} | Override: ${cv.manual_override}` : undefined}
                                                            >
                                                                {cv.effective_value !== null ? cv.effective_value : '-'}
                                                                {cv.is_overridden && <span className="ml-0.5 text-[8px]">✎</span>}
                                                            </button>
                                                        )}
                                                    </td>
                                                );
                                            })}

                                            {/* Final Grade */}
                                            <td className={`px-4 py-3 text-center font-bold text-sm bg-zinc-50 ${s.is_remedial ? 'text-green-600' : s.is_below_kkm ? 'text-red-600' : 'text-zinc-900'
                                                }`}>
                                                {s.final_grade.toFixed(1)}
                                            </td>

                                            {/* Status */}
                                            <td className="px-3 py-3 text-center">
                                                {s.is_remedial ? (
                                                    <button
                                                        onClick={() => handleUndoRemedial(s)}
                                                        className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition"
                                                        title="Klik untuk membatalkan remedial"
                                                    >
                                                        <CheckCircle size={12} /> Remedial ✅
                                                    </button>
                                                ) : s.is_below_kkm ? (
                                                    <button
                                                        onClick={() => handleRemedial(s)}
                                                        className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition animate-pulse"
                                                    >
                                                        <AlertTriangle size={12} /> Remedial → KKM
                                                    </button>
                                                ) : (
                                                    <span className="text-[10px] text-green-600 font-bold">✅ Tuntas</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {students.length === 0 && (
                                        <tr>
                                            <td colSpan={components.length + 4} className="px-6 py-12 text-center text-zinc-400 italic">
                                                Tidak ada siswa di kelas ini.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* Legend */}
                        <div className="flex items-center gap-4 px-4 py-2 bg-zinc-50 border-t border-zinc-100 text-[10px] text-zinc-500">
                            <span><span className="text-blue-600 font-bold">Biru✎</span> = Override guru</span>
                            <span><span className="text-red-600 font-bold">⚠️</span> = Di bawah KKM</span>
                            <span><span className="text-green-600 font-bold">✅</span> = Tuntas / Remedial</span>
                            <span className="ml-auto text-zinc-400">Klik nilai untuk edit</span>
                        </div>
                    </div>
                )}

                {/* Modals */}
                <GradeConfigModal
                    isOpen={configModalOpen}
                    onClose={() => setConfigModalOpen(false)}
                    config={config}
                    onSave={saveConfig}
                />
                <CsvUploadModal
                    isOpen={csvModalOpen}
                    onClose={() => setCsvModalOpen(false)}
                    components={gradeRecap.components}
                    onPreview={csvPreview}
                    onUpload={csvUpload}
                />
            </div>
        );
    }

    // ====== RENDER: Class Selector ======
    if (loading && !selectedClass) {
        return <GridSkeleton count={6} />;
    }

    if (!activePeriod) {
        return (
            <div className="text-center p-12 bg-white rounded-2xl border border-zinc-200">
                <p className="text-zinc-500">Belum ada periode akademik aktif.</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">📊 Rekap Nilai</h1>
                    <p className="text-zinc-500 mt-2">Pilih kelas untuk melihat dan mengelola nilai siswa.</p>
                </div>
                <button
                    onClick={() => setConfigModalOpen(true)}
                    className="px-4 py-2 text-sm font-bold text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:border-orange-300 hover:text-orange-600 transition flex items-center gap-2"
                >
                    <Settings size={16} /> Konfigurasi
                </button>
            </div>

            {/* Config Summary */}
            {config.components.length > 0 && (
                <div className="mb-6 p-4 bg-zinc-50 border border-zinc-200 rounded-xl">
                    <div className="flex items-center gap-4 text-xs text-zinc-600">
                        <span className="font-bold">Komponen:</span>
                        {config.components.map(c => (
                            <span key={c.id} className="px-2 py-0.5 bg-white border border-zinc-200 rounded-full">
                                {c.name} <b>{c.weight}%</b>
                            </span>
                        ))}
                        <span className="ml-auto px-2 py-0.5 bg-amber-100 text-amber-700 font-bold rounded-full">
                            KKM: {config.kkm}
                        </span>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {classes.map(cls => (
                    <div
                        key={cls.id}
                        onClick={() => selectClass(cls)}
                        className="group bg-white border border-zinc-200 p-6 rounded-2xl cursor-pointer hover:border-orange-500 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                            <ChevronRight className="w-5 h-5 text-orange-500" />
                        </div>
                        <h3 className="text-xl font-bold text-zinc-900 group-hover:text-orange-600 transition-colors mb-1">
                            {cls.name}
                        </h3>
                        <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 group-hover:text-orange-400/80">
                            Rekap Nilai Siap
                        </p>
                    </div>
                ))}
                {classes.length === 0 && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-200 rounded-2xl">
                        <p className="text-zinc-400 font-medium">Belum ada kelas yang tersedia.</p>
                    </div>
                )}
            </div>

            {/* Config Modal */}
            <GradeConfigModal
                isOpen={configModalOpen}
                onClose={() => setConfigModalOpen(false)}
                config={config}
                onSave={saveConfig}
            />
        </div>
    );
}
