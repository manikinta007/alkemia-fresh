// views/periods.js
// Mengelola Periode Akademik (Lengkap & Optimized)
// Update: Menggunakan ICONS dari ui.js menggantikan Emoji

import { getLayoutHtml } from './layout.js';
import { UI_COMPONENTS } from './ui.js';

export function getPeriodsPage(periods = [], activePeriod = null) {
    const initialData = { periods, activePeriod };
  
    const contentComponent = `
        ${UI_COMPONENTS}

        const { useState, useEffect } = React;
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        const { periods: initialPeriods, activePeriod: initialActivePeriod } = window.__INITIAL_DATA__;

        // --- COMPONENT: EDIT PERIOD MODAL ---
        const EditPeriodModal = ({ isOpen, period, onClose, onSave }) => {
            if (!isOpen || !period) return null;
            const [form, setForm] = useState({ year: period.year, semester: period.semester });

            useEffect(() => {
                if(period) setForm({ year: period.year, semester: period.semester });
            }, [period]);

            return (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 transform transition-all scale-100 animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-zinc-900 mb-4">Edit Periode</h3>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Tahun Ajaran</label>
                                <input type="text" className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:outline-none focus:border-black" value={form.year} onChange={e => setForm({...form, year: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Semester</label>
                                <select className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:outline-none focus:border-black" value={form.semester} onChange={e => setForm({...form, semester: e.target.value})}>
                                    <option value="Ganjil">Ganjil</option>
                                    <option value="Genap">Genap</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={onClose} className="flex-1 py-3 border border-zinc-200 text-zinc-600 rounded-xl font-bold hover:bg-zinc-50 transition">BATAL</button>
                            <button onClick={() => onSave(period.id, form)} className="flex-1 py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition">SIMPAN</button>
                        </div>
                    </div>
                </div>
            );
        };

        function Periods() {
            const [periods, setPeriods] = useState(initialPeriods || []);
            const [form, setForm] = useState({ year: '', semester: 'Ganjil', sourcePeriodId: '', withStudents: true, withMaterials: false });
            const [loading, setLoading] = useState(false);
            
            // State Modals
            const [editModal, setEditModal] = useState({ isOpen: false, period: null });
            const [alertState, setAlertState] = useState({ isOpen: false, type: 'success', message: '' });
            const [confirmState, setConfirmState] = useState({ isOpen: false, message: '', onConfirm: null });

            const showAlert = (type, message) => setAlertState({ isOpen: true, type, message });
            const closeAlert = () => {
                setAlertState({ ...alertState, isOpen: false });
                if (alertState.message.includes('refresh') || alertState.type === 'success') window.location.reload();
            };

            const fetchPeriods = async () => {
                const res = await window.secureFetch('/api/periods');
                if (res.ok) setPeriods(await res.json());
            };

            const handleSubmit = async (e) => {
                e.preventDefault();
                setLoading(true);
                try {
                    const res = await window.secureFetch('/api/periods', {
                        method: 'POST',
                        body: JSON.stringify(form)
                    });
                    if (res.ok) {
                        setForm({ year: '', semester: 'Ganjil', sourcePeriodId: '', withStudents: true, withMaterials: false });
                        fetchPeriods();
                        showAlert('success', 'Periode berhasil dibuat! Halaman akan dimuat ulang...');
                    } else {
                        showAlert('error', 'Gagal membuat periode.');
                    }
                } catch (e) {
                    showAlert('error', 'Terjadi kesalahan koneksi.');
                } finally {
                    setLoading(false);
                }
            };

            const handleEdit = async (id, formData) => {
                try {
                    const res = await window.secureFetch('/api/periods', {
                        method: 'PUT',
                        body: JSON.stringify({ id, ...formData })
                    });
                    if (res.ok) {
                        setEditModal({ isOpen: false, period: null });
                        fetchPeriods();
                        showAlert('success', 'Data periode berhasil diperbarui.');
                    } else {
                        showAlert('error', 'Gagal update periode.');
                    }
                } catch(e) { showAlert('error', 'Gagal update.'); }
            };

            const handleDelete = (id) => {
                setConfirmState({
                    isOpen: true,
                    message: "Hapus periode ini? PERINGATAN: Semua Kelas, Siswa, Nilai, dan Data Quiz dalam periode ini akan HILANG PERMANEN.",
                    onConfirm: async () => {
                        setConfirmState(prev => ({ ...prev, isOpen: false }));
                        try {
                            const res = await window.secureFetch('/api/periods?id=' + id, { method: 'DELETE' });
                            if (res.ok) {
                                const currentActive = JSON.parse(localStorage.getItem('activePeriod') || 'null');
                                if (currentActive && currentActive.id == id) {
                                    localStorage.removeItem('activePeriod'); 
                                }
                                fetchPeriods();
                                showAlert('success', 'Periode berhasil dihapus.');
                            } else {
                                showAlert('error', 'Gagal menghapus periode.');
                            }
                        } catch(e) { showAlert('error', 'Gagal menghapus.'); }
                    }
                });
            };

            const handleSetActive = async (periodId) => {
                setConfirmState({
                    isOpen: true,
                    message: "Ubah periode aktif? Data dashboard akan berubah sesuai periode yang dipilih.",
                    onConfirm: async () => {
                        setConfirmState(prev => ({ ...prev, isOpen: false })); 
                        try {
                            const res = await window.secureFetch('/api/periods/set-active', {
                                method: 'POST',
                                body: JSON.stringify({ periodId })
                            });
                            if (res.ok) {
                                const data = await res.json();
                                localStorage.setItem('activePeriod', JSON.stringify(data.activePeriod));
                                showAlert('success', 'Periode aktif berhasil diubah! Halaman akan refresh...');
                            } else {
                                showAlert('error', 'Gagal mengubah periode aktif.');
                            }
                        } catch(e) {
                            showAlert('error', 'Terjadi kesalahan server.');
                        }
                    }
                });
            };

            return (
                <AuthGuard>
                    <div className="animate-in fade-in duration-500">
                        <CustomAlert isOpen={alertState.isOpen} type={alertState.type} message={alertState.message} onClose={closeAlert} />
                        <CustomConfirm isOpen={confirmState.isOpen} message={confirmState.message} onConfirm={confirmState.onConfirm} onCancel={() => setConfirmState({...confirmState, isOpen: false})} />
                        <EditPeriodModal isOpen={editModal.isOpen} period={editModal.period} onClose={() => setEditModal({isOpen: false, period: null})} onSave={handleEdit} />
                        
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold text-zinc-900">Periode Akademik</h2>
                            <p className="text-zinc-500 mt-2">Kelola tahun ajaran dan semester</p>
                        </div>

                        <div className="grid lg:grid-cols-12 gap-8">
                            <div className="lg:col-span-4">
                                <div className="card-mono p-6 sticky top-4">
                                    <h3 className="text-lg font-bold text-zinc-900 mb-6 pb-4 border-b border-zinc-100">Buat Periode Baru</h3>
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Tahun Ajaran</label>
                                            <input type="text" className="w-full px-4 py-3 rounded-md input-mono" placeholder="2024/2025" value={form.year} onChange={e => setForm({...form, year: e.target.value})} required />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Semester</label>
                                            <select className="w-full px-4 py-3 rounded-md input-mono" value={form.semester} onChange={e => setForm({...form, semester: e.target.value})}>
                                                <option value="Ganjil">Ganjil</option>
                                                <option value="Genap">Genap</option>
                                            </select>
                                        </div>
                                        <div className="pt-4 border-t border-zinc-100">
                                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Salin Data Dari (Opsional)</label>
                                            <select className="w-full px-4 py-3 rounded-md input-mono mb-3 text-sm" value={form.sourcePeriodId} onChange={e => setForm({...form, sourcePeriodId: e.target.value})}>
                                                <option value="">-- Buat Kosong --</option>
                                                {periods.map(p => (
                                                    <option key={p.id} value={p.id}>{p.year} - {p.semester}</option>
                                                ))}
                                            </select>
                                            {form.sourcePeriodId && (
                                                <div className="bg-zinc-50 p-3 rounded border border-zinc-200 space-y-2">
                                                    <p className="text-xs font-bold text-zinc-500 mb-1">Opsi Salin:</p>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" checked={form.withStudents} onChange={e => setForm({...form, withStudents: e.target.checked})} className="rounded text-black focus:ring-black" />
                                                        <span className="text-sm text-zinc-700">Sertakan Data Siswa</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" checked={form.withMaterials} onChange={e => setForm({...form, withMaterials: e.target.checked})} className="rounded text-black focus:ring-black" />
                                                        <span className="text-sm text-zinc-700">Sertakan Bahan Ajar</span>
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                        <button disabled={loading} className="w-full bg-black text-white py-3 rounded-md font-bold shadow hover:bg-zinc-800 transition active:scale-95">
                                            {loading ? 'MEMPROSES...' : 'BUAT PERIODE'}
                                        </button>
                                    </form>
                                </div>
                            </div>

                            <div className="lg:col-span-8">
                                <div className="space-y-4">
                                    {periods.map(period => (
                                        <div key={period.id} className={"card-mono p-6 transition group " + (period.is_active ? 'border-2 border-orange-500 bg-orange-50/10' : 'bg-white hover:border-zinc-300')}>
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className={"w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm " + (period.is_active ? 'bg-orange-500 text-white' : 'bg-zinc-100 text-zinc-400')}>
                                                        {period.is_active ? ICONS.fire : ICONS.calendar}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xl font-bold text-zinc-900">{period.year}</h4>
                                                        <p className="text-sm text-zinc-500 font-medium">Semester {period.semester}</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                                    {period.is_active ? (
                                                        <span className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 text-xs font-bold rounded-lg border border-orange-200">
                                                            {ICONS.check} SEDANG AKTIF
                                                        </span>
                                                    ) : (
                                                        <button onClick={() => handleSetActive(period.id)} className="flex-1 sm:flex-none px-4 py-2 bg-black text-white text-xs font-bold rounded-lg hover:bg-zinc-800 transition shadow-md">
                                                            SET AKTIF
                                                        </button>
                                                    )}
                                                    
                                                    <div className="flex gap-1 ml-2 border-l border-zinc-200 pl-3">
                                                        <button onClick={() => setEditModal({isOpen: true, period})} className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit">
                                                            {ICONS.edit}
                                                        </button>
                                                        <button onClick={() => handleDelete(period.id)} className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Hapus">
                                                            {ICONS.trash}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {periods.length === 0 && (
                                        <div className="card-mono p-12 text-center">
                                            <p className="text-zinc-400">Belum ada periode akademik.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </AuthGuard>
            );
        }

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<Periods />);
    `;

    return getLayoutHtml({
        title: 'Periode Akademik',
        user: { name: 'Guru' },
        activePeriod,
        initialData,
        contentComponent
    });
}