import React from 'react';
import { Link } from 'react-router-dom';

export const ScheduleItem = ({ schedule, active }) => {
    return (
        <div className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${active
            ? 'bg-teal-50/40 border-teal-500 shadow-lg shadow-teal-100/50'
            : 'bg-white border-zinc-200 hover:border-zinc-300 hover:shadow-md'
            }`}>
            {active && (
                <div className="absolute top-0 right-0">
                    <div className="bg-teal-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-bl-xl shadow-sm tracking-wide flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                        BERLANGSUNG
                    </div>
                </div>
            )}

            <div className="p-6">
                <div className="mb-6">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold mb-2 ${active ? 'bg-teal-100 text-teal-800' : 'bg-zinc-100 text-zinc-500'
                        }`}>
                        {schedule.start_time} - {schedule.end_time} WIB
                    </span>
                    <h4 className="text-3xl font-bold text-zinc-900 tracking-tight">{schedule.class_name}</h4>
                    <p className="text-xs font-bold uppercase tracking-wider mt-1 text-zinc-400">
                        {schedule.subject || 'Mapel Umum'}
                    </p>
                </div>

                {/* Action Buttons: ORANGE PRESENSI */}
                <div className="flex gap-3 pt-4 border-t border-zinc-100/50">
                    <Link to={`/attendance?class_id=${schedule.class_id}`} className="flex-1 py-3 text-center text-xs font-bold rounded-xl bg-orange-600 text-white hover:bg-orange-700 shadow-sm shadow-orange-200 transition flex items-center justify-center gap-2">
                        PRESENSI
                    </Link>
                    <Link to={`/materials?class_id=${schedule.class_id}`} className="flex-1 py-3 text-center text-xs font-bold rounded-xl border border-teal-100 text-teal-700 bg-white hover:bg-teal-50 transition flex items-center justify-center gap-2">
                        BAHAN AJAR
                    </Link>
                </div>
            </div>
        </div>
    );
};
