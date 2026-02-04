import React, { useState, useEffect } from 'react';
import { Calendar, Save, Copy } from 'lucide-react';

export const ActivationModal = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;
    const [date, setDate] = useState('');
    const handleSubmit = () => { if (!date) return alert("Pilih tanggal pelaksanaan!"); onConfirm(date); };
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 transform transition-all scale-100 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold">
                        <Calendar size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900">Jadwal Ujian</h3>
                </div>
                <p className="text-zinc-500 text-sm mb-4">Tentukan waktu mulai ujian agar siswa dapat mengaksesnya.</p>
                <input type="datetime-local" className="w-full px-4 py-3 rounded-lg border border-zinc-300 mb-6 font-mono text-sm" value={date} onChange={e => setDate(e.target.value)} />
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 border border-zinc-200 text-zinc-600 rounded-xl font-bold hover:bg-zinc-50 transition">BATAL</button>
                    <button onClick={handleSubmit} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition shadow-lg shadow-green-200">AKTIFKAN</button>
                </div>
            </div>
        </div>
    );
};

export const CopyQuizModal = ({ isOpen, classes, onClose, onConfirm }) => {
    if (!isOpen) return null;
    const [targetClass, setTargetClass] = useState(classes[0]?.id || '');

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                        <Copy size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900">Salin Quiz</h3>
                </div>
                <p className="text-zinc-500 text-sm mb-4">Pilih kelas tujuan untuk menyalin quiz ini beserta soal-soalnya.</p>

                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Kelas Tujuan</label>
                <select className="w-full px-4 py-3 rounded-lg border border-zinc-300 mb-6 bg-white" value={targetClass} onChange={e => setTargetClass(e.target.value)}>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 border border-zinc-200 text-zinc-600 rounded-xl font-bold hover:bg-zinc-50 transition">BATAL</button>
                    <button onClick={() => onConfirm(targetClass)} className="flex-1 py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition">SALIN</button>
                </div>
            </div>
        </div>
    );
};

export const EditQuizModal = ({ isOpen, quiz, students, onClose, onSave }) => {
    const [form, setForm] = useState({
        id: quiz?.id,
        title: quiz?.title || '',
        description: quiz?.description || '',
        duration: quiz?.duration || 60,
        toleranceMinutes: quiz?.tolerance_minutes || 0,
        showLimit: quiz?.show_limit || 0,
        isRandom: quiz?.is_random === 1,
        showResults: quiz?.show_results === 1,
        checkAttendance: quiz?.check_attendance === 1,
        allowedStudents: JSON.parse(quiz?.allowed_students || '[]'),
        isOfflineMode: quiz?.is_offline_mode === 1
    });

    useEffect(() => {
        if (quiz) {
            setForm({
                id: quiz.id,
                title: quiz.title,
                description: quiz.description || '',
                duration: quiz.duration || 60,
                toleranceMinutes: quiz.tolerance_minutes || 0,
                showLimit: quiz.show_limit || 0,
                isRandom: quiz.is_random === 1,
                showResults: quiz.show_results === 1,
                checkAttendance: quiz.check_attendance === 1,
                allowedStudents: JSON.parse(quiz.allowed_students || '[]'),
                isOfflineMode: quiz.is_offline_mode === 1
            });
        }
    }, [quiz]);

    if (!isOpen) return null;

    const handleSubmit = () => onSave(form);

    const toggleAllowedStudent = (studentId) => {
        const current = form.allowedStudents;
        if (current.includes(studentId)) {
            setForm({ ...form, allowedStudents: current.filter(id => id !== studentId) });
        } else {
            setForm({ ...form, allowedStudents: [...current, studentId] });
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 overflow-y-auto max-h-[90vh] custom-scrollbar">
                <h3 className="text-xl font-bold text-zinc-900 mb-4 border-b pb-4">Pengaturan Quiz</h3>
                <div className="space-y-4 mb-6">
                    <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Judul Quiz</label><input type="text" className="w-full px-4 py-3 rounded input-mono bg-zinc-50 border-zinc-200" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>

                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Durasi (Menit)</label><input type="number" className="w-full px-4 py-3 rounded input-mono bg-zinc-50 border-zinc-200" value={form.duration} onChange={e => setForm({ ...form, duration: parseInt(e.target.value) })} /></div>
                        <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Limit Soal</label><input type="number" className="w-full px-4 py-3 rounded input-mono bg-zinc-50 border-zinc-200" placeholder="0 = Semua" value={form.showLimit} onChange={e => setForm({ ...form, showLimit: parseInt(e.target.value) })} /><p className="text-[10px] text-zinc-400 mt-1">0 = Tampilkan semua soal</p></div>
                    </div>

                    <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Toleransi Keterlambatan (Menit)</label><input type="number" className="w-full px-4 py-3 rounded input-mono bg-zinc-50 border-zinc-200" placeholder="0 = Tidak ada toleransi" value={form.toleranceMinutes} onChange={e => setForm({ ...form, toleranceMinutes: parseInt(e.target.value || 0) })} /><p className="text-[10px] text-zinc-400 mt-1">Siswa masih bisa masuk dalam waktu ini setelah jadwal mulai.</p></div>

                    <div className="grid grid-cols-2 gap-3">
                        <label className="flex items-center gap-3 p-3 border border-zinc-200 rounded cursor-pointer hover:bg-zinc-50"><input type="checkbox" className="w-5 h-5 accent-black" checked={form.isRandom} onChange={e => setForm({ ...form, isRandom: e.target.checked })} /><span className="text-sm font-bold text-zinc-700">Acak Soal</span></label>
                        <label className="flex items-center gap-3 p-3 border border-zinc-200 rounded cursor-pointer hover:bg-zinc-50"><input type="checkbox" className="w-5 h-5 accent-black" checked={form.showResults} onChange={e => setForm({ ...form, showResults: e.target.checked })} /><span className="text-sm font-bold text-zinc-700">Pembahasan</span></label>
                    </div>

                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" className="w-5 h-5 accent-orange-600" checked={form.checkAttendance} onChange={e => setForm({ ...form, checkAttendance: e.target.checked })} />
                            <div>
                                <span className="text-sm font-bold text-orange-900 block">Wajibkan Presensi (Hadir)?</span>
                                <span className="text-xs text-orange-700">Hanya siswa status 'H' yang bisa ujian.</span>
                            </div>
                        </label>

                        {form.checkAttendance && (
                            <div className="bg-white p-3 rounded-lg border border-orange-200 animate-in slide-in-from-top-2">
                                <p className="text-xs font-bold text-zinc-500 uppercase mb-2">Pengecualian (Whitelist)</p>
                                <p className="text-[10px] text-zinc-400 mb-2">Centang siswa yang <b>diizinkan ujian</b> walau tidak hadir (Dispensasi):</p>
                                <div className="max-h-32 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                                    {students.map(s => (
                                        <label key={s.id} className="flex items-center gap-2 hover:bg-zinc-50 p-1 rounded cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={form.allowedStudents.includes(s.id)}
                                                onChange={() => toggleAllowedStudent(s.id)}
                                                className="accent-black"
                                            />
                                            <span className="text-xs font-medium truncate">{s.name}</span>
                                        </label>
                                    ))}
                                    {students.length === 0 && <p className="text-xs text-red-500">Data siswa tidak ditemukan.</p>}
                                </div>
                            </div>
                        )}
                    </div>

                    <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Deskripsi</label><textarea className="w-full px-4 py-3 rounded input-mono bg-zinc-50 border-zinc-200" rows="2" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}></textarea></div>

                    {/* Offline Mode Toggle */}
                    <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" className="w-5 h-5 accent-purple-600" checked={form.isOfflineMode} onChange={e => setForm({ ...form, isOfflineMode: e.target.checked })} />
                            <div>
                                <span className="text-sm font-bold text-purple-900 block flex items-center gap-2">🛫 Mode Offline Wajib</span>
                                <span className="text-xs text-purple-700">Siswa harus matikan jaringan saat mengerjakan (anti-curang).</span>
                            </div>
                        </label>
                    </div>
                </div>
                <div className="flex gap-3"><button onClick={onClose} className="flex-1 py-3 border border-zinc-200 text-zinc-600 rounded-xl font-bold hover:bg-zinc-50 transition">BATAL</button><button onClick={handleSubmit} className="flex-1 py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition">SIMPAN</button></div>
            </div>
        </div>
    );
};
