import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentTasks from './StudentTasks';
import { QuizCard, QuizRunner, QuizReview } from './StudentCBT';
import StudentCBTOffline from './StudentCBTOffline';

import { BookOpen, ClipboardList, Trophy, BarChart2, User, FileText } from 'lucide-react';

const getEmbedUrl = (url) => {
    if (!url) return '';

    // 1. Google Drive - Tidak bisa di-iframe, return null untuk trigger fallback UI
    if (url.includes('drive.google.com')) {
        return null; // Signal to show external link only
    }

    // 2. YouTube (Embed Mode) - Aman dari X-Frame blocks
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoId = url.split('v=')[1] || url.split('/').pop();
        const cleanId = videoId?.split('&')[0];
        return `https://www.youtube.com/embed/${cleanId}?autoplay=0`;
    }

    // 3. PDF Files (Use Google Docs Viewer for better mobile support)
    // Checks for .pdf extension (case insensitive)
    if (url.toLowerCase().endsWith('.pdf')) {
        return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
    }

    // 4. General Files (R2/External) -> Use Proxy to bypass CORS/X-Frame
    return `/api/proxy?url=${encodeURIComponent(url)}`;
};

// Student Grade View Component
function StudentGradeView({ student, gradesHidden }) {
    const [gradeData, setGradeData] = useState(null);
    const [loadingGrade, setLoadingGrade] = useState(true);
    const [isHidden, setIsHidden] = useState(gradesHidden || false);

    useEffect(() => {
        if (gradesHidden) {
            setIsHidden(true);
            setLoadingGrade(false);
            return;
        }
        const fetchGrade = async () => {
            try {
                const token = localStorage.getItem('student_token');
                const deviceId = localStorage.getItem('student_device_id');
                const res = await fetch(
                    `/api/student/grade-recap?student_id=${student.id}&class_id=${student.class_id}&period_id=${student.period_id}`,
                    { headers: { 'Authorization': `Bearer ${token}`, 'X-Device-Id': deviceId } }
                );
                if (res.ok) {
                    const json = await res.json();
                    if (json.hidden) {
                        setIsHidden(true);
                    } else {
                        setGradeData(json);
                    }
                }
            } catch (e) { console.error(e); }
            setLoadingGrade(false);
        };
        fetchGrade();
    }, [student, gradesHidden]);

    if (loadingGrade) {
        return (
            <div className="flex flex-col items-center justify-center pt-16 pb-24">
                <div className="w-32 h-32 bg-zinc-900 rounded-full animate-pulse mb-4" />
                <div className="w-24 h-4 bg-zinc-900 rounded animate-pulse" />
            </div>
        );
    }

    if (isHidden) {
        return (
            <div className="flex flex-col items-center justify-center pt-16 pb-24 text-center px-6">
                <div className="w-20 h-20 bg-zinc-900 rounded-2xl flex items-center justify-center mb-6 border border-zinc-800">
                    <span className="text-4xl">🔒</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Nilai Belum Ditampilkan</h3>
                <p className="text-sm text-zinc-500 max-w-xs">Guru belum membuka akses nilai untuk kelas ini. Silakan hubungi guru Anda.</p>
            </div>
        );
    }

    if (!gradeData) {
        return (
            <div className="p-8 text-center text-zinc-500 mt-10">
                <p className="text-lg mb-1">📊</p>
                <p className="text-sm">Nilai belum tersedia.</p>
                <p className="text-xs text-zinc-600 mt-1">Guru belum mengatur komponen penilaian.</p>
            </div>
        );
    }

    const { final_grade, kkm, is_below_kkm, is_remedial, breakdown } = gradeData;
    const percentage = Math.min(100, (final_grade / 100) * 100);
    const circumference = 2 * Math.PI * 54;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="flex flex-col items-center pt-8 pb-24 animate-in fade-in">
            {/* Circular Grade Display */}
            <div className="relative w-36 h-36 mb-6">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="#27272a" strokeWidth="8" />
                    <circle
                        cx="60" cy="60" r="54" fill="none"
                        stroke={is_remedial ? '#22c55e' : is_below_kkm ? '#ef4444' : '#3b82f6'}
                        strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-3xl font-black ${is_below_kkm && !is_remedial ? 'text-red-400' : 'text-white'}`}>
                        {final_grade.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-bold mt-0.5">NILAI AKHIR</span>
                </div>
            </div>

            {/* KKM Badge */}
            <div className={`px-4 py-2 rounded-xl text-xs font-bold mb-6 ${is_remedial ? 'bg-green-900/30 text-green-400 border border-green-800' :
                is_below_kkm ? 'bg-red-900/30 text-red-400 border border-red-800' :
                    'bg-blue-900/30 text-blue-400 border border-blue-800'
                }`}>
                {is_remedial ? '✅ Tuntas (Remedial)' : is_below_kkm ? `⚠️ Di Bawah KKM (${kkm})` : `✅ Tuntas (KKM: ${kkm})`}
            </div>

            {/* Breakdown Table (if enabled by teacher) */}
            {breakdown && breakdown.length > 0 && (
                <div className="w-full bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-800">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Rincian Nilai</h3>
                    </div>
                    <div className="divide-y divide-zinc-800">
                        {breakdown.map((item, i) => (
                            <div key={i} className="flex justify-between items-center px-4 py-3">
                                <div>
                                    <span className="text-sm text-white font-medium">{item.name}</span>
                                    <span className="text-[10px] text-zinc-600 ml-2">({item.weight}%)</span>
                                </div>
                                <span className={`text-sm font-bold ${item.value !== null ? 'text-white' : 'text-zinc-600'}`}>
                                    {item.value !== null ? item.value.toFixed(1) : '-'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function StudentPortal() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('MATERI');
    const [data, setData] = useState(null); // Dashboard Data
    const [loading, setLoading] = useState(true);
    const [isPWA, setIsPWA] = useState(true); // Default true to avoid flash

    // CBT STATE
    const [activeQuizId, setActiveQuizId] = useState(null);
    const [reviewQuizId, setReviewQuizId] = useState(null);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // PWA CHECK
    useEffect(() => {
        const checkPWA = () => {
            const isApp =
                window.matchMedia('(display-mode: standalone)').matches ||
                window.navigator.standalone === true ||
                document.referrer.includes('android-app://');
            setIsPWA(isApp);
        };
        checkPWA();
        window.addEventListener('resize', checkPWA);
        return () => window.removeEventListener('resize', checkPWA);
    }, []);

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

    // --- NON-PWA BLOCK (Block entire portal from browser) ---
    if (!isPWA) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-8 text-center">
                <div className="w-20 h-20 bg-red-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                    <span className="text-4xl">🔒</span>
                </div>
                <h1 className="text-2xl font-bold mb-4">Akses Ditolak</h1>
                <p className="text-zinc-400 mb-8 max-w-sm">
                    Portal Siswa hanya bisa diakses melalui <strong className="text-white">aplikasi yang terinstall</strong>.
                </p>
                <button
                    onClick={() => navigate('/student')}
                    className="px-8 py-3 bg-white text-black rounded-xl font-bold"
                >
                    Ke Halaman Install
                </button>
            </div>
        );
    }

    // --- FULL SCREEN MODES ---
    if (activeQuizId && data) {
        const quiz = data.quizzes.find(q => q.id === activeQuizId);

        // Branching: Use offline component for offline mode quizzes
        if (quiz?.is_offline_mode === 1) {
            return <StudentCBTOffline
                quiz={quiz}
                onFinish={() => { setActiveQuizId(null); refreshData(); }}
            />;
        }

        // Regular online quiz
        return <QuizRunner
            quizId={activeQuizId}
            studentId={data.student.id}
            duration={quiz?.duration}
            onFinish={() => { setActiveQuizId(null); refreshData(); }}
        />;
    }

    if (reviewQuizId && data) {
        return <QuizReview quizId={reviewQuizId} onBack={() => setReviewQuizId(null)} />;
    }

    // --- MAIN RENDER ---
    if (loading) return <div className="flex items-center justify-center min-h-screen bg-black text-white"><div className="animate-spin text-4xl">⚓</div></div>;
    if (!data) return <div className="flex items-center justify-center min-h-screen bg-black text-white p-6 text-center">Gagal memuat data. Periksa koneksi internet.<br /><button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-white text-black rounded font-bold">Refresh</button></div>;


    const renderContent = () => {
        if (activeTab === 'MATERI') return (
            <div className="space-y-3 pb-24">
                <h2 className="text-xl font-bold mb-4 px-1">Materi Pelajaran</h2>
                {data.materials.length === 0 ? (
                    <div className="text-center p-8 text-zinc-600 bg-zinc-900 rounded-2xl border border-zinc-800 border-dashed">
                        Belum ada materi untuk saat ini.
                    </div>
                ) : (
                    data.materials.map(m => (
                        <div key={m.id}
                            onClick={() => setSelectedMaterial(m)}
                            className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex items-center gap-4 hover:bg-zinc-800 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer shadow-sm group">
                            <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 group-hover:text-white transition shadow-inner">
                                <FileText size={24} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-white truncate text-lg mb-0.5">{m.title}</h3>
                                <p className="text-xs text-zinc-500 truncate font-medium">{m.description || 'Tidak ada deskripsi'}</p>
                            </div>
                            <span className="text-zinc-600 group-hover:text-zinc-400">↗</span>
                        </div>
                    ))
                )}
            </div>
        );
        if (activeTab === 'TUGAS') return <StudentTasks student={data.student} onBack={() => setActiveTab('MATERI')} />;
        if (activeTab === 'QUIZ') return (
            <div className="space-y-3 pb-24">
                <h2 className="text-xl font-bold mb-4 px-1">Quiz & Ujian</h2>
                {(!data.quizzes || data.quizzes.length === 0) ? (
                    <div className="text-center p-8 text-zinc-600 bg-zinc-900 rounded-2xl border border-zinc-800 border-dashed">
                        Belum ada quiz untuk saat ini.
                    </div>
                ) : (
                    data.quizzes.map(q => (
                        <QuizCard
                            key={q.id}
                            quiz={q}
                            onStart={(id) => setActiveQuizId(id)}
                            onReview={(id) => setReviewQuizId(id)}
                        />
                    ))
                )}
            </div>
        );
        if (activeTab === 'NILAI') {
            return <StudentGradeView student={data.student} gradesHidden={data.gradesHidden} />;
        }
        if (activeTab === 'PROFIL') return (
            <div className="flex flex-col items-center justify-center pt-10 px-6 animate-in fade-in cursor-default">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-2xl mb-6 ring-4 ring-black/50">
                    {data.student.name.charAt(0)}
                </div>
                <h2 className="text-2xl font-bold text-white text-center mb-1">{data.student.name}</h2>
                <p className="text-zinc-500 text-sm font-medium mb-8 bg-zinc-900 px-4 py-1.5 rounded-full border border-zinc-800">
                    {data.student.nis} • {data.student.class_name}
                </p>

                <div className="w-full bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden divide-y divide-zinc-800 shadow-lg">
                    <div className="p-4 flex justify-between items-center hover:bg-zinc-800/50 transition">
                        <span className="text-zinc-400 text-sm font-medium">Status</span>
                        <span className="text-green-500 font-bold text-sm bg-green-500/10 px-3 py-1 rounded-lg">Aktif</span>
                    </div>
                </div>

                <div className="mt-12 text-center space-y-2 opacity-50 hover:opacity-100 transition duration-500">
                    <p className="text-[10px] text-zinc-600 font-mono tracking-widest uppercase">AlkeMia Learning System</p>
                    <p className="text-[10px] text-zinc-700">Protected by Cloudflare Zero Trust</p>
                </div>

                <div className="fixed bottom-24 left-0 right-0 pointer-events-none flex justify-center pb-safe">
                    <div className="bg-zinc-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-zinc-800 pointer-events-auto shadow-xl">
                        <p className="text-center text-xs text-zinc-600">App Version 2.4 (Proxy & Alert Logic Fix)<br />Device ID: ...{localStorage.getItem('student_device_id')?.slice(-6)}</p>
                    </div>
                </div>
            </div>
        );
        return null;
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
                            <button
                                onClick={refreshData}
                                disabled={isRefreshing}
                                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 border border-orange-500 rounded-xl text-white font-bold text-xs uppercase tracking-wide active:scale-95 transition shadow-lg disabled:opacity-50"
                            >
                                <span className={isRefreshing ? "animate-spin text-base" : "text-base"}>↻</span>
                                <span className="hidden sm:inline">REFRESH</span>
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
                            const Icon =
                                tab === 'MATERI' ? BookOpen :
                                    tab === 'TUGAS' ? ClipboardList :
                                        tab === 'QUIZ' ? Trophy :
                                            tab === 'NILAI' ? BarChart2 : User;
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
                        </div>
                        <button onClick={() => setSelectedMaterial(null)} className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white transition">
                            ✕
                        </button>
                    </div>
                    <div className="flex-1 bg-black relative flex items-center justify-center">
                        {getEmbedUrl(selectedMaterial.file_url) ? (
                            <iframe
                                src={getEmbedUrl(selectedMaterial.file_url)}
                                className="w-full h-full border-0"
                                allow="autoplay; encrypted-media; fullscreen"
                                allowFullScreen
                                onError={(e) => console.log("Iframe Error", e)}
                            ></iframe>
                        ) : (
                            <div className="text-center p-8">
                                <h3 className="text-2xl font-bold text-white mb-8">{selectedMaterial.title}</h3>
                                <a
                                    href={selectedMaterial.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-block bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-lg"
                                >
                                    Buka Materi ↗
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

