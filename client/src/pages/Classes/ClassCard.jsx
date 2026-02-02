import React from 'react';
import { Edit2, Trash2, ArrowLeft } from 'lucide-react';

export const ClassCard = ({ cls, activePeriod, onSelect, onEdit, onDelete }) => {
    return (
        <div onClick={() => onSelect(cls)} className="bg-white border border-zinc-200 rounded-xl p-6 cursor-pointer hover:border-orange-500 transition-all relative group shadow-sm hover:shadow-md">
            <div className="flex justify-between items-start">
                <h4 className="text-xl font-bold text-zinc-900 mb-2">{cls.name}</h4>
                <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); onEdit(cls); }} className="text-zinc-400 hover:text-blue-600 p-1" title="Edit Nama Kelas"><Edit2 size={16} /></button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(cls.id); }} className="text-zinc-400 hover:text-red-600 p-1" title="Hapus Kelas"><Trash2 size={16} /></button>
                </div>
            </div>
            <div className="flex justify-between items-center mt-4">
                <p className="text-xs text-zinc-500 flex items-center gap-1 group-hover:text-black transition-colors">Kelola Siswa <ArrowLeft size={12} className="rotate-180" /></p>
                {cls.show_grades === 1 && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded border border-green-200">Nilai Tampil</span>}
            </div>
        </div>
    );
};
