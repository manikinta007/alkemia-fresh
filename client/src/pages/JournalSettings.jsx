import React, { useState, useEffect } from 'react';
import { fetchApi } from '../hooks/../utils/api';
import { Spinner } from '../components/UI';
import { useAlertContext } from '../components/Alert';
import { Settings, Image as ImageIcon, Upload, User, Building, FileText, ArrowLeft, Save, Settings as SettingsIcon, Trash2, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function JournalSettings() {
    const { showAlert, showConfirm } = useAlertContext();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingSignature, setUploadingSignature] = useState(false);

    const [settings, setSettings] = useState({
        school_name: '',
        school_address: '',
        school_logo_url: '',
        pdf_orientation: 'landscape',
        signature_name: '',
        signature_nip: '',
        signature_image_url: ''
    });

    // Templates state
    const [templates, setTemplates] = useState([]);
    const [deletingTemplateId, setDeletingTemplateId] = useState(null);

    // Fetch settings and templates on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch settings
                const settingsRes = await fetchApi('/api/journal-settings');
                if (settingsRes.ok) {
                    const data = await settingsRes.json();
                    if (data.settings) {
                        setSettings(data.settings);
                    }
                }

                // Fetch templates
                const templatesRes = await fetchApi('/api/journal-templates');
                if (templatesRes.ok) {
                    const data = await templatesRes.json();
                    setTemplates(data.templates || []);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleDeleteTemplate = async (id, name) => {
        const confirmed = await showConfirm(`Hapus template "${name}"?`);
        if (!confirmed) return;

        setDeletingTemplateId(id);
        try {
            const res = await fetchApi(`/api/journal-templates?id=${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setTemplates(prev => prev.filter(t => t.id !== id));
                showAlert('Template berhasil dihapus.', 'success');
            } else {
                const err = await res.json();
                showAlert(err.error || 'Gagal menghapus template.', 'error');
            }
        } catch (e) {
            showAlert('Terjadi kesalahan.', 'error');
        } finally {
            setDeletingTemplateId(null);
        }
    };

    // Handle input change
    const handleChange = (field, value) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    // Save settings
    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetchApi('/api/journal-settings', {
                method: 'PUT',
                body: JSON.stringify(settings)
            });

            if (res.ok) {
                showAlert('Pengaturan berhasil disimpan.', 'success');
            } else {
                const err = await res.json();
                showAlert(err.error || 'Gagal menyimpan.', 'error');
            }
        } catch (e) {
            showAlert('Terjadi kesalahan.', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Upload Logo
    const handleUploadLogo = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingLogo(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetchApi('/api/journal-settings/upload-logo', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setSettings(prev => ({ ...prev, school_logo_url: data.url }));
                showAlert('Logo berhasil diupload.', 'success');
            } else {
                showAlert('Gagal upload logo.', 'error');
            }
        } catch (e) {
            showAlert('Terjadi kesalahan.', 'error');
        } finally {
            setUploadingLogo(false);
        }
    };

    // Upload Signature
    const handleUploadSignature = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingSignature(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetchApi('/api/journal-settings/upload-signature', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setSettings(prev => ({ ...prev, signature_image_url: data.url }));
                showAlert('Tanda tangan berhasil diupload.', 'success');
            } else {
                showAlert('Gagal upload tanda tangan.', 'error');
            }
        } catch (e) {
            showAlert('Terjadi kesalahan.', 'error');
        } finally {
            setUploadingSignature(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500 pb-20 max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link
                    to="/journal"
                    className="p-2 hover:bg-zinc-100 rounded-lg transition"
                >
                    <ArrowLeft size={24} className="text-zinc-500" />
                </Link>
                <div>
                    <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-3 tracking-tight">
                        <Settings className="text-orange-600" size={28} />
                        Pengaturan Jurnal
                    </h2>
                    <p className="text-zinc-500 mt-1">Konfigurasi KOP, logo, dan tanda tangan untuk export PDF.</p>
                </div>
            </div>

            {/* Form */}
            <div className="space-y-6">
                {/* Template Management Section */}
                <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                            <FileText size={20} className="text-orange-500" />
                            Template Jurnal
                        </h3>
                        <Link
                            to="/journal/template-editor"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm font-bold rounded-lg hover:bg-orange-700 transition"
                        >
                            <SettingsIcon size={16} />
                            Buat Baru
                        </Link>
                    </div>

                    {/* Template List */}
                    <div className="space-y-2">
                        {templates.length === 0 ? (
                            <p className="text-sm text-zinc-400 py-4 text-center">Belum ada template.</p>
                        ) : (
                            templates.map(template => (
                                <div
                                    key={template.id}
                                    className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg border border-zinc-100 hover:bg-zinc-100 transition"
                                >
                                    <div className="flex items-center gap-3">
                                        <FileText size={18} className="text-zinc-400" />
                                        <div>
                                            <p className="font-medium text-zinc-800">{template.name}</p>
                                            {template.is_default === 1 && (
                                                <span className="text-xs text-orange-600 font-medium">Default</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Link
                                            to={`/journal/template-editor/${template.id}`}
                                            className="p-2 hover:bg-zinc-200 rounded-lg transition"
                                            title="Edit"
                                        >
                                            <Edit size={16} className="text-zinc-500" />
                                        </Link>
                                        {template.is_default !== 1 && (
                                            <button
                                                onClick={() => handleDeleteTemplate(template.id, template.name)}
                                                disabled={deletingTemplateId === template.id}
                                                className="p-2 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                                                title="Hapus"
                                            >
                                                {deletingTemplateId === template.id ? (
                                                    <Spinner size="sm" />
                                                ) : (
                                                    <Trash2 size={16} className="text-red-500" />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* School Info Section */}
                <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2 mb-6">
                        <Building size={20} className="text-orange-500" />
                        Informasi Sekolah
                    </h3>

                    <div className="space-y-4">
                        {/* School Logo */}
                        <div className="flex items-start gap-4">
                            <div className="w-24 h-24 bg-zinc-100 rounded-xl border border-zinc-200 flex items-center justify-center overflow-hidden">
                                {settings.school_logo_url ? (
                                    <img
                                        src={settings.school_logo_url}
                                        alt="Logo Sekolah"
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <ImageIcon size={32} className="text-zinc-300" />
                                )}
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
                                    Logo Sekolah
                                </label>
                                <label className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-600 rounded-lg font-medium hover:bg-zinc-200 cursor-pointer transition">
                                    <Upload size={16} />
                                    {uploadingLogo ? 'Mengupload...' : 'Upload Logo'}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleUploadLogo}
                                        disabled={uploadingLogo}
                                    />
                                </label>
                                <p className="text-xs text-zinc-400 mt-1">Format: JPG, PNG. Maks 2MB.</p>
                            </div>
                        </div>

                        {/* School Name */}
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
                                Nama Sekolah
                            </label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none bg-zinc-50 transition"
                                placeholder="Contoh: SMA Negeri 1 Contoh"
                                value={settings.school_name || ''}
                                onChange={e => handleChange('school_name', e.target.value)}
                            />
                        </div>

                        {/* School Address */}
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
                                Alamat Sekolah
                            </label>
                            <textarea
                                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none bg-zinc-50 transition min-h-[80px] resize-none"
                                placeholder="Jl. Pendidikan No. 1, Kota Contoh"
                                value={settings.school_address || ''}
                                onChange={e => handleChange('school_address', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Signature Section */}
                <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2 mb-6">
                        <User size={20} className="text-orange-500" />
                        Tanda Tangan
                    </h3>

                    <div className="space-y-4">
                        {/* Signature Image */}
                        <div className="flex items-start gap-4">
                            <div className="w-32 h-20 bg-zinc-100 rounded-xl border border-zinc-200 flex items-center justify-center overflow-hidden">
                                {settings.signature_image_url ? (
                                    <img
                                        src={settings.signature_image_url}
                                        alt="Tanda Tangan"
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <FileText size={24} className="text-zinc-300" />
                                )}
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
                                    Gambar Tanda Tangan
                                </label>
                                <label className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-600 rounded-lg font-medium hover:bg-zinc-200 cursor-pointer transition">
                                    <Upload size={16} />
                                    {uploadingSignature ? 'Mengupload...' : 'Upload Tanda Tangan'}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleUploadSignature}
                                        disabled={uploadingSignature}
                                    />
                                </label>
                                <p className="text-xs text-zinc-400 mt-1">Gunakan gambar dengan latar belakang transparan (PNG).</p>
                            </div>
                        </div>

                        {/* Signature Name */}
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
                                Nama Penanda Tangan
                            </label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none bg-zinc-50 transition"
                                placeholder="Contoh: Drs. Budi Santoso, M.Pd"
                                value={settings.signature_name || ''}
                                onChange={e => handleChange('signature_name', e.target.value)}
                            />
                        </div>

                        {/* NIP */}
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
                                NIP
                            </label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none bg-zinc-50 transition font-mono"
                                placeholder="19750101 199903 1 001"
                                value={settings.signature_nip || ''}
                                onChange={e => handleChange('signature_nip', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* PDF Options Section */}
                <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2 mb-6">
                        <FileText size={20} className="text-orange-500" />
                        Pengaturan PDF
                    </h3>

                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
                            Orientasi Halaman
                        </label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="orientation"
                                    value="landscape"
                                    checked={settings.pdf_orientation === 'landscape'}
                                    onChange={e => handleChange('pdf_orientation', e.target.value)}
                                    className="w-4 h-4 text-orange-600"
                                />
                                <span className="text-zinc-700">Landscape (Horizontal)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="orientation"
                                    value="portrait"
                                    checked={settings.pdf_orientation === 'portrait'}
                                    onChange={e => handleChange('pdf_orientation', e.target.value)}
                                    className="w-4 h-4 text-orange-600"
                                />
                                <span className="text-zinc-700">Portrait (Vertikal)</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-4 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition disabled:opacity-50 shadow-lg shadow-orange-200 flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <Spinner size="sm" isWhite />
                                Menyimpan...
                            </>
                        ) : (
                            <>
                                <Save size={20} />
                                SIMPAN PENGATURAN
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
