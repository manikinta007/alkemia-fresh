import React, { useState } from 'react';
import { useScheduleData } from '../hooks/useScheduleData';
import { Spinner } from '../components/UI';
import { GridSkeleton } from '../components/Skeleton';
import { useAlertContext } from '../components/Alert';
import { Calendar, Clock, Plus, Trash2, X } from 'lucide-react';

const dayNames = { 1: 'SENIN', 2: 'SELASA', 3: 'RABU', 4: 'KAMIS', 5: 'JUMAT', 6: 'SABTU', 7: 'MINGGU' };
const orderedDays = [1, 2, 3, 4, 5, 6];

const ScheduleCard = ({ schedule, onDelete, deletingId }) => {
    return (
        <div className="group relative bg-white border border-zinc-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
            {/* Accent Line */}
            <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-orange-500 rounded-r-full"></div>

            <div className="pl-4">
                <div className="flex justify-between items-start mb-2">
                    <span className="bg-zinc-50 border border-zinc-100 text-zinc-500 text-[10px] px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                        <Clock size={10} />
                        {schedule.start_time} - {schedule.end_time}
                    </span>

                    <button
                        onClick={() => onDelete(schedule.id)}
                        disabled={deletingId === schedule.id}
                        className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-500 transition-all duration-200 p-1"
                        title="Hapus Jadwal"
                    >
                        {deletingId === schedule.id ? <Spinner size="sm" /> : <Trash2 size={16} />}
                    </button>
                </div>

                <div className="font-bold text-xl text-zinc-900 tracking-tight leading-none mb-1">
                    {schedule.class_name}
                </div>
                <div className="text-xs text-orange-600 font-bold uppercase tracking-wide">
                    {schedule.subject || 'Mapel Umum'}
                </div>
            </div>
        </div>
    );
};

const AddScheduleModal = ({ isOpen, onClose, classes, userSubjects, onSave, submitting }) => {
    if (!isOpen) return null;

    const [formData, setFormData] = useState({
        day: '1',
        classId: '',
        startTime: '07:30',
        endTime: '09:00',
        subject: userSubjects[0] || 'Mapel Umum'
    });

    const handleSubmit = async () => {
        if (!formData.classId || !formData.subject) return;
        const success = await onSave(formData);
        if (success) {
            onClose();
            setFormData({ ...formData, classId: '' }); // Reset partial
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-zinc-900">Tambah Jadwal Baru</h3>
                    <button onClick={onClose} className="text-zinc-400 hover:text-black transition">
                        <X size={24} />
                    </button>
                </div>

                <div className="space-y-5">
                    {/* Subject */}
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Mata Pelajaran</label>
                        <select
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none bg-zinc-50 transition"
                            value={formData.subject}
                            onChange={e => setFormData({ ...formData, subject: e.target.value })}
                        >
                            {userSubjects.map((subj, idx) => (
                                <option key={idx} value={subj}>{subj}</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-zinc-400 mt-1">Ingin mapel lain? Atur di menu Pengaturan.</p>
                    </div>

                    {/* Day */}
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Hari</label>
                        <select
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none bg-zinc-50 transition"
                            value={formData.day}
                            onChange={e => setFormData({ ...formData, day: e.target.value })}
                        >
                            {orderedDays.map(d => (
                                <option key={d} value={d}>{dayNames[d]}</option>
                            ))}
                        </select>
                    </div>

                    {/* Class */}
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Kelas</label>
                        <select
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none bg-zinc-50 transition"
                            value={formData.classId}
                            onChange={e => setFormData({ ...formData, classId: e.target.value })}
                        >
                            <option value="">-- Pilih Kelas --</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Times */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Jam Mulai</label>
                            <input
                                type="time"
                                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none bg-zinc-50 font-mono text-sm transition"
                                value={formData.startTime}
                                onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Jam Selesai</label>
                            <input
                                type="time"
                                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none bg-zinc-50 font-mono text-sm transition"
                                value={formData.endTime}
                                onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-4 border-t border-zinc-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 text-zinc-500 font-bold hover:bg-zinc-50 rounded-xl transition">
                        BATAL
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="px-6 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition disabled:opacity-50 shadow-lg shadow-orange-200 relative"
                    >
                        {submitting ? <span className="opacity-0">SIMPAN</span> : 'SIMPAN'}
                        {submitting && <div className="absolute inset-0 flex items-center justify-center"><Spinner size="sm" isWhite /></div>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function Schedule() {
    const { showAlert, showConfirm } = useAlertContext();
    const {
        loading, submitting, deletingId,
        schedules, classes, activePeriod, userSubjects,
        addSchedule, deleteSchedule
    } = useScheduleData(showAlert, showConfirm);

    const [showModal, setShowModal] = useState(false);

    // Group Schedules
    const groupedSchedules = {};
    orderedDays.forEach(day => groupedSchedules[day] = []);
    schedules.forEach(sch => {
        if (groupedSchedules[sch.day]) {
            groupedSchedules[sch.day].push(sch);
        }
    });

    const jsDay = new Date().getDay();
    const currentDbDay = jsDay === 0 ? 7 : jsDay;

    if (!activePeriod) return <div className="p-8"><GridSkeleton count={6} /></div>;

    return (
        <div className="animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-zinc-900 flex items-center gap-3 tracking-tight">
                        <Calendar className="text-orange-600" size={32} />
                        Jadwal Mengajar
                    </h2>
                    <p className="text-zinc-500 mt-1">Atur jadwal pelajaran mingguan Anda.</p>
                </div>

                <button
                    onClick={() => setShowModal(true)}
                    className="px-6 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition shadow-lg shadow-orange-200 flex items-center gap-2 group"
                >
                    <Plus className="group-hover:rotate-90 transition duration-300" size={20} />
                    TAMBAH JADWAL
                </button>
            </div>

            {loading ? (
                <GridSkeleton count={6} />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {orderedDays.map(dayNum => {
                        const daySchedules = groupedSchedules[dayNum];
                        const highlight = currentDbDay === dayNum;

                        return (
                            <div key={dayNum} className={`flex flex-col h-full rounded-2xl border overflow-hidden transition-all duration-300 ${highlight
                                ? 'bg-orange-50/40 border-orange-200 shadow-md ring-1 ring-orange-100'
                                : 'bg-white border-zinc-200 shadow-sm'
                                }`}>
                                {/* Card Header */}
                                <div className={`p-4 flex justify-between items-center border-b ${highlight
                                    ? 'bg-orange-600 text-white border-orange-600'
                                    : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                                    }`}>
                                    <h3 className="font-bold uppercase tracking-widest text-sm">
                                        {dayNames[dayNum]}
                                    </h3>
                                    {highlight && (
                                        <span className="text-[10px] bg-white text-orange-700 px-2 py-0.5 rounded-full font-bold shadow-sm">
                                            HARI INI
                                        </span>
                                    )}
                                </div>

                                {/* Card Body */}
                                <div className="p-4 flex-1 space-y-3 min-h-[150px]">
                                    {daySchedules.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-zinc-300 py-8 text-center">
                                            <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center mb-2">
                                                <Clock size={20} className="opacity-30" />
                                            </div>
                                            <span className="text-xs font-medium">Rehat sejenak</span>
                                        </div>
                                    ) : (
                                        daySchedules.map(sch => (
                                            <ScheduleCard
                                                key={sch.id}
                                                schedule={sch}
                                                onDelete={deleteSchedule}
                                                deletingId={deletingId}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <AddScheduleModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                classes={classes}
                userSubjects={userSubjects}
                onSave={addSchedule}
                submitting={submitting}
            />
        </div>
    );
}
