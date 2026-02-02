import React, { useRef } from 'react';
import { Upload } from 'lucide-react';

export const StudentImport = ({ uploading, onUpload, onDownloadTemplate }) => {
    const fileInputRef = useRef(null);

    const handleUpload = (e) => {
        onUpload(e);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-bold text-zinc-500 uppercase">Import CSV</p>
                <button onClick={onDownloadTemplate} className="text-[10px] text-blue-600 font-bold hover:underline">⬇ Template</button>
            </div>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <input type="file" ref={fileInputRef} accept=".csv" onChange={handleUpload} disabled={uploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <div className="w-full px-4 py-2 rounded-md border border-zinc-300 bg-white text-sm text-zinc-500 flex items-center justify-between">
                        <span>Import data siswa...</span>
                        <Upload size={14} />
                    </div>
                </div>
                {uploading && <span className="text-xs self-center">Loading...</span>}
            </div>
        </div>
    );
};
