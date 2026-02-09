import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { fetchApi } from '../../utils/api';

// Configuration Modal
export function ConfigModal({ isOpen, onClose, settings, onSave }) {
    const [formData, setFormData] = useState({
        base_score: 50,
        ask_points: 2,
        answer_points: 3,
        present_points: 5,
        penalty_points: -2
    });

    useEffect(() => {
        if (settings) {
            setFormData(settings);
        }
    }, [settings]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        ⚙️ Konfigurasi Poin
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Base Score */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            NILAI DASAR (BASE)
                        </label>
                        <input
                            type="number"
                            value={formData.base_score}
                            onChange={(e) => setFormData({ ...formData, base_score: parseInt(e.target.value) })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Activity Points Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Ask Points */}
                        <div>
                            <label className="block text-sm font-medium text-blue-600 mb-2">
                                BERTANYA
                            </label>
                            <input
                                type="number"
                                value={formData.ask_points}
                                onChange={(e) => setFormData({ ...formData, ask_points: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center font-bold text-blue-600"
                            />
                        </div>

                        {/* Answer Points */}
                        <div>
                            <label className="block text-sm font-medium text-green-600 mb-2">
                                MENJAWAB
                            </label>
                            <input
                                type="number"
                                value={formData.answer_points}
                                onChange={(e) => setFormData({ ...formData, answer_points: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-center font-bold text-green-600"
                            />
                        </div>

                        {/* Present Points */}
                        <div>
                            <label className="block text-sm font-medium text-purple-600 mb-2">
                                MAJU
                            </label>
                            <input
                                type="number"
                                value={formData.present_points}
                                onChange={(e) => setFormData({ ...formData, present_points: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center font-bold text-purple-600"
                            />
                        </div>

                        {/* Penalty Points */}
                        <div>
                            <label className="block text-sm font-medium text-red-600 mb-2">
                                SANKSI
                            </label>
                            <input
                                type="number"
                                value={formData.penalty_points}
                                onChange={(e) => setFormData({ ...formData, penalty_points: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-center font-bold text-red-600"
                            />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Simpan
                    </button>
                </div>
            </div>
        </div>
    );
}

// History Modal
export function HistoryModal({ isOpen, onClose, student, classId }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && student && classId) {
            fetchHistory();
        }
    }, [isOpen, student, classId]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await fetchApi(`/api/participation/history?student_id=${student.id}&class_id=${classId}`);
            if (res.ok) {
                const data = await res.json();
                setHistory(data);
            }
        } catch (e) {
            console.error('Error fetching history:', e);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const getActivityLabel = (type) => {
        const labels = {
            ask: 'BERTANYA',
            answer: 'MENJAWAB',
            present: 'MAJU',
            penalty: 'SANKSI'
        };
        return labels[type] || type.toUpperCase();
    };

    const getActivityColor = (type) => {
        const colors = {
            ask: 'bg-blue-100 text-blue-700',
            answer: 'bg-green-100 text-green-700',
            present: 'bg-purple-100 text-purple-700',
            penalty: 'bg-red-100 text-red-700'
        };
        return colors[type] || 'bg-gray-100 text-gray-700';
    };

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold">Riwayat Keaktifan</h2>
                        <p className="text-gray-600">{student?.name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-8 text-gray-500">Loading...</div>
                ) : history.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">Belum ada aktivitas</div>
                ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {history.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getActivityColor(item.activity_type)}`}>
                                        {getActivityLabel(item.activity_type)}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{formatDate(item.timestamp)}</p>
                                </div>
                                <div className={`text-lg font-bold ${item.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {item.points > 0 ? '+' : ''}{item.points}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <button
                    onClick={onClose}
                    className="w-full mt-6 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                    Tutup
                </button>
            </div>
        </div>
    );
}
