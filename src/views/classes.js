// views/classes.js
// Mengelola Kelas dan Siswa
// FIXED: CSRF Protection (secureFetch) & Syntax Error Prevention

import { getLayoutHtml } from './layout.js';
import { UI_COMPONENTS } from './ui.js';

export function getClassesPage(classes = [], activePeriod = null) {
    const initialData = { classes, activePeriod };
  
    const contentComponent = `
        ${UI_COMPONENTS}

        const { useState, useEffect, useRef } = React;
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        const { classes: initialClasses, activePeriod: initialPeriod } = window.__INITIAL_DATA__;

        // --- COMPONENT: EDIT CLASS MODAL (Lokal karena spesifik) ---
        const EditClassModal = ({ isOpen, cls, onClose, onSave }) => {
            if (!isOpen || !cls) return null;
            const [name, setName] = useState(cls.name);
            const handleSubmit = () => onSave(cls.id, name);

            return (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 transform transition-all scale-100 animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-zinc-900 mb-4">Edit Nama Kelas</h3>
                        <input type="text" className="w-full px-4 py-3 rounded-lg border border-zinc-300 mb-6 font-mono text-sm focus:border-black focus:outline-none" value={name} onChange={e => setName(e.target.value)} />
                        <div className="flex gap-3">
                            <button onClick={onClose} className="flex-1 py-3 border border-zinc-200 text-zinc-600 rounded-xl font-bold hover:bg-zinc-50 transition">BATAL</button>
                            <button onClick={handleSubmit} className="flex-1 py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition">SIMPAN</button>
                        </div>
                    </div>
                </div>
            );
        };

        function Classes() {
            const [classes, setClasses] = useState(initialClasses || []);
            const [activePeriod, setActivePeriod] = useState(initialPeriod || null);
            const [selectedClass, setSelectedClass] = useState(null);
            const [students, setStudents] = useState([]);
            const [form, setForm] = useState({ name: '' });
            const [creatingClass, setCreatingClass] = useState(false);
            const [studentName, setStudentName] = useState('');
            const [addingStudent, setAddingStudent] = useState(false);
            const [editingId, setEditingId] = useState(null);
            const [editName, setEditName] = useState('');
            const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
            const [loadingStudents, setLoadingStudents] = useState(false);
            const [uploadingCsv, setUploadingCsv] = useState(false);
            const fileInputRef = useRef(null);

            // Modal States
            const [alertState, setAlertState] = useState({ isOpen: false, type: 'success', message: '' });
            const [confirmState, setConfirmState] = useState({ isOpen: false, message: '', onConfirm: null });
            const [editClassModal, setEditClassModal] = useState({ isOpen: false, cls: null });

            const showAlert = (type, message) => setAlertState({ isOpen: true, type, message });
            const triggerConfirm = (message, onConfirm) => {
                setConfirmState({
                    isOpen: true,
                    message,
                    onConfirm: () => {
                        onConfirm();
                        setConfirmState({ ...confirmState, isOpen: false });
                    }
                });
            };

            const fetchClasses = async () => {
                // UPDATE: secureFetch
                const res = await window.secureFetch('/api/classes?period_id=' + activePeriod.id);
                if (res.ok) setClasses(await res.json());
            };

            const fetchStudents = async (classId) => {
                setLoadingStudents(true);
                setSelectedStudentIds(new Set());
                try {
                    // UPDATE: secureFetch
                    const res = await window.secureFetch('/api/students?class_id=' + classId);
                    if (res.ok) setStudents(await res.json());
                } catch(err) { console.error(err); } finally { setLoadingStudents(false); }
            };

            const handleCreateClass = async (e) => {
                e.preventDefault();
                setCreatingClass(true);
                try {
                    // UPDATE: secureFetch (Auto CSRF)
                    const res = await window.secureFetch('/api/classes', {
                        method: 'POST',
                        body: JSON.stringify({ periodId: activePeriod.id, name: form.name })
                    });
                    if (res.ok) { setForm({ name: '' }); fetchClasses(); }
                } finally { setCreatingClass(false); }
            };

            const handleUpdateClass = async (id, newName) => {
                try {
                    // UPDATE: secureFetch
                    const res = await window.secureFetch('/api/classes', {
                        method: 'PUT',
                        body: JSON.stringify({ id, name: newName })
                    });
                    if (res.ok) {
                        setEditClassModal({ isOpen: false, cls: null });
                        fetchClasses();
                        showAlert('success', 'Nama kelas berhasil diubah.');
                    } else {
                        showAlert('error', 'Gagal mengubah nama kelas.');
                    }
                } catch(e) { showAlert('error', 'Error server.'); }
            };

            const handleDeleteClass = (id) => {
                triggerConfirm('Hapus kelas ini? PERINGATAN: Semua siswa, nilai, dan quiz di dalam kelas ini akan TERHAPUS PERMANEN.', async () => {
                    try {
                        // UPDATE: secureFetch
                        const res = await window.secureFetch('/api/classes?id=' + id, { method: 'DELETE' });
                        if (res.ok) {
                            fetchClasses();
                            showAlert('success', 'Kelas berhasil dihapus.');
                        } else {
                            showAlert('error', 'Gagal menghapus kelas.');
                        }
                    } catch(e) { showAlert('error', 'Error server.'); }
                });
            };

            const handleSelectClass = (cls) => {
                setSelectedClass(cls);
                fetchStudents(cls.id);
            };

            const handleToggleGrades = async () => {
                if(!selectedClass) return;
                const newStatus = selectedClass.show_grades === 1 ? 0 : 1;
                const updatedClass = { ...selectedClass, show_grades: newStatus };
                setSelectedClass(updatedClass);
                setClasses(prev => prev.map(c => c.id === updatedClass.id ? updatedClass : c));

                try {
                    // UPDATE: secureFetch
                    await window.secureFetch('/api/classes/toggle-grades', {
                        method: 'POST',
                        body: JSON.stringify({ classId: selectedClass.id, showGrades: newStatus === 1 })
                    });
                } catch(err) {
                    showAlert('error', 'Gagal update status nilai.');
                    fetchClasses();
                }
            };

            const handleAddStudent = async (e) => {
                e.preventDefault();
                setAddingStudent(true);
                try {
                    // UPDATE: secureFetch
                    const res = await window.secureFetch('/api/students', {
                        method: 'POST',
                        body: JSON.stringify({ periodId: activePeriod.id, classId: selectedClass.id, name: studentName })
                    });
                    if (res.ok) { setStudentName(''); fetchStudents(selectedClass.id); }
                } finally { setAddingStudent(false); }
            };

            const toggleSelectAll = () => {
                if (selectedStudentIds.size === students.length) setSelectedStudentIds(new Set());
                else setSelectedStudentIds(new Set(students.map(s => s.id)));
            };

            const toggleSelectStudent = (id) => {
                const newSet = new Set(selectedStudentIds);
                if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
                setSelectedStudentIds(newSet);
            };

            const handleBulkDelete = () => {
                const count = selectedStudentIds.size;
                if (count === 0) return;
                triggerConfirm('Hapus ' + count + ' siswa terpilih? DATA NILAI AKAN HILANG PERMANEN.', async () => {
                    try {
                        // UPDATE: secureFetch
                        const res = await window.secureFetch('/api/students', {
                            method: 'DELETE',
                            body: JSON.stringify({ ids: Array.from(selectedStudentIds) })
                        });
                        if (res.ok) { 
                            showAlert('success', 'Berhasil menghapus siswa.'); 
                            fetchStudents(selectedClass.id); 
                        } 
                    } catch (err) { showAlert('error', 'Terjadi kesalahan server.'); }
                });
            };

            const startEditing = (s) => { setEditingId(s.id); setEditName(s.name); };
            const cancelEditing = () => { setEditingId(null); setEditName(''); };
            const saveEdit = async (id) => {
                // UPDATE: secureFetch
                const res = await window.secureFetch('/api/students', { method: 'PUT', body: JSON.stringify({ id, name: editName }) });
                if (res.ok) { setEditingId(null); fetchStudents(selectedClass.id); }
            };

            const handleDeleteStudent = (id) => {
                triggerConfirm('Hapus siswa ini?', async () => {
                    // UPDATE: secureFetch
                    const res = await window.secureFetch('/api/students?id=' + id, { method: 'DELETE' });
                    if (res.ok) fetchStudents(selectedClass.id);
                });
            };

            const handleUnlockStudent = (id, name) => {
                triggerConfirm('Reset akses (Logout paksa) untuk siswa "' + name + '"?', async () => {
                    // UPDATE: secureFetch
                    await window.secureFetch('/api/student/unlock', { method: 'POST', body: JSON.stringify({ studentId: id }) });
                    showAlert('success', 'Akses siswa berhasil di-reset.');
                });
            };

            const handleDownloadTemplate = () => {
                const link = document.createElement("a");
                link.href = URL.createObjectURL(new Blob(["No;Nama Siswa\\n1;Siswa A"], { type: 'text/csv' }));
                link.download = "template_siswa.csv";
                link.click();
            };

            const handleUploadCsv = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                setUploadingCsv(true);
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const lines = event.target.result.split('\\n');
                    const names = [];
                    for (let i = 1; i < lines.length; i++) {
                        const parts = lines[i].trim().split(';');
                        const name = parts.length > 1 ? parts[1].trim() : parts[0].trim();
                        if (name) names.push(name);
                    }
                    if (names.length > 0) {
                        // UPDATE: secureFetch
                        await window.secureFetch('/api/students/bulk', {
                            method: 'POST',
                            body: JSON.stringify({ periodId: activePeriod.id, classId: selectedClass.id, names: names })
                        });
                        showAlert('success', 'Berhasil import ' + names.length + ' siswa!');
                        if(fileInputRef.current) fileInputRef.current.value = ''; 
                        fetchStudents(selectedClass.id);
                    }
                    setUploadingCsv(false);
                };
                reader.readAsText(file);
            };

            if (selectedClass) {
                return (
                    <AuthGuard>
                        <div className="animate-in fade-in duration-500">
                            <CustomAlert isOpen={alertState.isOpen} type={alertState.type} message={alertState.message} onClose={() => setAlertState({ ...alertState, isOpen: false })} />
                            <CustomConfirm isOpen={confirmState.isOpen} message={confirmState.message} onConfirm={confirmState.onConfirm} onCancel={() => setConfirmState({ ...confirmState, isOpen: false })} />
                            <EditClassModal isOpen={editClassModal.isOpen} cls={editClassModal.cls} onClose={() => setEditClassModal({ isOpen: false, cls: null })} onSave={handleUpdateClass} />

                            <div className="mb-6"><button onClick={() => setSelectedClass(null)} className="text-sm text-zinc-600 hover:text-black font-medium">← Kembali ke Daftar Kelas</button></div>
                            <div className="card-mono mb-6">
                                <div className="p-6 border-b border-zinc-200 bg-zinc-50/50">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-3">
                                                {selectedClass.name}
                                                {selectedClass.show_grades === 1 ? <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded border border-green-200">Nilai: PUBLIK</span> : <span className="text-[10px] bg-zinc-200 text-zinc-500 px-2 py-1 rounded border border-zinc-300">Nilai: SEMBUNYI</span>}
                                            </h2>
                                            <p className="text-sm text-zinc-500">{activePeriod.year} - {activePeriod.semester}</p>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-2">
                                                {/* FIXED: Removed nested backticks below */}
                                                <button onClick={handleToggleGrades} className={'flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition ' + (selectedClass.show_grades === 1 ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300')}>
                                                    {selectedClass.show_grades === 1 ? '👁️ NILAI TAMPIL' : '👁️‍🗨️ NILAI DISEMBUNYIKAN'}
                                                </button>
                                                {!loadingStudents && (<p className="text-xs text-zinc-500 mt-1">Total: <b>{students.length}</b> Siswa</p>)}
                                        </div>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div><p className="text-xs font-bold text-zinc-500 uppercase mb-2">Tambah Manual</p><form onSubmit={handleAddStudent} className="flex gap-2"><input type="text" placeholder="Nama siswa..." className="flex-1 px-4 py-2 rounded-md input-mono text-sm" value={studentName} onChange={e => setStudentName(e.target.value)} required /><button disabled={addingStudent} className="bg-black text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-zinc-800 disabled:opacity-50">+</button></form></div>
                                        <div><div className="flex justify-between items-center mb-2"><p className="text-xs font-bold text-zinc-500 uppercase">Import CSV</p><button onClick={handleDownloadTemplate} className="text-[10px] text-blue-600 font-bold hover:underline">⬇ Template</button></div><div className="flex gap-2"><input type="file" ref={fileInputRef} accept=".csv" onChange={handleUploadCsv} disabled={uploadingCsv} className="flex-1 text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200" />{uploadingCsv && <span className="text-xs self-center">Loading...</span>}</div></div>
                                    </div>
                                </div>
                                {selectedStudentIds.size > 0 && (<div className="bg-red-50 px-6 py-3 border-b border-red-100 flex justify-between items-center animate-pulse-fast"><span className="text-red-700 text-sm font-bold">{selectedStudentIds.size} siswa dipilih</span><button onClick={handleBulkDelete} className="bg-red-600 text-white text-xs px-4 py-2 rounded font-bold hover:bg-red-700">HAPUS TERPILIH ({selectedStudentIds.size})</button></div>)}
                                {loadingStudents ? (<div className="p-12 text-center flex flex-col items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 mb-4"></div><p className="text-zinc-500">Memuat data siswa...</p></div>) : (
                                    <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-zinc-50 border-b border-zinc-200"><tr><th className="p-4 text-left w-10"><input type="checkbox" className="rounded text-black focus:ring-black cursor-pointer" checked={students.length > 0 && selectedStudentIds.size === students.length} onChange={toggleSelectAll} /></th><th className="p-4 text-left text-xs text-zinc-500 uppercase font-bold w-16">No</th><th className="p-4 text-left text-xs text-zinc-500 uppercase font-bold">Nama Siswa</th><th className="p-4 text-right text-xs text-zinc-500 uppercase font-bold w-32">Aksi</th></tr></thead><tbody className="divide-y divide-zinc-100">{students.map((s, idx) => { const isEditing = editingId === s.id; const isSelected = selectedStudentIds.has(s.id); return (<tr key={s.id} className={'hover:bg-zinc-50 group ' + (isSelected ? 'bg-zinc-50' : '')}><td className="p-4"><input type="checkbox" className="rounded text-black focus:ring-black cursor-pointer" checked={isSelected} onChange={() => toggleSelectStudent(s.id)} /></td><td className="p-4 text-zinc-500">{idx + 1}</td><td className="p-4 font-bold text-zinc-900">{isEditing ? (<input type="text" className="w-full px-2 py-1 border rounded" value={editName} autoFocus onChange={e => setEditName(e.target.value)} />) : (s.name)}</td><td className="p-4 text-right">{isEditing ? (<div className="flex justify-end gap-2"><button onClick={() => saveEdit(s.id)} className="text-green-600 font-bold text-xs hover:underline">SAVE</button><button onClick={cancelEditing} className="text-zinc-400 font-bold text-xs hover:underline">BATAL</button></div>) : (<div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleUnlockStudent(s.id, s.name)} className="text-orange-500 hover:text-orange-700" title="Reset / Unlock Device Siswa">🔓</button><button onClick={() => startEditing(s)} className="text-blue-600 hover:text-blue-800" title="Edit">✏️</button><button onClick={() => handleDeleteStudent(s.id)} className="text-red-600 hover:text-red-800" title="Hapus">🗑️</button></div>)}</td></tr>); })}{students.length === 0 && (<tr><td colSpan="4" className="p-12 text-center text-zinc-400">Belum ada siswa</td></tr>)}</tbody></table></div>
                                )}
                            </div>
                        </div>
                    </AuthGuard>
                );
            }

            return (
                <AuthGuard>
                    <div className="animate-in fade-in duration-500">
                        <CustomAlert isOpen={alertState.isOpen} type={alertState.type} message={alertState.message} onClose={() => setAlertState({ ...alertState, isOpen: false })} />
                        <CustomConfirm isOpen={confirmState.isOpen} message={confirmState.message} onConfirm={confirmState.onConfirm} onCancel={() => setConfirmState({ ...confirmState, isOpen: false })} />
                        <EditClassModal isOpen={editClassModal.isOpen} cls={editClassModal.cls} onClose={() => setEditClassModal({ isOpen: false, cls: null })} onSave={handleUpdateClass} />

                        <div className="mb-8"><h2 className="text-3xl font-bold text-zinc-900">Kelas & Siswa</h2><p className="text-zinc-500 mt-2">Periode: {activePeriod?.year} - {activePeriod?.semester}</p></div>
                        {!activePeriod ? (<div className="card-mono p-8 text-center"><p className="text-zinc-500">Pilih periode akademik terlebih dahulu.</p></div>) : (
                            <div className="grid lg:grid-cols-12 gap-8">
                                <div className="lg:col-span-4">
                                    <div className="card-mono p-6 sticky top-4">
                                        <h3 className="text-lg font-bold text-zinc-900 mb-6 pb-4 border-b">Buat Kelas Baru</h3>
                                        <form onSubmit={handleCreateClass} className="space-y-4"><div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Nama Kelas</label><input type="text" className="w-full px-4 py-3 rounded-md input-mono" placeholder="XII IPA 1" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div><button disabled={creatingClass} className="w-full bg-black text-white py-3 rounded-md font-bold hover:bg-zinc-800 disabled:opacity-50">{creatingClass ? 'MENYIMPAN...' : 'BUAT KELAS'}</button></form>
                                    </div>
                                </div>
                                <div className="lg:col-span-8">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {classes.map(cls => (
                                            <div key={cls.id} onClick={() => handleSelectClass(cls)} className="card-mono p-6 cursor-pointer hover:border-orange-500 transition-all relative group">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="text-xl font-bold text-zinc-900 mb-2">{cls.name}</h4>
                                                    <div className="flex gap-2">
                                                        <button onClick={(e) => { e.stopPropagation(); setEditClassModal({ isOpen: true, cls: cls }); }} className="text-zinc-400 hover:text-blue-600 p-1" title="Edit Nama Kelas">✏️</button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteClass(cls.id); }} className="text-zinc-400 hover:text-red-600 p-1" title="Hapus Kelas">🗑️</button>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center mt-2">
                                                    <p className="text-xs text-zinc-500">Klik untuk kelola siswa →</p>
                                                    {cls.show_grades === 1 && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded">Nilai Tampil</span>}
                                                </div>
                                            </div>
                                        ))}
                                        {classes.length === 0 && (<div className="col-span-2 card-mono p-12 text-center"><p className="text-zinc-400">Belum ada kelas. Buat kelas pertama!</p></div>)}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </AuthGuard>
            );
        }
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<Classes />);
    `;

    return getLayoutHtml({
        title: 'Kelas & Siswa',
        user: { name: 'Guru' },
        activePeriod,
        initialData,
        contentComponent
    });
}