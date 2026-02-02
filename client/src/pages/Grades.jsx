import React, { useState } from 'react';
import { useGradesData } from '../hooks/useGradesData';
// Layout is handled in App.jsx
import { Card, Spinner, Alert } from '../components/UI';
import { GridSkeleton } from '../components/Skeleton';
import { ChevronRight, ArrowLeft, Save, Edit3 } from 'lucide-react';

export default function Grades() {
    const {
        loading,
        classes,
        activePeriod,
        selectedClass,
        students,
        gradesData,
        selectClass,
        saveGrade,
        calculateFinal,
        setSelectedClass
    } = useGradesData();

    // Local state for editing
    const [editingId, setEditingId] = useState(null);
    const [tempGrade, setTempGrade] = useState({}); // { uh, uts, uas, tugas }

    const handleEdit = (studentId) => {
        const current = gradesData[studentId] || {};
        setTempGrade({
            uh: current.uh || 0,
            uts: current.uts || 0,
            uas: current.uas || 0,
            tugas: current.tugas || 0
        });
        setEditingId(studentId);
    };

    const handleSave = async (studentId) => {
        const success = await saveGrade(studentId, tempGrade);
        if (success) {
            setEditingId(null);
        }
    };

    const handleInputChange = (field, value) => {
        setTempGrade(prev => ({ ...prev, [field]: value }));
    };

    const renderContent = () => {
        if (loading) {
            if (selectedClass) {
                return <div className="py-12 flex justify-center"><Spinner /></div>
            }
            return <GridSkeleton count={6} />
        }

        if (!activePeriod) {
            return (
                <div className="text-center p-12 bg-white rounded-2xl border border-zinc-200">
                    <p className="text-zinc-500">Belum ada periode akademik aktif.</p>
                </div>
            );
        }

        if (selectedClass) {
            return (
                <div className="animate-in fade-in duration-300">
                    <button
                        onClick={() => setSelectedClass(null)}
                        className="mb-6 flex items-center text-sm font-medium text-zinc-500 hover:text-orange-600 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Kembali ke Daftar Kelas
                    </button>

                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-zinc-900">{selectedClass.name}</h2>
                            <p className="text-zinc-500 text-sm mt-1">
                                Input Nilai: UH (30%), UTS (20%), UAS (30%), Tugas (20%)
                            </p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-12 flex justify-center"><Spinner /></div>
                    ) : (
                        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-zinc-50 border-b border-zinc-200">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs text-zinc-500 uppercase font-bold tracking-wider">No</th>
                                            <th className="px-6 py-4 text-left text-xs text-zinc-500 uppercase font-bold tracking-wider w-1/4">Nama Siswa</th>
                                            <th className="px-4 py-4 text-center text-xs text-zinc-500 uppercase font-bold w-24">UH</th>
                                            <th className="px-4 py-4 text-center text-xs text-zinc-500 uppercase font-bold w-24">UTS</th>
                                            <th className="px-4 py-4 text-center text-xs text-zinc-500 uppercase font-bold w-24">UAS</th>
                                            <th className="px-4 py-4 text-center text-xs text-zinc-500 uppercase font-bold w-24">Tugas</th>
                                            <th className="px-6 py-4 text-center text-xs text-zinc-500 uppercase font-bold w-24 bg-zinc-100">Final</th>
                                            <th className="px-6 py-4 text-center text-xs text-zinc-500 uppercase font-bold w-32">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100">
                                        {students.map((s, idx) => {
                                            const isEditing = editingId === s.id;
                                            const g = gradesData[s.id] || {};
                                            // Calculate live preview if editing
                                            const displayFinal = isEditing ? calculateFinal(tempGrade) : (g.final_grade || 0);

                                            return (
                                                <tr key={s.id} className={`hover:bg-zinc-50 transition-colors ${isEditing ? 'bg-orange-50/50' : ''}`}>
                                                    <td className="px-6 py-4 text-zinc-400 font-mono text-xs">{idx + 1}</td>
                                                    <td className="px-6 py-4 font-medium text-zinc-900">{s.name}</td>

                                                    {/* INPUTS */}
                                                    {['uh', 'uts', 'uas', 'tugas'].map(field => (
                                                        <td key={field} className="px-4 py-4 text-center">
                                                            {isEditing ? (
                                                                <input
                                                                    type="number"
                                                                    className="w-16 px-2 py-1.5 text-center text-sm font-bold border border-zinc-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                                                                    value={tempGrade[field]}
                                                                    onChange={e => handleInputChange(field, e.target.value)}
                                                                />
                                                            ) : (
                                                                <span className="text-zinc-600 block py-1.5">{g[field] || '-'}</span>
                                                            )}
                                                        </td>
                                                    ))}

                                                    <td className="px-6 py-4 text-center font-bold text-zinc-900 bg-zinc-50">
                                                        {Number(displayFinal).toFixed(1)}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {isEditing ? (
                                                            <button
                                                                onClick={() => handleSave(s.id)}
                                                                className="inline-flex items-center px-3 py-1.5 bg-zinc-900 text-white text-xs font-bold rounded-lg hover:bg-zinc-800 transition-all shadow-sm"
                                                            >
                                                                <Save className="w-3 h-3 mr-1.5" />
                                                                SIMPAN
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleEdit(s.id)}
                                                                className="inline-flex items-center px-3 py-1.5 border border-zinc-200 text-zinc-600 text-xs font-bold rounded-lg hover:bg-white hover:border-orange-200 hover:text-orange-600 transition-all"
                                                            >
                                                                <Edit3 className="w-3 h-3 mr-1.5" />
                                                                EDIT
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {students.length === 0 && (
                                            <tr>
                                                <td colSpan="8" className="px-6 py-12 text-center text-zinc-400 italic">
                                                    Tidak ada siswa di kelas ini.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // CLASS SELECTOR MODE
        return (
            <div className="animate-in fade-in duration-500">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Input Nilai</h1>
                    <p className="text-zinc-500 mt-2">Pilih kelas untuk mulai mengelola nilai siswa.</p>
                </div>

                {loading ? (
                    <GridSkeleton count={6} />
                ) : (
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
                                    Data Nilai Siap
                                </p>
                            </div>
                        ))}
                        {classes.length === 0 && (
                            <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-200 rounded-2xl">
                                <p className="text-zinc-400 font-medium">Belum ada kelas yang tersedia.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Removed Layout wrapper as it is handled in App.jsx
    return (
        <>
            {renderContent()}
        </>
    );
}
