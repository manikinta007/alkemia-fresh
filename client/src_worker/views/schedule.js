// views/schedule.js
// Halaman Jadwal Pelajaran (Roster)
// Fitur: Lihat Jadwal, Tambah Jadwal, Hapus Jadwal
// Update: BACK TO ORANGE THEME (Matching Sidebar Consistency)

import { getLayoutHtml } from './layout.js';
import { UI_COMPONENTS } from './ui.js';

export function getSchedulePage(classes = [], activePeriod = null) {
    const initialData = { classes, activePeriod };
  
    const contentComponent = `
        ${UI_COMPONENTS}

        const { useState, useEffect } = React;
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        const { classes, activePeriod } = window.__INITIAL_DATA__;

        const dayNames = { 1: 'SENIN', 2: 'SELASA', 3: 'RABU', 4: 'KAMIS', 5: 'JUMAT', 6: 'SABTU', 7: 'MINGGU' };
        const orderedDays = [1, 2, 3, 4, 5, 6]; 

        // Helper: Siapkan daftar mapel
        const availableSubjects = (user?.subjects && user.subjects.length > 0) 
            ? user.subjects 
            : (user?.subject ? [user.subject] : ['Mapel Umum']);

        function SchedulePage() {
            const [schedules, setSchedules] = useState([]);
            const [loading, setLoading] = useState(false);
            const [submitting, setSubmitting] = useState(false);
            
            // Modal State
            const [showModal, setShowModal] = useState(false);
            const [formData, setFormData] = useState({
                day: '1',
                classId: '',
                startTime: '07:30',
                endTime: '09:00',
                subject: availableSubjects[0]
            });

            const [alertState, setAlertState] = useState({ isOpen: false, type: 'success', message: '' });
            const [confirmState, setConfirmState] = useState({ isOpen: false, message: '', onConfirm: null });

            useEffect(() => {
                if (activePeriod) fetchSchedules();
            }, [activePeriod]);

            const fetchSchedules = async () => {
                setLoading(true);
                try {
                    const res = await window.secureFetch(\`/api/schedules?period_id=\${activePeriod.id}\`);
                    if (res.ok) {
                        const data = await res.json();
                        setSchedules(data);
                    }
                } catch (e) {
                    console.error("Gagal ambil jadwal:", e);
                } finally {
                    setLoading(false);
                }
            };

            const handleSubmit = async () => {
                if (!formData.classId || !formData.subject) {
                    setAlertState({ isOpen: true, type: 'error', message: 'Data tidak lengkap.' });
                    return;
                }

                setSubmitting(true);
                try {
                    const payload = {
                        periodId: activePeriod.id,
                        classId: formData.classId,
                        day: parseInt(formData.day),
                        startTime: formData.startTime,
                        endTime: formData.endTime,
                        subject: formData.subject,
                        username: user.username
                    };

                    const res = await window.secureFetch('/api/schedules', {
                        method: 'POST',
                        body: JSON.stringify(payload)
                    });

                    if (res.ok) {
                        setAlertState({ isOpen: true, type: 'success', message: 'Jadwal berhasil ditambahkan.' });
                        setShowModal(false);
                        fetchSchedules();
                        setFormData({ ...formData, classId: '' }); 
                    } else {
                        const err = await res.json();
                        throw new Error(err.error || 'Gagal menyimpan');
                    }
                } catch (e) {
                    setAlertState({ isOpen: true, type: 'error', message: e.message });
                } finally {
                    setSubmitting(false);
                }
            };

            const handleDelete = (id) => {
                setConfirmState({
                    isOpen: true,
                    message: 'Yakin ingin menghapus jadwal ini?',
                    onConfirm: async () => {
                        setConfirmState(prev => ({ ...prev, isOpen: false }));
                        try {
                            const res = await window.secureFetch(\`/api/schedules?id=\${id}\`, { method: 'DELETE' });
                            if (res.ok) {
                                setAlertState({ isOpen: true, type: 'success', message: 'Jadwal dihapus.' });
                                fetchSchedules();
                            }
                        } catch (e) {
                            setAlertState({ isOpen: true, type: 'error', message: 'Gagal menghapus.' });
                        }
                    }
                });
            };

            // Grouping Jadwal
            const groupedSchedules = {};
            orderedDays.forEach(day => groupedSchedules[day] = []);
            schedules.forEach(sch => {
                if (groupedSchedules[sch.day]) {
                    groupedSchedules[sch.day].push(sch);
                }
            });

            return (
                <AuthGuard>
                    <div className="animate-in fade-in duration-500 pb-20">
                        <CustomAlert isOpen={alertState.isOpen} type={alertState.type} message={alertState.message} onClose={() => setAlertState({...alertState, isOpen: false})} />
                        
                        <CustomConfirm
                            isOpen={confirmState.isOpen}
                            message={confirmState.message}
                            onConfirm={confirmState.onConfirm}
                            onCancel={() => setConfirmState({ ...confirmState, isOpen: false })}
                        />

                        {/* HEADER */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                            <div>
                                <h2 className="text-3xl font-bold text-zinc-900 flex items-center gap-3 tracking-tight">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256" fill="currentColor"><path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48h16V64a8,8,0,0,0,16,0V48h48V64a8,8,0,0,0,16,0V48h40V80H48V48Zm136,160H48V96H208V208Z" opacity="0.2"></path><path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A24,24,0,0,0,24,56V208a24,24,0,0,0,24,24H208a24,24,0,0,0,24-24V56A24,24,0,0,0,208,32ZM72,48h16V64a8,8,0,0,0,16,0V48h48V64a8,8,0,0,0,16,0V48h40V80H48V48Zm136,160H48V96H208V208Z"></path><circle cx="128" cy="136" r="12"></circle><circle cx="172" cy="136" r="12"></circle><circle cx="84" cy="136" r="12"></circle><circle cx="128" cy="176" r="12"></circle><circle cx="172" cy="176" r="12"></circle><circle cx="84" cy="176" r="12"></circle></svg>
                                    Jadwal Mengajar
                                </h2>
                                <p className="text-zinc-500 mt-1">Atur jadwal pelajaran mingguan Anda.</p>
                            </div>
                            
                            {/* BUTTON: ORANGE THEME */}
                            <button 
                                onClick={() => setShowModal(true)}
                                className="px-6 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition shadow-lg shadow-orange-200 flex items-center gap-2 group"
                            >
                                <span className="group-hover:rotate-90 transition duration-300">{ICONS.plus}</span> 
                                TAMBAH JADWAL
                            </button>
                        </div>

                        {!activePeriod ? (
                             <div className="card-mono p-8 text-center"><p className="text-zinc-500">Pilih periode akademik terlebih dahulu.</p></div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {orderedDays.map(dayNum => {
                                    const daySchedules = groupedSchedules[dayNum];
                                    const jsDay = new Date().getDay();
                                    const currentDbDay = jsDay === 0 ? 7 : jsDay;
                                    const highlight = currentDbDay === dayNum;

                                    return (
                                        <div key={dayNum} className={\`flex flex-col h-full rounded-2xl border overflow-hidden transition-all duration-300 \${
                                            highlight 
                                            ? 'bg-orange-50/40 border-orange-200 shadow-md ring-1 ring-orange-100' 
                                            : 'bg-white border-zinc-200 shadow-sm'
                                        }\`}>
                                            {/* HEADER BLOCK (Solid) */}
                                            <div className={\`p-4 flex justify-between items-center border-b \${
                                                highlight 
                                                ? 'bg-orange-600 text-white border-orange-600' 
                                                : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                                            }\`}>
                                                <h3 className="font-bold uppercase tracking-widest text-sm">
                                                    {dayNames[dayNum]}
                                                </h3>
                                                {highlight && (
                                                    <span className="text-[10px] bg-white text-orange-700 px-2 py-0.5 rounded-full font-bold shadow-sm">
                                                        HARI INI
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {/* BODY */}
                                            <div className="p-4 flex-1 space-y-3 min-h-[150px]">
                                                {daySchedules.length === 0 ? (
                                                    <div className="h-full flex flex-col items-center justify-center text-zinc-300 py-8">
                                                        {/* Empty State Icon: Coffee */}
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256" fill="currentColor" className="opacity-30 mb-2"><path d="M88,112a8,8,0,0,1,8-8h80a8,8,0,0,1,0,16H96A8,8,0,0,1,88,112Zm8,40h80a8,8,0,0,0,0-16H96a8,8,0,0,0,0,16ZM224,64H195.34A48.09,48.09,0,0,0,160,24H48A16,16,0,0,0,32,40V160a48.05,48.05,0,0,0,48,48h96a48.05,48.05,0,0,0,48-48V136h.63A39.46,39.46,0,0,0,264,96.63,40.09,40.09,0,0,0,224,64Zm24,32.63A23.46,23.46,0,0,1,224.63,120H224V80h0a24.08,24.08,0,0,1,24,16.63ZM208,160a32,32,0,0,1-32,32H80a32,32,0,0,1-32-32V40H160a32,32,0,0,1,32,32v88Z"></path></svg>
                                                        <span className="text-xs font-medium">Rehat sejenak</span>
                                                    </div>
                                                ) : (
                                                    daySchedules.map(sch => (
                                                        <div key={sch.id} className="group relative bg-white border border-zinc-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                                                            {/* Vertical Accent Line (Orange) */}
                                                            <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-orange-500 rounded-r-full"></div>
                                                            
                                                            <div className="pl-4">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <span className="bg-zinc-50 border border-zinc-100 text-zinc-500 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                                                                        {sch.start_time} - {sch.end_time}
                                                                    </span>
                                                                    
                                                                    {/* Delete Button (Hover Only) */}
                                                                    <button 
                                                                        onClick={() => handleDelete(sch.id)}
                                                                        className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-500 transition-all duration-200 p-1"
                                                                        title="Hapus Jadwal"
                                                                    >
                                                                        {ICONS.trash}
                                                                    </button>
                                                                </div>
                                                                
                                                                <div className="font-bold text-xl text-zinc-900 tracking-tight leading-none mb-1">
                                                                    {sch.class_name}
                                                                </div>
                                                                <div className="text-xs text-orange-600 font-bold uppercase tracking-wide">
                                                                    {sch.subject || 'Mapel Umum'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* MODAL TAMBAH JADWAL */}
                        {showModal && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xl font-bold text-zinc-900">Tambah Jadwal Baru</h3>
                                        <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-black transition">
                                            {ICONS.close}
                                        </button>
                                    </div>

                                    <div className="space-y-5">
                                        {/* DROPDOWN MAPEL */}
                                        <div>
                                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Mata Pelajaran</label>
                                            <div className="relative">
                                                <select 
                                                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none bg-zinc-50 appearance-none transition"
                                                    value={formData.subject}
                                                    onChange={e => setFormData({...formData, subject: e.target.value})}
                                                >
                                                    {availableSubjects.map((subj, idx) => (
                                                        <option key={idx} value={subj}>{subj}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-zinc-400">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="currentColor"><path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"></path></svg>
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-zinc-400 mt-1">Ingin tambah mapel lain? Buka menu Pengaturan.</p>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Hari</label>
                                            <div className="relative">
                                                <select 
                                                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none bg-zinc-50 appearance-none transition"
                                                    value={formData.day}
                                                    onChange={e => setFormData({...formData, day: e.target.value})}
                                                >
                                                    {orderedDays.map(d => (
                                                        <option key={d} value={d}>{dayNames[d]}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-zinc-400">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="currentColor"><path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"></path></svg>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Kelas</label>
                                            <div className="relative">
                                                <select 
                                                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none bg-zinc-50 appearance-none transition"
                                                    value={formData.classId}
                                                    onChange={e => setFormData({...formData, classId: e.target.value})}
                                                >
                                                    <option value="">-- Pilih Kelas --</option>
                                                    {classes.map(c => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-zinc-400">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="currentColor"><path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"></path></svg>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Jam Mulai</label>
                                                <input 
                                                    type="time" 
                                                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none bg-zinc-50 font-mono text-sm transition"
                                                    value={formData.startTime}
                                                    onChange={e => setFormData({...formData, startTime: e.target.value})}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Jam Selesai</label>
                                                <input 
                                                    type="time" 
                                                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none bg-zinc-50 font-mono text-sm transition"
                                                    value={formData.endTime}
                                                    onChange={e => setFormData({...formData, endTime: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 pt-4 border-t border-zinc-100 flex justify-end gap-3">
                                        <button onClick={() => setShowModal(false)} className="px-6 py-3 text-zinc-500 font-bold hover:bg-zinc-50 rounded-xl transition">
                                            BATAL
                                        </button>
                                        <button 
                                            onClick={handleSubmit} 
                                            disabled={submitting}
                                            className="px-6 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition disabled:opacity-50 shadow-lg shadow-orange-200"
                                        >
                                            {submitting ? 'MENYIMPAN...' : 'SIMPAN'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </AuthGuard>
            );
        }

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<SchedulePage />);
    `;

    return getLayoutHtml({
        title: 'Jadwal Pelajaran',
        user: { name: 'Guru' },
        activePeriod,
        initialData,
        contentComponent
    });
}