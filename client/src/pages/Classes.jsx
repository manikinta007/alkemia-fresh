import React, { useState, useEffect } from 'react';
import {
    Users,
    UserPlus,
    Plus,
    ArrowLeft,
    Eye,
    EyeOff
} from 'lucide-react';
import { useAlertContext } from '../components/Alert';
import { useClassesData } from '../hooks/useClassesData';
import { ClassCard } from './Classes/ClassCard';
import { StudentTable } from './Classes/StudentTable';
import { EditClassModal } from './Classes/ClassModals';
import { StudentImport } from './Classes/StudentImport';
import { GridSkeleton, TableSkeleton } from '../components/Skeleton';

export default function Classes() {
    const { showAlert, showConfirm } = useAlertContext();
    const {
        activePeriod,
        classes,
        selectedClass,
        students,
        loadingStudents,
        fetchActivePeriod,
        selectClass,
        createClass,
        updateClass,
        deleteClass,
        toggleGrades,
        addStudent,
        updateStudent,
        removeStudent,
        removeStudentsBulk,
        resetStudentDevice,
        importStudents
    } = useClassesData(showAlert);

    // Initial Fetch
    useEffect(() => {
        fetchActivePeriod();
    }, [fetchActivePeriod]);

    // Local UI States
    const [form, setForm] = useState({ name: '' });
    const [creatingClass, setCreatingClass] = useState(false);

    // Student Form States
    const [studentName, setStudentName] = useState('');
    const [addingStudent, setAddingStudent] = useState(false);

    // Edit Student State
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');

    // Selection State
    const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());

    // Upload State
    const [uploadingCsv, setUploadingCsv] = useState(false);

    // Modals
    const [editClassModal, setEditClassModal] = useState({ isOpen: false, cls: null });

    // --- Class Handlers ---

    const handleCreateClass = async (e) => {
        e.preventDefault();
        setCreatingClass(true);
        const success = await createClass(form.name);
        if (success) setForm({ name: '' });
        setCreatingClass(false);
    };

    const handleDeleteClass = (id) => {
        showConfirm('Hapus kelas ini? PERINGATAN: Semua siswa, nilai, dan quiz di dalam kelas ini akan TERHAPUS PERMANEN.', async () => {
            await deleteClass(id);
        });
    };

    const handleUpdateClass = async (id, newName) => {
        const success = await updateClass(id, newName);
        if (success) setEditClassModal({ isOpen: false, cls: null });
    };

    const handleSelectClass = (cls) => {
        selectClass(cls);
        setSelectedStudentIds(new Set()); // Reset selection when changing class
    };

    // --- Student Handlers ---

    const handleAddStudent = async (e) => {
        e.preventDefault();
        setAddingStudent(true);
        const success = await addStudent(studentName);
        if (success) setStudentName('');
        setAddingStudent(false);
    };

    // Selection Logic
    const toggleSelectAll = () => {
        if (selectedStudentIds.size === students.length) setSelectedStudentIds(new Set());
        else setSelectedStudentIds(new Set(students.map(s => s.id)));
    };

    const toggleSelectStudent = (id) => {
        const newSet = new Set(selectedStudentIds);
        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
        setSelectedStudentIds(newSet);
    };

    // Bulk Delete
    const handleBulkDelete = () => {
        if (selectedStudentIds.size === 0) return;
        showConfirm(`Hapus ${selectedStudentIds.size} siswa terpilih? DATA NILAI AKAN HILANG PERMANEN.`, async () => {
            const success = await removeStudentsBulk(selectedStudentIds);
            if (success) setSelectedStudentIds(new Set());
        });
    };

    // Inline Edit Logic
    const startEditing = (s) => { setEditingId(s.id); setEditName(s.name); };
    const cancelEditing = () => { setEditingId(null); setEditName(''); };
    const saveEdit = async (id) => {
        const success = await updateStudent(id, editName);
        if (success) setEditingId(null);
    };

    const handleDeleteStudent = (id) => {
        showConfirm('Hapus siswa ini?', async () => {
            await removeStudent(id);
        });
    };

    const handleUnlockStudent = (id, name) => {
        showConfirm(`Reset akses (Logout paksa) untuk siswa "${name}"?`, async () => {
            await resetStudentDevice(id);
        });
    };

    // Import / CSV
    const handleDownloadTemplate = () => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob(["No;Nama Siswa\n1;Siswa A"], { type: 'text/csv' }));
        link.download = "template_siswa.csv";
        link.click();
    };

    const handleUploadCsv = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingCsv(true);

        const reader = new FileReader();
        reader.onload = async (event) => {
            const lines = event.target.result.split('\n');
            const names = [];
            for (let i = 1; i < lines.length; i++) {
                const parts = lines[i].trim().split(';');
                const name = parts.length > 1 ? parts[1].trim() : parts[0].trim();
                if (name) names.push(name);
            }
            if (names.length > 0) {
                await importStudents(names);
            }
            setUploadingCsv(false);
        };
        reader.readAsText(file);
    };

    return (
        <div className="animate-in fade-in duration-500">
            <EditClassModal
                isOpen={editClassModal.isOpen}
                cls={editClassModal.cls}
                onClose={() => setEditClassModal({ isOpen: false, cls: null })}
                onSave={handleUpdateClass}
            />

            {selectedClass ? (
                <>
                    <div className="mb-6">
                        <button onClick={() => selectClass(null)} className="text-sm text-zinc-600 hover:text-black font-medium flex items-center gap-1">
                            <ArrowLeft size={16} /> Kembali ke Daftar Kelas
                        </button>
                    </div>
                    <div className="bg-white border border-zinc-200 rounded-xl mb-6">
                        <div className="p-6 border-b border-zinc-200 bg-zinc-50/50 rounded-t-xl">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-3">
                                        {selectedClass.name}
                                        {selectedClass.show_grades === 1 ? <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded border border-green-200">Nilai: PUBLIK</span> : <span className="text-[10px] bg-zinc-200 text-zinc-500 px-2 py-1 rounded border border-zinc-300">Nilai: SEMBUNYI</span>}
                                    </h2>
                                    <p className="text-sm text-zinc-500">{activePeriod?.year} - {activePeriod?.semester}</p>
                                </div>
                                <div className="text-right flex flex-col items-end gap-2">
                                    <button onClick={() => toggleGrades(selectedClass)} className={'flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition ' + (selectedClass.show_grades === 1 ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300')}>
                                        {selectedClass.show_grades === 1 ? <><Eye size={14} /> NILAI TAMPIL</> : <><EyeOff size={14} /> NILAI DISEMBUNYIKAN</>}
                                    </button>
                                    {!loadingStudents && (<p className="text-xs text-zinc-500 mt-1">Total: <b>{students.length}</b> Siswa</p>)}
                                </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <p className="text-xs font-bold text-zinc-500 uppercase mb-2">Tambah Manual</p>
                                    <form onSubmit={handleAddStudent} className="flex gap-2">
                                        <input type="text" placeholder="Nama siswa..." className="flex-1 px-4 py-2 rounded-md border border-zinc-300 text-sm focus:outline-none focus:border-black" value={studentName} onChange={e => setStudentName(e.target.value)} required />
                                        <button disabled={addingStudent} className="bg-black text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-zinc-800 disabled:opacity-50"><UserPlus size={18} /></button>
                                    </form>
                                </div>
                                <div>
                                    <StudentImport
                                        uploading={uploadingCsv}
                                        onUpload={handleUploadCsv}
                                        onDownloadTemplate={handleDownloadTemplate}
                                    />
                                </div>
                            </div>
                        </div>

                        {selectedStudentIds.size > 0 && (
                            <div className="bg-red-50 px-6 py-3 border-b border-red-100 flex justify-between items-center animate-pulse-fast">
                                <span className="text-red-700 text-sm font-bold">{selectedStudentIds.size} siswa dipilih</span>
                                <button onClick={handleBulkDelete} className="bg-red-600 text-white text-xs px-4 py-2 rounded font-bold hover:bg-red-700">HAPUS TERPILIH ({selectedStudentIds.size})</button>
                            </div>
                        )}

                        {loadingStudents ? (
                            <div className="p-6">
                                <TableSkeleton rows={5} />
                            </div>
                        ) : (
                            <StudentTable
                                students={students}
                                selectedStudentIds={selectedStudentIds}
                                toggleSelectAll={toggleSelectAll}
                                toggleSelectStudent={toggleSelectStudent}
                                editingId={editingId}
                                editName={editName}
                                setEditName={setEditName}
                                startEditing={startEditing}
                                cancelEditing={cancelEditing}
                                saveEdit={saveEdit}
                                handleDeleteStudent={handleDeleteStudent}
                                handleUnlockStudent={handleUnlockStudent}
                            />
                        )}
                    </div>
                </>
            ) : (
                <>
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-zinc-900">Kelas & Siswa</h2>
                        <p className="text-zinc-500 mt-2">Periode: {activePeriod?.year} - {activePeriod?.semester}</p>
                    </div>

                    {!activePeriod ? (
                        <div className="py-6">
                            <GridSkeleton count={4} />
                        </div>
                    ) : (
                        <div className="grid lg:grid-cols-12 gap-8">
                            <div className="lg:col-span-4">
                                <div className="bg-white border border-zinc-200 rounded-xl p-6 sticky top-4">
                                    <h3 className="text-lg font-bold text-zinc-900 mb-6 pb-4 border-b border-zinc-100">Buat Kelas Baru</h3>
                                    <form onSubmit={handleCreateClass} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Nama Kelas</label>
                                            <input type="text" className="w-full px-4 py-3 rounded-md border border-zinc-300 focus:outline-none focus:border-black" placeholder="XII IPA 1" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                                        </div>
                                        <button disabled={creatingClass} className="w-full bg-black text-white py-3 rounded-md font-bold hover:bg-zinc-800 disabled:opacity-50">
                                            {creatingClass ? 'MENYIMPAN...' : 'BUAT KELAS'}
                                        </button>
                                    </form>
                                </div>
                            </div>
                            <div className="lg:col-span-8">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {classes.map(cls => (
                                        <ClassCard
                                            key={cls.id}
                                            cls={cls}
                                            activePeriod={activePeriod}
                                            onSelect={handleSelectClass}
                                            onEdit={(c) => setEditClassModal({ isOpen: true, cls: c })}
                                            onDelete={handleDeleteClass}
                                        />
                                    ))}
                                    {classes.length === 0 && (
                                        <div className="col-span-2 bg-white border border-zinc-200 rounded-xl p-12 text-center">
                                            <p className="text-zinc-400">Belum ada kelas. Buat kelas pertama!</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
