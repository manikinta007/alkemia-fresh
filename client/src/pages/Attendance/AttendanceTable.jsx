import React from 'react';

export const AttendanceTable = ({ students, loading, dataExists, markAllPresent, handleStatusChange }) => {
    if (loading) {
        return <div className="p-12 text-center flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 mb-4"></div>
            <p className="text-zinc-500">Mengambil data absensi...</p>
        </div>;
    }

    if (!students || students.length === 0) {
        return <div className="p-12 text-center text-zinc-400">Belum ada siswa di kelas ini.</div>;
    }

    return (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50/50">
                <div className="text-sm font-bold text-zinc-500 flex items-center gap-2">
                    DAFTAR SISWA ({students.length})
                    {dataExists && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full uppercase tracking-wider font-bold border border-green-200">Terisi</span>}
                </div>
                <button
                    onClick={markAllPresent}
                    className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-md transition"
                >
                    TANDAI SEMUA HADIR
                </button>
            </div>

            <div className="divide-y divide-zinc-100">
                {students.map((student, idx) => (
                    <div key={student.student_id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50 transition group">
                        <div className="flex items-center gap-4">
                            <span className="w-8 h-8 flex items-center justify-center bg-zinc-100 rounded-full text-xs font-bold text-zinc-500 font-mono group-hover:bg-white group-hover:shadow-sm transition">
                                {idx + 1}
                            </span>
                            <span className="font-bold text-zinc-800">{student.name}</span>
                        </div>

                        <div className="flex bg-zinc-100 rounded-lg p-1 gap-1">
                            {[
                                { val: 'H', label: 'Hadir', color: 'bg-green-500 text-white', hover: 'hover:bg-green-100 hover:text-green-600' },
                                { val: 'S', label: 'Sakit', color: 'bg-yellow-500 text-white', hover: 'hover:bg-yellow-100 hover:text-yellow-600' },
                                { val: 'I', label: 'Izin', color: 'bg-blue-500 text-white', hover: 'hover:bg-blue-100 hover:text-blue-600' },
                                { val: 'A', label: 'Alpa', color: 'bg-red-500 text-white', hover: 'hover:bg-red-100 hover:text-red-600' }
                            ].map(opt => (
                                <button
                                    key={opt.val}
                                    onClick={() => handleStatusChange(student.student_id, opt.val)}
                                    className={`w-10 h-10 rounded-md text-xs font-bold transition flex items-center justify-center ${student.status === opt.val
                                            ? opt.color + ' shadow-md scale-105'
                                            : 'text-zinc-400 hover:bg-white hover:text-zinc-600'
                                        }`}
                                    title={opt.label}
                                >
                                    {opt.val}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
