import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Lock, User, Plus, X } from 'lucide-react';
import { ListSkeleton } from '../components/Skeleton';
import { useAlertContext } from '../components/Alert';
import { fetchApi, initSession } from '../utils/api';

export default function Settings() {
    const { showAlert } = useAlertContext();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    // Profile State
    const [formProfile, setFormProfile] = useState({
        name: '',
        nip: '',
        username: '',
        schoolName: '',
        schoolAddress: '',
        headmaster: ''
    });

    // Tag Input State
    const [subjects, setSubjects] = useState([]);
    const [subjectInput, setSubjectInput] = useState('');

    // Password State
    const [formPassword, setFormPassword] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // Loading States for Actions
    const [savingProfile, setSavingProfile] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            // 1. Get User Session (Updated to return nip & subjects)
            const userData = await initSession();

            // 2. Get School Data
            const schoolRes = await fetchApi('/api/school');
            const schoolData = schoolRes.ok ? await schoolRes.json() : {};

            if (userData) {
                setUser(userData);
                setSubjects(userData.subjects || []);
                setFormProfile({
                    name: userData.name || '',
                    nip: userData.nip || '',
                    username: userData.username || '',
                    schoolName: schoolData.name || '',
                    schoolAddress: schoolData.address || '',
                    headmaster: schoolData.headmaster || ''
                });
            }
        } catch (e) {
            console.error("Failed to load settings", e);
            showAlert('Gagal memuat data pengaturan.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- Tag Input Logic ---
    const addSubject = (e) => {
        e?.preventDefault();
        const val = subjectInput.trim();
        if (val && !subjects.includes(val)) {
            setSubjects([...subjects, val]);
            setSubjectInput('');
        }
    };

    const removeSubject = (valToRemove) => {
        setSubjects(subjects.filter(s => s !== valToRemove));
    };

    const handleSubjectKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addSubject();
        }
    };

    // --- Actions ---
    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setSavingProfile(true);
        try {
            const payload = {
                user: {
                    username: formProfile.username, // Key
                    name: formProfile.name,
                    nip: formProfile.nip,
                    subjects: subjects
                },
                school: {
                    name: formProfile.schoolName,
                    address: formProfile.schoolAddress,
                    headmaster: formProfile.headmaster
                }
            };

            const res = await fetchApi('/api/save-all-profile', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                // Update local User state
                if (data.user) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                    setUser(data.user);
                    // Update form if needed, but mostly it's same
                }
                showAlert('Profil sekolah dan guru berhasil disimpan.', 'success');
            } else {
                showAlert('Gagal menyimpan data.', 'error');
            }
        } catch (err) {
            showAlert('Terjadi kesalahan koneksi.', 'error');
        } finally {
            setSavingProfile(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (formPassword.newPassword !== formPassword.confirmPassword) {
            showAlert('Konfirmasi password baru tidak cocok!', 'error');
            return;
        }

        setChangingPassword(true);
        try {
            const res = await fetchApi('/api/change-password', {
                method: 'POST',
                body: JSON.stringify({
                    username: user.username,
                    oldPassword: formPassword.oldPassword,
                    newPassword: formPassword.newPassword
                })
            });

            const data = await res.json();
            if (res.ok) {
                showAlert('Password berhasil diubah. Silakan login ulang.', 'success');
                setFormPassword({ oldPassword: '', newPassword: '', confirmPassword: '' });
                // Optional: Logout user
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else {
                showAlert(data.error || 'Password lama salah.', 'error');
            }
        } catch (err) {
            showAlert('Terjadi kesalahan server.', 'error');
        } finally {
            setChangingPassword(false);
        }
    };

    return (
        <div className="animate-in fade-in duration-500 pb-20">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-zinc-900 flex items-center gap-3">
                    <SettingsIcon className="text-zinc-900" size={32} />
                    Pengaturan
                </h2>
                <p className="text-zinc-500 mt-2">Kelola profil sekolah, data guru (Mapel), dan keamanan.</p>
            </div>

            {loading ? (
                <div className="grid lg:grid-cols-2 gap-8">
                    <ListSkeleton count={3} />
                    <ListSkeleton count={2} />
                </div>
            ) : (
                <div className="grid lg:grid-cols-2 gap-8">
                    {/* KOLOM KIRI: PROFIL */}
                    <div className="bg-white border border-zinc-200 rounded-xl p-8">
                        <h3 className="text-xl font-bold mb-6 pb-4 border-b border-zinc-100 flex items-center gap-2">
                            <User size={20} className="text-zinc-500" />
                            Profil Sekolah & Guru
                        </h3>
                        <form onSubmit={handleUpdateProfile} className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Nama Guru</label>
                                    <input type="text" className="w-full px-4 py-3 rounded-lg border border-zinc-300 focus:outline-none focus:border-black transition" value={formProfile.name} onChange={e => setFormProfile({ ...formProfile, name: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">NIP / ID</label>
                                    <input type="text" className="w-full px-4 py-3 rounded-lg border border-zinc-300 focus:outline-none focus:border-black transition" value={formProfile.nip} onChange={e => setFormProfile({ ...formProfile, nip: e.target.value })} />
                                </div>
                            </div>

                            {/* MULTI-SUBJECT INPUT (TAGGING) */}
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Mata Pelajaran (Multi)</label>
                                <div className="p-2 border border-zinc-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-black/10 transition">
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {subjects.map((subj, idx) => (
                                            <span key={idx} className="bg-zinc-100 text-zinc-800 text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 border border-zinc-200">
                                                {subj}
                                                <button type="button" onClick={() => removeSubject(subj)} className="text-zinc-400 hover:text-red-500">
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            className="flex-1 outline-none text-sm bg-transparent"
                                            placeholder="Ketik mapel lalu Enter..."
                                            value={subjectInput}
                                            onChange={e => setSubjectInput(e.target.value)}
                                            onKeyDown={handleSubjectKeyDown}
                                        />
                                        <button type="button" onClick={addSubject} className="text-xs font-bold bg-zinc-900 text-white px-3 py-1 rounded hover:bg-zinc-700">
                                            TAMBAH
                                        </button>
                                    </div>
                                </div>
                                <p className="text-[10px] text-zinc-400 mt-1">Contoh: Kimia, Fisika, Biologi (Tekan Enter untuk menambah)</p>
                            </div>

                            <hr className="border-dashed my-4 border-zinc-200" />

                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Nama Sekolah</label>
                                <input type="text" className="w-full px-4 py-3 rounded-lg border border-zinc-300 focus:outline-none focus:border-black transition" value={formProfile.schoolName} onChange={e => setFormProfile({ ...formProfile, schoolName: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Alamat Sekolah</label>
                                <textarea className="w-full px-4 py-3 rounded-lg border border-zinc-300 focus:outline-none focus:border-black transition" rows="2" value={formProfile.schoolAddress} onChange={e => setFormProfile({ ...formProfile, schoolAddress: e.target.value })}></textarea>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Kepala Sekolah</label>
                                <input type="text" className="w-full px-4 py-3 rounded-lg border border-zinc-300 focus:outline-none focus:border-black transition" value={formProfile.headmaster} onChange={e => setFormProfile({ ...formProfile, headmaster: e.target.value })} />
                            </div>

                            <button disabled={savingProfile} className="w-full py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 disabled:opacity-50 transition shadow-lg flex items-center justify-center gap-2">
                                {savingProfile ? 'MENYIMPAN...' : <><Save size={18} /> SIMPAN PERUBAHAN</>}
                            </button>
                        </form>
                    </div>

                    {/* KOLOM KANAN: KEAMANAN */}
                    <div className="bg-white border border-zinc-200 rounded-xl p-8 h-fit">
                        <h3 className="text-xl font-bold mb-6 pb-4 border-b border-zinc-100 text-red-600 flex items-center gap-2">
                            <Lock size={20} />
                            Keamanan Akun
                        </h3>
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Password Lama</label>
                                <input type="password" className="w-full px-4 py-3 rounded-lg border border-zinc-300 focus:outline-none focus:border-red-500 transition" value={formPassword.oldPassword} onChange={e => setFormPassword({ ...formPassword, oldPassword: e.target.value })} required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Password Baru</label>
                                <input type="password" className="w-full px-4 py-3 rounded-lg border border-zinc-300 focus:outline-none focus:border-red-500 transition" value={formPassword.newPassword} onChange={e => setFormPassword({ ...formPassword, newPassword: e.target.value })} required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Konfirmasi Password</label>
                                <input type="password" className="w-full px-4 py-3 rounded-lg border border-zinc-300 focus:outline-none focus:border-red-500 transition" value={formPassword.confirmPassword} onChange={e => setFormPassword({ ...formPassword, confirmPassword: e.target.value })} required />
                            </div>
                            <button disabled={changingPassword} className="w-full px-8 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50 transition shadow-lg shadow-red-200">
                                {changingPassword ? 'MEMPROSES...' : 'GANTI PASSWORD'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
