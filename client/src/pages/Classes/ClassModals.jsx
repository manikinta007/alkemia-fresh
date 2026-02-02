import React, { useState, useEffect } from 'react';

export const EditClassModal = ({ isOpen, cls, onClose, onSave }) => {
    if (!isOpen || !cls) return null;
    const [name, setName] = useState(cls.name);

    useEffect(() => {
        if (cls) setName(cls.name);
    }, [cls]);

    const handleSubmit = () => onSave(cls.id, name);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 transform transition-all scale-100 animate-in zoom-in-95 duration-200">
                <h3 className="text-lg font-bold text-zinc-900 mb-4">Edit Nama Kelas</h3>
                <input type="text" className="w-full px-4 py-3 rounded-lg border border-zinc-300 mb-6 text-sm focus:border-black focus:outline-none" value={name} onChange={e => setName(e.target.value)} />
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 border border-zinc-200 text-zinc-600 rounded-xl font-bold hover:bg-zinc-50 transition">BATAL</button>
                    <button onClick={handleSubmit} className="flex-1 py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition">SIMPAN</button>
                </div>
            </div>
        </div>
    );
};
