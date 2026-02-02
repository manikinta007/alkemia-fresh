import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentTasks from './StudentTasks';
import { QuizCard, QuizRunner, QuizReview } from './StudentCBT';

// --- ICONS ---
const Icons = {
    Materi: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>,
    Tugas: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>,
    Quiz: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>,
    Nilai: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z"></path></svg>,
    Profil: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
};

const getEmbedUrl = (url) => {
    if (!url) return '';
    if (url.includes('drive.google.com')) return url.replace('/view', '/preview');
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const v = url.split('v=')[1] || url.split('/').pop();
        return 'https://www.youtube.com/embed/' + v;
    }
    return url;
};

export default function StudentPortal() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('MATERI');
    const [data, setData] = useState(null); // Dashboard Data
    const [loading, setLoading] = useState(true);

    // CBT STATE
    const [activeQuizId, setActiveQuizId] = useState(null);
    const [reviewQuizId, setReviewQuizId] = useState(null);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // AUTH CHECK
    useEffect(() => {
        const verify = async () => {
            const token = localStorage.getItem('student_token');
            const deviceId = localStorage.getItem('student_device_id');
            if (!token || !deviceId) { navigate('/student'); return; }

            try {
                const res = await fetch('/api/student/dashboard', {
                    headers: { 'Authorization': `Bearer ${token}`, 'X-Device-Id': deviceId }
                });
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                } else {
                    localStorage.removeItem('student_token');
                    navigate('/student');
                }
            } catch (e) {
                console.error(e); // Offline/Error
            }
            setLoading(false);
        };
        verify();
    }, [navigate]);

    // REFRESH DATA (e.g. after submitting quiz)
    const refreshData = async () => {
        setIsRefreshing(true);
        try {
            const token = localStorage.getItem('student_token');
            const deviceId = localStorage.getItem('student_device_id');
            const res = await fetch('/api/student/dashboard', {
                headers: { 'Authorization': `Bearer ${token}`, 'X-Device-Id': deviceId }
            });
            if (res.ok) setData(await res.json());
        } catch (e) { }
        setIsRefreshing(false);
    };

    const handleLogout = () => {
        if (confirm('Yakin ingin log out? Anda harus scan QR lagi untuk masuk.')) {
            localStorage.removeItem('student_token');
            navigate('/student');
        }
    };

    // --- FULL SCREEN MODES ---
    if (activeQuizId && data) {
        return <QuizRunner
            quizId={activeQuizId}
            studentId={data.student.id}
            duration={data.quizzes.find(q => q.id === activeQuizId)?.duration}
            onFinish={() => { setActiveQuizId(null); refreshData(); }}
        />;
    }

    if (reviewQuizId && data) {
        return <QuizReview quizId={reviewQuizId} onBack={() => setReviewQuizId(null)} />;
    }

    // --- MAIN RENDER ---
    if (loading) return <div className="flex items-center justify-center min-h-screen bg-black text-white"><div className="animate-spin text-4xl">⚓</div></div>;
    if (!data) return <div className="flex items-center justify-center min-h-screen bg-black text-white p-6 text-center">Gagal memuat data. Periksa koneksi internet.<br /><button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-white text-black rounded font-bold">Refresh</button></div>;

    // RENDER TAB CONTENT
    const renderContent = () => {
        switch (activeTab) {
            case 'MATERI':
                return (
                    <div className="space-y-4 animate-in fade-in">
                        <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2"><span className="text-blue-500">📚</span> Materi Pelajaran</h2>
                        {data.materials.length === 0 ? (
                            <div className="text-zinc-500 text-center py-10 italic">Belum ada materi dibagikan.</div>
                        ) : (
                            data.materials.map(m => (
                                <div key={m.id} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex gap-4 items-center hover:bg-zinc-800 transition active:scale-95 cursor-pointer" onClick={() => setSelectedMaterial(m)}>
                                    <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center text-2xl shadow-inner">
                                        {m.type === 'video' ? '📺' : '📄'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-white font-bold truncate">{m.title}</h3>
                                        <p className="text-xs text-zinc-500 truncate">{m.description || 'Klik untuk membuka file'}</p>
                                    </div>
                                    <div className="text-zinc-500">↗</div>
                                </div>
                            ))
                        )}
                    </div>
                );
            case 'TUGAS':
                return <StudentTasks student={data.student} onBack={() => setActiveTab('MATERI')} />;
            case 'QUIZ':
                return (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-white font-bold text-xl">Ujian & Kuis</h2>
                            <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded">{data.quizzes.length} Tersedia</span>
                        </div>
                        {data.quizzes.length === 0 && <div className="text-zinc-500 text-center py-10">Tidak ada jadwal ujian.</div>}
                        {data.quizzes.map(q => (
                            <QuizCard
                                key={q.id}
                                quiz={q}
                                onStart={(id) => setActiveQuizId(id)}
                                onReview={(id) => setReviewQuizId(id)}
                            />
                        ))}
                    </div>
                );
            case 'NILAI':
                return (
                    <div className="space-y-4 animate-in fade-in">
                        <h2 className="text-white font-bold text-xl mb-4">Rekap Nilai</h2>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                                <p className="text-zinc-500 text-xs uppercase mb-1">Rata-rata Tugas</p>
                                <p className="text-3xl font-black text-orange-500">{data.grades?.avg_task || '-'}</p>
                            </div>
                            <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                                <p className="text-zinc-500 text-xs uppercase mb-1">Rata-rata Kuis</p>
                                <p className="text-3xl font-black text-blue-500">{data.grades?.avg_quiz || '-'}</p>
                            </div>
                        </div>
                        {/* Detail List could go here if API provided detailed history */}
                        <div className="bg-zinc-900/50 p-6 rounded-xl border border-dashed border-zinc-800 text-center">
                            <p className="text-zinc-500 text-sm">Detail riwayat nilai dapat dilihat pada masing-masing menu Tugas dan Quiz.</p>
                        </div>
                    </div>
                );
            case 'PROFIL':
                return (
                    <div className="space-y-6 animate-in fade-in">
                        <h2 className="text-white font-bold text-xl">Profil Saya</h2>
                        <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 text-center">
                            <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl shadow-xl">
                                🎓
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-1">{data.student.name}</h3>
                            <p className="text-zinc-400">{data.student.nis}</p>
                            <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-2 gap-4 text-left">
                                <div><p className="text-xs text-zinc-500 uppercase">Kelas</p><p className="font-bold text-white">{data.student.class}</p></div>
                                <div><p className="text-xs text-zinc-500 uppercase">Status</p><p className="font-bold text-green-500">Aktif</p></div>
                            </div>
                        </div>


                        <p className="text-center text-xs text-zinc-600">App Version 2.3 (Fallback & Debug)<br />Device ID: ...{localStorage.getItem('student_device_id')?.slice(-6)}</p>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="bg-zinc-950 h-screen text-white font-sans selection:bg-blue-500/30 overflow-hidden flex flex-col items-center">
            {/* MAIN CONTENT AREA */}
            <div className="w-full max-w-md h-full bg-zinc-950 relative shadow-2xl flex flex-col">
                {/* FLOATING HEADER (Sticky Top) */}
                <header className="px-5 pt-safe pt-6 pb-2 bg-zinc-950 z-10 shrink-0 border-b border-transparent transition-all">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <p className="text-xs text-zinc-500 font-medium mb-0.5">Selamat Datang,</p>
                            <h1 className="text-xl font-bold text-white tracking-tight">{data.student.name.split(' ')[0]}</h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={refreshData} disabled={isRefreshing} className="w-10 h-10 flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded-full text-orange-500 active:scale-95 transition shadow-lg">
                                <span className={isRefreshing ? "animate-spin" : ""}>↻</span>
                            </button>
                            <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 font-bold text-sm shadow-lg">{data.student.name.substring(0, 2)}</div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 p-4 rounded-2xl border border-zinc-700/50 flex justify-between items-center shadow-lg">
                        <div>
                            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-1">KELAS AKTIF</p>
                            <p className="text-lg font-bold text-white">{data.student.class}</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-5 pt-2 scrollbar-hide pb-24">
                    {renderContent()}
                </div>

                {/* BOTTOM NAVIGATION */}
                <div className="fixed bottom-0 left-0 right-0 z-50 glass-nav pb-safe pointer-events-none">
                    <div className="max-w-md mx-auto pointer-events-auto flex justify-around items-center p-2">
                        {['MATERI', 'TUGAS', 'QUIZ', 'NILAI', 'PROFIL'].map((tab) => {
                            const isActive = activeTab === tab;
                            const Icon = Icons[tab.charAt(0) + tab.slice(1).toLowerCase()];
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all duration-300 w-16 ${isActive ? 'text-blue-400 scale-110' : 'text-zinc-600 hover:text-zinc-400'}`}
                                >
                                    <Icon />
                                    <span className="text-[10px] font-bold">{tab}</span>
                                    {isActive && <div className="w-1 h-1 bg-blue-500 rounded-full mt-1"></div>}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* MODAL PRESENTASI MATERI (MOVED TO ROOT) */}
            {selectedMaterial && (
                <div className="fixed inset-0 z-[9999] bg-black flex flex-col animate-in slide-in-from-bottom duration-300">
                    <div className="flex items-center justify-between px-4 py-4 bg-zinc-900 text-white shadow-md pt-safe border-b border-zinc-800">
                        <div className="flex-1 min-w-0 pr-4">
                            <h3 className="text-sm font-bold truncate text-zinc-200">{selectedMaterial.title}</h3>
                            <a href={selectedMaterial.file_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 underline flex items-center gap-1">
                                Buka di Browser Luar ↗
                            </a>
                        </div>
                        <button onClick={() => setSelectedMaterial(null)} className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white transition">
                            ✕
                        </button>
                    </div>
                    <div className="flex-1 bg-black relative flex items-center justify-center">
                        <iframe
                            src={getEmbedUrl(selectedMaterial.file_url)}
                            className="w-full h-full border-0"
                            allow="autoplay; encrypted-media; fullscreen"
                            allowFullScreen
                            onError={(e) => console.log("Iframe Error", e)}
                        ></iframe>
                    </div>
                </div>
            )}
        </div>
    );
}

