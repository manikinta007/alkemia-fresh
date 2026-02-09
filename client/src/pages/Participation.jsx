import React, { useState, useEffect } from 'react';
import { Award, Settings, Grid3x3, List, Shuffle } from 'lucide-react';
import { fetchApi } from '../utils/api';
import { ConfigModal, HistoryModal } from './Participation/ParticipationModals';

export default function Participation() {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [students, setStudents] = useState([]);
    const [settings, setSettings] = useState(null);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
    const [configModal, setConfigModal] = useState(false);
    const [historyModal, setHistoryModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [loading, setLoading] = useState(false);

    // Fetch classes on mount
    useEffect(() => {
        fetchClasses();
    }, []);

    // Fetch students when class is selected
    useEffect(() => {
        if (selectedClass) {
            fetchSettings();
            fetchStudents();
        }
    }, [selectedClass]);

    const fetchClasses = async () => {
        try {
            const res = await fetchApi('/api/classes');
            if (res.ok) {
                const data = await res.json();
                setClasses(data);
            }
        } catch (e) {
            console.error('Error fetching classes:', e);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetchApi(`/api/participation/settings?class_id=${selectedClass}`);
            if (res.ok) {
                const data = await res.json();
                setSettings(data);
            }
        } catch (e) {
            console.error('Error fetching settings:', e);
        }
    };

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await fetchApi(`/api/participation/students?class_id=${selectedClass}`);
            if (res.ok) {
                const data = await res.json();
                setStudents(data);
            }
        } catch (e) {
            console.error('Error fetching students:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleActivityClick = async (studentId, activityType, points) => {
        try {
            const res = await fetchApi('/api/participation/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    class_id: selectedClass,
                    student_id: studentId,
                    activity_type: activityType,
                    points: points
                })
            });

            if (res.ok) {
                fetchStudents(); // Refresh data
            }
        } catch (e) {
            console.error('Error logging activity:', e);
        }
    };

    const handleUndo = async (studentId) => {
        try {
            const res = await fetchApi('/api/participation/undo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_id: studentId,
                    class_id: selectedClass
                })
            });

            if (res.ok) {
                fetchStudents(); // Refresh data
            }
        } catch (e) {
            console.error('Error undoing activity:', e);
        }
    };

    const handleSaveSettings = async (newSettings) => {
        try {
            const res = await fetchApi('/api/participation/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    class_id: selectedClass,
                    ...newSettings
                })
            });

            if (res.ok) {
                setSettings(newSettings);
                setConfigModal(false);
                fetchStudents(); // Refresh to recalculate scores
            }
        } catch (e) {
            console.error('Error saving settings:', e);
        }
    };

    const handleViewHistory = async (student) => {
        setSelectedStudent(student);
        setHistoryModal(true);
    };

    if (!selectedClass) {
        return (
            <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Award className="w-8 h-8 text-orange-500" />
                    <div>
                        <h1 className="text-2xl font-bold">Nilai Keaktifan</h1>
                        <p className="text-gray-600">Sistem Poin & Gamifikasi Kelas</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {classes.map(cls => (
                        <div
                            key={cls.id}
                            onClick={() => setSelectedClass(cls.id)}
                            className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border-2 border-transparent hover:border-orange-500"
                        >
                            <h3 className="text-xl font-bold mb-2">{cls.name}</h3>
                            <p className="text-gray-600">{cls.student_count || 30} siswa</p>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSelectedClass(null)}
                        className="text-gray-600 hover:text-gray-900"
                    >
                        ← Kembali
                    </button>
                    <h1 className="text-2xl font-bold">
                        {classes.find(c => c.id === selectedClass)?.name}
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}
                        >
                            <Grid3x3 className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-2 rounded ${viewMode === 'table' ? 'bg-white shadow' : ''}`}
                        >
                            <List className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Random Picker Button */}
                    <button className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
                        <Shuffle className="w-5 h-5" />
                        Pilih Acak
                    </button>

                    {/* Settings Button */}
                    <button
                        onClick={() => setConfigModal(true)}
                        className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="text-center py-12">Loading...</div>
            ) : viewMode === 'grid' ? (
                <GridView
                    students={students}
                    settings={settings}
                    onActivityClick={handleActivityClick}
                    onUndo={handleUndo}
                />
            ) : (
                <TableView
                    students={students}
                    onViewHistory={handleViewHistory}
                />
            )}

            {/* Modals */}
            <ConfigModal
                isOpen={configModal}
                onClose={() => setConfigModal(false)}
                settings={settings}
                onSave={handleSaveSettings}
            />

            <HistoryModal
                isOpen={historyModal}
                onClose={() => setHistoryModal(false)}
                student={selectedStudent}
                classId={selectedClass}
            />
        </div>
    );
}

// Grid View Component
function GridView({ students, settings, onActivityClick, onUndo }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {students.map(student => (
                <div key={student.id} className="bg-white p-4 rounded-xl shadow-sm border">
                    {/* Student Header */}
                    <div className="mb-3">
                        <h3 className="font-bold text-lg">{student.name}</h3>
                        <div className="flex items-center justify-between mt-2">
                            <span className="text-3xl font-bold">{student.final_score}</span>
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm font-medium">
                                +{student.activity_points} Poin
                            </span>
                        </div>
                        <p className="text-sm text-gray-500">Base: {student.base_score}</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                        <button
                            onClick={() => onActivityClick(student.id, 'ask', settings?.ask_points || 2)}
                            className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2"
                        >
                            <span>Tanya</span>
                            <span className="font-bold">+{settings?.ask_points || 2}</span>
                        </button>

                        <button
                            onClick={() => onActivityClick(student.id, 'answer', settings?.answer_points || 3)}
                            className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
                        >
                            <span>Jawab</span>
                            <span className="font-bold">+{settings?.answer_points || 3}</span>
                        </button>

                        <button
                            onClick={() => onActivityClick(student.id, 'present', settings?.present_points || 5)}
                            className="w-full py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center justify-center gap-2"
                        >
                            <span>Maju</span>
                            <span className="font-bold">+{settings?.present_points || 5}</span>
                        </button>

                        <button
                            onClick={() => onActivityClick(student.id, 'penalty', settings?.penalty_points || -2)}
                            className="w-full py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center justify-center gap-2"
                        >
                            <span className="font-bold">{settings?.penalty_points || -2}</span>
                            <span>Sanksi</span>
                        </button>

                        <button
                            onClick={() => onUndo(student.id)}
                            className="w-full py-1 text-sm text-gray-600 hover:text-gray-900 flex items-center justify-center gap-1"
                        >
                            ↶ Batalkan
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

// Table View Component
function TableView({ students, onViewHistory }) {
    return (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">NO</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">NAMA SISWA</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">POIN AKTIVITAS</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">NILAI AKHIR</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">AKSI</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {students.map((student, idx) => (
                        <tr key={student.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm">{idx + 1}</td>
                            <td className="px-6 py-4 font-medium">{student.name}</td>
                            <td className="px-6 py-4 text-center">
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">
                                    +{student.activity_points}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-center text-lg font-bold">{student.final_score}</td>
                            <td className="px-6 py-4 text-center">
                                <button
                                    onClick={() => onViewHistory(student)}
                                    className="text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    Lihat Riwayat
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
