// views/grades.js
// Input dan Kelola Nilai Siswa
// FIXED: Menghapus nested backticks yang menyebabkan SyntaxError

import { getLayoutHtml } from './layout.js';
import { UI_COMPONENTS } from './ui.js';

export function getGradesPage(classes = [], activePeriod = null) {
    const initialData = { classes, activePeriod };
  
    const contentComponent = `
        ${UI_COMPONENTS}

        const { useState, useEffect } = React;
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        const { classes: initialClasses, activePeriod: initialPeriod } = window.__INITIAL_DATA__;

        function Grades() {
            const [classes, setClasses] = useState(initialClasses || []);
            const [activePeriod, setActivePeriod] = useState(initialPeriod || null);
            const [selectedClass, setSelectedClass] = useState(null);
            const [students, setStudents] = useState([]);
            const [grades, setGrades] = useState({});
            const [editingId, setEditingId] = useState(null);
            const [loadingData, setLoadingData] = useState(false);
            const [alertState, setAlertState] = useState({ isOpen: false, type: 'success', message: '' });
            
            const showAlert = (type, message) => setAlertState({ isOpen: true, type, message });

            const fetchStudentsAndGrades = async (classId) => {
                setLoadingData(true); 
                try {
                    // Secure Fetch GET
                    const studentsRes = await window.secureFetch('/api/students?class_id=' + classId);
                    const gradesRes = await window.secureFetch('/api/grades?class_id=' + classId);
                    
                    if (studentsRes.ok && gradesRes.ok) {
                        const studentsData = await studentsRes.json();
                        const gradesData = await gradesRes.json();
                        setStudents(studentsData);
                        
                        const gradesMap = {};
                        gradesData.forEach(g => { gradesMap[g.student_id] = g; });
                        setGrades(gradesMap);
                    } else {
                        showAlert('error', 'Gagal memuat data nilai. Coba refresh.');
                    }
                } catch (err) {
                    showAlert('error', 'Terjadi kesalahan koneksi.');
                } finally {
                    setLoadingData(false); 
                }
            };

            const handleSelectClass = (cls) => {
                setSelectedClass(cls);
                fetchStudentsAndGrades(cls.id);
            };

            const handleSaveGrade = async (studentId) => {
                const grade = grades[studentId] || {};
                try {
                    // Secure Fetch POST
                    const res = await window.secureFetch('/api/grades', {
                        method: 'POST',
                        body: JSON.stringify({
                            periodId: activePeriod.id,
                            studentId: studentId,
                            uh: grade.uh || 0,
                            uts: grade.uts || 0,
                            uas: grade.uas || 0,
                            tugas: grade.tugas || 0
                        })
                    });
                    
                    if (res.ok) {
                        const data = await res.json();
                        // Update nilai final di state lokal agar langsung berubah di UI
                        setGrades(prev => ({
                            ...prev,
                            [studentId]: { ...prev[studentId], final_grade: data.finalGrade }
                        }));
                        setEditingId(null);
                    } else {
                        showAlert('error', 'Gagal menyimpan nilai.');
                    }
                } catch (err) {
                    showAlert('error', 'Kesalahan koneksi saat menyimpan.');
                }
            };

            const updateGrade = (studentId, field, value) => {
                setGrades(prev => ({
                    ...prev,
                    [studentId]: { ...(prev[studentId] || {}), [field]: value }
                }));
            };

            if (selectedClass) {
                return (
                    <AuthGuard>
                        <div className="animate-in fade-in duration-500">
                            <CustomAlert isOpen={alertState.isOpen} type={alertState.type} message={alertState.message} onClose={() => setAlertState({ ...alertState, isOpen: false })} />

                            <button onClick={() => setSelectedClass(null)} className="mb-6 text-sm text-zinc-600 hover:text-black font-medium">← Kembali</button>
                            
                            <div className="mb-6">
                                <h2 className="text-3xl font-bold text-zinc-900">{selectedClass.name}</h2>
                                <p className="text-zinc-500">Bobot: UH 30%, UTS 20%, UAS 30%, Tugas 20%</p>
                            </div>

                            {loadingData ? (
                                <div className="min-h-[200px] flex flex-col items-center justify-center card-mono">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 mb-4"></div>
                                    <p className="text-zinc-500 text-sm">Sedang memuat data nilai...</p>
                                </div>
                            ) : (
                                <div className="card-mono overflow-x-auto bg-white">
                                    <table className="w-full text-sm">
                                        <thead className="bg-zinc-50 border-b border-zinc-200">
                                            <tr>
                                                <th className="p-4 text-left text-xs text-zinc-500 uppercase font-bold">Nama Siswa</th>
                                                <th className="p-4 text-center text-xs text-zinc-500 uppercase font-bold">UH (30%)</th>
                                                <th className="p-4 text-center text-xs text-zinc-500 uppercase font-bold">UTS (20%)</th>
                                                <th className="p-4 text-center text-xs text-zinc-500 uppercase font-bold">UAS (30%)</th>
                                                <th className="p-4 text-center text-xs text-zinc-500 uppercase font-bold">Tugas (20%)</th>
                                                <th className="p-4 text-center text-xs text-zinc-500 uppercase font-bold">Final</th>
                                                <th className="p-4 text-center text-xs text-zinc-500 uppercase font-bold">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100">
                                            {students.map((s, idx) => {
                                                const g = grades[s.id] || {};
                                                const isEditing = editingId === s.id;
                                                return (
                                                    <tr key={s.id} className={"hover:bg-zinc-50 transition " + (isEditing ? "bg-orange-50" : "")}>
                                                        <td className="p-4 font-bold text-zinc-900">
                                                            <div className="flex gap-3">
                                                                <span className="text-zinc-400 w-6 font-mono font-normal">{idx + 1}</span>
                                                                {s.name}
                                                            </div>
                                                        </td>
                                                        <td className="p-4">{isEditing ? <input type="number" className="w-16 px-2 py-1 border rounded text-center font-bold" value={g.uh || ''} onChange={e => updateGrade(s.id, 'uh', e.target.value)} /> : <span className="block text-center text-zinc-600">{g.uh || '-'}</span>}</td>
                                                        <td className="p-4">{isEditing ? <input type="number" className="w-16 px-2 py-1 border rounded text-center font-bold" value={g.uts || ''} onChange={e => updateGrade(s.id, 'uts', e.target.value)} /> : <span className="block text-center text-zinc-600">{g.uts || '-'}</span>}</td>
                                                        <td className="p-4">{isEditing ? <input type="number" className="w-16 px-2 py-1 border rounded text-center font-bold" value={g.uas || ''} onChange={e => updateGrade(s.id, 'uas', e.target.value)} /> : <span className="block text-center text-zinc-600">{g.uas || '-'}</span>}</td>
                                                        <td className="p-4">{isEditing ? <input type="number" className="w-16 px-2 py-1 border rounded text-center font-bold" value={g.tugas || ''} onChange={e => updateGrade(s.id, 'tugas', e.target.value)} /> : <span className="block text-center text-zinc-600">{g.tugas || '-'}</span>}</td>
                                                        <td className="p-4 text-center font-bold text-zinc-900 bg-zinc-50/50">{g.final_grade ? Number(g.final_grade).toFixed(1) : '-'}</td>
                                                        <td className="p-4 text-center">{isEditing ? <button onClick={() => handleSaveGrade(s.id)} className="px-4 py-1 bg-black text-white rounded text-xs font-bold hover:bg-zinc-800 shadow-lg">SIMPAN</button> : <button onClick={() => setEditingId(s.id)} className="px-4 py-1 border border-zinc-300 text-zinc-600 rounded text-xs font-bold hover:bg-zinc-100">EDIT</button>}</td>
                                                    </tr>
                                                );
                                            })}
                                            {students.length === 0 && (
                                                <tr><td colSpan="7" className="p-12 text-center text-zinc-400">Belum ada siswa di kelas ini</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </AuthGuard>
                );
            }

            return (
                <AuthGuard>
                    <div className="animate-in fade-in duration-500">
                        <CustomAlert isOpen={alertState.isOpen} type={alertState.type} message={alertState.message} onClose={() => setAlertState({ ...alertState, isOpen: false })} />

                        <div className="mb-8">
                            <h2 className="text-3xl font-bold text-zinc-900">Nilai</h2>
                            <p className="text-zinc-500 mt-2">
                                {selectedClass ? 'Kelas: ' + selectedClass.name : 'Pilih kelas untuk input nilai'}
                            </p>
                        </div>

                        {!activePeriod ? (
                            <div className="card-mono p-8 text-center"><p className="text-zinc-500">Pilih periode akademik terlebih dahulu.</p></div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {classes.map(cls => (
                                    <div key={cls.id} onClick={() => handleSelectClass(cls)} className="card-mono p-6 cursor-pointer hover:border-orange-500 transition hover:shadow-lg group bg-white">
                                        <h4 className="text-xl font-bold mb-2 text-zinc-900 group-hover:text-orange-600 transition">{cls.name}</h4>
                                        <p className="text-xs text-zinc-500">Klik untuk input nilai →</p>
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
        root.render(<Grades />);
    `;

    return getLayoutHtml({
        title: 'Nilai',
        user: { name: 'Guru' },
        activePeriod,
        initialData,
        contentComponent
    });
}