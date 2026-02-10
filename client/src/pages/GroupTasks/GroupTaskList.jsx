import React, { useState } from 'react';
import { Trash2, AlertTriangle, CheckCircle, Clock, Users } from 'lucide-react';
import { GridSkeleton, ListSkeleton } from '../../components/Skeleton';

// --- 1. TAMPILAN PILIH KELAS (Reuse dari Individual) ---
export const ClassGrid = ({ classes, onSelect, loading }) => {
    return (
        <div className="w-full h-full flex flex-col animate-in fade-in">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">Tugas Kelompok</h2>
                <p className="text-zinc-500 mt-2">Kelola tugas berbasis kelompok untuk setiap kelas.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {loading && classes.length === 0 ? (
                    <GridSkeleton count={3} />
                ) : (
                    classes.map(cls => (
                        <div
                            key={cls.id}
                            onClick={() => onSelect(cls)}
                            className="bg-white border border-zinc-200 p-6 rounded-2xl cursor-pointer hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/10 transition-all group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition">
                                <span className="text-zinc-300 group-hover:text-purple-500 transition">→</span>
                            </div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <Users size={16} className="text-purple-600" />
                                </div>
                                <h4 className="text-xl font-bold text-zinc-900 group-hover:text-purple-600 transition">{cls.name}</h4>
                            </div>
                            <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Kelola Tugas Kelompok</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// --- 2. TAMPILAN DAFTAR TUGAS KELOMPOK ---
export const GroupTaskList = ({
    selectedClass,
    tasks,
    loading,
    onBack,
    onCreate,
    onEdit,
    onGrade,
    onDelete,
    onToggleStatus,
    onDiscussion
}) => {
    const [errorMsg, setErrorMsg] = useState(null);

    const handleToggle = (task, e) => {
        e.stopPropagation();
        if (!task.is_active) {
            if (!task.deadline) {
                setErrorMsg(`Gagal Terbit: Tugas "${task.title}" wajib memiliki deadline! Edit dulu.`);
                setTimeout(() => setErrorMsg(null), 4000);
                return;
            }
        }
        onToggleStatus(task);
    };

    return (
        <div className="w-full h-full flex flex-col animate-in fade-in relative">
            {/* Custom Error Toast */}
            {errorMsg && (
                <div className="fixed bottom-6 right-6 z-[150] bg-red-600 text-white px-6 py-4 rounded-xl shadow-2xl animate-in slide-in-from-bottom flex items-center gap-3">
                    <AlertTriangle size={24} className="shrink-0" />
                    <div>
                        <h4 className="font-bold text-sm">PERHATIAN</h4>
                        <p className="text-xs opacity-90">{errorMsg}</p>
                    </div>
                </div>
            )}

            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-xl border border-zinc-200 hover:bg-zinc-100 transition text-zinc-500">
                        ←
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-900">{selectedClass.name}</h2>
                        <p className="text-xs text-zinc-500">Daftar Tugas Kelompok</p>
                    </div>
                </div>
                <button
                    onClick={onCreate}
                    className="px-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition shadow-lg flex items-center gap-2"
                >
                    + BUAT TUGAS KELOMPOK
                </button>
            </div>

            <div className="grid gap-4">
                {loading ? (
                    <ListSkeleton count={5} />
                ) : (
                    <>
                        {tasks.length === 0 && (
                            <div className="text-center py-16 border-2 border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50">
                                <p className="text-zinc-900 font-bold mb-1">Belum ada tugas kelompok</p>
                                <p className="text-zinc-500 text-sm">Buat tugas kelompok pertama untuk kelas ini.</p>
                            </div>
                        )}

                        {tasks.map(task => (
                            <div key={task.id} className={`card-mono p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white ${task.is_active ? 'border-l-4 border-l-purple-500' : 'border-l-4 border-l-zinc-300 opacity-90'}`}>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        {task.is_active ?
                                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold border border-green-200 flex items-center gap-1"><CheckCircle size={10} /> TERBIT</span>
                                            :
                                            <span className="bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded text-[10px] font-bold border border-zinc-200">DRAFT</span>
                                        }
                                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold border border-purple-200 flex items-center gap-1">
                                            <Users size={10} /> KELOMPOK
                                        </span>
                                        {task.group_set_name && (
                                            <span className="bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded text-[10px] font-bold border border-zinc-200">
                                                Set: {task.group_set_name}
                                            </span>
                                        )}
                                        {task.show_discussion === 1 && (
                                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-200 flex items-center gap-1">
                                                <span>🔑</span> KUNCI TERBUKA
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-lg text-zinc-900">{task.title}</h3>
                                    <div className="flex gap-4 text-xs text-zinc-500 mt-2 font-medium">
                                        <span className="flex items-center gap-1">📝 <b>{task.question_count || 0}</b> Soal</span>
                                        <span className="flex items-center gap-1">👥 <b>{task.graded_count || 0}</b> Dinilai</span>
                                        <span className="flex items-center gap-1 text-purple-600">
                                            <Clock size={12} />
                                            <b>{task.deadline ? new Date(task.deadline).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}</b>
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row items-end md:items-center gap-3">
                                    <button
                                        onClick={(e) => handleToggle(task, e)}
                                        className={`px-4 py-2 rounded-lg text-[10px] font-bold transition w-full md:w-auto tracking-wider ${task.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' : 'bg-green-600 text-white hover:bg-green-700 shadow-md'}`}
                                    >
                                        {task.is_active ? '⛔ TARIK KEMBALI' : '🚀 TERBITKAN'}
                                    </button>

                                    <div className="flex gap-2 w-full md:w-auto">
                                        <button
                                            onClick={() => onDiscussion && onDiscussion(task)}
                                            className={`px-3 py-2 border rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 flex-1 md:flex-none ${task.show_discussion ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-zinc-200 hover:border-black'}`}
                                            title="Atur Kunci Jawaban & Pembahasan"
                                        >
                                            <span className="text-base">🔑</span>
                                        </button>

                                        <button
                                            onClick={() => onEdit(task.id)}
                                            disabled={task.is_active === 1}
                                            title={task.is_active === 1 ? "Tarik kembali tugas untuk mengedit soal" : "Edit Soal"}
                                            className={`px-4 py-2 border rounded-lg text-xs font-bold transition flex-1 md:flex-none ${task.is_active === 1
                                                ? 'bg-zinc-100 border-zinc-200 text-zinc-400 cursor-not-allowed'
                                                : 'bg-white border-zinc-200 hover:border-black hover:text-black hover:bg-zinc-50'
                                                }`}
                                        >
                                            EDIT
                                        </button>

                                        <button
                                            onClick={() => onGrade(task.id)}
                                            className="px-5 py-2 bg-zinc-100 text-zinc-900 border border-zinc-200 rounded-lg text-xs font-bold hover:bg-zinc-200 transition flex-1 md:flex-none"
                                        >
                                            NILAI
                                        </button>

                                        <button
                                            onClick={() => onDelete(task.id)}
                                            className="px-3 py-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition border border-transparent hover:border-red-100 flex-none"
                                            title="Hapus Tugas"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
};
