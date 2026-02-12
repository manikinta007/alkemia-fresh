import React, { useState, useEffect } from 'react';
import { fetchApi } from '../utils/api';
import { useClassesData } from '../hooks/useClassesData';
import { Spinner } from '../components/UI';
import { GridSkeleton } from '../components/Skeleton';
import {
    ChevronRight, ArrowLeft, Calculator, AlertCircle,
    HelpCircle, CheckCircle, UserPlus, Shuffle, RefreshCw, X, Settings, List, Grid, History, Trophy,
    Users, Save, Trash2, FolderOpen
} from 'lucide-react';
import { useAlertContext } from '../components/Alert';

export default function Participation() {
    const {
        loading: loadingClasses,
        classes,
        activePeriod,
        fetchActivePeriod
    } = useClassesData();

    const [selectedClass, setSelectedClass] = useState(null);
    const [students, setStudents] = useState([]);
    const [loadingData, setLoadingData] = useState(false);

    // Config State
    const [config, setConfig] = useState({
        base_score: 60,
        point_ask: 1,
        point_answer: 2,
        point_volunteer: 3,
        point_sanction: -1
    });

    // UI State
    const [showRandomizer, setShowRandomizer] = useState(false); // Unified Modal
    const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'list'
    const [showSettings, setShowSettings] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [selectedStudentHistory, setSelectedStudentHistory] = useState(null);
    const [historyLogs, setHistoryLogs] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Date Filter State removed

    const { showAlert, showConfirm } = useAlertContext();

    useEffect(() => {
        fetchActivePeriod();
    }, [fetchActivePeriod]);

    useEffect(() => {
        if (selectedClass && activePeriod) {
            fetchParticipationData(selectedClass.id);
        }
    }, [selectedClass, activePeriod]);

    const fetchParticipationData = async (classId) => {
        setLoadingData(true);
        try {
            const res = await fetchApi(`/api/participation?class_id=${classId}&period_id=${activePeriod.id}`);
            if (res.ok) {
                const data = await res.json();
                if (data.students) {
                    setStudents(data.students);
                    setConfig(data.config || {
                        base_score: 60,
                        point_ask: 1,
                        point_answer: 2,
                        point_volunteer: 3,
                        point_sanction: -1
                    });
                }
            } else {
                showAlert("Gagal mengambil data keaktifan", "error");
            }
        } catch (e) {
            console.error(e);
            showAlert("Terjadi kesalahan koneksi", "error");
        } finally {
            setLoadingData(false);
        }
    };

    const handleAddPoint = async (studentId, type, points) => {
        setStudents(prev => prev.map(s => {
            if (s.id === studentId) {
                const newTotal = (s.total_points || 0) + points;
                const newScore = Math.min(100, config.base_score + newTotal);
                return { ...s, total_points: newTotal, participation: newScore };
            }
            return s;
        }));

        try {
            const res = await fetchApi('/api/participation/log', {
                method: 'POST',
                body: JSON.stringify({
                    periodId: activePeriod.id,
                    classId: selectedClass.id,
                    studentId,
                    type,
                    points
                })
            });
            if (!res.ok) throw new Error("API Error");
        } catch (e) {
            console.error(e);
            showAlert("Gagal menyimpan poin (cek koneksi)", "error");
            fetchParticipationData(selectedClass.id);
        }
    };

    const handleResetStudent = async (studentId) => {
        if (!await showConfirm("Reset poin keaktifan siswa ini kembali ke 0?")) return;

        try {
            const res = await fetchApi('/api/participation/reset', {
                method: 'POST',
                body: JSON.stringify({
                    periodId: activePeriod.id,
                    studentId
                })
            });

            if (res.ok) {
                showAlert("Poin di-reset", "success");
                fetchParticipationData(selectedClass.id);
            }
        } catch (e) {
            showAlert("Gagal mereset data", "error");
        }
    };

    const handleViewHistory = async (student) => {
        setSelectedStudentHistory(student);
        setShowHistory(true);
        setLoadingHistory(true);
        try {
            const res = await fetchApi(`/api/participation/history?student_id=${student.id}&period_id=${activePeriod.id}`);
            if (res.ok) {
                const logs = await res.json();
                setHistoryLogs(logs);
            }
        } catch (e) {
            showAlert("Gagal mengambil riwayat", "error");
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleUpdateSettings = async (newConfig) => {
        try {
            const res = await fetchApi('/api/classes/settings', {
                method: 'POST',
                body: JSON.stringify({
                    classId: selectedClass.id,
                    participationBaseScore: parseInt(newConfig.base_score),
                    pointAsk: parseInt(newConfig.point_ask),
                    pointAnswer: parseInt(newConfig.point_answer),
                    pointVolunteer: parseInt(newConfig.point_volunteer),
                    pointSanction: parseInt(newConfig.point_sanction)
                })
            });

            if (res.ok) {
                showAlert("Pengaturan diperbarui", "success");
                setShowSettings(false);
                fetchParticipationData(selectedClass.id);
            }
        } catch (e) {
            showAlert("Gagal menyimpan pengaturan", "error");
        }
    }

    const handleDeleteLog = async (logId) => {
        try {
            const res = await fetchApi(`/api/participation/log?id=${logId}`, { method: 'DELETE' });
            if (res.ok) {
                showAlert("Riwayat dihapus", "success");
                // Refresh history logs
                const historyRes = await fetchApi(`/api/participation/history?student_id=${selectedStudentHistory.id}&period_id=${activePeriod.id}`);
                if (historyRes.ok) {
                    setHistoryLogs(await historyRes.json());
                }
                // Refresh main student list to update total points
                fetchParticipationData(selectedClass.id);
            } else {
                showAlert("Gagal menghapus riwayat", "error");
            }
        } catch (e) {
            showAlert("Terjadi kesalahan", "error");
        }
    };

    if (loadingClasses) return <div className="p-8"><GridSkeleton /></div>;

    if (!activePeriod) {
        return (
            <div className="p-8 text-center bg-white rounded-xl border border-zinc-200">
                <AlertCircle className="mx-auto h-12 w-12 text-zinc-300 mb-2" />
                <h3 className="text-lg font-bold text-zinc-900">Tidak Ada Periode Aktif</h3>
                <p className="text-zinc-500">Silakan set periode aktif di menu Akademik.</p>
            </div>
        );
    }

    if (!selectedClass) {
        return (
            <div className="animate-in fade-in duration-500">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Nilai Keaktifan</h1>
                    <p className="text-zinc-500 mt-2">Sistem Poin & Gamifikasi Kelas.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classes.map(cls => (
                        <div
                            key={cls.id}
                            onClick={() => setSelectedClass(cls)}
                            className="group bg-white border border-zinc-200 p-6 rounded-2xl cursor-pointer hover:border-orange-500 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                                <ChevronRight className="w-5 h-5 text-orange-500" />
                            </div>
                            <h3 className="text-xl font-bold text-zinc-900 group-hover:text-orange-600 transition-colors mb-1">
                                {cls.name}
                            </h3>
                            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 group-hover:text-orange-400/80">
                                {cls.student_count || 0} Siswa
                            </p>
                        </div>
                    ))}
                    {classes.length === 0 && (
                        <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-200 rounded-2xl">
                            <p className="text-zinc-400 font-medium">Belum ada kelas yang tersedia.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-300 pb-20">
            {/* Header Navigation */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSelectedClass(null)}
                        className="flex items-center text-sm font-bold text-zinc-500 hover:text-indigo-600 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Kembali
                    </button>
                    <div className="h-6 w-px bg-zinc-200 hidden md:block"></div>
                    <h1 className="text-xl font-bold text-indigo-900">{selectedClass.name}</h1>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-zinc-100 rounded-lg p-1 mr-2">
                        <button
                            onClick={() => setViewMode('cards')}
                            className={`p-2 rounded-md transition ${viewMode === 'cards' ? 'bg-white shadow text-indigo-600' : 'text-zinc-400 hover:text-zinc-600'}`}
                            title="Tampilan Kartu"
                        >
                            <Grid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition ${viewMode === 'list' ? 'bg-white shadow text-indigo-600' : 'text-zinc-400 hover:text-zinc-600'}`}
                            title="Tampilan Daftar"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        onClick={() => setShowRandomizer(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm font-medium text-sm"
                    >
                        <Shuffle className="w-4 h-4" />
                        <span className="hidden sm:inline">Pilih Acak</span>
                    </button>

                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-2 border border-zinc-200 text-zinc-600 rounded-lg hover:bg-zinc-50 transition"
                        title="Pengaturan Kelas"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            </div>




            {
                loadingData ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <GridSkeleton />
                        <GridSkeleton />
                        <GridSkeleton />
                    </div>
                ) : (
                    <>
                        {viewMode === 'cards' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {students.map(student => (
                                    <StudentPointCard
                                        key={student.id}
                                        student={student}
                                        config={config}
                                        onAddPoint={handleAddPoint}
                                        onReset={handleResetStudent}
                                        onViewHistory={handleViewHistory}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-zinc-50 text-zinc-500 uppercase font-bold text-xs">
                                        <tr>
                                            <th className="px-6 py-4 w-12">No</th>
                                            <th className="px-6 py-4">Nama Siswa</th>
                                            <th className="px-6 py-4 text-center">Poin Aktivitas</th>
                                            <th className="px-6 py-4 text-center">Nilai Akhir</th>
                                            <th className="px-6 py-4 text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100">
                                        {students.map((student, idx) => (
                                            <tr key={student.id} className="hover:bg-zinc-50">
                                                <td className="px-6 py-4 text-center text-zinc-400">{idx + 1}</td>
                                                <td className="px-6 py-4 font-medium text-zinc-900">{student.name}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-bold">
                                                        +{student.total_points || 0}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold text-lg">
                                                    {student.participation}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => handleViewHistory(student)}
                                                        className="text-indigo-600 hover:text-indigo-800 text-xs font-bold"
                                                    >
                                                        Lihat Riwayat
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )
            }

            {/* MODALS */}
            {
                showRandomizer && (
                    <RandomizerModal
                        students={students}
                        classId={selectedClass.id}
                        onClose={() => setShowRandomizer(false)}
                    />
                )
            }

            {
                showSettings && (
                    <SettingsModal
                        currentConfig={config}
                        onClose={() => setShowSettings(false)}
                        onSave={handleUpdateSettings}
                    />
                )
            }

            {
                showHistory && selectedStudentHistory && (
                    <HistoryModal
                        student={selectedStudentHistory}
                        logs={historyLogs}
                        loading={loadingHistory}
                        onClose={() => setShowHistory(false)}
                        onDelete={handleDeleteLog}
                        showConfirm={showConfirm}
                    />
                )
            }
        </div >
    );
}

// --- SUB COMPONENTS ---
// (StudentPointCard, SettingsModal, HistoryModal - reuse from previous, adding RandomizerModal below)


function RandomizerModal({ students, classId, onClose }) {
    // Simplified to just Pick Student (previous behavior)
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 relative overflow-hidden flex flex-col">
                <button onClick={onClose} className="absolute top-4 right-4 text-zinc-300 hover:text-zinc-600 z-10">
                    <X className="w-6 h-6" />
                </button>

                <h2 className="text-xl font-bold text-zinc-900 mb-6 flex items-center justify-center gap-2">
                    <Shuffle className="w-5 h-5 text-indigo-600" /> Acak Siswa
                </h2>

                <TabPickStudent students={students} />
            </div>
        </div>
    );
}

function TabPickStudent({ students }) {
    const [spinning, setSpinning] = useState(false);
    const [currentName, setCurrentName] = useState("Siap?");
    const [winner, setWinner] = useState(null);

    const handleSpin = () => {
        if (students.length === 0) return;
        setSpinning(true);
        setWinner(null);
        let duration = 0;
        let speed = 50;
        const interval = setInterval(() => {
            const random = students[Math.floor(Math.random() * students.length)];
            setCurrentName(random.name);
            duration += speed;
            if (duration > 1500) speed = 100;
            if (duration > 2500) speed = 200;
            if (duration > 3000) {
                clearInterval(interval);
                const finalWinner = students[Math.floor(Math.random() * students.length)];
                setWinner(finalWinner);
                setSpinning(false);
            }
        }, speed);
    };

    return (
        <div className="text-center py-4">
            <div className="h-48 flex items-center justify-center mb-6 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border-4 border-white shadow-inner mx-auto max-w-sm">
                {winner ? (
                    <div className="animate-in zoom-in duration-300 space-y-2">
                        <p className="text-3xl font-black text-indigo-900 leading-tight px-4">{winner.name}</p>
                        <span className="inline-block px-3 py-1 bg-white rounded-full text-xs font-bold text-indigo-600 shadow-sm">
                            Poin: {winner.total_points || 0}
                        </span>
                    </div>
                ) : (
                    <p className={`text-3xl font-bold text-zinc-400 ${spinning ? 'animate-pulse text-zinc-800' : ''}`}>{currentName}</p>
                )}
            </div>
            {!winner ? (
                <button onClick={handleSpin} disabled={spinning} className="w-full max-w-sm py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 disabled:opacity-50 transition-all active:scale-95">
                    {spinning ? "Mengacak..." : "PUTAR!"}
                </button>
            ) : (
                <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                    <button onClick={handleSpin} className="py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition">Ulangi</button>
                    <button onClick={() => setWinner(null)} className="py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition">OK</button>
                </div>
            )}
        </div>
    );
}

function TabGroupGenerator({ students, classId }) {
    const [membersPerGroup, setMembersPerGroup] = useState(4);
    const [generatedGroups, setGeneratedGroups] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const { showAlert, showPrompt } = useAlertContext();

    const handleGenerate = () => {
        if (membersPerGroup < 1) return;

        // Shuffle
        const shuffled = [...students].sort(() => 0.5 - Math.random());
        const groups = [];

        // Chunking
        for (let i = 0; i < shuffled.length; i += membersPerGroup) {
            const chunk = shuffled.slice(i, i + membersPerGroup);
            groups.push(chunk);
        }

        // Format for display & save
        const formatted = groups.map((g, idx) => ({
            name: `Kelompok ${idx + 1}`,
            members: g,
            memberIds: g.map(s => s.id)
        }));

        setGeneratedGroups(formatted);
    };

    const handleSave = async () => {
        if (generatedGroups.length === 0) return;

        const name = await showPrompt("Beri nama untuk kumpulan kelompok ini:", "Kelompok Tugas 1");
        if (!name) return;

        setIsSaving(true);
        try {
            const res = await fetchApi('/api/groups/sets', {
                method: 'POST',
                body: JSON.stringify({
                    classId,
                    name,
                    groups: generatedGroups
                })
            });

            if (res.ok) {
                showAlert("Kelompok berhasil disimpan!", "success");
                setGeneratedGroups([]);
            } else {
                showAlert("Gagal menyimpan kelompok", "error");
            }
        } catch (e) {
            showAlert("Terjadi kesalahan", "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-end gap-4 justify-center bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                <div className="w-full max-w-[200px]">
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Anggota per Kelompok</label>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setMembersPerGroup(Math.max(1, membersPerGroup - 1))} className="p-2 bg-white border rounded-lg hover:bg-zinc-50">-</button>
                        <span className="text-xl font-bold w-12 text-center">{membersPerGroup}</span>
                        <button onClick={() => setMembersPerGroup(membersPerGroup + 1)} className="p-2 bg-white border rounded-lg hover:bg-zinc-50">+</button>
                    </div>
                </div>
                <button
                    onClick={handleGenerate}
                    className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                >
                    Generate
                </button>
            </div>

            {generatedGroups.length > 0 && (
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-zinc-700">Preview: {generatedGroups.length} Kelompok</h3>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition"
                        >
                            <Save className="w-4 h-4" />
                            {isSaving ? "Menyimpan..." : "Simpan Kelompok"}
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[300px] pr-2">
                        {generatedGroups.map((group, idx) => (
                            <div key={idx} className="bg-white border border-zinc-200 rounded-xl p-3 shadow-sm">
                                <h4 className="font-bold text-indigo-900 text-sm mb-2 border-b border-indigo-50 pb-1">{group.name}</h4>
                                <ul className="space-y-1">
                                    {group.members.map(m => (
                                        <li key={m.id} className="text-xs text-zinc-600 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-300"></div>
                                            {m.name}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function TabSavedGroups({ classId }) {
    const [sets, setSets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSet, setSelectedSet] = useState(null); // Detail view

    useEffect(() => {
        loadSets();
    }, [classId]);

    const loadSets = async () => {
        setLoading(true);
        try {
            const res = await fetchApi(`/api/groups/sets?class_id=${classId}`);
            if (res.ok) {
                setSets(await res.json());
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = async (setId) => {
        setLoading(true);
        try {
            const res = await fetchApi(`/api/groups/sets/${setId}`);
            if (res.ok) {
                setSelectedSet(await res.json());
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (setId) => {
        if (!confirm("Hapus kelompok tersimpan ini?")) return; // Simple confirm for tab simplicity
        try {
            await fetchApi(`/api/groups/sets/${setId}`, { method: 'DELETE' });
            setSelectedSet(null);
            loadSets();
        } catch (e) {
            alert("Gagal menghapus");
        }
    };

    if (loading && !selectedSet) return <div className="py-8 text-center"><Spinner /></div>;

    if (selectedSet) {
        return (
            <div className="animate-in slide-in-from-right duration-300">
                <button onClick={() => setSelectedSet(null)} className="mb-4 text-sm font-bold text-zinc-500 hover:text-indigo-600 flex items-center">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Daftar
                </button>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-indigo-900">{selectedSet.name}</h3>
                    <button onClick={() => handleDelete(selectedSet.id)} className="text-red-500 hover:text-red-700 p-2 bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[350px] pr-2">
                    {selectedSet.groups.map(g => (
                        <div key={g.id} className="bg-zinc-50 border border-zinc-200 rounded-xl p-3">
                            <h4 className="font-bold text-zinc-900 text-sm mb-2">{g.name}</h4>
                            <ul className="space-y-1">
                                {g.members.map(m => (
                                    <li key={m.id} className="text-xs text-zinc-600">{m.name}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {sets.length === 0 ? (
                <div className="text-center py-8 text-zinc-400 border-2 border-dashed border-zinc-100 rounded-xl">
                    Belum ada kelompok tersimpan.
                </div>
            ) : (
                sets.map(set => (
                    <div key={set.id} className="flex justify-between items-center p-4 bg-white border border-zinc-200 rounded-xl hover:border-indigo-300 transition cursor-pointer" onClick={() => handleViewDetail(set.id)}>
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                                <FolderOpen className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-zinc-900">{set.name}</h4>
                                <p className="text-xs text-zinc-500">{new Date(set.created_at).toLocaleDateString()} • {set.group_count} Kelompok</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-zinc-300" />
                    </div>
                ))
            )}
        </div>
    );
}

function StudentPointCard({ student, config, onAddPoint, onReset, onViewHistory }) {
    // Score Color Logic
    const scoreColor = student.participation >= 95 ? 'text-green-600' :
        student.participation >= 85 ? 'text-blue-600' :
            student.participation > config.base_score ? 'text-indigo-600' : 'text-zinc-500';

    return (
        <div className="bg-white border border-zinc-200 rounded-xl p-4 hover:shadow-lg hover:border-indigo-200 transition-all flex flex-col justify-between group h-full">
            <div className="mb-4">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-zinc-900 line-clamp-1 text-lg flex-1 mr-2" title={student.name}>
                        {student.name}
                    </h3>
                    <div className={`text-3xl font-black ${scoreColor}`}>
                        {student.participation}
                    </div>
                </div>

                <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-zinc-400 bg-zinc-50 px-2 py-1 rounded">Base: {config.base_score}</span>
                    <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded border border-yellow-100 flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        +{student.total_points || 0} Poin
                    </span>
                </div>
            </div>

            <div className="space-y-2 mt-auto">
                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => onAddPoint(student.id, 'BERTANYA', config.point_ask)}
                        className="flex flex-col items-center justify-center p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition active:scale-95 border border-blue-100"
                        title={`Bertanya (+${config.point_ask})`}
                    >
                        <HelpCircle className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-bold">Tanya +{config.point_ask}</span>
                    </button>
                    <button
                        onClick={() => onAddPoint(student.id, 'MENJAWAB', config.point_answer)}
                        className="flex flex-col items-center justify-center p-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition active:scale-95 border border-green-100"
                        title={`Menjawab (+${config.point_answer})`}
                    >
                        <CheckCircle className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-bold">Jawab +{config.point_answer}</span>
                    </button>
                    <button
                        onClick={() => onAddPoint(student.id, 'MAJU', config.point_volunteer)}
                        className="flex flex-col items-center justify-center p-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition active:scale-95 border border-purple-100"
                        title={`Maju Kedepan (+${config.point_volunteer})`}
                    >
                        <UserPlus className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-bold">Maju +{config.point_volunteer}</span>
                    </button>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-zinc-100">
                    <button
                        onClick={() => onAddPoint(student.id, 'INDISIPLINER', config.point_sanction)}
                        className="text-xs text-red-400 hover:text-red-600 font-medium px-2 py-1 hover:bg-red-50 rounded transition"
                    >
                        {config.point_sanction} Sanksi
                    </button>
                    <div className="flex gap-1">
                        <button
                            onClick={() => onViewHistory(student)}
                            className="text-zinc-400 hover:text-indigo-600 p-1 hover:bg-zinc-50 rounded transition"
                            title="Riwayat"
                        >
                            <History className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onReset(student.id)}
                            className="text-zinc-300 hover:text-zinc-500 p-1 hover:bg-zinc-50 rounded transition"
                            title="Reset"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SettingsModal({ currentConfig, onClose, onSave }) {
    const [config, setConfig] = useState(currentConfig);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
                <h2 className="text-xl font-bold text-zinc-900 mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-zinc-500" /> Konfigurasi Poin
                </h2>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Nilai Dasar (Base)</label>
                        <input
                            type="number" min="0" max="100"
                            className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold"
                            value={config.base_score}
                            onChange={(e) => setConfig({ ...config, base_score: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Bertanya</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 border border-blue-100 bg-blue-50 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-blue-800"
                                value={config.point_ask}
                                onChange={(e) => setConfig({ ...config, point_ask: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-green-600 uppercase mb-1">Menjawab</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 border border-green-100 bg-green-50 rounded-lg focus:ring-2 focus:ring-green-500 font-bold text-green-800"
                                value={config.point_answer}
                                onChange={(e) => setConfig({ ...config, point_answer: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-purple-600 uppercase mb-1">Maju</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 border border-purple-100 bg-purple-50 rounded-lg focus:ring-2 focus:ring-purple-500 font-bold text-purple-800"
                                value={config.point_volunteer}
                                onChange={(e) => setConfig({ ...config, point_volunteer: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-red-500 uppercase mb-1">Sanksi</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 border border-red-100 bg-red-50 rounded-lg focus:ring-2 focus:ring-red-500 font-bold text-red-800"
                                value={config.point_sanction}
                                onChange={(e) => setConfig({ ...config, point_sanction: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-100">
                    <button onClick={onClose} className="px-4 py-2 font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg">Batal</button>
                    <button onClick={() => onSave(config)} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">Simpan</button>
                </div>
            </div>
        </div>
    );
}

function HistoryModal({ student, logs, loading, onClose, onDelete, showConfirm }) {
    if (!student) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-zinc-300 hover:text-zinc-600">
                    <X className="w-6 h-6" />
                </button>

                <h2 className="text-xl font-bold text-zinc-900 mb-1">Riwayat Keaktifan</h2>
                <p className="text-zinc-500 mb-4">{student.name}</p>

                <div className="max-h-[60vh] overflow-y-auto pr-2 -mr-2">
                    {loading ? (
                        <div className="py-8 text-center text-zinc-400">Loading...</div>
                    ) : logs.length === 0 ? (
                        <div className="py-8 text-center text-zinc-400 border-2 border-dashed border-zinc-100 rounded-xl">
                            Belum ada riwayat tercatat.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {logs.map((log) => (
                                <div key={log.id} className="flex justify-between items-center p-3 bg-zinc-50 rounded-lg border border-zinc-100 group">
                                    <div>
                                        <p className="font-bold text-sm text-zinc-800">{log.type}</p>
                                        <p className="text-xs text-zinc-400">
                                            {new Date(log.created_at.endsWith('Z') ? log.created_at : log.created_at + 'Z').toLocaleString('id-ID', {
                                                timeZone: 'Asia/Jakarta',
                                                day: 'numeric', month: 'long', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            })} WIB
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`font-bold ${log.points > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                            {log.points > 0 ? '+' : ''}{log.points}
                                        </span>
                                        <button
                                            onClick={async () => {
                                                const confirmed = await showConfirm('Hapus riwayat ini? Poin akan ditarik kembali.');
                                                if (confirmed) {
                                                    onDelete(log.id);
                                                }
                                            }}
                                            className="text-zinc-300 hover:text-red-500 p-1 hover:bg-red-50 rounded-md transition"
                                            title="Hapus / Undo"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-6 text-center">
                    <button onClick={onClose} className="w-full py-3 bg-indigo-50 text-indigo-600 font-bold rounded-xl hover:bg-indigo-100 transition">
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
}
