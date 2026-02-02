import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAttendanceData } from '../hooks/useAttendanceData';
import { Card, Spinner, Alert } from '../components/UI';
import { GridSkeleton, TableSkeleton } from '../components/Skeleton';
import { useAlertContext } from '../components/Alert';
import { ClipboardList, Calendar, Download, Trash2, Save, FileText, CheckCircle, ChevronRight, ArrowLeft } from 'lucide-react';

const ExportModal = ({ isOpen, onClose, classId, availableDates, fetchAvailableDates }) => {
    // ... (unchanged)
    if (!isOpen) return null;
    const [type, setType] = useState('daily'); // daily | recap
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    useEffect(() => {
        if (isOpen && classId && type === 'daily') {
            fetchAvailableDates(classId);
        }
    }, [isOpen, classId, type]);

    const handleDownload = () => {
        let url = `/api/attendance/export?type=${type}&class_id=${classId}`;
        if (type === 'daily') url += `&date=${date}`;
        if (type === 'recap') url += `&month=${month}`;
        window.open(url, '_blank');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-green-100 text-green-600 rounded-full">
                        <Download size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Download Laporan</h3>
                        <p className="text-zinc-500 text-xs">Format CSV</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex bg-zinc-100 p-1 rounded-lg">
                        <button onClick={() => setType('daily')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${type === 'daily' ? 'bg-white shadow text-black' : 'text-zinc-500 hover:text-zinc-700'}`}>Harian</button>
                        <button onClick={() => setType('recap')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${type === 'recap' ? 'bg-white shadow text-black' : 'text-zinc-500 hover:text-zinc-700'}`}>Rekap Bulanan</button>
                    </div>

                    {type === 'daily' ? (
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Tanggal</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-zinc-200 outline-none focus:border-black font-mono text-sm" />

                            {availableDates.length > 0 && (
                                <div className="mt-3">
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase mb-2">Data Tersedia</p>
                                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                                        {availableDates.map(d => (
                                            <button key={d} onClick={() => setDate(d)} className={`px-2 py-1 text-[10px] font-mono rounded border ${date === d ? 'bg-zinc-800 text-white border-zinc-800' : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'}`}>
                                                {d}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Bulan</label>
                            <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-zinc-200 outline-none focus:border-black font-mono text-sm" />
                        </div>
                    )}

                    <div className="flex gap-2 pt-4">
                        <button onClick={onClose} className="flex-1 py-2.5 border border-zinc-200 text-zinc-600 text-sm font-bold rounded-lg hover:bg-zinc-50">Batal</button>
                        <button onClick={handleDownload} className="flex-1 py-2.5 bg-zinc-900 text-white text-sm font-bold rounded-lg hover:bg-zinc-800">Download</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function Attendance() {
    const [searchParams] = useSearchParams();
    const { showAlert, showConfirm } = useAlertContext();
    const {
        loading, submitting, deleting,
        classes, activePeriod,
        selectedClass, setSelectedClass,
        date, setDate,
        students, dataExists,
        // Actions
        handleStatusChange,
        markAllPresent,
        saveAttendance,
        deleteAttendance,
        // Export
        availableDates,
        fetchAvailableDates
    } = useAttendanceData(showAlert, showConfirm);

    const [showExport, setShowExport] = useState(false);

    // --- DEEP LINKING: AUTO SELECT CLASS ---
    useEffect(() => {
        const classIdParam = searchParams.get('class_id');
        if (classIdParam && classes.length > 0 && !selectedClass) {
            const cls = classes.find(c => c.id == classIdParam);
            if (cls) setSelectedClass(cls);
        }
    }, [classes, searchParams, selectedClass, setSelectedClass]);

    if (!activePeriod) return <div className="p-8"><GridSkeleton count={3} /></div>;

    if (!selectedClass) {
        return (
            <div className="animate-in fade-in duration-500">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-zinc-900 flex items-center gap-3">
                        <ClipboardList className="text-orange-600" size={32} />
                        Presensi Siswa
                    </h2>

                    <p className="text-zinc-500 mt-2">Pilih kelas untuk mengelola kehadiran harian.</p>
                </div>

                {
                    loading ? <GridSkeleton count={6} /> : (
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
                                        Kelola Kehadiran
                                    </p>
                                </div>
                            ))}
                        </div>
                    )
                }
            </div >
        );
    }

    return (
        <div className="animate-in fade-in duration-500 pb-24">
            <button
                onClick={() => setSelectedClass(null)}
                className="mb-6 flex items-center text-sm font-medium text-zinc-500 hover:text-orange-600 transition-colors"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali ke Daftar Kelas
            </button>

            {/* Header Control */}
            <div className="bg-white border border-zinc-200 rounded-xl p-6 mb-6 shadow-sm sticky top-4 z-10">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="w-full md:w-1/3">
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Kelas Terpilih</label>
                        <div className="text-lg font-bold text-zinc-900 px-4 py-3 bg-zinc-50 rounded-lg border border-zinc-200">
                            {selectedClass.name}
                        </div>
                    </div>
                    <div className="w-full md:w-1/3">
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Tanggal Presensi</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:border-black outline-none font-mono text-sm shadow-sm"
                        />
                    </div>
                    <div className="w-full md:w-auto flex gap-2">
                        <button
                            onClick={() => setShowExport(true)}
                            className="h-[50px] px-6 border border-zinc-200 text-zinc-700 font-bold rounded-lg hover:bg-zinc-50 hover:border-zinc-300 transition flex items-center gap-2"
                        >
                            <Download size={18} />
                            <span className="hidden md:inline">Laporan</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-zinc-700 text-sm uppercase tracking-wider">Daftar Siswa ({students.length})</h3>
                        {dataExists && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase">Terisi</span>
                        )}
                    </div>
                    <button
                        onClick={markAllPresent}
                        className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-md transition disabled:opacity-50"
                        disabled={students.length === 0}
                    >
                        TANDAI SEMUA HADIR
                    </button>
                </div>

                {loading ? (
                    <div className="p-4"><TableSkeleton rows={8} /></div>
                ) : (
                    <div className="divide-y divide-zinc-100">
                        {students.length === 0 ? (
                            <div className="p-12 text-center text-zinc-400 italic">Tidak ada siswa atau pilih tanggal.</div>
                        ) : (
                            students.map((student, idx) => (
                                <div key={student.student_id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50 transition">
                                    <div className="flex items-center gap-4">
                                        <span className="w-8 h-8 flex items-center justify-center bg-zinc-100 rounded-full text-xs font-bold text-zinc-500 font-mono">
                                            {idx + 1}
                                        </span>
                                        <span className="font-bold text-zinc-800">{student.name}</span>
                                    </div>

                                    <div className="flex bg-zinc-100 rounded-lg p-1 gap-1">
                                        {[
                                            { val: 'H', label: 'Hadir', color: 'bg-green-500 text-white ring-green-500' },
                                            { val: 'S', label: 'Sakit', color: 'bg-yellow-400 text-white ring-yellow-400' },
                                            { val: 'I', label: 'Izin', color: 'bg-blue-500 text-white ring-blue-500' },
                                            { val: 'A', label: 'Alpa', color: 'bg-red-500 text-white ring-red-500' }
                                        ].map(opt => (
                                            <button
                                                key={opt.val}
                                                onClick={() => handleStatusChange(student.student_id, opt.val)}
                                                className={`w-10 h-9 rounded-md text-xs font-bold transition flex items-center justify-center ${student.status === opt.val
                                                    ? opt.color + ' shadow-md scale-105 ring-2 ring-offset-1'
                                                    : 'text-zinc-400 hover:bg-white hover:text-zinc-600'
                                                    }`}
                                                title={opt.label}
                                            >
                                                {opt.val}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Floating Action Buttons */}
            {selectedClass && students.length > 0 && (
                <div className="fixed bottom-6 right-6 left-6 md:left-72 z-40 flex justify-end gap-3 pointer-events-none">
                    <div className="flex gap-3 pointer-events-auto">
                        {dataExists && (
                            <button
                                onClick={deleteAttendance}
                                disabled={deleting || submitting}
                                className="w-14 h-14 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 hover:scale-105 active:scale-95 transition flex items-center justify-center"
                                title="Hapus Data Tanggal Ini"
                            >
                                <Trash2 size={24} />
                            </button>
                        )}

                        <button
                            onClick={saveAttendance}
                            disabled={deleting || submitting}
                            className="h-14 px-8 bg-zinc-900 text-white font-bold rounded-full shadow-lg hover:bg-black hover:scale-105 active:scale-95 transition flex items-center gap-3"
                        >
                            {submitting ? (
                                <Spinner />
                            ) : (
                                <>
                                    <Save size={20} />
                                    <span>SIMPAN</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            <ExportModal
                isOpen={showExport}
                onClose={() => setShowExport(false)}
                classId={selectedClass.id}
                availableDates={availableDates}
                fetchAvailableDates={fetchAvailableDates}
            />
        </div>
    );
}
