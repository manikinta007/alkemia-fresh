import React, { useState, useEffect, useRef } from 'react';
import {
    Upload,
    Image as ImageIcon,
    X,
    Loader2,
    Check,
    Search,
    Folder
} from 'lucide-react';
import { fetchApi } from '../utils/api';
import { compressImage, formatFileSize } from '../utils/imageCompressor';

export default function ImagePickerModal({ isOpen, onClose, onSelect }) {
    if (!isOpen) return null;

    const [activeTab, setActiveTab] = useState('upload'); // upload | bank | link
    const [isLoading, setIsLoading] = useState(false);

    // --- UPLOAD TAB STATE ---
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    // --- BANK TAB STATE ---
    const [folders, setFolders] = useState([]);
    const [images, setImages] = useState([]);
    const [activeFolder, setActiveFolder] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);

    // --- EFFECTS ---

    useEffect(() => {
        if (isOpen && activeTab === 'bank') {
            loadFolders();
            loadImages();
        }
    }, [isOpen, activeTab]);

    useEffect(() => {
        if (isOpen && activeTab === 'bank') {
            loadImages(activeFolder?.id);
        }
    }, [activeFolder]);

    // --- FETCH DATA ---

    const loadFolders = async () => {
        try {
            const res = await fetchApi('/api/folders');
            const data = await res.json();
            setFolders(data.folders || []);
        } catch (error) {
            console.error('Failed to load folders:', error);
        }
    };

    const loadImages = async (folderId = null) => {
        setIsLoading(true);
        try {
            const params = folderId ? `?folder_id=${folderId}` : '?folder_id=all';
            const res = await fetchApi(`/api/images${params}`);
            const data = await res.json();
            setImages(data.images || []);
        } catch (error) {
            console.error('Failed to load images:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- HANDLERS ---

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const { blob } = await compressImage(file, {
                maxWidth: 1200,
                maxSizeKB: 500,
                quality: 0.8
            });

            const formData = new FormData();
            formData.append('file', blob, file.name);
            formData.append('folder_id', 1); // Upload to 'Umum' by default from here

            const res = await fetchApi('/api/images/upload', {
                method: 'POST',
                body: formData
            }, true);
            const result = await res.json();

            // Select immediately
            if (result.image?.url) {
                onSelect(result.image.url);
                onClose();
            }
        } catch (error) {
            alert('Gagal upload gambar: ' + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleConfirmSelection = () => {
        if (activeTab === 'bank' && selectedImage) {
            onSelect(selectedImage.url);
            onClose();
        }
    };

    // --- RENDER ---

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

                {/* HEADER */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-200">
                    <h2 className="text-lg font-bold text-zinc-800">Sisipkan Gambar</h2>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                        <X size={20} className="text-zinc-500" />
                    </button>
                </div>

                {/* TABS */}
                <div className="flex border-b border-zinc-200 bg-zinc-50">
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors border-b-2 ${activeTab === 'upload'
                            ? 'border-orange-500 text-orange-600 bg-white'
                            : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
                            }`}
                    >
                        <Upload size={18} />
                        Upload Baru
                    </button>
                    <button
                        onClick={() => setActiveTab('bank')}
                        className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors border-b-2 ${activeTab === 'bank'
                            ? 'border-orange-500 text-orange-600 bg-white'
                            : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
                            }`}
                    >
                        <ImageIcon size={18} />
                        Bank Gambar
                    </button>
                </div>

                {/* CONTENT AREA */}
                <div className="flex-1 overflow-hidden relative">

                    {/* 1. UPLOAD TAB */}
                    {activeTab === 'upload' && (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full max-w-md aspect-video border-2 border-dashed border-zinc-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-all group"
                            >
                                <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    {isUploading ? (
                                        <Loader2 size={32} className="text-orange-500 animate-spin" />
                                    ) : (
                                        <Upload size={32} className="text-zinc-400 group-hover:text-orange-500 transition-colors" />
                                    )}
                                </div>
                                <h3 className="text-xl font-bold text-zinc-800 mb-2">
                                    {isUploading ? 'Mengupload...' : 'Klik untuk Upload'}
                                </h3>
                                <p className="text-zinc-500 text-sm max-w-xs">
                                    JPG, PNG max 10MB. Gambar akan otomatis dikompres ke max 500KB.
                                </p>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleUpload}
                                    accept="image/*"
                                    className="hidden"
                                    disabled={isUploading}
                                />
                            </div>
                        </div>
                    )}

                    {/* 2. BANK GAMBAR TAB */}
                    {activeTab === 'bank' && (
                        <div className="h-full flex animate-in fade-in slide-in-from-bottom-4 duration-300">
                            {/* Left Sidebar: Folders */}
                            <div className="w-56 border-r border-zinc-200 bg-zinc-50 overflow-y-auto p-2">
                                <div
                                    onClick={() => setActiveFolder(null)}
                                    className={`flex items-center gap-2 p-2 rounded cursor-pointer ${activeFolder === null ? 'bg-orange-100 text-orange-700 font-bold' : 'hover:bg-zinc-200 text-zinc-600'}`}
                                >
                                    <Folder size={16} />
                                    <span className="text-sm">Semua Gambar</span>
                                </div>
                                {folders.map(folder => (
                                    <div
                                        key={folder.id}
                                        onClick={() => setActiveFolder(folder)}
                                        className={`flex items-center gap-2 p-2 rounded cursor-pointer ${activeFolder?.id === folder.id ? 'bg-orange-100 text-orange-700 font-bold' : 'hover:bg-zinc-200 text-zinc-600'}`}
                                    >
                                        <Folder size={16} />
                                        <span className="text-sm truncate">{folder.name}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Right Content: Images */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {isLoading ? (
                                    <div className="flex justify-center items-center h-full text-zinc-400">
                                        <Loader2 className="animate-spin mr-2" />
                                        Memuat gambar...
                                    </div>
                                ) : images.length === 0 ? (
                                    <div className="flex flex-col justify-center items-center h-full text-zinc-400">
                                        <ImageIcon size={48} className="mb-2 opacity-50" />
                                        <p>Tidak ada gambar</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                                        {images.map(img => (
                                            <div
                                                key={img.id}
                                                onClick={() => setSelectedImage(img)}
                                                className={`relative aspect-square rounded-lg border-2 overflow-hidden cursor-pointer group transition-all ${selectedImage?.id === img.id
                                                    ? 'border-orange-500 ring-2 ring-orange-500/30'
                                                    : 'border-zinc-200 hover:border-zinc-400'
                                                    }`}
                                            >
                                                <img
                                                    src={img.url}
                                                    alt={img.filename}
                                                    className="w-full h-full object-cover"
                                                />
                                                {selectedImage?.id === img.id && (
                                                    <div className="absolute inset-0 bg-orange-500/20 z-10 flex items-center justify-center">
                                                        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-lg">
                                                            <Check size={16} strokeWidth={3} />
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 truncate text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {img.filename}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}


                </div>

                {/* FOOTER (Only for Bank tab) */}
                {activeTab === 'bank' && (
                    <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 rounded-lg font-bold text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleConfirmSelection}
                            disabled={!selectedImage}
                            className="px-6 py-2 rounded-lg font-bold bg-orange-600 text-white shadow-lg shadow-orange-600/20 hover:bg-orange-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            PILIH GAMBAR
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
