import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, GraduationCap, BookOpen, FlaskConical } from 'lucide-react';

export const QuickAction = () => {
    return (
        <div className="md:col-span-2 bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-900 mb-5">Aksi Cepat</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link to="/schedule" className="group flex flex-col items-center justify-center p-4 rounded-xl border border-zinc-100 bg-zinc-50 hover:bg-teal-50 hover:border-teal-100 transition duration-200">
                    <span className="text-zinc-400 group-hover:text-teal-600 mb-2 transition"><Calendar size={20} /></span>
                    <span className="text-xs font-bold text-zinc-600 group-hover:text-teal-700">Jadwal</span>
                </Link>
                <Link to="/grades" className="group flex flex-col items-center justify-center p-4 rounded-xl border border-zinc-100 bg-zinc-50 hover:bg-blue-50 hover:border-blue-100 transition duration-200">
                    <span className="text-zinc-400 group-hover:text-blue-600 mb-2 transition"><GraduationCap size={20} /></span>
                    <span className="text-xs font-bold text-zinc-600 group-hover:text-blue-700">Nilai</span>
                </Link>
                <Link to="/materials" className="group flex flex-col items-center justify-center p-4 rounded-xl border border-zinc-100 bg-zinc-50 hover:bg-purple-50 hover:border-purple-100 transition duration-200">
                    <span className="text-zinc-400 group-hover:text-purple-600 mb-2 transition"><BookOpen size={20} /></span>
                    <span className="text-xs font-bold text-zinc-600 group-hover:text-purple-700">Bahan</span>
                </Link>
                {/* Virtual Lab temporarily disabled or routed to materials until implemented */}
                <Link to="/materials" className="group flex flex-col items-center justify-center p-4 rounded-xl border border-zinc-100 bg-zinc-50 hover:bg-pink-50 hover:border-pink-100 transition duration-200 opacity-50 cursor-not-allowed" onClick={(e) => e.preventDefault()}>
                    <span className="text-zinc-400 group-hover:text-pink-600 mb-2 transition"><FlaskConical size={20} /></span>
                    <span className="text-xs font-bold text-zinc-600 group-hover:text-pink-700">Virtual Lab (Soon)</span>
                </Link>
            </div>
        </div>
    );
};
