import React, { useState, useEffect } from 'react';
import { useJournalData } from '../hooks/useJournalData';
import { Spinner } from '../components/UI';
import { GridSkeleton } from '../components/Skeleton';
import { useAlertContext } from '../components/Alert';
import { BookOpen, Plus, Trash2, X, Edit2, Calendar, Clock, FileText, ChevronDown, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

// Format date helper
const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

const formatShortDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
};

// Journal Card Component
const JournalCard = ({ journal, template, onEdit, onDelete, deletingId }) => {
    const customData = journal.custom_data || {};

    // Show first 2-3 fields as preview
    const previewFields = (template?.template_config || []).slice(0, 3);

    return (
        <div className="group relative bg-white border border-zinc-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
            {/* Accent Line */}
            <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-orange-500 rounded-r-full"></div>

            <div className="pl-4">
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-zinc-50 border border-zinc-100 text-zinc-500 text-[10px] px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                                <Calendar size={10} />
                                {formatShortDate(journal.date)}
                            </span>
                            {journal.start_time && (
                                <span className="bg-orange-50 border border-orange-100 text-orange-600 text-[10px] px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                                    <Clock size={10} />
                                    {journal.start_time} - {journal.end_time || '...'}
                                </span>
                            )}
                        </div>
                        <div className="font-bold text-lg text-zinc-900 tracking-tight leading-tight">
                            {journal.class_name}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <button
                            onClick={() => onEdit(journal)}
                            className="text-zinc-300 hover:text-blue-500 transition p-1"
                            title="Edit Jurnal"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button
                            onClick={() => onDelete(journal.id)}
                            disabled={deletingId === journal.id}
                            className="text-zinc-300 hover:text-red-500 transition p-1"
                            title="Hapus Jurnal"
                        >
                            {deletingId === journal.id ? <Spinner size="sm" /> : <Trash2 size={16} />}
                        </button>
                    </div>
                </div>

                {/* Preview Fields */}
                <div className="space-y-1">
                    {previewFields.map((field, idx) => {
                        const value = customData[field.key];
                        if (!value || field.type === 'attendance') return null;
                        return (
                            <div key={idx} className="text-xs text-zinc-500 truncate">
                                <span className="font-medium text-zinc-400">{field.label}:</span>{' '}
                                <span className="text-zinc-700">{value.substring(0, 50)}{value.length > 50 ? '...' : ''}</span>
                            </div>
                        );
                    })}
                    {/* Attendance if available */}
                    {customData.absensi && (
                        <div className="text-xs text-zinc-500">
                            <span className="font-medium text-zinc-400">Absensi:</span>{' '}
                            <span className="text-zinc-700">{customData.absensi}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Add/Edit Journal Modal
const JournalFormModal = ({
    isOpen,
    onClose,
    classes,
    templates,
    selectedTemplate,
    onSelectTemplate,
    onSave,
    submitting,
    editData,
    fetchAttendance
}) => {
    const [formData, setFormData] = useState({
        class_id: '',
        date: new Date().toISOString().split('T')[0],
        start_time: '07:00',
        end_time: '08:30',
        custom_data: {}
    });
    const [attendanceData, setAttendanceData] = useState(null);

    // Reset form when modal opens/closes or editData changes
    useEffect(() => {
        if (isOpen) {
            if (editData) {
                setFormData({
                    id: editData.id,
                    class_id: String(editData.class_id),
                    date: editData.date,
                    start_time: editData.start_time || '07:00',
                    end_time: editData.end_time || '08:30',
                    custom_data: editData.custom_data || {}
                });
            } else {
                setFormData({
                    class_id: '',
                    date: new Date().toISOString().split('T')[0],
                    start_time: '07:00',
                    end_time: '08:30',
                    custom_data: {}
                });
            }
            setAttendanceData(null);
        }
    }, [isOpen, editData]);

    // Fetch attendance when class and date change
    useEffect(() => {
        const loadAttendance = async () => {
            if (formData.class_id && formData.date) {
                const data = await fetchAttendance(formData.class_id, formData.date);
                setAttendanceData(data);
                // Auto-fill attendance field
                if (data?.formatted) {
                    setFormData(prev => ({
                        ...prev,
                        custom_data: {
                            ...prev.custom_data,
                            absensi: data.formatted
                        }
                    }));
                }
            }
        };
        loadAttendance();
    }, [formData.class_id, formData.date]);

    const handleCustomDataChange = (key, value) => {
        setFormData(prev => ({
            ...prev,
            custom_data: {
                ...prev.custom_data,
                [key]: value
            }
        }));
    };

    const handleSubmit = async () => {
        if (!formData.class_id || !formData.date) {
            return;
        }
        const success = await onSave(formData);
        if (success) {
            onClose();
        }
    };

    if (!isOpen) return null;

    const templateConfig = selectedTemplate?.template_config || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 animate-in zoom-in-95 my-8 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-zinc-900">
                        {editData ? 'Edit Jurnal' : 'Tambah Jurnal Baru'}
                    </h3>
                    <button onClick={onClose} className="text-zinc-400 hover:text-black transition">
                        <X size={24} />
                    </button>
                </div>

                <div className="space-y-5">
                    {/* Template Selector */}
                    <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                        <label className="block text-xs font-bold text-orange-600 uppercase mb-2">
                            Template Jurnal
                        </label>
                        <select
                            className="w-full px-4 py-3 rounded-xl border border-orange-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none bg-white transition"
                            value={selectedTemplate?.id || ''}
                            onChange={e => {
                                const tmpl = templates.find(t => t.id === parseInt(e.target.value));
                                if (tmpl) onSelectTemplate(tmpl);
                            }}
                        >
                            {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Basic Info Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Class */}
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Kelas</label>
                            <select
                                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none bg-zinc-50 transition"
                                value={formData.class_id}
                                onChange={e => setFormData({ ...formData, class_id: e.target.value })}
                            >
                                <option value="">-- Pilih Kelas --</option>
                                {classes.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Date */}
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Tanggal</label>
                            <input
                                type="date"
                                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none bg-zinc-50 transition"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>

                        {/* Time Range */}
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Mulai</label>
                                <input
                                    type="time"
                                    className="w-full px-3 py-3 rounded-xl border border-zinc-200 focus:border-orange-500 outline-none bg-zinc-50 font-mono text-sm transition"
                                    value={formData.start_time}
                                    onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Selesai</label>
                                <input
                                    type="time"
                                    className="w-full px-3 py-3 rounded-xl border border-zinc-200 focus:border-orange-500 outline-none bg-zinc-50 font-mono text-sm transition"
                                    value={formData.end_time}
                                    onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Dynamic Template Fields */}
                    <div className="border-t border-zinc-100 pt-5 space-y-4">
                        <h4 className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                            <FileText size={16} className="text-orange-500" />
                            Kolom Jurnal ({selectedTemplate?.name || 'Default'})
                        </h4>

                        {templateConfig.map((field, idx) => (
                            <div key={idx}>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
                                    {field.label}
                                    {field.type === 'attendance' && (
                                        <span className="ml-2 text-orange-500 font-normal">(Otomatis)</span>
                                    )}
                                </label>

                                {field.type === 'textarea' ? (
                                    <textarea
                                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none bg-zinc-50 transition min-h-[80px] resize-none"
                                        placeholder={`Masukkan ${field.label.toLowerCase()}...`}
                                        value={formData.custom_data[field.key] || ''}
                                        onChange={e => handleCustomDataChange(field.key, e.target.value)}
                                    />
                                ) : field.type === 'attendance' ? (
                                    <div className="px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-100 text-zinc-600 font-mono text-sm">
                                        {attendanceData?.formatted || 'Pilih kelas dan tanggal dulu...'}
                                    </div>
                                ) : field.type === 'number' ? (
                                    <input
                                        type="number"
                                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none bg-zinc-50 transition"
                                        placeholder={field.label}
                                        value={formData.custom_data[field.key] || ''}
                                        onChange={e => handleCustomDataChange(field.key, e.target.value)}
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none bg-zinc-50 transition"
                                        placeholder={`Masukkan ${field.label.toLowerCase()}...`}
                                        value={formData.custom_data[field.key] || ''}
                                        onChange={e => handleCustomDataChange(field.key, e.target.value)}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-8 pt-4 border-t border-zinc-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 text-zinc-500 font-bold hover:bg-zinc-50 rounded-xl transition">
                        BATAL
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !formData.class_id}
                        className="px-6 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition disabled:opacity-50 shadow-lg shadow-orange-200 relative"
                    >
                        {submitting ? <span className="opacity-0">SIMPAN</span> : 'SIMPAN'}
                        {submitting && <div className="absolute inset-0 flex items-center justify-center"><Spinner size="sm" isWhite /></div>}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Get month options for filter
const getMonthOptions = () => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        months.push({ value: val, label });
    }
    return months;
};

export default function Journal() {
    const { showAlert, showConfirm } = useAlertContext();
    const {
        loading, submitting, deletingId,
        journals, classes, activePeriod, templates, selectedTemplate,
        selectedClassId, setSelectedClassId,
        selectedMonth, setSelectedMonth,
        setSelectedTemplate,
        addJournal, updateJournal, deleteJournal, fetchAttendance
    } = useJournalData(showAlert, showConfirm);

    const [showModal, setShowModal] = useState(false);
    const [editData, setEditData] = useState(null);

    const handleEdit = (journal) => {
        setEditData(journal);
        setShowModal(true);
    };

    const handleAdd = () => {
        setEditData(null);
        setShowModal(true);
    };

    const handleSave = async (formData) => {
        if (formData.id) {
            return await updateJournal(formData);
        } else {
            return await addJournal(formData);
        }
    };

    const monthOptions = getMonthOptions();

    if (!activePeriod) return <div className="p-8"><GridSkeleton count={6} /></div>;

    return (
        <div className="animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-zinc-900 flex items-center gap-3 tracking-tight">
                        <BookOpen className="text-orange-600" size={32} />
                        Jurnal Mengajar
                    </h2>
                    <p className="text-zinc-500 mt-1">Dokumentasi harian kegiatan pembelajaran.</p>
                </div>

                <div className="flex gap-2">
                    <Link
                        to="/journal/settings"
                        className="px-4 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition flex items-center gap-2"
                    >
                        <Settings size={18} />
                        <span className="hidden md:inline">Pengaturan</span>
                    </Link>
                    <button
                        onClick={handleAdd}
                        className="px-6 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition shadow-lg shadow-orange-200 flex items-center gap-2 group"
                    >
                        <Plus className="group-hover:rotate-90 transition duration-300" size={20} />
                        TAMBAH JURNAL
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-zinc-200 p-4 mb-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Class Filter */}
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Kelas</label>
                        <select
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none bg-zinc-50 transition"
                            value={selectedClassId}
                            onChange={e => setSelectedClassId(e.target.value)}
                        >
                            <option value="">-- Pilih Kelas --</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Month Filter */}
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Bulan</label>
                        <select
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none bg-zinc-50 transition"
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(e.target.value)}
                        >
                            <option value="">Semua Bulan</option>
                            {monthOptions.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Template Info */}
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Template Aktif</label>
                        <div className="px-4 py-3 rounded-xl bg-orange-50 border border-orange-100 text-orange-700 font-medium">
                            {selectedTemplate?.name || 'Belum dipilih'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            {!selectedClassId ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-zinc-200">
                    <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BookOpen size={32} className="text-zinc-300" />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-400 mb-2">Pilih Kelas</h3>
                    <p className="text-zinc-400">Pilih kelas untuk melihat jurnal mengajar.</p>
                </div>
            ) : loading ? (
                <GridSkeleton count={6} />
            ) : journals.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-zinc-200">
                    <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText size={32} className="text-zinc-300" />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-400 mb-2">Belum Ada Jurnal</h3>
                    <p className="text-zinc-400 mb-4">Mulai dokumentasikan kegiatan pembelajaran Anda.</p>
                    <button
                        onClick={handleAdd}
                        className="px-6 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition"
                    >
                        Tambah Jurnal Pertama
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {journals.map(journal => (
                        <JournalCard
                            key={journal.id}
                            journal={journal}
                            template={selectedTemplate}
                            onEdit={handleEdit}
                            onDelete={deleteJournal}
                            deletingId={deletingId}
                        />
                    ))}
                </div>
            )}

            {/* Modal */}
            <JournalFormModal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setEditData(null);
                }}
                classes={classes}
                templates={templates}
                selectedTemplate={selectedTemplate}
                onSelectTemplate={setSelectedTemplate}
                onSave={handleSave}
                submitting={submitting}
                editData={editData}
                fetchAttendance={fetchAttendance}
            />
        </div>
    );
}
