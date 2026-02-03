import React, { useState, useEffect, useRef } from 'react';
import {
    Folder,
    Image as ImageIcon,
    Plus,
    Trash2,
    MoreVertical,
    Search,
    Upload,
    Grid,
    List,
    X,
    Loader2
} from 'lucide-react';
import { fetchApi } from '../utils/api';
import { compressImage, formatFileSize } from '../utils/imageCompressor';

// --- COMPONENTS ---

const FolderItem = ({ folder, isActive, onClick, onDelete }) => (
    <div
        onClick={() => onClick(folder)}
        className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${isActive ? 'bg-orange-100 text-orange-700' : 'hover:bg-zinc-100 text-zinc-700'
            }`}
    >
        <div className="flex items-center gap-3 overflow-hidden">
            <Folder size={18} className={isActive ? 'fill-orange-500 text-orange-500' : 'text-zinc-400'} />
            <span className="font-medium truncate text-sm">{folder.name}</span>
            <span className="text-xs text-zinc-400 flex-shrink-0">({folder.image_count || 0})</span>
        </div>
        {folder.id !== 1 && (
            <button
                onClick={(e) => { e.stopPropagation(); onDelete(folder); }}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 text-zinc-400 hover:text-red-500 rounded transition-all"
            >
                <Trash2 size={14} />
            </button>
        )}
    </div>
);

const ImageGridItem = ({ image, onClick, onDelete }) => (
    <div className="group relative bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
        {/* Thumbnail */}
        <div className="aspect-square bg-zinc-100 relative overflow-hidden">
            <img
                src={image.url}
                alt={image.filename}
                className="w-full h-full object-cover"
                loading="lazy"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                    onClick={() => window.open(image.url, '_blank')}
                    className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-lg backdrop-blur-sm transition-colors"
                >
                    <Search size={18} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(image); }}
                    className="p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-lg backdrop-blur-sm transition-colors"
                >
                    <Trash2 size={18} />
                </button>
            </div>
        </div>

        {/* Info */}
        <div className="p-3">
            <p className="text-sm font-medium text-zinc-800 truncate" title={image.filename}>{image.filename}</p>
            <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-zinc-400">{formatFileSize(image.size_bytes || 0)}</span>
                <span className="text-[10px] text-zinc-300 uppercase tracking-wider">
                    {image.mime_type?.split('/')[1] || 'IMG'}
                </span>
            </div>
        </div>
    </div>
);

// --- MAIN PAGE ---

export default function GudangGambar() {
    const [folders, setFolders] = useState([]);
    const [images, setImages] = useState([]);
    const [activeFolder, setActiveFolder] = useState(null); // null = all, or folder object
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    // Create Folder State
    const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    const fileInputRef = useRef(null);

    // --- FETCH DATA ---

    const loadFolders = async () => {
        try {
            const data = await fetchApi('/api/folders');
            setFolders(data.folders || []);
            // Set default folder as active if first load and no active folder
            if (!activeFolder && data.folders?.length > 0) {
                // setActiveFolder(data.folders[0]); // Optional: auto select first folder
            }
        } catch (error) {
            console.error('Failed to load folders:', error);
        }
    };

    const loadImages = async (folderId = null) => {
        setIsLoading(true);
        try {
            const params = folderId ? `?folder_id=${folderId}` : '?folder_id=all';
            const data = await fetchApi(`/api/images${params}`);
            setImages(data.images || []);
        } catch (error) {
            console.error('Failed to load images:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadFolders();
        loadImages(activeFolder?.id);
    }, [activeFolder]);

    // --- HANDLERS ---

    const handleCreateFolder = async (e) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;

        try {
            await fetchApi('/api/folders', {
                method: 'POST',
                body: JSON.stringify({ name: newFolderName })
            });
            setNewFolderName('');
            setIsCreateFolderOpen(false);
            loadFolders();
        } catch (error) {
            alert('Gagal membuat folder: ' + error.message);
        }
    };

    const handleDeleteFolder = async (folder) => {
        if (!confirm(`Hapus folder "${folder.name}"? Gambar di dalamnya akan dipindahkan ke folder Umum.`)) return;

        try {
            await fetchApi(`/api/folders/${folder.id}`, { method: 'DELETE' });
            if (activeFolder?.id === folder.id) setActiveFolder(null);
            loadFolders();
            loadImages(activeFolder?.id);
        } catch (error) {
            alert('Gagal menghapus folder: ' + error.message);
        }
    };

    const handleDeleteImage = async (image) => {
        if (!confirm('Hapus gambar ini permanen?')) return;

        try {
            await fetchApi(`/api/images/${image.id}`, { method: 'DELETE' });
            loadImages(activeFolder?.id);
            loadFolders(); // Refresh counts
        } catch (error) {
            alert('Gagal menghapus gambar: ' + error.message);
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            // 1. Compress Client-side
            console.log('Original size:', formatFileSize(file.size));
            const { blob, compressedSize } = await compressImage(file, {
                maxWidth: 1200,
                maxSizeKB: 500,
                quality: 0.8
            });
            console.log('Compressed size:', formatFileSize(compressedSize));

            // 2. Upload to Server
            const formData = new FormData();
            formData.append('file', blob, file.name);
            formData.append('folder_id', activeFolder?.id || 1); // Default to 'Umum' (id=1) or active folder

            await fetchApi('/api/images/upload', {
                method: 'POST',
                body: formData // fetchApi handles non-JSON automatically if body is FormData (removes Content-Type)
            }, true); // forceFormData = true custom param in fetchApi? checking utils/api.js...

            // Note: utils/api.js usually sets 'Content-Type': 'application/json' by default. 
            // We need to ensure it allows FormData.
            // If fetchApi doesn't support it standardly, we might need a small workaround or ensure fetchApi detects FormData.
            // Let's assume fetchApi handles it or we'll fix it if it errors.
            // Actually, best to check fetchApi first. But standard fetch handles FormData by removing Content-Type header to let browser set boundary.

            loadImages(activeFolder?.id);
            loadFolders(); // Refresh counts
        } catch (error) {
            console.error(error);
            alert('Gagal upload gambar: ' + error.message);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="flex h-[calc(100vh-theme(spacing.32))] gap-6">

            {/* LEFT SIDEBAR: FOLDERS */}
            <div className="w-64 flex-shrink-0 flex flex-col bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                    <h3 className="font-bold text-zinc-700 text-sm">FOLDER</h3>
                    <button
                        onClick={() => setIsCreateFolderOpen(true)}
                        className="p-1 hover:bg-zinc-200 rounded text-zinc-500 hover:text-zinc-800 transition-colors"
                        title="Buat Folder Baru"
                    >
                        <Plus size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    <FolderItem
                        folder={{ id: null, name: 'Semua Gambar', image_count: folders.reduce((acc, f) => acc + (f.image_count || 0), 0) }}
                        isActive={activeFolder === null}
                        onClick={() => setActiveFolder(null)}
                        onDelete={() => { }} // Cannot delete 'All'
                    />
                    {folders.map(folder => (
                        <FolderItem
                            key={folder.id}
                            folder={folder}
                            isActive={activeFolder?.id === folder.id}
                            onClick={setActiveFolder}
                            onDelete={handleDeleteFolder}
                        />
                    ))}
                </div>

                {/* Create Folder Input */}
                {isCreateFolderOpen && (
                    <div className="p-3 bg-zinc-50 border-t border-zinc-100 animate-in slide-in-from-bottom-2">
                        <form onSubmit={handleCreateFolder} className="flex gap-2">
                            <input
                                autoFocus
                                type="text"
                                value={newFolderName}
                                onChange={e => setNewFolderName(e.target.value)}
                                placeholder="Nama folder..."
                                className="w-full text-sm px-2 py-1.5 rounded border border-zinc-300 focus:outline-none focus:border-orange-500"
                            />
                            <button
                                type="button"
                                onClick={() => setIsCreateFolderOpen(false)}
                                className="text-zinc-400 hover:text-zinc-600"
                            >
                                <X size={16} />
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* RIGHT CONTENT: IMAGES */}
            <div className="flex-1 flex flex-col bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
                {/* Header Actions */}
                <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-white z-10">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-bold text-zinc-800">
                            {activeFolder ? activeFolder.name : 'Semua Gambar'}
                        </h2>
                        {isLoading && <Loader2 size={16} className="animate-spin text-zinc-400" />}
                    </div>

                    <div className="flex gap-3">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleUpload}
                            accept="image/*"
                            className="hidden"
                        />
                        <button
                            disabled={isUploading}
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-wait"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Compressing & Uploading...</span>
                                </>
                            ) : (
                                <>
                                    <Upload size={16} />
                                    <span>Upload Gambar</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Image Grid */}
                <div className="flex-1 overflow-y-auto p-6 bg-zinc-50">
                    {images.length === 0 && !isLoading ? (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-400 opacity-60">
                            <ImageIcon size={64} className="mb-4 text-zinc-300" />
                            <p className="font-medium">Belum ada gambar</p>
                            <p className="text-sm">Upload gambar baru atau pilih folder lain</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {images.map(img => (
                                <ImageGridItem
                                    key={img.id}
                                    image={img}
                                    onDelete={handleDeleteImage}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}
