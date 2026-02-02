import React, { useState } from 'react';
import { Play, Square, Settings, Copy, HelpCircle, Eye, Trash2, Clock, Shuffle, FileText, CheckCircle } from 'lucide-react';
import { ActivationModal, CopyQuizModal } from './QuizModals';
import { GridSkeleton, ListSkeleton } from '../../components/Skeleton';

export const QuizList = ({
    classes,
    selectedClass,
    onSelectClass,
    quizzes,
    loading,
    onCreate,
    onToggleStatus,
    onEdit,
    onCopy,
    onDelete,
    onManageQuestions,
    onViewResults
}) => {
    const [formQuiz, setFormQuiz] = useState({ title: '', description: '' });
    const [activationModal, setActivationModal] = useState({ isOpen: false, quizId: null });
    const [copyModal, setCopyModal] = useState({ isOpen: false, quizId: null });

    const handleCreateSubmit = (e) => {
        e.preventDefault();
        onCreate({ ...formQuiz, periodId: null, classId: selectedClass.id }, () => {
            setFormQuiz({ title: '', description: '' });
        });
    };

    const handleToggleClick = (quiz) => {
        if (quiz.is_active) onToggleStatus(quiz.id, false, null);
        else setActivationModal({ isOpen: true, quizId: quiz.id });
    };

    if (!selectedClass) {
        return (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in">
                {loading && classes.length === 0 ? (
                    <GridSkeleton count={3} />
                ) : (
                    <>
                        {classes.map(cls => (
                            <div key={cls.id} onClick={() => onSelectClass(cls)} className="bg-white border border-zinc-200 p-6 rounded-xl cursor-pointer hover:border-orange-500 transition shadow-sm hover:shadow-md group">
                                <h4 className="text-xl font-bold mb-2 text-zinc-900 group-hover:text-orange-600 transition">{cls.name}</h4>
                                <p className="text-xs text-zinc-500">Kelola Quiz & Soal →</p>
                            </div>
                        ))}
                        {classes.length === 0 && <div className="p-12 text-center col-span-3 text-zinc-400 border-2 border-dashed border-zinc-200 rounded-xl">Belum ada kelas.</div>}
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="grid lg:grid-cols-12 gap-8 animate-in fade-in">
            {/* Activation & Copy Modals Local */}
            <ActivationModal
                isOpen={activationModal.isOpen}
                onClose={() => setActivationModal({ isOpen: false, quizId: null })}
                onConfirm={(date) => {
                    onToggleStatus(activationModal.quizId, true, date);
                    setActivationModal({ isOpen: false, quizId: null });
                }}
            />
            <CopyQuizModal
                isOpen={copyModal.isOpen}
                classes={classes}
                onClose={() => setCopyModal({ isOpen: false, quizId: null })}
                onConfirm={(targetClassId) => {
                    onCopy(copyModal.quizId, targetClassId);
                    setCopyModal({ isOpen: false, quizId: null });
                }}
            />

            <div className="lg:col-span-4">
                <button onClick={() => onSelectClass(null)} className="mb-4 text-xs font-bold text-zinc-500 hover:text-black transition">← GANTI KELAS</button>
                <div className="bg-white border border-zinc-200 p-6 rounded-xl sticky top-4 shadow-sm">
                    <h3 className="text-lg font-bold mb-4">Buat Quiz Baru</h3>
                    <form onSubmit={handleCreateSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Judul Quiz</label>
                            <input type="text" className="w-full px-4 py-3 rounded-lg border border-zinc-200 bg-zinc-50 focus:border-black focus:outline-none" value={formQuiz.title} onChange={e => setFormQuiz({ ...formQuiz, title: e.target.value })} placeholder="Contoh: UH 1 Matematika" required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Deskripsi</label>
                            <textarea className="w-full px-4 py-3 rounded-lg border border-zinc-200 bg-zinc-50 focus:border-black focus:outline-none" rows="2" value={formQuiz.description} onChange={e => setFormQuiz({ ...formQuiz, description: e.target.value })}></textarea>
                        </div>
                        <button className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-zinc-800 transition shadow-lg active:scale-95">BUAT QUIZ</button>
                    </form>
                </div>
            </div>

            <div className="lg:col-span-8">
                <h3 className="text-xl font-bold mb-4">Daftar Quiz: {selectedClass.name}</h3>
                {loading ? (
                    <ListSkeleton count={4} />
                ) : (
                    <div className="space-y-4">
                        {quizzes.map(q => {
                            const activeClass = q.is_active ? 'border-l-4 border-l-green-500 shadow-md' : 'opacity-90 hover:opacity-100';
                            const btnClass = q.is_active ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200';
                            return (
                                <div key={q.id} className={'bg-white border border-zinc-200 p-6 rounded-xl transition-all ' + activeClass}>
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                                        <div className="flex-1">
                                            <h4 className="text-xl font-bold flex items-center gap-2 text-zinc-900">
                                                {q.title}
                                                {q.is_active === 1 && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full uppercase tracking-wider font-bold">AKTIF</span>}
                                            </h4>
                                            {q.description && (<p className="text-sm text-zinc-500 mt-2 mb-2 italic">"{q.description}"</p>)}

                                            <div className="flex flex-wrap gap-2 mt-3 text-xs">
                                                <span className="bg-zinc-100 px-2 py-1 rounded font-bold text-zinc-600 flex items-center gap-1"><Clock size={12} /> {q.duration} Menit</span>
                                                <span className="bg-zinc-100 px-2 py-1 rounded font-bold text-zinc-600 flex items-center gap-1"><Shuffle size={12} /> {q.is_random ? 'Acak' : 'Urut'}</span>
                                                <span className="bg-zinc-100 px-2 py-1 rounded font-bold text-zinc-600 flex items-center gap-1"><FileText size={12} /> {q.show_limit > 0 ? q.show_limit + ' Soal Tampil' : 'Semua Soal'}</span>
                                                <span className="bg-zinc-100 px-2 py-1 rounded font-bold text-zinc-600 flex items-center gap-1"><Eye size={12} /> {q.show_results ? 'Bahas: ON' : 'Bahas: OFF'}</span>
                                            </div>

                                            {q.check_attendance === 1 && (
                                                <div className="mt-2 text-xs font-bold text-orange-600 flex items-center gap-1 bg-orange-50 px-2 py-1 rounded w-fit">
                                                    <CheckCircle size={12} /> <span>Wajib Presensi (Hadir)</span>
                                                </div>
                                            )}

                                            {q.scheduled_at && (
                                                <p className="text-xs text-blue-600 mt-2 font-bold flex items-center gap-1">
                                                    <Clock size={12} /> Jadwal: {new Date(q.scheduled_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                                            <button onClick={() => handleToggleClick(q)} className={'px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ' + btnClass}>
                                                {q.is_active ? <><Square size={14} fill="currentColor" /> STOP</> : <><Play size={14} fill="currentColor" /> START</>}
                                            </button>
                                            <button onClick={() => onEdit(q)} className="px-3 py-2 bg-zinc-100 text-zinc-700 rounded-lg text-xs font-bold hover:bg-zinc-200 transition flex items-center justify-center gap-2">
                                                <Settings size={14} /> SETTING
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-zinc-100">
                                        <div className="text-xs font-bold text-zinc-400">{q.question_count} SOAL</div>
                                        <div className="text-xs font-bold text-zinc-400">{q.attempt_count} SISWA MENGERJAKAN</div>
                                        <div className="flex-1 hidden sm:block"></div>

                                        <div className="flex flex-wrap gap-3">
                                            <button onClick={() => setCopyModal({ isOpen: true, quizId: q.id })} className="text-xs font-bold text-zinc-500 hover:text-black flex items-center gap-1">
                                                <Copy size={16} /> SALIN
                                            </button>
                                            <button onClick={() => onManageQuestions(q)} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                                                <HelpCircle size={16} /> KELOLA SOAL
                                            </button>
                                            <button onClick={() => onViewResults(q)} className="text-xs font-bold text-black hover:underline flex items-center gap-1">
                                                <Eye size={16} /> LIHAT HASIL
                                            </button>
                                            <button onClick={() => onDelete(q.id)} className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1">
                                                <Trash2 size={16} /> HAPUS
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {quizzes.length === 0 && <div className="p-8 text-center text-zinc-400 border border-zinc-200 rounded-xl bg-zinc-50">Belum ada quiz dibuat.</div>}
                    </div>
                )}
            </div>
        </div>
    );
};
