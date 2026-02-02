// views/dashboard.js
// Dashboard Guru - Clean Layout
// Update: Tombol Presensi jadi ORANGE (Matching Brand)

import { getLayoutHtml } from './layout.js';
import { UI_COMPONENTS } from './ui.js';

export function getDashboardPage(stats = {}, activePeriod = null, school = {}) {
    const initialData = { stats, activePeriod, school };

    const contentComponent = `
        ${UI_COMPONENTS}

        const { useState, useEffect } = React;
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        const { stats, activePeriod, school } = window.__INITIAL_DATA__;

        function Dashboard() {
            const [todaySchedules, setTodaySchedules] = useState([]);
            const [loadingSchedule, setLoadingSchedule] = useState(false);

            useEffect(() => {
                if(user && user.name) {
                    const sidebarName = document.querySelector('aside .p-6 p.text-zinc-400');
                    if(sidebarName) sidebarName.innerText = user.name;
                }

                if (activePeriod) fetchTodaySchedule();
            }, []);

            const fetchTodaySchedule = async () => {
                setLoadingSchedule(true);
                try {
                    const res = await window.secureFetch(\`/api/schedules?period_id=\${activePeriod.id}\`);
                    if (res.ok) {
                        const allSchedules = await res.json();
                        
                        let todayNum = new Date().getDay(); 
                        if (todayNum === 0) todayNum = 7; 

                        const todayData = allSchedules.filter(s => s.day === todayNum);
                        todayData.sort((a, b) => a.start_time.localeCompare(b.start_time));
                        
                        setTodaySchedules(todayData);
                    }
                } catch (e) {
                    console.error("Gagal load jadwal:", e);
                } finally {
                    setLoadingSchedule(false);
                }
            };

            const isNow = (start, end) => {
                const now = new Date();
                const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
                return currentTime >= start && currentTime <= end;
            };

            return (
                <AuthGuard>
                    <div className="animate-in fade-in duration-500 pb-20">
                        
                        {/* HEADER */}
                        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">Dashboard</h2>
                                <p className="text-zinc-500 mt-1">Selamat Datang, {user?.name || 'Bapak Guru'}.</p>
                            </div>
                            <div className="text-right hidden md:block">
                                <span className="px-4 py-2 bg-white rounded-full border border-zinc-200 text-sm font-semibold text-zinc-600 shadow-sm">
                                    {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </span>
                            </div>
                        </div>

                        {!activePeriod && (
                            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-6 py-4 rounded-xl mb-8 flex items-center gap-4 shadow-sm">
                                <span className="text-2xl animate-pulse">{ICONS.warning}</span>
                                <div>
                                    <p className="font-bold">Periode Akademik Belum Aktif!</p>
                                    <p className="text-sm">Silakan ke menu "Periode Akademik" untuk mengaktifkan tahun ajaran.</p>
                                </div>
                            </div>
                        )}
                        
                        {/* JADWAL MENGAJAR HARI INI */}
                        {activePeriod && (
                            <div className="mb-10">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-1.5 h-6 bg-teal-500 rounded-full"></div>
                                    <h3 className="text-lg font-bold text-zinc-800">
                                        Jadwal Mengajar Hari Ini
                                    </h3>
                                    {loadingSchedule && <span className="text-xs text-zinc-400 animate-pulse ml-auto">Sinkronisasi data...</span>}
                                </div>

                                {todaySchedules.length === 0 ? (
                                    <div className="bg-white border border-zinc-200 border-dashed rounded-xl p-10 text-center">
                                        <p className="text-zinc-500 font-medium">Tidak ada jadwal mengajar hari ini.</p>
                                        <p className="text-xs text-zinc-400 mt-1">Anda bisa menyiapkan materi atau beristirahat.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                        {todaySchedules.map((sch) => {
                                            const active = isNow(sch.start_time, sch.end_time);
                                            return (
                                                <div key={sch.id} className={\`relative overflow-hidden rounded-2xl border transition-all duration-300 \${
                                                    active 
                                                    ? 'bg-teal-50/40 border-teal-500 shadow-lg shadow-teal-100/50' 
                                                    : 'bg-white border-zinc-200 hover:border-zinc-300 hover:shadow-md'
                                                }\`}>
                                                    {active && (
                                                        <div className="absolute top-0 right-0">
                                                            <div className="bg-teal-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-bl-xl shadow-sm tracking-wide flex items-center gap-1.5">
                                                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                                                                BERLANGSUNG
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    <div className="p-6">
                                                        <div className="mb-6">
                                                            <span className={\`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold mb-2 \${
                                                                active ? 'bg-teal-100 text-teal-800' : 'bg-zinc-100 text-zinc-500'
                                                            }\`}>
                                                                {sch.start_time} - {sch.end_time} WIB
                                                            </span>
                                                            <h4 className="text-3xl font-bold text-zinc-900 tracking-tight">{sch.class_name}</h4>
                                                            <p className="text-xs font-bold uppercase tracking-wider mt-1 text-zinc-400">
                                                                {sch.subject || user.subject || 'Mapel Umum'}
                                                            </p>
                                                        </div>

                                                        {/* Action Buttons: ORANGE PRESENSI */}
                                                        <div className="flex gap-3 pt-4 border-t border-zinc-100/50">
                                                            <a href="/attendance" className="flex-1 py-3 text-center text-xs font-bold rounded-xl bg-orange-600 text-white hover:bg-orange-700 shadow-sm shadow-orange-200 transition flex items-center justify-center gap-2">
                                                                PRESENSI
                                                            </a>
                                                            <a href="/materials" className="flex-1 py-3 text-center text-xs font-bold rounded-xl border border-teal-100 text-teal-700 bg-white hover:bg-teal-50 transition flex items-center justify-center gap-2">
                                                                BAHAN AJAR
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* SECTION: STATISTIK (CLEAN - NO ICONS) */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
                            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition duration-200 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
                                <div className="flex flex-col justify-between h-full">
                                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Kelas</p>
                                    <p className="text-4xl font-bold text-zinc-900 tracking-tight">{stats.classes || 0}</p>
                                </div>
                            </div>
                            
                            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition duration-200 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-teal-500"></div>
                                <div className="flex flex-col justify-between h-full">
                                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Siswa</p>
                                    <p className="text-4xl font-bold text-zinc-900 tracking-tight">{stats.students || 0}</p>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition duration-200 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-purple-500"></div>
                                <div className="flex flex-col justify-between h-full">
                                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Bahan Ajar</p>
                                    <p className="text-4xl font-bold text-zinc-900 tracking-tight">{stats.materials || 0}</p>
                                </div>
                            </div>
                        </div>

                        {/* SECTION: AKSI CEPAT & INFO */}
                        <div className="grid md:grid-cols-3 gap-6 mb-12">
                            <div className="md:col-span-2 bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
                                <h3 className="text-sm font-bold text-zinc-900 mb-5">Aksi Cepat</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <a href="/schedule" className="group flex flex-col items-center justify-center p-4 rounded-xl border border-zinc-100 bg-zinc-50 hover:bg-teal-50 hover:border-teal-100 transition duration-200">
                                        <span className="text-zinc-400 group-hover:text-teal-600 mb-2 transition">{ICONS.calendar}</span>
                                        <span className="text-xs font-bold text-zinc-600 group-hover:text-teal-700">Jadwal</span>
                                    </a>
                                    <a href="/grades" className="group flex flex-col items-center justify-center p-4 rounded-xl border border-zinc-100 bg-zinc-50 hover:bg-blue-50 hover:border-blue-100 transition duration-200">
                                        <span className="text-zinc-400 group-hover:text-blue-600 mb-2 transition">{ICONS.exam}</span>
                                        <span className="text-xs font-bold text-zinc-600 group-hover:text-blue-700">Nilai</span>
                                    </a>
                                    <a href="/materials" className="group flex flex-col items-center justify-center p-4 rounded-xl border border-zinc-100 bg-zinc-50 hover:bg-purple-50 hover:border-purple-100 transition duration-200">
                                        <span className="text-zinc-400 group-hover:text-purple-600 mb-2 transition">{ICONS.dashboard}</span>
                                        <span className="text-xs font-bold text-zinc-600 group-hover:text-purple-700">Bahan</span>
                                    </a>
                                    <a href="/lab" className="group flex flex-col items-center justify-center p-4 rounded-xl border border-zinc-100 bg-zinc-50 hover:bg-pink-50 hover:border-pink-100 transition duration-200">
                                        <span className="text-zinc-400 group-hover:text-pink-600 mb-2 transition">{ICONS.lab}</span>
                                        <span className="text-xs font-bold text-zinc-600 group-hover:text-pink-700">Virtual Lab</span>
                                    </a>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500">
                                            {ICONS.users}
                                        </div>
                                        <div>
                                            <p className="text-xs text-zinc-400 font-bold uppercase">Guru Pengampu</p>
                                            <p className="font-bold text-zinc-900">{user?.name || 'Guru'}</p>
                                        </div>
                                    </div>
                                    <div className="h-px bg-zinc-100 my-4"></div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200ZM80,148a12,12,0,1,1,12-12A12,12,0,0,1,80,148Zm48,0a12,12,0,1,1,12-12A12,12,0,0,1,128,148Zm48,0a12,12,0,1,1,12-12A12,12,0,0,1,176,148Z"></path></svg>
                                        </div>
                                        <div>
                                            <p className="text-xs text-zinc-400 font-bold uppercase">Sekolah</p>
                                            <p className="font-bold text-zinc-900 text-sm truncate">{school?.name || '-'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 pt-4 border-t border-zinc-100">
                                    <a href="/settings" className="block w-full text-center py-2 text-xs font-bold text-zinc-400 hover:text-black hover:bg-zinc-50 rounded-lg transition">
                                        PENGATURAN PROFIL
                                    </a>
                                </div>
                            </div>
                        </div>

                    </div>
                </AuthGuard>
            );
        }

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<Dashboard />);
    `;

    return getLayoutHtml({
        title: 'Dashboard',
        user: { name: 'Guru' },
        activePeriod,
        initialData,
        contentComponent
    });
}