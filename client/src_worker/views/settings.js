// views/settings.js
// Pengaturan - Change password dan update profile (Support Multi-Mapel)
// FIXED: CSRF Protection (secureFetch) & Tag Input Logic

import { getLayoutHtml } from './layout.js';
import { UI_COMPONENTS } from './ui.js';

export function getSettingsPage(school = {}, activePeriod = null) {
    const initialData = { school, activePeriod };
  
    const contentComponent = `
        ${UI_COMPONENTS}

        const { useState, useEffect } = React;
        const userStorage = JSON.parse(localStorage.getItem('user') || 'null');
        const { school: initialSchool, activePeriod } = window.__INITIAL_DATA__;

        function Settings() {
            const [user, setUser] = useState(userStorage);
            
            // State Profil
            const [formProfile, setFormProfile] = useState({
                name: userStorage?.name || '',
                nip: userStorage?.nip || '',
                username: userStorage?.username || '',
                schoolName: initialSchool?.name || '',
                schoolAddress: initialSchool?.address || '',
                headmaster: initialSchool?.headmaster || ''
            });

            // State Multi-Subject (Tag Input)
            // Defaultnya array kosong jika belum ada, atau ambil dari userStorage.subjects
            const [subjects, setSubjects] = useState(userStorage?.subjects || []);
            const [subjectInput, setSubjectInput] = useState('');

            const [formPassword, setFormPassword] = useState({
                oldPassword: '',
                newPassword: '',
                confirmPassword: ''
            });

            const [loading, setLoading] = useState(false);
            const [modal, setModal] = useState({ isOpen: false, type: 'success', message: '' });

            useEffect(() => {
                if(user && user.name) {
                    const sidebarName = document.querySelector('aside .p-6 p.text-zinc-400');
                    if(sidebarName) sidebarName.innerText = user.name;
                }
            }, [user]);

            // --- FUNGSI TAG INPUT (SUBJECTS) ---
            const addSubject = (e) => {
                e.preventDefault();
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
                    addSubject(e);
                }
            };
            // ------------------------------------

            const showNotification = (type, message) => {
                setModal({ isOpen: true, type, message });
            };

            const handleCloseModal = () => {
                setModal({ ...modal, isOpen: false });
                if (modal.message.includes('Password berhasil')) {
                    localStorage.clear();
                    window.location.href = '/';
                }
            };

            const handleUpdateProfile = async (e) => {
                e.preventDefault();
                setLoading(true);
                try {
                    const payload = {
                        user: {
                            username: user.username,
                            name: formProfile.name,
                            nip: formProfile.nip,
                            subjects: subjects // Kirim Array Subjects
                        },
                        school: {
                            name: formProfile.schoolName,
                            address: formProfile.schoolAddress,
                            headmaster: formProfile.headmaster
                        }
                    };

                    const res = await window.secureFetch('/api/save-all-profile', {
                        method: 'POST',
                        body: JSON.stringify(payload)
                    });

                    if (res.ok) {
                        const data = await res.json();
                        localStorage.setItem('user', JSON.stringify(data.user));
                        setUser(data.user);
                        showNotification('success', 'Profil sekolah dan guru berhasil disimpan.');
                    } else {
                        showNotification('error', 'Gagal menyimpan data.');
                    }
                } catch (err) {
                    showNotification('error', 'Terjadi kesalahan koneksi.');
                } finally {
                    setLoading(false);
                }
            };

            const handleChangePassword = async (e) => {
                e.preventDefault();
                if (formPassword.newPassword !== formPassword.confirmPassword) {
                    showNotification('error', 'Konfirmasi password baru tidak cocok!');
                    return;
                }

                try {
                    const res = await window.secureFetch('/api/change-password', {
                        method: 'POST',
                        body: JSON.stringify({
                            username: user.username,
                            oldPassword: formPassword.oldPassword,
                            newPassword: formPassword.newPassword
                        })
                    });

                    const data = await res.json();
                    if (res.ok) {
                        showNotification('success', 'Password berhasil diubah. Silakan login ulang.');
                        setFormPassword({ oldPassword: '', newPassword: '', confirmPassword: '' });
                    } else {
                        showNotification('error', data.error || 'Password lama salah.');
                    }
                } catch (err) {
                    showNotification('error', 'Terjadi kesalahan server.');
                }
            };

            return (
                <AuthGuard>
                    <div className="animate-in fade-in duration-500 pb-20">
                        <CustomAlert 
                            isOpen={modal.isOpen} 
                            type={modal.type} 
                            message={modal.message} 
                            onClose={handleCloseModal} 
                        />

                        <div className="mb-8">
                            <h2 className="text-3xl font-bold text-zinc-900">Pengaturan</h2>
                            <p className="text-zinc-500 mt-2">Kelola profil sekolah, data guru (Mapel), dan keamanan.</p>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-8">
                            {/* KOLOM KIRI: PROFIL */}
                            <div className="card-mono p-8">
                                <h3 className="text-xl font-bold mb-6 pb-4 border-b">Profil Sekolah & Guru</h3>
                                <form onSubmit={handleUpdateProfile} className="space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Nama Guru</label>
                                            <input type="text" className="w-full px-4 py-3 rounded-lg input-mono" value={formProfile.name} onChange={e => setFormProfile({...formProfile, name: e.target.value})} required />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">NIP / ID</label>
                                            <input type="text" className="w-full px-4 py-3 rounded-lg input-mono" value={formProfile.nip} onChange={e => setFormProfile({...formProfile, nip: e.target.value})} />
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
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 256 256" fill="currentColor"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path></svg>
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
                                        <input type="text" className="w-full px-4 py-3 rounded-lg input-mono" value={formProfile.schoolName} onChange={e => setFormProfile({...formProfile, schoolName: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Alamat Sekolah</label>
                                        <textarea className="w-full px-4 py-3 rounded-lg input-mono" rows="2" value={formProfile.schoolAddress} onChange={e => setFormProfile({...formProfile, schoolAddress: e.target.value})}></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Kepala Sekolah</label>
                                        <input type="text" className="w-full px-4 py-3 rounded-lg input-mono" value={formProfile.headmaster} onChange={e => setFormProfile({...formProfile, headmaster: e.target.value})} />
                                    </div>
                                    
                                    <button disabled={loading} className="w-full py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 disabled:opacity-50 transition shadow-lg">
                                        {loading ? 'MENYIMPAN...' : 'SIMPAN PERUBAHAN'}
                                    </button>
                                </form>
                            </div>

                            {/* KOLOM KANAN: KEAMANAN */}
                            <div className="card-mono p-8 h-fit">
                                <h3 className="text-xl font-bold mb-6 pb-4 border-b text-red-600 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80Zm-80,84a12,12,0,1,1,12-12A12,12,0,0,1,128,164Zm40-84H88V56a40,40,0,0,1,80,0Z"></path></svg>
                                    Keamanan Akun
                                </h3>
                                <form onSubmit={handleChangePassword} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Password Lama</label>
                                        <input type="password" className="w-full px-4 py-3 rounded-lg input-mono" value={formPassword.oldPassword} onChange={e => setFormPassword({...formPassword, oldPassword: e.target.value})} required />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Password Baru</label>
                                        <input type="password" className="w-full px-4 py-3 rounded-lg input-mono" value={formPassword.newPassword} onChange={e => setFormPassword({...formPassword, newPassword: e.target.value})} required />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Konfirmasi Password</label>
                                        <input type="password" className="w-full px-4 py-3 rounded-lg input-mono" value={formPassword.confirmPassword} onChange={e => setFormPassword({...formPassword, confirmPassword: e.target.value})} required />
                                    </div>
                                    <button className="w-full px-8 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition shadow-lg shadow-red-200">
                                        GANTI PASSWORD
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </AuthGuard>
            );
        }

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<Settings />);
    `;

    return getLayoutHtml({
        title: 'Pengaturan',
        user: { name: 'Guru' },
        activePeriod,
        initialData,
        contentComponent
    });
}