import React from 'react';
import { Unlock, Edit2, Trash2 } from 'lucide-react';

export const StudentTable = ({
    students,
    selectedStudentIds,
    toggleSelectAll,
    toggleSelectStudent,
    editingId,
    editName,
    setEditName,
    startEditing,
    cancelEditing,
    saveEdit,
    handleDeleteStudent,
    handleUnlockStudent
}) => {
    if (students.length === 0) {
        return (
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-zinc-50 border-b border-zinc-200">
                        <tr>
                            <th className="p-4 text-left w-10">
                                <input type="checkbox" className="rounded text-black focus:ring-black cursor-pointer" checked={false} onChange={toggleSelectAll} />
                            </th>
                            <th className="p-4 text-left text-xs text-zinc-500 uppercase font-bold w-16">No</th>
                            <th className="p-4 text-left text-xs text-zinc-500 uppercase font-bold">Nama Siswa</th>
                            <th className="p-4 text-right text-xs text-zinc-500 uppercase font-bold w-32">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        <tr><td colSpan="4" className="p-12 text-center text-zinc-400">Belum ada siswa</td></tr>
                    </tbody>
                </table>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                    <tr>
                        <th className="p-4 text-left w-10">
                            <input
                                type="checkbox"
                                className="rounded text-black focus:ring-black cursor-pointer"
                                checked={students.length > 0 && selectedStudentIds.size === students.length}
                                onChange={toggleSelectAll}
                            />
                        </th>
                        <th className="p-4 text-left text-xs text-zinc-500 uppercase font-bold w-16">No</th>
                        <th className="p-4 text-left text-xs text-zinc-500 uppercase font-bold">Nama Siswa</th>
                        <th className="p-4 text-right text-xs text-zinc-500 uppercase font-bold w-32">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                    {students.map((s, idx) => {
                        const isEditing = editingId === s.id;
                        const isSelected = selectedStudentIds.has(s.id);
                        return (
                            <tr key={s.id} className={'hover:bg-zinc-50 group ' + (isSelected ? 'bg-zinc-50' : '')}>
                                <td className="p-4">
                                    <input type="checkbox" className="rounded text-black focus:ring-black cursor-pointer" checked={isSelected} onChange={() => toggleSelectStudent(s.id)} />
                                </td>
                                <td className="p-4 text-zinc-500">{idx + 1}</td>
                                <td className="p-4 font-bold text-zinc-900">
                                    {isEditing ? (
                                        <input type="text" className="w-full px-2 py-1 border rounded" value={editName} autoFocus onChange={e => setEditName(e.target.value)} />
                                    ) : (s.name)}
                                </td>
                                <td className="p-4 text-right">
                                    {isEditing ? (
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => saveEdit(s.id)} className="text-green-600 font-bold text-xs hover:underline">SAVE</button>
                                            <button onClick={cancelEditing} className="text-zinc-400 font-bold text-xs hover:underline">BATAL</button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleUnlockStudent(s.id, s.name)} className="text-orange-500 hover:text-orange-700" title="Reset / Unlock Device Siswa"><Unlock size={16} /></button>
                                            <button onClick={() => startEditing(s)} className="text-blue-600 hover:text-blue-800" title="Edit"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDeleteStudent(s.id)} className="text-red-600 hover:text-red-800" title="Hapus"><Trash2 size={16} /></button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
