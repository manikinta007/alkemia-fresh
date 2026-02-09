import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
    BookOpen,
    Plus,
    Search,
    FileText,
    Link as LinkIcon,
    Youtube,
    Trash2,
    Eye,
    EyeOff,
    MonitorPlay,
    Download,
    X,
    FolderOpen,
    Share2,
    Check,
    Upload,
    File,
    Folder,
    ChevronDown,
    Filter,
    MoreVertical,
    Edit,
    FolderPlus,
    Maximize2,
    Maximize,
    Minimize,
    ExternalLink,
    School,
    RefreshCw,
    Library,
    Send
} from 'lucide-react';
import { GridSkeleton } from '../components/Skeleton';
import { fetchApi } from '../utils/api';
import { useAlertContext } from '../components/Alert';
import { useSearchParams } from 'react-router-dom';

// =============================================================================
// TAB 1: BANK BAHAN AJAR (Master/Gudang)
// =============================================================================
const BankMaterialTab = ({
    periodId,
    materials,
    folders,
    loading,
    onRefresh,
    onDistribute,
    onPresent,
    classes
}) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [folderFilter, setFolderFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [folderModalOpen, setFolderModalOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const { showAlert, showConfirm } = useAlertContext();

    // Form State
    const [form, setForm] = useState({
        title: '',
        description: '',
        fileType: 'link',
        fileUrl: '',
        folderId: null
    });

    const resetForm = () => {
        setForm({ title: '', description: '', fileType: 'link', fileUrl: '', folderId: null });
        setEditingItem(null);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setForm({
            title: item.title,
            description: item.description || '',
            fileType: item.file_type || 'link',
            fileUrl: item.file_url || '',
            folderId: item.folder_id || null
        });
        setModalOpen(true);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/material-bank/upload', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            if (res.ok) {
                const data = await res.json();
                setForm(prev => ({
                    ...prev,
                    fileUrl: data.url,
                    fileType: file.type.includes('pdf') ? 'pdf' : 'file'
                }));
                showAlert('File berhasil diupload!', 'success');
            } else {
                const err = await res.json();
                showAlert(err.error || 'Gagal upload', 'error');
            }
        } catch (e) {
            showAlert('Error upload: ' + e.message, 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!form.title.trim()) return showAlert('Judul wajib diisi', 'error');

        setSaving(true);
        try {
            const payload = {
                periodId,
                folderId: form.folderId,
                title: form.title,
                description: form.description,
                fileUrl: form.fileUrl,
                fileType: form.fileType
            };

            const method = editingItem ? 'PUT' : 'POST';
            if (editingItem) payload.id = editingItem.id;

            const res = await fetchApi('/api/material-bank', {
                method,
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showAlert(editingItem ? 'Materi diperbarui!' : 'Materi ditambahkan ke Bank!', 'success');
                setModalOpen(false);
                resetForm();
                onRefresh();
            } else {
                const err = await res.json();
                showAlert(err.error || 'Gagal menyimpan', 'error');
            }
        } catch (e) {
            showAlert('Error: ' + e.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (item) => {
        const confirmed = await showConfirm(`Hapus "${item.title}" dari Bank?\n\nSemua distribusi ke kelas juga akan dihapus.`);
        if (!confirmed) return;

        try {
            const res = await fetchApi(`/api/material-bank?id=${item.id}`, { method: 'DELETE' });
            if (res.ok) {
                showAlert('Materi dihapus', 'success');
                onRefresh();
            }
        } catch (e) {
            showAlert('Error: ' + e.message, 'error');
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        try {
            const res = await fetchApi('/api/material-bank/folders', {
                method: 'POST',
                body: JSON.stringify({ periodId, name: newFolderName })
            });
            if (res.ok) {
                showAlert('Folder dibuat!', 'success');
                setFolderModalOpen(false);
                setNewFolderName('');
                onRefresh();
            }
        } catch (e) {
            showAlert('Error: ' + e.message, 'error');
        }
    };

    const handleDeleteFolder = async (folder) => {
        const confirmed = await showConfirm(`Hapus folder "${folder.name}"?\n\nMateri di dalamnya tidak akan dihapus, hanya dipindah ke "Tanpa Folder".`);
        if (!confirmed) return;

        try {
            const res = await fetchApi(`/api/material-bank/folders?id=${folder.id}`, { method: 'DELETE' });
            if (res.ok) {
                showAlert('Folder dihapus', 'success');
                if (folderFilter === String(folder.id)) setFolderFilter('all');
                onRefresh();
            }
        } catch (e) {
            showAlert('Error: ' + e.message, 'error');
        }
    };

    // Filter materials
    const filteredMaterials = materials.filter(m => {
        const matchFolder = folderFilter === 'all'
            ? true
            : (folderFilter === 'none' ? !m.folder_id : String(m.folder_id) === folderFilter);
        const matchSearch = searchQuery
            ? m.title.toLowerCase().includes(searchQuery.toLowerCase())
            : true;
        return matchFolder && matchSearch;
    });

    const getIcon = (type) => {
        switch (type) {
            case 'youtube': return <Youtube size={18} className="text-red-500" />;
            case 'pdf': return <FileText size={18} className="text-blue-500" />;
            case 'file': return <File size={18} className="text-purple-500" />;
            default: return <LinkIcon size={18} className="text-emerald-500" />;
        }
    };

    return (
        <div className="space-y-6">
            {/* TOOLBAR */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex gap-2 flex-wrap">
                    {/* Folder Filter */}
                    <select
                        value={folderFilter}
                        onChange={e => setFolderFilter(e.target.value)}
                        className="bg-white border border-zinc-200 text-zinc-700 text-sm font-bold px-4 py-2.5 rounded-xl focus:border-black outline-none cursor-pointer"
                    >
                        <option value="all">📁 Semua Folder</option>
                        <option value="none">📄 Tanpa Folder</option>
                        {folders.map(f => (
                            <option key={f.id} value={f.id}>📂 {f.name} ({f.material_count})</option>
                        ))}
                    </select>
                    {/* Create Folder Button */}
                    <button
                        onClick={() => setFolderModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-sm font-bold transition"
                    >
                        <FolderPlus size={16} />
                        <span className="hidden md:inline">Folder Baru</span>
                    </button>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 md:w-64">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Cari materi..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:border-black outline-none"
                        />
                    </div>
                    {/* Add Button */}
                    <button
                        onClick={() => { resetForm(); setModalOpen(true); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition shadow-lg"
                    >
                        <Plus size={18} />
                        <span className="hidden md:inline">TAMBAH MATERI</span>
                    </button>
                </div>
            </div>

            {/* FOLDER CHIPS (Quick delete) */}
            {folders.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                    {folders.map(f => (
                        <div key={f.id} className="group flex items-center gap-2 px-3 py-1.5 bg-zinc-100 rounded-full text-xs font-bold text-zinc-600">
                            <Folder size={12} />
                            <span>{f.name}</span>
                            <button
                                onClick={() => handleDeleteFolder(f)}
                                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* MATERIALS GRID */}
            {loading ? (
                <GridSkeleton count={6} />
            ) : filteredMaterials.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-zinc-200 border-dashed">
                    <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BookOpen size={32} className="text-purple-300" />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900">Belum ada materi di Bank</h3>
                    <p className="text-zinc-500 text-sm">Klik tombol "Tambah Materi" untuk mulai.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredMaterials.map(item => (
                        <div key={item.id} className="bg-white rounded-2xl p-5 border border-zinc-200 hover:border-purple-300 hover:shadow-lg transition-all group">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                                        {getIcon(item.file_type)}
                                    </div>
                                    <div>
                                        {item.folder_name && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-600">
                                                {item.folder_name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => openEditModal(item)} className="p-2 text-zinc-300 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition" title="Edit">
                                        <Edit size={14} />
                                    </button>
                                    <button onClick={() => handleDelete(item)} className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Hapus">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <h4 className="font-bold text-black leading-tight mb-2 line-clamp-2">
                                {item.title}
                            </h4>
                            <p className="text-xs text-zinc-700 line-clamp-2 mb-4">{item.description || 'Tidak ada deskripsi.'}</p>

                            {/* Footer */}
                            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 gap-2">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase">
                                    {item.distribution_count > 0 ? `📤 ${item.distribution_count} kelas` : '📦 Belum dibagikan'}
                                </span>
                                <div className="flex gap-1.5">
                                    <button
                                        onClick={() => onPresent(item)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-black hover:bg-zinc-800 text-white rounded-lg text-xs font-bold transition shadow-sm"
                                        title="Mode Presentasi"
                                    >
                                        <Maximize2 size={12} />
                                        <span className="hidden lg:inline">PRESENTASI</span>
                                    </button>
                                    <a
                                        href={item.file_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-lg text-xs font-bold transition border border-zinc-200"
                                        title="Download"
                                    >
                                        <Download size={12} />
                                    </a>
                                    <button
                                        onClick={() => onDistribute(item)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-lg text-xs font-bold transition border border-zinc-200"
                                    >
                                        <Share2 size={12} />
                                        <span className="hidden lg:inline">BAGIKAN</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL: CREATE/EDIT MATERIAL */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                            <h3 className="text-lg font-bold text-zinc-900">{editingItem ? 'Edit Materi' : 'Tambah Materi ke Bank'}</h3>
                            <button onClick={() => { setModalOpen(false); resetForm(); }} className="p-2 hover:bg-zinc-200 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            {/* Title */}
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">JUDUL MATERI</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none font-medium"
                                    placeholder="Contoh: Modul Kimia Bab 1"
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                />
                            </div>
                            {/* Description */}
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">DESKRIPSI (OPSIONAL)</label>
                                <textarea
                                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-black outline-none font-medium min-h-[80px]"
                                    placeholder="Instruksi atau rangkuman singkat..."
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                />
                            </div>
                            {/* Folder */}
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">FOLDER</label>
                                <select
                                    value={form.folderId || ''}
                                    onChange={e => setForm({ ...form, folderId: e.target.value || null })}
                                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-black outline-none font-medium"
                                >
                                    <option value="">Tanpa Folder</option>
                                    {folders.map(f => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                </select>
                            </div>
                            {/* File Type */}
                            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-4">
                                <label className="block text-xs font-bold text-zinc-500 uppercase">TIPE & SUMBER</label>
                                <div className="flex gap-2">
                                    {['link', 'youtube', 'pdf', 'file'].map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setForm({ ...form, fileType: type })}
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition flex items-center justify-center gap-1.5 border ${form.fileType === type
                                                ? 'bg-black text-white border-black'
                                                : 'bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-100'
                                                }`}
                                        >
                                            {type === 'link' && <LinkIcon size={12} />}
                                            {type === 'youtube' && <Youtube size={12} />}
                                            {type === 'pdf' && <FileText size={12} />}
                                            {type === 'file' && <Upload size={12} />}
                                            {type}
                                        </button>
                                    ))}
                                </div>
                                {form.fileType === 'file' ? (
                                    <div>
                                        <input
                                            type="file"
                                            id="file-upload"
                                            className="hidden"
                                            onChange={handleFileUpload}
                                            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.jpg,.jpeg,.png,.gif,.mp4,.mp3"
                                        />
                                        <label
                                            htmlFor="file-upload"
                                            className={`flex items-center justify-center gap-2 w-full py-4 border-2 border-dashed rounded-xl cursor-pointer transition ${uploading ? 'bg-zinc-100 border-zinc-300' : 'border-zinc-300 hover:border-purple-400 hover:bg-purple-50'}`}
                                        >
                                            {uploading ? (
                                                <span className="text-sm text-zinc-500">Mengupload...</span>
                                            ) : form.fileUrl ? (
                                                <span className="text-sm text-green-600 font-bold">✓ File terupload</span>
                                            ) : (
                                                <>
                                                    <Upload size={18} className="text-zinc-400" />
                                                    <span className="text-sm text-zinc-500">Klik untuk upload file</span>
                                                </>
                                            )}
                                        </label>
                                        {form.fileUrl && <p className="text-[10px] text-zinc-400 mt-1 truncate">{form.fileUrl}</p>}
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-blue-500 outline-none font-mono text-sm"
                                        placeholder={form.fileType === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://...'}
                                        value={form.fileUrl}
                                        onChange={e => setForm({ ...form, fileUrl: e.target.value })}
                                    />
                                )}
                            </div>
                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t border-zinc-100">
                                <button onClick={() => { setModalOpen(false); resetForm(); }} className="flex-1 py-3 border border-zinc-200 text-zinc-600 rounded-xl font-bold hover:bg-zinc-50 transition">BATAL</button>
                                <button onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition disabled:opacity-50">
                                    {saving ? 'MENYIMPAN...' : (editingItem ? 'SIMPAN PERUBAHAN' : 'SIMPAN KE BANK')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: CREATE FOLDER */}
            {folderModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-bold text-zinc-900 mb-4">Buat Folder Baru</h3>
                        <input
                            type="text"
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-black outline-none font-medium mb-4"
                            placeholder="Nama folder (misal: Bab 1)"
                            value={newFolderName}
                            onChange={e => setNewFolderName(e.target.value)}
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button onClick={() => setFolderModalOpen(false)} className="flex-1 py-3 border border-zinc-200 text-zinc-600 rounded-xl font-bold hover:bg-zinc-50 transition">BATAL</button>
                            <button onClick={handleCreateFolder} className="flex-1 py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition">BUAT</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// =============================================================================
// TAB 2: DISTRIBUSI BAHAN AJAR
// =============================================================================
const DistributionTab = ({ periodId, classes, loading, onRefresh, onPresent }) => {
    const [distributions, setDistributions] = useState([]);
    const [loadingDist, setLoadingDist] = useState(true);
    const [filterClass, setFilterClass] = useState('all');
    const { showAlert, showConfirm } = useAlertContext();

    useEffect(() => {
        if (periodId) fetchDistributions();
    }, [periodId]);

    const fetchDistributions = async () => {
        setLoadingDist(true);
        try {
            const res = await fetchApi(`/api/material-bank/distributions?period_id=${periodId}`);
            if (res.ok) {
                setDistributions(await res.json());
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingDist(false);
        }
    };

    const handleToggleVisibility = async (dist) => {
        try {
            await fetchApi('/api/material-bank/distribute', {
                method: 'PUT',
                body: JSON.stringify({ id: dist.id, isVisible: !dist.is_visible })
            });
            setDistributions(prev => prev.map(d =>
                d.id === dist.id ? { ...d, is_visible: !d.is_visible } : d
            ));
        } catch (e) {
            showAlert('Error: ' + e.message, 'error');
        }
    };

    const handleRemove = async (dist) => {
        const confirmed = await showConfirm(`Tarik materi "${dist.title}" dari kelas ${dist.class_name}?`);
        if (!confirmed) return;

        try {
            const res = await fetchApi(`/api/material-bank/distribute?id=${dist.id}`, { method: 'DELETE' });
            if (res.ok) {
                showAlert('Materi ditarik dari kelas', 'success');
                setDistributions(prev => prev.filter(d => d.id !== dist.id));
                onRefresh();
            }
        } catch (e) {
            showAlert('Error: ' + e.message, 'error');
        }
    };

    const filteredDist = filterClass === 'all'
        ? distributions
        : distributions.filter(d => String(d.class_id) === filterClass);

    const getIcon = (type) => {
        switch (type) {
            case 'youtube': return <Youtube size={16} className="text-red-500" />;
            case 'pdf': return <FileText size={16} className="text-blue-500" />;
            default: return <LinkIcon size={16} className="text-emerald-500" />;
        }
    };

    return (
        <div className="space-y-6">
            {/* TOOLBAR */}
            <div className="flex gap-4 items-center justify-between">
                <div className="relative">
                    <School className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                    <select
                        value={filterClass}
                        onChange={e => setFilterClass(e.target.value)}
                        className="bg-white border border-zinc-200 text-zinc-700 text-sm font-bold pl-10 pr-4 py-2.5 rounded-xl focus:border-black outline-none cursor-pointer appearance-none"
                    >
                        <option value="all">Semua Kelas</option>
                        {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
                <button onClick={fetchDistributions} className="flex items-center gap-2 px-4 py-2.5 border border-zinc-200 rounded-xl text-sm font-bold hover:bg-zinc-50 transition">
                    <RefreshCw size={16} />
                    <span>Refresh</span>
                </button>
            </div>

            {/* DISTRIBUTION LIST */}
            {loadingDist ? (
                <GridSkeleton count={4} />
            ) : filteredDist.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-zinc-200 border-dashed">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Share2 size={32} className="text-blue-300" />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900">Belum ada materi yang dibagikan</h3>
                    <p className="text-zinc-500 text-sm">Klik "Bagikan" di tab Bahan Ajar untuk mendistribusikan materi.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-zinc-50 border-b border-zinc-200">
                            <tr>
                                <th className="px-5 py-4 text-left text-xs font-bold text-zinc-500 uppercase">Materi</th>
                                <th className="px-5 py-4 text-left text-xs font-bold text-zinc-500 uppercase">Kelas</th>
                                <th className="px-5 py-4 text-center text-xs font-bold text-zinc-500 uppercase">Status</th>
                                <th className="px-5 py-4 text-center text-xs font-bold text-zinc-500 uppercase">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {filteredDist.map(d => (
                                <tr key={d.id} className="hover:bg-zinc-50 transition">
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                                                {getIcon(d.file_type)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-zinc-800 text-sm">{d.title}</p>
                                                <p className="text-xs text-zinc-400 truncate max-w-[200px]">{d.file_url}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="px-3 py-1 bg-zinc-100 rounded-full text-xs font-bold text-zinc-600">{d.class_name}</span>
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <button
                                            onClick={() => handleToggleVisibility(d)}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${d.is_visible
                                                ? 'bg-green-50 text-green-600 hover:bg-green-100'
                                                : 'bg-red-50 text-red-600 hover:bg-red-100'
                                                }`}
                                        >
                                            {d.is_visible ? <Eye size={12} /> : <EyeOff size={12} />}
                                            {d.is_visible ? 'Tampil' : 'Sembunyi'}
                                        </button>
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => onPresent(d)}
                                                className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg transition"
                                                title="Presentasi"
                                            >
                                                <Maximize2 size={16} />
                                            </button>
                                            <a
                                                href={d.file_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                title="Download"
                                            >
                                                <Download size={16} />
                                            </a>
                                            <button
                                                onClick={() => handleRemove(d)}
                                                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                                title="Tarik dari kelas"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// =============================================================================
// MODAL: DISTRIBUTE TO CLASSES
// =============================================================================
const DistributeModal = ({ isOpen, onClose, material, classes, onSuccess }) => {
    const [selectedClasses, setSelectedClasses] = useState([]);
    const [saving, setSaving] = useState(false);
    const { showAlert } = useAlertContext();

    if (!isOpen || !material) return null;

    const toggleClass = (id) => {
        setSelectedClasses(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        setSelectedClasses(prev =>
            prev.length === classes.length ? [] : classes.map(c => c.id)
        );
    };

    const handleDistribute = async () => {
        if (selectedClasses.length === 0) return showAlert('Pilih minimal 1 kelas', 'error');

        setSaving(true);
        try {
            const res = await fetchApi('/api/material-bank/distribute', {
                method: 'POST',
                body: JSON.stringify({ materialId: material.id, classIds: selectedClasses })
            });

            if (res.ok) {
                const data = await res.json();
                showAlert(data.message, 'success');
                onClose();
                setSelectedClasses([]);
                onSuccess();
            } else {
                const err = await res.json();
                showAlert(err.error || 'Gagal membagikan', 'error');
            }
        } catch (e) {
            showAlert('Error: ' + e.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
                    <h3 className="text-lg font-bold text-zinc-900">Bagikan Materi</h3>
                    <p className="text-sm text-zinc-500 mt-1 truncate">"{material.title}"</p>
                </div>
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <label className="text-xs font-bold text-zinc-500 uppercase">PILIH KELAS TUJUAN</label>
                        <button onClick={toggleAll} className="text-[10px] font-bold text-blue-600 hover:text-blue-800">
                            {selectedClasses.length === classes.length ? 'BATALKAN SEMUA' : 'PILIH SEMUA'}
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1">
                        {classes.map(c => (
                            <div
                                key={c.id}
                                onClick={() => toggleClass(c.id)}
                                className={`cursor-pointer px-4 py-3 rounded-xl border text-sm font-bold transition flex items-center justify-between ${selectedClasses.includes(c.id)
                                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                                    : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'
                                    }`}
                            >
                                <span>{c.name}</span>
                                {selectedClasses.includes(c.id) && <Check size={16} />}
                            </div>
                        ))}
                    </div>
                    {selectedClasses.length === 0 && <p className="text-xs text-red-500 mt-3">* Pilih minimal satu kelas.</p>}
                </div>
                <div className="flex gap-3 p-6 border-t border-zinc-100">
                    <button onClick={onClose} className="flex-1 py-3 border border-zinc-200 text-zinc-600 rounded-xl font-bold hover:bg-zinc-50 transition">BATAL</button>
                    <button
                        onClick={handleDistribute}
                        disabled={saving || selectedClasses.length === 0}
                        className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        {saving ? 'MEMBAGIKAN...' : `BAGIKAN KE ${selectedClasses.length} KELAS`}
                    </button>
                </div>
            </div>
        </div>
    );
};

// =============================================================================
// PRESENTATION VIEW (Fullscreen Mode untuk Guru) - Seperti LiveLeaderboard
// =============================================================================
const PresentationView = ({ material, onClose }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef(null);

    if (!material) return null;

    const toggleFullscreen = async () => {
        try {
            if (!document.fullscreenElement) {
                await containerRef.current?.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (err) {
            console.error('Fullscreen error:', err);
        }
    };

    // Listen for fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        // ESC key to close
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && !document.fullscreenElement) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    const getEmbedUrl = (url, type) => {
        if (!url) return '';

        // 1. Handle YouTube
        if (type === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
            try {
                const urlObj = new URL(url);
                const videoId = urlObj.searchParams.get("v");
                if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
                if (url.includes('youtu.be')) return `https://www.youtube.com/embed/${url.split('/').pop()}?autoplay=1`;
            } catch (e) { return url; }
        }

        // 2. Handle Google Drive / Slides / Docs
        if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
            // Case A: Google Presentation/Slides -> Embed Mode
            if (url.includes('/presentation/d/')) {
                return url.replace(/\/edit.*|\/view.*/, '/embed?start=false&loop=false&delayms=3000');
            }
            // Case B: General File (PDF, Video, etc) -> Preview Mode
            const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (match && match[1]) {
                return `https://drive.google.com/file/d/${match[1]}/preview`;
            }
        }

        return url;
    };

    const embedUrl = getEmbedUrl(material.file_url, material.file_type);
    const canEmbed = material.file_type === 'youtube' || material.file_type === 'link' || material.file_type === 'pdf' ||
        (material.file_url && (material.file_url.includes('drive.google.com') || material.file_url.includes('docs.google.com') || material.file_url.includes('youtube')));

    return ReactDOM.createPortal(
        <div ref={containerRef} className="fixed inset-0 z-[9999] bg-zinc-900 flex flex-col animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md z-50 shrink-0">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold text-white truncate max-w-[50vw]">{material.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleFullscreen}
                        className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full font-bold text-sm transition border border-zinc-700 text-white"
                        title={isFullscreen ? 'Keluar Fullscreen' : 'Fullscreen'}
                    >
                        {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                    </button>
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-full font-bold text-sm transition border border-zinc-700 text-white"
                    >
                        TUTUP
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 relative overflow-hidden bg-black">
                {canEmbed ? (
                    <iframe
                        src={embedUrl}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                        allowFullScreen
                        title="Presentation Content"
                    />
                ) : material.file_url ? (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400">
                        <div className="text-center">
                            <FileText size={64} className="mx-auto mb-4" />
                            <p className="mb-4">Preview tidak tersedia untuk tipe file ini.</p>
                            <a href={material.file_url} target="_blank" rel="noreferrer" className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl font-bold inline-flex items-center gap-2">
                                <ExternalLink size={16} /> Buka File
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500">
                        <div className="text-center">
                            <FileText size={64} className="mx-auto mb-4" />
                            <p>Tidak ada file untuk ditampilkan.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function Materials() {
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState('bank'); // 'bank' | 'distribution'
    const [materials, setMaterials] = useState([]);
    const [folders, setFolders] = useState([]);
    const [classes, setClasses] = useState([]);
    const [activePeriod, setActivePeriod] = useState(null);
    const [loading, setLoading] = useState(true);

    // Distribute Modal
    const [distributeModal, setDistributeModal] = useState({ open: false, material: null });

    // Presentation Mode
    const [presentMaterial, setPresentMaterial] = useState(null);

    const { showAlert } = useAlertContext();

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const periodRes = await fetchApi('/api/periods?active=true');
            if (!periodRes.ok) {
                setLoading(false);
                return;
            }

            const periods = await periodRes.json();
            const period = periods.find(p => p.is_active) || periods[0];

            if (!period) {
                setLoading(false);
                return;
            }

            setActivePeriod(period);

            // Fetch classes
            const resClasses = await fetchApi(`/api/classes?period_id=${period.id}`);
            if (resClasses.ok) {
                setClasses(await resClasses.json());
            }

            // Fetch materials & folders
            await fetchMaterialsAndFolders(period.id);

        } catch (e) {
            console.error("Init Error", e);
            showAlert("Gagal memuat data", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchMaterialsAndFolders = async (periodId) => {
        try {
            const [matRes, folderRes] = await Promise.all([
                fetchApi(`/api/material-bank?period_id=${periodId}`),
                fetchApi(`/api/material-bank/folders?period_id=${periodId}`)
            ]);

            if (matRes.ok) setMaterials(await matRes.json());
            if (folderRes.ok) setFolders(await folderRes.json());
        } catch (e) {
            console.error("Fetch Error", e);
        }
    };

    const handleRefresh = () => {
        if (activePeriod) fetchMaterialsAndFolders(activePeriod.id);
    };

    const openDistributeModal = (material) => {
        setDistributeModal({ open: true, material });
    };

    const openPresentModal = (material) => {
        setPresentMaterial(material);
    };

    if (loading) return (
        <div className="pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
                        <BookOpen className="text-purple-600" size={32} />
                        Bahan Ajar
                    </h2>
                    <p className="text-zinc-500 mt-1">Memuat...</p>
                </div>
            </div>
            <GridSkeleton count={6} />
        </div>
    );

    if (!activePeriod) return (
        <div className="p-10 text-center">
            <h2 className="text-xl font-bold text-zinc-400">Pilih Periode Aktif Dahulu</h2>
            <p className="text-zinc-500">Silakan atur periode di menu Akademik.</p>
        </div>
    );

    return (
        <div className="pb-20">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
                        <BookOpen className="text-purple-600" size={32} />
                        Bahan Ajar
                    </h2>
                    <p className="text-zinc-500 mt-1">Kelola bank materi dan bagikan ke kelas.</p>
                </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex gap-1 p-1 bg-zinc-100 rounded-2xl w-fit mb-8">
                <button
                    onClick={() => setActiveTab('bank')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'bank'
                        ? 'bg-white text-zinc-900 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700'
                        }`}
                >
                    <Library size={18} />
                    <span>Bahan Ajar</span>
                </button>
                <button
                    onClick={() => setActiveTab('distribution')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'distribution'
                        ? 'bg-white text-zinc-900 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700'
                        }`}
                >
                    <Send size={18} />
                    <span>Distribusi Bahan Ajar</span>
                </button>
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'bank' ? (
                <BankMaterialTab
                    periodId={activePeriod.id}
                    materials={materials}
                    folders={folders}
                    loading={loading}
                    onRefresh={handleRefresh}
                    onDistribute={openDistributeModal}
                    onPresent={openPresentModal}
                    classes={classes}
                />
            ) : (
                <DistributionTab
                    periodId={activePeriod.id}
                    classes={classes}
                    loading={loading}
                    onRefresh={handleRefresh}
                    onPresent={openPresentModal}
                />
            )}

            {/* DISTRIBUTE MODAL */}
            <DistributeModal
                isOpen={distributeModal.open}
                onClose={() => setDistributeModal({ open: false, material: null })}
                material={distributeModal.material}
                classes={classes}
                onSuccess={handleRefresh}
            />

            {/* PRESENTATION VIEW */}
            {presentMaterial && (
                <PresentationView
                    material={presentMaterial}
                    onClose={() => setPresentMaterial(null)}
                />
            )}
        </div>
    );
}
