import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { fetchApi } from '../utils/api';
import { useAlertContext } from '../components/Alert';
import {
    ArrowLeft,
    GripVertical,
    Type,
    AlignLeft,
    Hash,
    Clock,
    ChevronDown,
    Users,
    Trash2,
    Settings as SettingsIcon,
    Save,
    Plus
} from 'lucide-react';
import { Spinner } from '../components/UI';

// Column Type Definitions
const COLUMN_TYPES = [
    { id: 'text', label: 'Teks Singkat', icon: Type, description: 'Input teks satu baris' },
    { id: 'textarea', label: 'Paragraf', icon: AlignLeft, description: 'Input teks panjang' },
    { id: 'number', label: 'Angka', icon: Hash, description: 'Input angka (JP, Pertemuan)' },
    { id: 'time', label: 'Waktu', icon: Clock, description: 'Input jam (HH:MM)' },
    { id: 'select', label: 'Dropdown', icon: ChevronDown, description: 'Pilihan dropdown' },
    { id: 'attendance_summary', label: 'Rekap Absensi', icon: Users, description: 'Auto-fetch dari DB (readonly)' }
];

// Sortable Column Item Component
function SortableColumnItem({ column, onEdit, onDelete }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: column.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1
    };

    const typeInfo = COLUMN_TYPES.find(t => t.id === column.type) || COLUMN_TYPES[0];
    const Icon = typeInfo.icon;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="group bg-white border border-zinc-200 rounded-xl p-4 hover:shadow-md transition-all"
        >
            <div className="flex items-center gap-3">
                {/* Drag Handle */}
                <button
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                    <GripVertical size={18} className="text-zinc-400" />
                </button>

                {/* Icon */}
                <div className="p-2 bg-orange-50 rounded-lg">
                    <Icon size={18} className="text-orange-600" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-zinc-800 truncate">{column.label}</p>
                    <p className="text-xs text-zinc-400 truncate">{typeInfo.label}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onEdit(column)}
                        className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                    >
                        <SettingsIcon size={16} className="text-zinc-500" />
                    </button>
                    <button
                        onClick={() => onDelete(column.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <Trash2 size={16} className="text-red-500" />
                    </button>
                </div>
            </div>

            {/* Required Badge */}
            {column.required && (
                <div className="mt-2">
                    <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full font-medium">
                        Wajib Diisi
                    </span>
                </div>
            )}
        </div>
    );
}

// Toolbox Item Component
function ToolboxItem({ type }) {
    const Icon = type.icon;
    return (
        <div className="bg-white border border-zinc-200 rounded-xl p-4 cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-all">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-100 rounded-lg">
                    <Icon size={18} className="text-zinc-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-zinc-800 text-sm truncate">{type.label}</p>
                    <p className="text-xs text-zinc-400 truncate">{type.description}</p>
                </div>
            </div>
        </div>
    );
}

// Column Edit Modal
function ColumnEditModal({ column, onSave, onClose }) {
    const [formData, setFormData] = useState(column || {
        label: '',
        type: 'text',
        required: false,
        width: 'full',
        options: ''
    });

    const handleSave = () => {
        if (!formData.label.trim()) {
            alert('Label kolom harus diisi');
            return;
        }
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-zinc-100">
                    <h3 className="text-lg font-bold text-zinc-900">
                        {column ? 'Edit Kolom' : 'Tambah Kolom'}
                    </h3>
                </div>

                {/* Form */}
                <div className="p-6 space-y-4">
                    {/* Label */}
                    <div>
                        <label className="block text-sm font-bold text-zinc-700 mb-2">
                            Label Kolom *
                        </label>
                        <input
                            type="text"
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none"
                            placeholder="Contoh: Materi Pokok"
                            value={formData.label}
                            onChange={e => setFormData({ ...formData, label: e.target.value })}
                        />
                    </div>

                    {/* Type */}
                    <div>
                        <label className="block text-sm font-bold text-zinc-700 mb-2">
                            Tipe Kolom
                        </label>
                        <select
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none bg-white"
                            value={formData.type}
                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                        >
                            {COLUMN_TYPES.map(type => (
                                <option key={type.id} value={type.id}>{type.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Options (only for select) */}
                    {formData.type === 'select' && (
                        <div>
                            <label className="block text-sm font-bold text-zinc-700 mb-2">
                                Pilihan (pisahkan dengan koma)
                            </label>
                            <textarea
                                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none min-h-[80px] resize-none"
                                placeholder="Metode A, Metode B, Metode C"
                                value={formData.options}
                                onChange={e => setFormData({ ...formData, options: e.target.value })}
                            />
                        </div>
                    )}

                    {/* Required */}
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="required"
                            className="w-5 h-5 text-orange-600 rounded border-zinc-300 focus:ring-orange-500"
                            checked={formData.required}
                            onChange={e => setFormData({ ...formData, required: e.target.checked })}
                        />
                        <label htmlFor="required" className="text-sm font-medium text-zinc-700 cursor-pointer">
                            Wajib Diisi
                        </label>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-zinc-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-3 text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition-colors flex items-center gap-2"
                    >
                        <Save size={16} />
                        Simpan
                    </button>
                </div>
            </div>
        </div>
    );
}

// Main Component
export default function TemplateEditor() {
    const { id } = useParams(); // For editing existing template
    const navigate = useNavigate();
    const { showAlert, showConfirm } = useAlertContext();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [columns, setColumns] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [editingColumn, setEditingColumn] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates
        })
    );

    // Load template if editing
    useEffect(() => {
        if (id) {
            loadTemplate();
        }
    }, [id]);

    const loadTemplate = async () => {
        setLoading(true);
        try {
            const res = await fetchApi(`/api/journal-templates/${id}`);
            if (res.ok) {
                const data = await res.json();
                setTemplateName(data.template.name);
                setColumns(JSON.parse(data.template.template_config || '[]'));
            }
        } catch (e) {
            showAlert('Gagal memuat template.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            setColumns((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }

        setActiveId(null);
    };

    const handleAddColumn = (type) => {
        const columnId = `col_${Date.now()}`;
        const newColumn = {
            id: columnId,
            key: columnId, // Add key property for Journal.jsx compatibility
            type: type.id,
            label: type.label,
            required: false,
            width: 'full',
            options: ''
        };
        setEditingColumn(newColumn);
        setShowEditModal(true);
    };

    const handleEditColumn = (column) => {
        setEditingColumn(column);
        setShowEditModal(true);
    };

    const handleSaveColumn = (updatedColumn) => {
        if (columns.find(c => c.id === updatedColumn.id)) {
            // Update existing
            setColumns(columns.map(c => c.id === updatedColumn.id ? updatedColumn : c));
        } else {
            // Add new
            setColumns([...columns, updatedColumn]);
        }
        setShowEditModal(false);
        setEditingColumn(null);
    };

    const handleDeleteColumn = async (columnId) => {
        const confirmed = await showConfirm('Hapus kolom ini?');
        if (confirmed) {
            setColumns(columns.filter(c => c.id !== columnId));
        }
    };

    const handleSaveTemplate = async () => {
        if (!templateName.trim()) {
            showAlert('Nama template harus diisi.', 'error');
            return;
        }

        if (columns.length === 0) {
            showAlert('Template harus punya minimal 1 kolom.', 'error');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                id: id ? parseInt(id) : undefined,
                name: templateName,
                template_config: columns // Send array directly, backend handles JSON.stringify
            };

            const res = await fetchApi('/api/journal-templates', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showAlert('Template berhasil disimpan.', 'success');
                navigate('/journal/settings');
            } else {
                const err = await res.json();
                showAlert(err.error || 'Gagal menyimpan template.', 'error');
            }
        } catch (e) {
            showAlert('Terjadi kesalahan.', 'error');
        } finally {
            setSaving(false);
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
        <div className="animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link
                        to="/journal/settings"
                        className="p-2 hover:bg-zinc-100 rounded-lg transition"
                    >
                        <ArrowLeft size={24} className="text-zinc-500" />
                    </Link>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">
                            {id ? 'Edit Template' : 'Buat Template Baru'}
                        </h2>
                        <p className="text-zinc-500 mt-1">Atur kolom yang akan muncul di form jurnal</p>
                    </div>
                </div>

                <button
                    onClick={handleSaveTemplate}
                    disabled={saving}
                    className="px-6 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition disabled:opacity-50 shadow-lg shadow-orange-200 flex items-center gap-2"
                >
                    {saving ? (
                        <>
                            <Spinner size="sm" isWhite />
                            Menyimpan...
                        </>
                    ) : (
                        <>
                            <Save size={20} />
                            SIMPAN TEMPLATE
                        </>
                    )}
                </button>
            </div>

            {/* Template Name */}
            <div className="mb-6">
                <label className="block text-sm font-bold text-zinc-700 mb-2">
                    Nama Template *
                </label>
                <input
                    type="text"
                    className="max-w-md px-4 py-3 rounded-xl border border-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none"
                    placeholder="Contoh: Kurikulum Saya"
                    value={templateName}
                    onChange={e => setTemplateName(e.target.value)}
                />
            </div>

            {/* Main Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT: Toolbox */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm sticky top-6">
                        <h3 className="text-lg font-bold text-zinc-900 mb-4">Toolbox</h3>
                        <p className="text-sm text-zinc-500 mb-4">Klik tipe kolom untuk menambahkan</p>
                        <div className="space-y-3">
                            {COLUMN_TYPES.map(type => (
                                <div key={type.id} onClick={() => handleAddColumn(type)}>
                                    <ToolboxItem type={type} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT: Canvas */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm min-h-[400px]">
                        <h3 className="text-lg font-bold text-zinc-900 mb-4">Canvas Template</h3>

                        {columns.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                                <Plus size={48} className="mb-4 text-zinc-300" />
                                <p className="font-medium">Belum ada kolom</p>
                                <p className="text-sm">Klik tipe kolom di sebelah kiri untuk menambahkan</p>
                            </div>
                        ) : (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={columns.map(c => c.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="space-y-3">
                                        {columns.map(column => (
                                            <SortableColumnItem
                                                key={column.id}
                                                column={column}
                                                onEdit={handleEditColumn}
                                                onDelete={handleDeleteColumn}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <ColumnEditModal
                    column={editingColumn}
                    onSave={handleSaveColumn}
                    onClose={() => {
                        setShowEditModal(false);
                        setEditingColumn(null);
                    }}
                />
            )}
        </div>
    );
}
