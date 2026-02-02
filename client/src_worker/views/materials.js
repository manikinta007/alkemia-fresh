// views/materials.js
// Bahan Ajar - Global Search + Bulk Upload + Presentation
// FIXED: Menghapus nested backticks & Menggunakan window.secureFetch untuk CSRF

import { getLayoutHtml } from './layout.js';
import { UI_COMPONENTS } from './ui.js';

export function getMaterialsPage(classes = [], activePeriod = null) {
    const initialData = { classes, activePeriod };
  
    const contentComponent = `
        ${UI_COMPONENTS}

        const { useState, useEffect, useRef } = React;
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        const { classes: initialClasses, activePeriod: initialPeriod } = window.__INITIAL_DATA__;

        function Materials() {
            const [classes, setClasses] = useState(initialClasses || []);
            const [activePeriod, setActivePeriod] = useState(initialPeriod || null);
            const [selectedClass, setSelectedClass] = useState(null);
            const [showBulkUpload, setShowBulkUpload] = useState(false);
            const [allMaterials, setAllMaterials] = useState([]); 
            const [currentMaterials, setCurrentMaterials] = useState([]); 
            const [searchQuery, setSearchQuery] = useState(''); 
            const [loadingData, setLoadingData] = useState(false);
            const [submitting, setSubmitting] = useState(false);
            const [form, setForm] = useState({ title: '', description: '', fileUrl: '' });
            const [targetClasses, setTargetClasses] = useState(new Set());
            const [presentingMaterial, setPresentingMaterial] = useState(null);
            const presentationRef = useRef(null);
            const [alertState, setAlertState] = useState({ isOpen: false, type: 'success', message: '' });
            const [confirmState, setConfirmState] = useState({ isOpen: false, message: '', onConfirm: null });

            useEffect(() => {
                if (activePeriod) {
                    fetchAllMaterials();
                }
            }, [activePeriod]);

            const fetchAllMaterials = async () => {
                try {
                    // UPDATE: secureFetch
                    const res = await window.secureFetch('/api/materials?period_id=' + activePeriod.id);
                    if (res.ok) setAllMaterials(await res.json());
                } catch(err) { console.error(err); }
            };

            const fetchClassMaterials = async (classId) => {
                setLoadingData(true);
                try {
                    // UPDATE: secureFetch
                    const res = await window.secureFetch('/api/materials?class_id=' + classId);
                    if (res.ok) setCurrentMaterials(await res.json());
                } catch(err) { console.error(err); } finally { setLoadingData(false); }
            };

            const handleSelectClass = (cls) => {
                setSelectedClass(cls);
                setShowBulkUpload(false);
                setSearchQuery('');
                fetchClassMaterials(cls.id);
            };

            const handleOpenBulkUpload = () => {
                setSelectedClass(null);
                setShowBulkUpload(true);
                setForm({ title: '', description: '', fileUrl: '' });
                setTargetClasses(new Set());
            };

            const globalSearchResults = searchQuery ? allMaterials.filter(m => {
                const q = searchQuery.toLowerCase();
                return (
                    m.title.toLowerCase().includes(q) || 
                    (m.description && m.description.toLowerCase().includes(q)) ||
                    (m.class_name && m.class_name.toLowerCase().includes(q))
                );
            }) : [];

            const classFilteredMaterials = selectedClass ? currentMaterials.filter(m => {
                const q = searchQuery.toLowerCase();
                return (
                    m.title.toLowerCase().includes(q) || 
                    (m.description && m.description.toLowerCase().includes(q))
                );
            }) : [];

            const toggleTargetClass = (classId) => {
                const newSet = new Set(targetClasses);
                if (newSet.has(classId)) newSet.delete(classId);
                else newSet.add(classId);
                setTargetClasses(newSet);
            };

            const showAlert = (type, message) => setAlertState({ isOpen: true, type, message });

            const handleSubmit = async (e, isBulk = false) => {
                e.preventDefault();
                setSubmitting(true);
                try {
                    let payloadClassIds = [];
                    if (isBulk) {
                        payloadClassIds = Array.from(targetClasses);
                        if (payloadClassIds.length === 0) {
                            showAlert('error', 'Pilih minimal satu kelas!');
                            setSubmitting(false);
                            return;
                        }
                    } else {
                        payloadClassIds = [selectedClass.id];
                    }

                    // UPDATE: secureFetch (Auto CSRF Token)
                    const res = await window.secureFetch('/api/materials', {
                        method: 'POST',
                        body: JSON.stringify({
                            periodId: activePeriod.id,
                            classIds: payloadClassIds,
                            title: form.title,
                            description: form.description,
                            fileUrl: form.fileUrl,
                            fileType: 'google-drive'
                        })
                    });
                    
                    if (res.ok) {
                        setForm({ title: '', description: '', fileUrl: '' });
                        fetchAllMaterials(); 
                        if (isBulk) {
                            showAlert('success', 'Sukses membagikan materi ke ' + payloadClassIds.length + ' kelas!');
                            setShowBulkUpload(false);
                        } else {
                            fetchClassMaterials(selectedClass.id);
                            showAlert('success', 'Materi berhasil ditambahkan!');
                        }
                    }
                } catch(err) { showAlert('error', 'Gagal menyimpan data'); } finally { setSubmitting(false); }
            };

            const triggerDelete = (id, isGlobal) => {
                setConfirmState({
                    isOpen: true,
                    message: 'Hapus bahan ajar ini? Data akan hilang permanen.',
                    onConfirm: () => performDelete(id, isGlobal)
                });
            };

            const performDelete = async (id, isGlobal) => {
                setConfirmState({ ...confirmState, isOpen: false }); 
                try {
                    // UPDATE: secureFetch
                    const res = await window.secureFetch('/api/materials?id=' + id, { method: 'DELETE' });
                    if (res.ok) {
                        if (isGlobal) {
                            fetchAllMaterials(); 
                        } else {
                            fetchClassMaterials(selectedClass.id);
                            fetchAllMaterials(); 
                        }
                        showAlert('success', 'Materi berhasil dihapus.');
                    }
                } catch(err) { showAlert('error', 'Gagal menghapus materi.'); }
            };

            const handleToggleVisibility = async (m, isGlobal = false) => {
                const newStatus = !m.is_visible;
                try {
                    // UPDATE: secureFetch
                    const res = await window.secureFetch('/api/materials', {
                        method: 'PUT',
                        body: JSON.stringify({ id: m.id, isVisible: newStatus })
                    });
                    if (res.ok) {
                        if (isGlobal) {
                            fetchAllMaterials();
                        } else {
                            fetchClassMaterials(selectedClass.id);
                            fetchAllMaterials(); 
                        }
                    }
                } catch (err) { showAlert('error', 'Gagal mengubah status visibilitas.'); }
            };

            const startPresentation = (material) => setPresentingMaterial(material);
            const closePresentation = () => { if (document.fullscreenElement) document.exitFullscreen(); setPresentingMaterial(null); };
            const toggleFullscreen = () => {
                if (!presentationRef.current) return;
                if (!document.fullscreenElement) presentationRef.current.requestFullscreen().catch(err => showAlert('error', 'Gagal masuk mode fullscreen'));
                else document.exitFullscreen();
            };

            const getEmbedUrl = (url) => {
                if (!url) return '';
                const match = url.match(/[-\\w]{25,}/);
                const fileId = match ? match[0] : null;
                if (!fileId) return url; 
                if (url.includes('presentation') || url.includes('slides')) return 'https://docs.google.com/presentation/d/' + fileId + '/embed?start=false&loop=false&delayms=3000';
                return 'https://drive.google.com/file/d/' + fileId + '/preview';
            };

            const MaterialCard = ({ m, isGlobal }) => (
                <div className={"card-mono p-6 transition hover:shadow-md " + (m.is_visible ? '' : 'opacity-60 bg-zinc-50 border-dashed')}>
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h4 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                                {m.title}
                                {!m.is_visible && <span className="text-[10px] bg-zinc-200 text-zinc-500 px-2 py-1 rounded">HIDDEN</span>}
                            </h4>
                            {isGlobal && (<span className="inline-block mt-1 bg-zinc-100 text-zinc-600 text-xs font-bold px-2 py-1 rounded">{m.class_name || 'Kelas Tidak Dikenal'}</span>)}
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleToggleVisibility(m, isGlobal)} className={"p-2 rounded hover:bg-zinc-100 " + (m.is_visible ? 'text-green-600' : 'text-zinc-400')} title={m.is_visible ? "Sembunyikan dari Siswa" : "Tampilkan ke Siswa"}>{m.is_visible ? '👁️' : '👁️‍🗨️'}</button>
                            {m.file_url && (<button onClick={() => startPresentation(m)} className="flex items-center gap-2 px-4 py-1.5 bg-black text-white text-xs font-bold rounded hover:bg-zinc-800 shadow-sm hover:shadow"><span>🖥️</span></button>)}
                            <button onClick={() => triggerDelete(m.id, isGlobal)} className="p-2 text-zinc-400 hover:text-red-600" title="Hapus">🗑️</button>
                        </div>
                    </div>
                    {m.description && <p className="text-sm text-zinc-600 mt-2 mb-2">{m.description}</p>}
                    <div className="flex items-center gap-4 text-xs text-zinc-400 border-t pt-4 border-zinc-100 mt-4">
                        <span>📅 {new Date(m.created_at).toLocaleDateString('id-ID')}</span>
                        {m.file_url && <a href={m.file_url} target="_blank" className="hover:text-blue-600 underline">Buka Sumber Asli ↗</a>}
                    </div>
                </div>
            );

            const renderModals = () => (
                <React.Fragment>
                    <CustomAlert isOpen={alertState.isOpen} type={alertState.type} message={alertState.message} onClose={() => setAlertState({ ...alertState, isOpen: false })} />
                    <CustomConfirm isOpen={confirmState.isOpen} message={confirmState.message} onConfirm={confirmState.onConfirm} onCancel={() => setConfirmState({ ...confirmState, isOpen: false })} />
                    {presentingMaterial && (
                        <div ref={presentationRef} className="fixed inset-0 z-[999] bg-black flex flex-col animate-in fade-in duration-300">
                            <div className="flex items-center justify-between px-6 py-4 bg-zinc-900 text-white shadow-xl z-50">
                                <div className="flex items-center gap-4"><h3 className="text-lg font-bold truncate max-w-md">{presentingMaterial.title}</h3><span className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-400">Teaching Mode</span></div>
                                <div className="flex items-center gap-3"><button onClick={toggleFullscreen} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm font-bold transition">⛶ Fullscreen</button><button onClick={closePresentation} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-bold transition">✕ Tutup</button></div>
                            </div>
                            <div className="flex-1 bg-black relative"><iframe src={getEmbedUrl(presentingMaterial.file_url)} className="w-full h-full border-0 absolute inset-0" allow="autoplay; encrypted-media; fullscreen" allowFullScreen></iframe></div>
                        </div>
                    )}
                </React.Fragment>
            );

            if (showBulkUpload) {
                return (
                    <AuthGuard>
                        <div className="animate-in fade-in duration-500">
                            {renderModals()}
                            <button onClick={() => setShowBulkUpload(false)} className="mb-6 text-sm text-zinc-600 hover:text-black font-medium">← Batal / Kembali</button>
                            <div className="max-w-3xl mx-auto">
                                <div className="mb-8"><h2 className="text-3xl font-bold text-zinc-900">Upload Massal</h2><p className="text-zinc-500">Bagikan satu materi ke banyak kelas sekaligus.</p></div>
                                <div className="card-mono p-8">
                                    <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-6">
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Judul Materi</label><input type="text" className="w-full px-4 py-3 rounded-md input-mono" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
                                                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Link Drive</label><input type="url" className="w-full px-4 py-3 rounded-md input-mono" placeholder="https://..." value={form.fileUrl} onChange={e => setForm({...form, fileUrl: e.target.value})} required /></div>
                                                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Deskripsi</label><textarea className="w-full px-4 py-3 rounded-md input-mono" rows="3" value={form.description} onChange={e => setForm({...form, description: e.target.value})}></textarea></div>
                                            </div>
                                            <div className="bg-zinc-50 p-4 rounded border border-zinc-200">
                                                <div className="flex justify-between items-center mb-3"><label className="block text-xs font-bold text-zinc-500 uppercase">Pilih Target Kelas:</label><span className="text-xs font-bold bg-black text-white px-2 py-1 rounded">{targetClasses.size} Dipilih</span></div>
                                                <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                                                    {classes.map(cls => (
                                                        <label key={cls.id} className={"flex items-center gap-3 cursor-pointer p-3 rounded border transition " + (targetClasses.has(cls.id) ? 'bg-white border-black shadow-sm' : 'hover:bg-zinc-100 border-transparent')}>
                                                            <input type="checkbox" checked={targetClasses.has(cls.id)} onChange={() => toggleTargetClass(cls.id)} className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black" />
                                                            <span className="text-sm font-bold text-zinc-800">{cls.name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <button disabled={submitting} className="w-full bg-black text-white py-4 rounded-lg font-bold hover:bg-zinc-800 disabled:opacity-50 text-sm tracking-widest uppercase">
                                            {submitting ? 'MEMPROSES...' : '🚀 KIRIM KE SEMUA KELAS TERPILIH'}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </AuthGuard>
                );
            }

            if (selectedClass) {
                return (
                    <AuthGuard>
                        <div className="animate-in fade-in duration-500">
                            {renderModals()}
                            <button onClick={() => setSelectedClass(null)} className="mb-6 text-sm text-zinc-600 hover:text-black font-medium">← Kembali ke Daftar Kelas</button>
                            <div className="mb-8"><h2 className="text-3xl font-bold">{selectedClass.name}</h2><p className="text-zinc-500">Kelola Bahan Ajar & Presentasi</p></div>
                            <div className="grid lg:grid-cols-12 gap-8">
                                <div className="lg:col-span-4">
                                    <div className="card-mono p-6 sticky top-4">
                                        <h3 className="text-lg font-bold mb-6 pb-4 border-b">Upload Materi Baru</h3>
                                        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
                                            <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Judul</label><input type="text" className="w-full px-4 py-3 rounded-md input-mono" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
                                            <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Deskripsi</label><textarea className="w-full px-4 py-3 rounded-md input-mono" rows="2" value={form.description} onChange={e => setForm({...form, description: e.target.value})}></textarea></div>
                                            <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Link Drive</label><input type="url" className="w-full px-4 py-3 rounded-md input-mono" placeholder="https://..." value={form.fileUrl} onChange={e => setForm({...form, fileUrl: e.target.value})} required /></div>
                                            <button disabled={submitting} className="w-full bg-black text-white py-3 rounded font-bold hover:bg-zinc-800 disabled:opacity-50">{submitting ? '...' : 'UPLOAD'}</button>
                                        </form>
                                    </div>
                                </div>
                                <div className="lg:col-span-8">
                                    <div className="mb-4"><div className="relative"><span className="absolute left-4 top-3.5 text-zinc-400">🔍</span><input type="text" className="w-full pl-10 pr-4 py-3 rounded-lg border border-zinc-200 focus:border-black focus:outline-none" placeholder="Cari di kelas ini..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div></div>
                                    {loadingData ? (
                                            <div className="flex flex-col items-center justify-center card-mono p-12">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 mb-4"></div>
                                            <p className="text-zinc-500 text-sm">Mengambil materi...</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {classFilteredMaterials.map(m => (<MaterialCard key={m.id} m={m} isGlobal={false} />))}
                                            {classFilteredMaterials.length === 0 && <div className="card-mono p-12 text-center"><p className="text-zinc-400">Tidak ada materi ditemukan.</p></div>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </AuthGuard>
                );
            }

            return (
                <AuthGuard>
                    <div className="animate-in fade-in duration-500">
                        {renderModals()}
                        
                        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                            <div className="w-full md:w-auto"><h2 className="text-3xl font-bold text-zinc-900">Bahan Ajar</h2><p className="text-zinc-500 mt-2">Cari materi atau pilih kelas.</p></div>
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <div className="relative flex-1 md:w-80"><span className="absolute left-4 top-3.5 text-zinc-400">🔍</span><input type="text" className="w-full pl-10 pr-4 py-3 rounded-lg border border-zinc-200 focus:border-black focus:outline-none shadow-sm" placeholder="Cari materi global..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
                                {activePeriod && classes.length > 0 && !searchQuery && (<button onClick={handleOpenBulkUpload} className="flex items-center gap-2 px-6 py-3 bg-black text-white font-bold rounded-lg hover:bg-zinc-800 shadow-lg transition"><span>📤</span></button>)}
                            </div>
                        </div>

                        {!activePeriod ? (
                            <div className="card-mono p-8 text-center"><p className="text-zinc-500">Pilih periode akademik terlebih dahulu.</p></div>
                        ) : searchQuery ? (
                            <div>
                                <h3 className="font-bold text-zinc-500 uppercase tracking-widest text-xs mb-4">Hasil Pencarian: "{searchQuery}"</h3>
                                <div className="grid gap-4">
                                    {globalSearchResults.map(m => (<MaterialCard key={m.id} m={m} isGlobal={true} />))}
                                    {globalSearchResults.length === 0 && (<div className="card-mono p-12 text-center text-zinc-400">Tidak ada materi yang cocok.</div>)}
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {classes.map(cls => (
                                    <div key={cls.id} onClick={() => handleSelectClass(cls)} className="card-mono p-6 cursor-pointer hover:border-orange-500 transition">
                                        <h4 className="text-xl font-bold mb-2 text-zinc-900">{cls.name}</h4>
                                        <p className="text-xs text-zinc-500">Klik untuk kelola bahan ajar →</p>
                                    </div>
                                ))}
                                {classes.length === 0 && (<div className="col-span-3 card-mono p-12 text-center"><p className="text-zinc-400">Belum ada kelas.</p></div>)}
                            </div>
                        )}
                    </div>
                </AuthGuard>
            );
        }

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<Materials />);
    `;

    return getLayoutHtml({
        title: 'Bahan Ajar',
        user: { name: 'Guru' },
        activePeriod,
        initialData,
        contentComponent
    });
}