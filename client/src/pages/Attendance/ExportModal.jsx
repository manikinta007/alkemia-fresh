import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { useAttendanceData } from '../../hooks/useAttendanceData';

export const ExportModal = ({ isOpen, onClose, classId }) => {
    if (!isOpen) return null;
    const [type, setType] = useState('daily'); // daily | recap
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    // Quick Chips Logic
    const { availableDates, loadingDates, fetchAvailableDates, downloadExport } = useAttendanceData();

    useEffect(() => {
        if (isOpen && classId && type === 'daily') {
            fetchAvailableDates(classId);
        }
    }, [isOpen, classId, type]);

    const handleDownload = () => {
        downloadExport(type, classId, date, month);
        onClose();
    };

    const formatDateID = (isoDate) => {
        if (!isoDate) return '';
        return new Date(isoDate).toLocaleDateString('id-ID', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 transform transition-all scale-100 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                        <Download size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-zinc-900">Download Laporan</h3>
                        <p className="text-xs text-zinc-500">Format CSV (Excel Compatible)</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Jenis Laporan</label>
                        <div className="flex bg-zinc-100 p-1 rounded-lg">
                            <button onClick={() => setType('daily')} className={"flex-1 py-2 text-xs font-bold rounded-md transition " + (type === 'daily' ? "bg-white shadow text-black" : "text-zinc-500 hover:text-zinc-700")}>Harian</button>
                            <button onClick={() => setType('recap')} className={"flex-1 py-2 text-xs font-bold rounded-md transition " + (type === 'recap' ? "bg-white shadow text-black" : "text-zinc-500 hover:text-zinc-700")}>Rekap Bulanan</button>
                        </div>
                    </div>

                    {type === 'daily' ? (
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Pilih Tanggal</label>
                            <input type="date" className="w-full px-4 py-3 rounded-lg border border-zinc-300 focus:border-black outline-none font-mono text-sm" value={date} onChange={e => setDate(e.target.value)} />

                            {/* QUICK CHIPS SECTION */}
                            <div className="mt-3">
                                <p className="text-[10px] text-zinc-400 uppercase font-bold mb-2 flex justify-between items-center">
                                    Data Tersedia
                                    {loadingDates && <span className="animate-pulse">Loading...</span>}
                                </p>

                                {!loadingDates && availableDates.length === 0 && (
                                    <div className="text-xs text-zinc-400 italic bg-zinc-50 p-2 rounded border border-zinc-100">
                                        Belum ada data absensi untuk kelas ini.
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                                    {availableDates.map(d => (
                                        <button
                                            key={d}
                                            onClick={() => setDate(d)}
                                            className={`px-3 py-1.5 text-xs font-mono rounded border transition ${date === d
                                                    ? 'bg-zinc-800 text-white border-zinc-800 shadow-md'
                                                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50'
                                                }`}
                                        >
                                            {formatDateID(d)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Pilih Bulan</label>
                            <input type="month" className="w-full px-4 py-3 rounded-lg border border-zinc-300 focus:border-black outline-none font-mono text-sm" value={month} onChange={e => setMonth(e.target.value)} />
                        </div>
                    )}
                </div>

                <div className="flex gap-3 mt-8">
                    <button onClick={onClose} className="flex-1 py-3 border border-zinc-200 text-zinc-600 rounded-xl font-bold hover:bg-zinc-50 transition">BATAL</button>
                    <button onClick={handleDownload} className="flex-1 py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition shadow-lg">DOWNLOAD</button>
                </div>
            </div>
        </div>
    );
};
