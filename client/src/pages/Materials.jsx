import React, { useState, useEffect } from 'react';
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
    X
} from 'lucide-react';
import { GridSkeleton } from '../components/Skeleton';
import { fetchApi } from '../utils/api';
import { useAlertContext } from '../components/Alert';

const MaterialModal = ({ isOpen, onClose, onSave, classes, loading }) => {
    if (!isOpen) return null;

    const [form, setForm] = useState({
        title: '',
        description: '',
        fileType: 'link', // link, pdf, youtube
        fileUrl: '',
        classIds: [] // Multi-select
    });

    // Toggle class selection for bulk assign
    const toggleClass = (id) => {
        setForm(prev => {
            if (prev.classIds.includes(id)) {
                return { ...prev, classIds: prev.classIds.filter(c => c !== id) };
            } else {
                return { ...prev, classIds: [...prev.classIds, id] };
            }
        });
    };

    const toggleAllClasses = () => {
        if (form.classIds.length === classes.length) {
            setForm(prev => ({ ...prev, classIds: [] }));
        } else {
            setForm(prev => ({ ...prev, classIds: classes.map(c => c.id) }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        onSave(form);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all scale-100 animate-in zoom-in-95">
                <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                    <div>
                        <h3 className="text-lg font-bold text-zinc-900">Bagikan Materi Baru</h3>
                        <p className="text-xs text-zinc-500">Materi akan muncul di dashboard siswa.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* 1. INFORMASI DASAR */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">JUDUL MATERI</label>
                            <input
                                type="text"
                                required
                                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition font-medium"
                                placeholder="Contoh: Modul Kimia Organik Bab 1"
                                value={form.title}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">DESKRIPSI (OPSIONAL)</label>
                            <textarea
                                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition font-medium min-h-[80px]"
                                placeholder="Instruksi atau rangkuman singkat..."
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* 2. SUMBER MATERI */}
                    <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-4">
                        <label className="block text-xs font-bold text-zinc-500 uppercase">TIPE & TAUTAN</label>
                        <div className="flex gap-2">
                            {['link', 'youtube', 'pdf'].map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setForm({ ...form, fileType: type })}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition flex items-center justify-center gap-2 border ${form.fileType === type
                                        ? 'bg-black text-white border-black'
                                        : 'bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-100'
                                        }`}
                                >
                                    {type === 'link' && <LinkIcon size={14} />}
                                    {type === 'youtube' && <Youtube size={14} />}
                                    {type === 'pdf' && <FileText size={14} />}
                                    {type}
                                </button>
                            ))}
                        </div>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition font-mono text-sm"
                            placeholder={form.fileType === 'youtube' ? 'https://youtube.com/watch?v=...' : (form.fileType === 'pdf' ? 'Link Google Drive / PDF...' : 'https://...')}
                            value={form.fileUrl}
                            onChange={e => setForm({ ...form, fileUrl: e.target.value })}
                        />
                        {form.fileType === 'pdf' && <p className="text-[10px] text-zinc-500">Pastikan link Google Drive bersifat <b>Public (Anyone with the link)</b>.</p>}
                    </div>

                    {/* 3. TARGET KELAS */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-bold text-zinc-500 uppercase">BAGIKAN KE KELAS</label>
                            <button type="button" onClick={toggleAllClasses} className="text-[10px] font-bold text-blue-600 hover:text-blue-800">
                                {form.classIds.length === classes.length ? 'BATALKAN SEMUA' : 'PILIH SEMUA'}
                            </button>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                            {classes.map(c => (
                                <div
                                    key={c.id}
                                    onClick={() => toggleClass(c.id)}
                                    className={`cursor-pointer px-3 py-2 rounded-lg border text-sm font-bold transition flex items-center justify-between group ${form.classIds.includes(c.id)
                                        ? 'bg-blue-50/50 border-blue-500 text-blue-700'
                                        : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'
                                        }`}
                                >
                                    <span>{c.name}</span>
                                    {form.classIds.includes(c.id) && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                                </div>
                            ))}
                        </div>
                        {form.classIds.length === 0 && <p className="text-xs text-red-500 font-medium mt-2">* Pilih minimal satu kelas.</p>}
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-zinc-100">
                        <button type="button" onClick={onClose} className="flex-1 py-3 border border-zinc-200 text-zinc-600 rounded-xl font-bold hover:bg-zinc-50 transition">BATAL</button>
                        <button
                            type="submit"
                            disabled={loading || form.classIds.length === 0}
                            className="flex-1 py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'MENYIMPAN...' : 'BAGIKAN MATERI'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- COMPONENTS: PRESENTATION MODE ---
const PresentationView = ({ material, onClose }) => {
    if (!material) return null;

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
            // Pattern: .../d/FILE_ID/...
            const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (match && match[1]) {
                return `https://drive.google.com/file/d/${match[1]}/preview`;
            }
        }

        return url;
    };

    const embedUrl = getEmbedUrl(material.file_url, material.file_type);

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-300">
            {/* TOOLBAR */}
            <div className="bg-zinc-900 border-b border-zinc-800 p-4 flex justify-between items-center text-white shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition text-zinc-400 hover:text-white">
                        <X size={24} />
                    </button>
                    <div>
                        <h2 className="text-lg font-bold leading-tight">{material.title}</h2>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">MODE PRESENTASI • {material.class_name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <a href={material.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-bold transition">
                        <LinkIcon size={14} /> BUKA EXTERNAL
                    </a>
                </div>
            </div>

            {/* VIEWER CONTENT */}
            <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                {material.file_type === 'youtube' || material.file_type === 'link' || material.file_type === 'pdf' ? (
                    <iframe
                        src={embedUrl}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="Presentation Content"
                    />
                ) : (
                    <div className="text-center text-zinc-500">
                        <FileText size={48} className="mx-auto mb-4" />
                        <p>Preview tidak tersedia untuk tipe file ini.</p>
                        <a href={material.file_url} target="_blank" rel="noreferrer" className="text-blue-500 underline">Buka di Tab Baru</a>
                    </div>
                )}
            </div>
        </div>
    );
};

import { useSearchParams } from 'react-router-dom';

export default function Materials() {
    const [searchParams] = useSearchParams();
    const [materials, setMaterials] = useState([]);
    const [classes, setClasses] = useState([]);
    const [activePeriod, setActivePeriod] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filterClass, setFilterClass] = useState(searchParams.get('class_id') || 'ALL');

    const [modalOpen, setModalOpen] = useState(false);
    const [presentation, setPresentation] = useState(null); // stores active material for presentation
    const [saving, setSaving] = useState(false);

    const { showAlert, showConfirm } = useAlertContext();

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // 1. Get Active Period from API (Fix: Don't rely on localStorage)
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

            // 2. Get Classes
            const resClasses = await fetchApi(`/api/classes?period_id=${period.id}`);
            if (resClasses.ok) {
                setClasses(await resClasses.json());
            }

            // 3. Get Materials (All for period)
            fetchMaterials(period.id);

        } catch (e) {
            console.error("Init Error", e);
            showAlert("Gagal memuat data", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchMaterials = async (periodId) => {
        try {
            const res = await fetchApi(`/api/materials?period_id=${periodId}`);
            if (res.ok) {
                setMaterials(await res.json());
            }
        } catch (e) {
            console.error("Fetch Materials Error", e);
        }
    };

    const handleCreate = async (formData) => {
        setSaving(true);
        try {
            const payload = {
                periodId: activePeriod.id,
                ...formData
            };

            const res = await fetchApi('/api/materials', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showAlert("Materi berhasil dibagikan!", "success");
                setModalOpen(false);
                fetchMaterials(activePeriod.id);
            } else {
                const err = await res.json();
                showAlert(err.error || "Gagal menyimpan", "error");
            }
        } catch (e) {
            showAlert("Terjadi kesalahan server", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, title) => {
        const confirmed = await showConfirm(`Hapus materi "${title}"?`);
        if (!confirmed) return;

        try {
            const res = await fetchApi(`/api/materials?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setMaterials(prev => prev.filter(m => m.id !== id));
                showAlert("Materi dihapus", "success");
            } else {
                showAlert("Gagal menghapus", "error");
            }
        } catch (e) { showAlert("Error server", "error"); }
    };

    const handleToggleVisibility = async (id, currentStatus) => {
        try {
            // Optimistic Update
            setMaterials(prev => prev.map(m => m.id === id ? { ...m, is_visible: !currentStatus } : m));

            await fetchApi('/api/materials', {
                method: 'PUT',
                body: JSON.stringify({ id, isVisible: !currentStatus })
            });
        } catch (e) {
            fetchMaterials(activePeriod.id); // Revert on error
        }
    };

    // FILTER LOGIC
    const filteredMaterials = filterClass === 'ALL'
        ? materials
        : materials.filter(m => m.class_id == filterClass);

    const getIcon = (type) => {
        switch (type) {
            case 'youtube': return <Youtube size={20} className="text-red-500" />;
            case 'pdf': return <FileText size={20} className="text-blue-500" />;
            default: return <LinkIcon size={20} className="text-emerald-500" />;
        }
    };

    if (loading) return (
        <div className="pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
                        <BookOpen className="text-purple-600" size={32} />
                        Bahan Ajar
                    </h2>
                    <p className="text-zinc-500 mt-1">Memuat materi...</p>
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
            {/* COMPONENT: HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
                        <BookOpen className="text-purple-600" size={32} />
                        Bahan Ajar
                    </h2>
                    <p className="text-zinc-500 mt-1">Bagikan modul, video, atau link referensi ke siswa.</p>
                </div>
                <div className="flex gap-3">
                    <select
                        className="bg-white border border-zinc-200 text-zinc-700 text-sm font-bold px-4 py-3 rounded-xl focus:border-black outline-none transition cursor-pointer"
                        value={filterClass}
                        onChange={e => setFilterClass(e.target.value)}
                    >
                        <option value="ALL">SEMUA KELAS</option>
                        {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setModalOpen(true)}
                        className="bg-black text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-zinc-800 transition flex items-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-1"
                    >
                        <Plus size={18} />
                        <span className="hidden md:inline">BAGIKAN MATERI</span>
                    </button>
                </div>
            </div>

            {/* LIST MATERIAL */}
            {filteredMaterials.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-zinc-100 shadow-sm border-dashed">
                    <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-200">
                        <BookOpen size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900">Belum ada materi</h3>
                    <p className="text-zinc-500 text-sm">Mulai bagikan materi pembelajaran untuk kelas ini.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMaterials.map(item => (
                        <div key={item.id} className={`bg-white rounded-2xl p-5 border transition-all duration-200 hover:shadow-lg group relative ${!item.is_visible ? 'opacity-60 border-zinc-200 bg-zinc-50' : 'border-zinc-200 hover:border-purple-200'}`}>

                            {/* HEADER CARD */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shadow-sm">
                                        {getIcon(item.file_type)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200 truncate max-w-[100px]">
                                                {item.class_name}
                                            </span>
                                            {!item.is_visible && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">HIDDEN</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleToggleVisibility(item.id, !!item.is_visible)}
                                        className="p-2 text-zinc-300 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition"
                                        title="Toggle Visibility"
                                    >
                                        {item.is_visible ? <Eye size={16} /> : <EyeOff size={16} />}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.id, item.title)}
                                        className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                        title="Hapus"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* CONTENT */}
                            <div className="mb-4 min-h-[60px]">
                                <h4 className="font-bold text-zinc-800 leading-tight mb-2 line-clamp-2 group-hover:text-purple-700 transition">
                                    {item.title}
                                </h4>
                                <p className="text-xs text-zinc-500 line-clamp-2">
                                    {item.description || 'Tidak ada deskripsi.'}
                                </p>
                            </div>

                            {/* FOOTER ACTION */}
                            <button
                                onClick={() => setPresentation(item)}
                                className={`block w-full py-3 rounded-xl text-center text-xs font-bold transition flex items-center justify-center gap-2 ${item.file_type === 'youtube'
                                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                    : (item.file_type === 'pdf' ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100')
                                    }`}
                            >
                                {item.file_type === 'youtube' && <MonitorPlay size={16} />}
                                {item.file_type === 'pdf' && <MonitorPlay size={16} />}
                                {item.file_type === 'link' && <MonitorPlay size={16} />}
                                PUTAR / PRESENTASIKAN
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL */}
            <MaterialModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleCreate}
                classes={classes}
                loading={saving}
            />
            {/* PRESENTATION MODE OVERLAY */}
            <PresentationView
                material={presentation}
                onClose={() => setPresentation(null)}
            />
        </div>
    );
}
