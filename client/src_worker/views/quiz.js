// views/quiz.js
// Manajemen Quiz / CBT untuk Guru
// FINAL VERSION: React Portal + Live Leaderboard + Animations
// UPDATE: Increased Top Padding (pt-40) to prevent Crown/Medal clipping

import { getLayoutHtml } from './layout.js';
import { UI_COMPONENTS } from './ui.js';

export function getQuizPage(classes = [], activePeriod = null) {
    const initialData = { classes, activePeriod };

    const contentComponent = UI_COMPONENTS + `

        const { useState, useEffect, useRef } = React;
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        const { classes: initialClasses, activePeriod: initialPeriod } = window.__INITIAL_DATA__;

        /* --- LOCAL COMPONENT: LEADERBOARD VIEW (PORTAL + ANIMATION) --- */
        const LeaderboardView = ({ results, onClose }) => {
            const [animatingIds, setAnimatingIds] = useState(new Set());
            const prevResultsRef = useRef({}); 

            // [LOGIC] Watcher: Deteksi perubahan nilai untuk trigger animasi
            useEffect(() => {
                const newAnimatingIds = new Set();
                const currentMap = {};
                let hasChanges = false;

                results.forEach(r => {
                    if (!r.finish_time) return; 
                    
                    currentMap[r.student_id] = r.score;
                    const prevScore = prevResultsRef.current[r.student_id];

                    if (prevScore === undefined || r.score !== prevScore) {
                        newAnimatingIds.add(r.student_id);
                        hasChanges = true;
                    }
                });

                if (hasChanges) {
                    setAnimatingIds(prev => {
                        const next = new Set(prev);
                        newAnimatingIds.forEach(id => next.add(id));
                        return next;
                    });

                    setTimeout(() => {
                        setAnimatingIds(prev => {
                            const next = new Set(prev);
                            newAnimatingIds.forEach(id => next.delete(id));
                            return next;
                        });
                    }, 3000);
                }

                prevResultsRef.current = currentMap;
            }, [results]);

            // [LOGIC] Sorting
            const sortedResults = [...results].sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                const durA = new Date(a.finish_time) - new Date(a.start_time);
                const durB = new Date(b.finish_time) - new Date(b.start_time);
                return durA - durB;
            });

            const slots = Array(10).fill(null).map((_, i) => sortedResults[i] || null);
            const top3 = slots.slice(0, 3);
            const listSlots = slots.slice(3, 10);

            const formatDuration = (start, end) => {
                if(!start || !end) return '--:--';
                const diff = Math.floor((new Date(end) - new Date(start)) / 1000);
                const m = Math.floor(diff / 60);
                const s = diff % 60;
                return \`\${m}m \${s}s\`;
            };

            const rankColors = [
                'from-cyan-500 to-blue-500',
                'from-emerald-500 to-green-500',
                'from-violet-500 to-purple-500',
                'from-rose-500 to-pink-500',
                'from-amber-500 to-orange-500',
                'from-indigo-500 to-blue-600',
                'from-slate-500 to-zinc-600'
            ];

            return ReactDOM.createPortal(
                <div className="fixed inset-0 z-[9999] bg-zinc-900 text-white flex flex-col animate-in fade-in duration-300 overflow-hidden font-sans">
                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md z-50">
                        <div className="flex items-center gap-4">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_red]"></div>
                            <h2 className="text-2xl font-black tracking-tighter italic uppercase text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">LIVE LEADERBOARD</h2>
                        </div>
                        <button onClick={onClose} className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-full font-bold text-sm transition border border-zinc-700">TUTUP</button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-8 relative flex flex-col">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none mix-blend-overlay"></div>
                        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-transparent to-zinc-900 pointer-events-none"></div>

                        {/* PODIUM SECTION */}
                        {/* [FIX] Updated pt-20 -> pt-40 to prevent Crown Clipping */}
                        <div className="flex justify-center items-end gap-2 md:gap-8 mb-8 pt-40 min-h-[320px] z-10 flex-shrink-0">
                            {/* Rank 2 */}
                            <div className="flex flex-col items-center w-1/3 max-w-[200px] transition-all duration-500 relative">
                                <div className="mb-3 text-center animate-in slide-in-from-bottom duration-700 delay-100 w-full">
                                    <div className={\`text-lg md:text-xl font-black truncate w-full px-2 drop-shadow-md \${top3[1] ? 'text-zinc-300' : 'text-zinc-500 italic'}\`}>
                                        {top3[1] ? top3[1].student_name : "AYOOO, KAMU BISA!!!"}
                                    </div>
                                    {top3[1] && <div className="text-xs md:text-sm font-mono text-zinc-400 bg-black/40 px-2 py-1 rounded inline-block mt-1">⏱ {formatDuration(top3[1].start_time, top3[1].finish_time)}</div>}
                                </div>
                                <div className={\`w-full h-40 md:h-56 bg-gradient-to-t from-zinc-500 to-zinc-300 rounded-t-3xl flex flex-col justify-end items-center pb-4 shadow-[0_0_40px_rgba(255,255,255,0.15)] border-t-4 border-zinc-200 relative transform transition-all duration-500 \${top3[1] && animatingIds.has(top3[1].student_id) ? 'scale-110 ring-4 ring-white shadow-[0_0_100px_white] z-20' : 'hover:scale-105'}\`}>
                                    <div className="text-5xl md:text-7xl font-black text-zinc-700/30">2</div>
                                    <div className="absolute -top-10 md:-top-14 text-5xl md:text-7xl drop-shadow-xl animate-bounce" style={{animationDuration: '3s'}}>🥈</div>
                                    <div className="bg-black/30 backdrop-blur-sm px-4 py-1 rounded-full text-2xl md:text-3xl font-black mt-2 text-white border border-white/10">{top3[1] ? top3[1].score : "?"}</div>
                                </div>
                            </div>

                            {/* Rank 1 */}
                            <div className="flex flex-col items-center w-1/3 max-w-[240px] -mt-10 transition-all duration-500 relative z-20">
                                <div className="absolute -top-16 md:-top-20 text-6xl md:text-8xl drop-shadow-[0_0_30px_rgba(234,179,8,0.8)] animate-bounce z-20">👑</div>
                                <div className="mb-3 text-center animate-in slide-in-from-bottom duration-700 z-10 w-full">
                                    <div className={\`text-xl md:text-3xl font-black truncate w-full px-2 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] \${top3[0] ? 'text-yellow-400' : 'text-yellow-600/70 italic'}\`}>
                                        {top3[0] ? top3[0].student_name : "AYOOO, KAMU BISA!!!"}
                                    </div>
                                    {top3[0] && <div className="text-xs md:text-sm font-mono text-yellow-200/80 bg-black/40 px-2 py-1 rounded inline-block mt-1">⏱ {formatDuration(top3[0].start_time, top3[0].finish_time)}</div>}
                                </div>
                                <div className={\`w-full h-56 md:h-72 bg-gradient-to-t from-yellow-600 via-yellow-500 to-yellow-300 rounded-t-3xl flex flex-col justify-end items-center pb-6 shadow-[0_0_60px_rgba(234,179,8,0.5)] border-t-4 border-yellow-100 relative transform transition-all duration-500 ring-4 ring-yellow-500/20 \${top3[0] && animatingIds.has(top3[0].student_id) ? 'scale-110 ring-4 ring-yellow-300 shadow-[0_0_100px_rgba(234,179,8,1)] z-20' : 'hover:scale-105'}\`}>
                                    <div className="text-7xl md:text-8xl font-black text-yellow-900/20">1</div>
                                    <div className="bg-black/30 backdrop-blur-sm px-6 py-2 rounded-full text-4xl md:text-5xl font-black mt-2 text-white border border-white/20 shadow-inner">{top3[0] ? top3[0].score : "?"}</div>
                                    <div className="absolute inset-0 overflow-hidden rounded-t-3xl"><div className="absolute top-0 left-1/4 w-2 h-2 bg-white rounded-full animate-ping"></div></div>
                                </div>
                            </div>

                            {/* Rank 3 */}
                            <div className="flex flex-col items-center w-1/3 max-w-[200px] transition-all duration-500 relative">
                                <div className="mb-3 text-center animate-in slide-in-from-bottom duration-700 delay-200 w-full">
                                    <div className={\`text-lg md:text-xl font-black truncate w-full px-2 drop-shadow-md \${top3[2] ? 'text-orange-300' : 'text-orange-800 italic'}\`}>
                                        {top3[2] ? top3[2].student_name : "AYOOO, KAMU BISA!!!"}
                                    </div>
                                    {top3[2] && <div className="text-xs md:text-sm font-mono text-zinc-400 bg-black/40 px-2 py-1 rounded inline-block mt-1">⏱ {formatDuration(top3[2].start_time, top3[2].finish_time)}</div>}
                                </div>
                                <div className={\`w-32 h-32 md:h-44 bg-gradient-to-t from-orange-800 to-orange-400 rounded-t-3xl flex flex-col justify-end items-center pb-4 shadow-[0_0_30px_rgba(249,115,22,0.15)] border-t-4 border-orange-300 relative transform transition-all duration-500 \${top3[2] && animatingIds.has(top3[2].student_id) ? 'scale-110 ring-4 ring-orange-300 shadow-[0_0_100px_orange] z-20' : 'hover:scale-105'}\`}>
                                    <div className="text-4xl font-black text-orange-900/40">3</div>
                                    <div className="absolute -top-10 md:-top-12 text-5xl md:text-7xl drop-shadow-xl animate-bounce" style={{animationDuration: '2.5s'}}>🥉</div>
                                    <div className="bg-black/20 px-4 py-1 rounded-full text-2xl font-black mt-2 text-white">{top3[2] ? top3[2].score : "?"}</div>
                                </div>
                            </div>
                        </div>

                        {/* LIST SECTION (Centered Balance) */}
                        <div className="max-w-6xl mx-auto w-full flex flex-wrap justify-center gap-4 px-4 pb-20 z-10">
                            {listSlots.map((r, i) => {
                                const bgGradient = rankColors[i] || 'from-zinc-700 to-zinc-800';
                                const isAnimating = r && animatingIds.has(r.student_id);
                                
                                return (
                                    <div key={i} className={\`relative overflow-hidden rounded-xl border border-white/5 p-1 transition-all duration-500 w-full md:w-[48%] lg:w-[32%] xl:w-[23%] min-w-[260px] \${isAnimating ? 'bg-white scale-105 z-20 shadow-[0_0_50px_rgba(255,255,255,0.5)]' : 'bg-zinc-800/40 hover:scale-105 hover:shadow-lg'}\`}>
                                        <div className={\`flex items-center gap-4 h-full p-3 rounded-lg bg-gradient-to-br relative overflow-hidden transition-colors duration-500 \${isAnimating ? 'from-white to-zinc-100' : bgGradient}\`}>
                                            <div className={\`w-10 h-10 backdrop-blur-md rounded-lg flex items-center justify-center font-black text-lg shadow-inner border border-white/10 \${isAnimating ? 'bg-black text-white' : 'bg-black/30 text-white'}\`}>#{i + 4}</div>
                                            <div className="flex-1 min-w-0 z-10">
                                                <div className={\`font-bold truncate text-lg drop-shadow-md \${!r ? 'italic text-white/60' : ''} \${isAnimating ? 'text-black' : 'text-white'}\`}>{r ? r.student_name : 'AYOOO, KAMU BISA!!!'}</div>
                                                <div className={\`text-xs font-mono flex items-center gap-1 \${isAnimating ? 'text-zinc-600' : 'text-white/70'}\`}><span>⏱</span> {r ? formatDuration(r.start_time, r.finish_time) : '--:--'}</div>
                                            </div>
                                            <div className={\`backdrop-blur-md px-3 py-1 rounded-lg font-black text-2xl shadow-sm border border-white/20 \${isAnimating ? 'bg-black text-white' : 'bg-white/20 text-white'}\`}>{r ? r.score : '?'}</div>
                                            {!isAnimating && <div className="absolute top-0 right-0 w-20 h-full bg-white/5 skew-x-12"></div>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>,
                document.body
            );
        };

        /* --- LOCAL COMPONENT: ACTIVATION MODAL --- */
        const ActivationModal = ({ isOpen, onClose, onConfirm }) => {
            if (!isOpen) return null;
            const [date, setDate] = useState('');
            const handleSubmit = () => { if (!date) return alert("Pilih tanggal pelaksanaan!"); onConfirm(date); };
            return (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 transform transition-all scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold">📅</div>
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

        /* --- LOCAL COMPONENT: COPY QUIZ MODAL --- */
        const CopyQuizModal = ({ isOpen, classes, onClose, onConfirm }) => {
            if (!isOpen) return null;
            const [targetClass, setTargetClass] = useState(classes[0]?.id || '');
            
            return (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">📋</div>
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

        /* --- LOCAL COMPONENT: EDIT QUIZ MODAL --- */
        const EditQuizModal = ({ isOpen, quiz, students, onClose, onSave }) => {
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
                allowedStudents: JSON.parse(quiz?.allowed_students || '[]')
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
                        allowedStudents: JSON.parse(quiz.allowed_students || '[]')
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
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 overflow-y-auto max-h-[90vh]">
                        <h3 className="text-xl font-bold text-zinc-900 mb-4 border-b pb-4">Pengaturan Quiz</h3>
                        <div className="space-y-4 mb-6">
                            <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Judul Quiz</label><input type="text" className="w-full px-4 py-3 rounded input-mono" value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Durasi (Menit)</label><input type="number" className="w-full px-4 py-3 rounded input-mono" value={form.duration} onChange={e => setForm({...form, duration: parseInt(e.target.value)})} /></div>
                                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Limit Soal</label><input type="number" className="w-full px-4 py-3 rounded input-mono" placeholder="0 = Semua" value={form.showLimit} onChange={e => setForm({...form, showLimit: parseInt(e.target.value)})} /><p className="text-[10px] text-zinc-400 mt-1">0 = Tampilkan semua soal</p></div>
                            </div>
                            
                            <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Toleransi Keterlambatan (Menit)</label><input type="number" className="w-full px-4 py-3 rounded input-mono" placeholder="0 = Tidak ada toleransi" value={form.toleranceMinutes} onChange={e => setForm({...form, toleranceMinutes: parseInt(e.target.value || 0)})} /><p className="text-[10px] text-zinc-400 mt-1">Siswa masih bisa masuk dalam waktu ini setelah jadwal mulai.</p></div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <label className="flex items-center gap-3 p-3 border border-zinc-200 rounded cursor-pointer hover:bg-zinc-50"><input type="checkbox" className="w-5 h-5 accent-black" checked={form.isRandom} onChange={e => setForm({...form, isRandom: e.target.checked})} /><span className="text-sm font-bold text-zinc-700">Acak Soal</span></label>
                                <label className="flex items-center gap-3 p-3 border border-zinc-200 rounded cursor-pointer hover:bg-zinc-50"><input type="checkbox" className="w-5 h-5 accent-black" checked={form.showResults} onChange={e => setForm({...form, showResults: e.target.checked})} /><span className="text-sm font-bold text-zinc-700">Pembahasan</span></label>
                            </div>

                            <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl space-y-3">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" className="w-5 h-5 accent-orange-600" checked={form.checkAttendance} onChange={e => setForm({...form, checkAttendance: e.target.checked})} />
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

                            <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Deskripsi</label><textarea className="w-full px-4 py-3 rounded input-mono" rows="2" value={form.description} onChange={e => setForm({...form, description: e.target.value})}></textarea></div>
                        </div>
                        <div className="flex gap-3"><button onClick={onClose} className="flex-1 py-3 border border-zinc-200 text-zinc-600 rounded-xl font-bold hover:bg-zinc-50 transition">BATAL</button><button onClick={handleSubmit} className="flex-1 py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition">SIMPAN</button></div>
                    </div>
                </div>
            );
        };

        /* --- MAIN APP --- */
        function QuizApp() {
            const [classes, setClasses] = useState(initialClasses || []);
            const [activePeriod, setActivePeriod] = useState(initialPeriod || null);
            const [selectedClass, setSelectedClass] = useState(null);
            const [students, setStudents] = useState([]); 
            const [quizzes, setQuizzes] = useState([]);
            const [viewMode, setViewMode] = useState('LIST');
            const [activeQuiz, setActiveQuiz] = useState(null);
            const [formQuiz, setFormQuiz] = useState({ title: '', description: '' });
            const [questions, setQuestions] = useState([]); 
            const [results, setResults] = useState([]);
            const [loading, setLoading] = useState(false);
            const fileInputRef = useRef(null);
            
            // MODAL STATES
            const [alertState, setAlertState] = useState({ isOpen: false, type: 'success', message: '' });
            const [confirmState, setConfirmState] = useState({ isOpen: false, message: '', onConfirm: null });
            const [activationModal, setActivationModal] = useState({ isOpen: false, quizId: null });
            const [editModal, setEditModal] = useState({ isOpen: false, quiz: null });
            const [copyModal, setCopyModal] = useState({ isOpen: false, quizId: null });
            const [urlModal, setUrlModal] = useState({ isOpen: false, targetIdx: null });
            
            // [NEW] Leaderboard State
            const [showLeaderboard, setShowLeaderboard] = useState(false);

            const showAlert = (type, message) => setAlertState({ isOpen: true, type, message });
            const closeAlert = () => setAlertState({ ...alertState, isOpen: false });

            const triggerConfirm = (message, onConfirm) => {
                setConfirmState({
                    isOpen: true,
                    message,
                    onConfirm: () => {
                        onConfirm();
                        setConfirmState({ ...confirmState, isOpen: false });
                    }
                });
            };

            const fetchQuizzes = async (classId) => {
                setLoading(true);
                const res = await window.secureFetch('/api/quizzes?class_id=' + classId);
                if (res.ok) setQuizzes(await res.json());
                setLoading(false);
            };

            const fetchStudents = async (classId) => {
                const res = await window.secureFetch('/api/student/claim-status?class_id=' + classId);
                if (res.ok) {
                    const data = await res.json();
                    setStudents(data); 
                }
            };

            const fetchQuestions = async (quizId) => {
                setLoading(true);
                const res = await window.secureFetch('/api/quizzes/questions?quiz_id=' + quizId);
                if (res.ok) setQuestions(await res.json());
                setLoading(false);
            };

            const fetchResults = async (quizId) => {
                const res = await window.secureFetch('/api/quizzes/results?quiz_id=' + quizId);
                if (res.ok) setResults(await res.json());
            };

            useEffect(() => {
                let interval;
                if (viewMode === 'RESULTS' && activeQuiz) {
                    fetchResults(activeQuiz.id); 
                    interval = setInterval(() => { fetchResults(activeQuiz.id); }, 5000);
                }
                return () => clearInterval(interval); 
            }, [viewMode, activeQuiz]);

            const handleSelectClass = (cls) => {
                setSelectedClass(cls);
                fetchQuizzes(cls.id);
                fetchStudents(cls.id); 
                setViewMode('LIST');
            };

            const handleCreateQuiz = async (e) => {
                e.preventDefault();
                try {
                    const res = await window.secureFetch('/api/quizzes', {
                        method: 'POST',
                        body: JSON.stringify({ 
                            periodId: activePeriod.id, 
                            classId: selectedClass.id, 
                            ...formQuiz 
                        })
                    });
                    if (res.ok) {
                        setFormQuiz({ title: '', description: '' });
                        fetchQuizzes(selectedClass.id);
                        showAlert('success', 'Quiz berhasil dibuat.');
                    } else {
                        showAlert('error', 'Gagal membuat quiz.');
                    }
                } catch(err) {
                    showAlert('error', 'Terjadi kesalahan koneksi.');
                }
            };

            const handleSaveSettings = async (formData) => {
                try {
                    const res = await window.secureFetch('/api/quizzes', {
                        method: 'PUT',
                        body: JSON.stringify(formData)
                    });
                    if(res.ok) {
                        setEditModal({ isOpen: false, quiz: null });
                        fetchQuizzes(selectedClass.id);
                        showAlert('success', 'Pengaturan quiz berhasil disimpan.');
                    } else {
                        showAlert('error', 'Gagal menyimpan pengaturan.');
                    }
                } catch(e) { showAlert('error', 'Error server.'); }
            };

            const handleCopyQuiz = async (targetClassId) => {
                try {
                    const res = await window.secureFetch('/api/quizzes/copy', {
                        method: 'POST',
                        body: JSON.stringify({ sourceQuizId: copyModal.quizId, targetClassId })
                    });
                    if (res.ok) {
                        setCopyModal({ isOpen: false, quizId: null });
                        if(selectedClass.id === targetClassId) fetchQuizzes(selectedClass.id);
                        showAlert('success', 'Quiz berhasil disalin.');
                    } else {
                        showAlert('error', 'Gagal menyalin quiz.');
                    }
                } catch(e) { showAlert('error', 'Gagal terkoneksi.'); }
            };

            const handleDeleteQuiz = async (id) => {
                triggerConfirm('Hapus quiz ini beserta soal dan nilainya?', async () => {
                    await window.secureFetch('/api/quizzes?id=' + id, { method: 'DELETE' });
                    fetchQuizzes(selectedClass.id);
                    showAlert('success', 'Quiz berhasil dihapus.');
                });
            };

            const handleResetAttempt = async (studentId = null) => {
                const confirmMsg = studentId 
                    ? "Reset riwayat ujian siswa ini? Siswa harus mengerjakan ulang dari awal." 
                    : "PERHATIAN: Anda akan mereset SEMUA data ujian di kelas ini. Data nilai akan hilang permanen. Lanjutkan?";
                
                triggerConfirm(confirmMsg, async () => {
                    const params = new URLSearchParams({ quiz_id: activeQuiz.id });
                    if(studentId) params.append('student_id', studentId);

                    const res = await window.secureFetch('/api/quizzes/reset-attempt?' + params.toString(), { method: 'DELETE' });
                    
                    if(res.ok) {
                        fetchResults(activeQuiz.id);
                        showAlert('success', 'Riwayat ujian berhasil direset.');
                    } else {
                        showAlert('error', 'Gagal mereset data.');
                    }
                });
            };

            const handleToggleClick = (quiz) => {
                if (quiz.is_active) confirmToggle(quiz.id, false, null);
                else setActivationModal({ isOpen: true, quizId: quiz.id });
            };

            const confirmToggle = async (id, isActive, scheduledAt) => {
                await window.secureFetch('/api/quizzes/toggle', {
                    method: 'POST',
                    body: JSON.stringify({ id, isActive, scheduledAt })
                });
                fetchQuizzes(selectedClass.id); 
                setActivationModal({ isOpen: false, quizId: null });
            };

            const openQuestionsEditor = (quiz) => { setActiveQuiz(quiz); fetchQuestions(quiz.id); setViewMode('QUESTIONS'); };
            const openResults = (quiz) => { setActiveQuiz(quiz); setViewMode('RESULTS'); }; 
            
            const addEmptyQuestion = () => setQuestions([...questions, { question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', option_e: '', correct_answer: 'A' }]);
            const updateQuestion = (idx, field, value) => { const newQ = [...questions]; newQ[idx][field] = value; setQuestions(newQ); };
            const removeQuestion = (idx) => { const newQ = [...questions]; newQ.splice(idx, 1); setQuestions(newQ); };

            const saveQuestions = async () => {
                triggerConfirm('Simpan perubahan soal?', async () => {
                    setLoading(true);
                    const res = await window.secureFetch('/api/quizzes/questions', {
                        method: 'POST',
                        body: JSON.stringify({ quizId: activeQuiz.id, questions: questions })
                    });
                    setLoading(false);
                    if (res.ok) {
                        showAlert('success', 'Soal berhasil disimpan!');
                        setViewMode('LIST');
                        fetchQuizzes(selectedClass.id);
                    }
                });
            };

            const handleDownloadTemplate = () => {
                const csvContent = "Pertanyaan;Opsi A;Opsi B;Opsi C;Opsi D;Opsi E;Jawaban Benar (A/B/C/D/E)\\nSiapa presiden pertama RI?;Soeharto;Soekarno;Habibie;Megawati;Jokowi;B";
                const link = document.createElement("a");
                link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
                link.download = "Template_Soal.csv";
                link.click();
            };

            const handleUploadCsv = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const text = evt.target.result;
                    const lines = text.split('\\n'); 
                    const newQuestions = [];
                    for (let i = 1; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (!line) continue;
                        const parts = line.split(';');
                        if (parts.length >= 2) {
                            newQuestions.push({
                                question_text: parts[0]?.trim() || '',
                                option_a: parts[1]?.trim() || '',
                                option_b: parts[2]?.trim() || '',
                                option_c: parts[3]?.trim() || '',
                                option_d: parts[4]?.trim() || '',
                                option_e: parts[5]?.trim() || '',
                                correct_answer: (parts[6]?.trim() || 'A').toUpperCase()
                            });
                        }
                    }
                    if (newQuestions.length > 0) {
                        setQuestions([...questions, ...newQuestions]);
                        showAlert('success', 'Berhasil membaca ' + newQuestions.length + ' soal dari CSV.');
                    } else { showAlert('error', 'Gagal membaca CSV atau file kosong.'); }
                    if(fileInputRef.current) fileInputRef.current.value = '';
                };
                reader.readAsText(file);
            };

            const handleOpenUrlModal = (idx) => {
                setUrlModal({ isOpen: true, targetIdx: idx });
            };

            const handleConfirmUrl = (url) => {
                const idx = urlModal.targetIdx;
                if (idx === null) return;
                let finalUrl = url;
                let message = "Gambar berhasil disisipkan.";
                if (url.includes('drive.google.com') && url.includes('/view')) {
                    const idMatch = url.match(/\\/d\\/([^/]+)/);
                    if (idMatch && idMatch[1]) {
                        // Use uc?export=view format which is the standard download link
                        // Proxy will handle User-Agent to prevent 403 Forbidden
                        const directUrl = \`https://drive.google.com/uc?export=view&id=\${idMatch[1]}\`;
                        finalUrl = \`/api/proxy?url=\${encodeURIComponent(directUrl)}\`;
                        message = "Tautan Google Drive berhasil dikonversi (via proxy bypass).";
                    }
                }
                const imgHtml = \`<br><img src="\${finalUrl}" class="w-full max-w-sm rounded-lg border border-zinc-200 my-2 shadow-sm"><br>\`;
                const currentText = questions[idx].question_text || '';
                updateQuestion(idx, 'question_text', currentText + imgHtml);
                setUrlModal({ isOpen: false, targetIdx: null });
                showAlert('success', message);
            };

            const renderContent = () => {
                if (viewMode === 'LIST') {
                    if (!selectedClass) return (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {classes.map(cls => (<div key={cls.id} onClick={() => handleSelectClass(cls)} className="card-mono p-6 cursor-pointer hover:border-orange-500 transition"><h4 className="text-xl font-bold mb-2 text-zinc-900">{cls.name}</h4><p className="text-xs text-zinc-500">Kelola Quiz & Soal →</p></div>))}
                            {classes.length === 0 && <div className="card-mono p-12 text-center col-span-3 text-zinc-400">Belum ada kelas.</div>}
                        </div>
                    );
                    return (
                        <div className="grid lg:grid-cols-12 gap-8">
                            <div className="lg:col-span-4">
                                <button onClick={() => setSelectedClass(null)} className="mb-4 text-xs font-bold text-zinc-500 hover:text-black">← GANTI KELAS</button>
                                <div className="card-mono p-6 sticky top-4">
                                    <h3 className="text-lg font-bold mb-4">Buat Quiz Baru</h3>
                                    <form onSubmit={handleCreateQuiz} className="space-y-4">
                                        <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Judul Quiz</label><input type="text" className="w-full px-4 py-3 rounded input-mono" value={formQuiz.title} onChange={e => setFormQuiz({...formQuiz, title: e.target.value})} placeholder="Contoh: UH 1 Matematika" required /></div>
                                        <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Deskripsi</label><textarea className="w-full px-4 py-3 rounded input-mono" rows="2" value={formQuiz.description} onChange={e => setFormQuiz({...formQuiz, description: e.target.value})}></textarea></div>
                                        <button className="w-full bg-black text-white py-3 rounded font-bold hover:bg-zinc-800">BUAT QUIZ</button>
                                    </form>
                                </div>
                            </div>
                            <div className="lg:col-span-8">
                                <h3 className="text-xl font-bold mb-4">Daftar Quiz: {selectedClass.name}</h3>
                                {loading ? <p>Loading...</p> : (
                                    <div className="space-y-4">
                                        {quizzes.map(q => {
                                            const activeClass = q.is_active ? 'border-l-4 border-l-green-500' : 'opacity-80';
                                            const btnClass = q.is_active ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200';
                                            return (
                                                <div key={q.id} className={'card-mono p-6 ' + activeClass}>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <h4 className="text-xl font-bold flex items-center gap-2">{q.title}{q.is_active === 1 && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">AKTIF</span>}</h4>
                                                            {q.description && (<p className="text-sm text-zinc-500 mt-2 mb-2 italic">{q.description}</p>)}
                                                            <div className="flex flex-wrap gap-2 mt-2 text-xs">
                                                                <span className="bg-zinc-100 px-2 py-1 rounded font-bold text-zinc-600">⏱ {q.duration} Menit</span>
                                                                <span className="bg-zinc-100 px-2 py-1 rounded font-bold text-zinc-600">🎲 {q.is_random ? 'Acak' : 'Urut'}</span>
                                                                <span className="bg-zinc-100 px-2 py-1 rounded font-bold text-zinc-600">📑 {q.show_limit > 0 ? q.show_limit + ' Soal Tampil' : 'Semua Soal'}</span>
                                                                <span className="bg-zinc-100 px-2 py-1 rounded font-bold text-zinc-600">👁️ {q.show_results ? 'Bahas: ON' : 'Bahas: OFF'}</span>
                                                            </div>
                                                            {q.check_attendance === 1 && (
                                                                <div className="mt-2 text-xs font-bold text-orange-600 flex items-center gap-1">
                                                                    <span>🔒 Wajib Presensi (Hadir)</span>
                                                                </div>
                                                            )}
                                                            {q.scheduled_at && (<p className="text-xs text-blue-600 mt-2 font-bold">📅 {new Date(q.scheduled_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</p>)}
                                                        </div>
                                                        <div className="text-right space-y-2">
                                                            <button onClick={() => handleToggleClick(q)} className={'px-3 py-1 rounded text-xs font-bold block w-full transition ' + btnClass}>{q.is_active ? '■ STOP' : '▶ START'}</button>
                                                            <button onClick={() => setEditModal({isOpen: true, quiz: q})} className="px-3 py-1 bg-zinc-100 text-zinc-700 rounded text-xs font-bold block w-full hover:bg-zinc-200">⚙️ PENGATURAN</button>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 pt-4 border-t border-zinc-100">
                                                        <div className="text-xs font-bold text-zinc-400">{q.question_count} SOAL</div>
                                                        <div className="text-xs font-bold text-zinc-400">{q.attempt_count} SISWA MENGERJAKAN</div>
                                                        <div className="flex-1"></div>
                                                        <button onClick={() => setCopyModal({isOpen: true, quizId: q.id})} className="text-xs font-bold text-zinc-500 hover:text-black hover:underline mr-4">SALIN</button>
                                                        <button onClick={() => openQuestionsEditor(q)} className="text-xs font-bold text-blue-600 hover:underline">KELOLA SOAL</button>
                                                        <button onClick={() => openResults(q)} className="text-xs font-bold text-black hover:underline">LIHAT HASIL</button>
                                                        <button onClick={() => handleDeleteQuiz(q.id)} className="text-xs font-bold text-red-500 hover:underline">HAPUS</button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {quizzes.length === 0 && <div className="p-8 text-center text-zinc-400 card-mono">Belum ada quiz dibuat.</div>}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                }
                
                if (viewMode === 'QUESTIONS') {
                    return (
                        <div className="max-w-4xl mx-auto animate-in fade-in">
                            <div className="flex justify-between items-center mb-6">
                                <div><h2 className="text-2xl font-bold">Editor Soal</h2><p className="text-zinc-500 text-sm">Quiz: <span className="font-bold text-black">{activeQuiz.title}</span> • {questions.length} Soal</p></div>
                                <div className="space-x-2"><button onClick={() => setViewMode('LIST')} className="px-4 py-2 text-sm font-bold text-zinc-500 hover:text-black transition">BATAL</button><button onClick={saveQuestions} className="px-6 py-2 bg-black text-white text-sm font-bold rounded hover:bg-zinc-800 shadow-md transition transform active:scale-95">SIMPAN SEMUA</button></div>
                            </div>
                            <div className="bg-white border border-zinc-200 p-4 rounded-xl mb-8 flex justify-between items-center shadow-sm">
                                <div className="text-xs"><span className="font-bold text-zinc-700 block mb-1">IMPORT DARI EXCEL/CSV</span><span className="text-zinc-400">Gunakan fitur ini untuk upload banyak soal sekaligus.</span></div>
                                <div className="flex gap-2">
                                    <button onClick={handleDownloadTemplate} className="px-3 py-1.5 bg-zinc-50 border border-zinc-300 rounded text-xs font-bold hover:bg-zinc-100 transition">⬇ Template</button>
                                    <div className="relative"><input type="file" ref={fileInputRef} onChange={handleUploadCsv} accept=".csv" className="absolute inset-0 opacity-0 cursor-pointer" /><button className="px-3 py-1.5 bg-zinc-800 text-white rounded text-xs font-bold hover:bg-black transition">⬆ Upload CSV</button></div>
                                </div>
                            </div>

                            <div className="space-y-8">
                                {questions.map((q, idx) => {
                                    const optKey = 'option_';
                                    return (
                                        <div key={idx} className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm transition hover:shadow-md">
                                            <div className="bg-zinc-50 border-b border-zinc-200 p-3 flex justify-between items-center">
                                                <span className="text-xs font-bold text-zinc-500 tracking-widest">PERTANYAAN NO {idx + 1}</span>
                                                <div className="flex items-center gap-3">
                                                    <button onClick={() => handleOpenUrlModal(idx)} className="flex items-center gap-2 bg-white border border-zinc-300 hover:border-blue-500 hover:text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm group" title="Paste Link dari Google"><span>🔗 Sisipkan URL Gambar</span></button>
                                                    <button onClick={() => removeQuestion(idx)} className="text-zinc-400 hover:text-red-500 transition" title="Hapus Soal"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor"><path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"></path></svg></button>
                                                </div>
                                            </div>
                                            <div className="p-0"><textarea className="w-full p-4 border-0 focus:ring-0 text-base font-mono bg-transparent resize-y min-h-[100px] placeholder-zinc-300 focus:bg-yellow-50/30 transition" rows="3" value={q.question_text} onChange={e => updateQuestion(idx, 'question_text', e.target.value)} placeholder="Ketik soal di sini... (HTML Allowed)"></textarea></div>
                                            {q.question_text && (<div className="bg-blue-50/30 p-4 border-t border-dashed border-blue-200"><p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-1"><span>👁️</span> Live Preview</p><div className="prose prose-sm max-w-none text-zinc-800" dangerouslySetInnerHTML={{__html: q.question_text}}></div></div>)}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-zinc-50 border-t border-zinc-200">
                                                {['A','B','C','D','E'].map(opt => {
                                                    const badgeClass = q.correct_answer === opt ? 'bg-green-500 text-white shadow-green-200 shadow-md' : 'bg-zinc-200 text-zinc-500';
                                                    const fieldName = 'option_' + opt.toLowerCase();
                                                    return (<div key={opt} className="flex items-center gap-2 group"><div className={'w-8 h-8 flex flex-shrink-0 items-center justify-center text-xs font-bold rounded-lg cursor-pointer transition transform active:scale-95 ' + badgeClass} onClick={() => updateQuestion(idx, 'correct_answer', opt)} title="Klik untuk set sebagai Kunci Jawaban">{opt}</div><input type="text" className="flex-1 px-3 py-2 rounded border border-zinc-300 text-sm focus:border-black focus:outline-none transition group-hover:border-zinc-400" value={q[fieldName]} onChange={e => updateQuestion(idx, fieldName, e.target.value)} placeholder={'Pilihan ' + opt} /></div>);
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <button onClick={addEmptyQuestion} className="w-full py-4 mt-8 border-2 border-dashed border-zinc-300 rounded-xl text-zinc-400 font-bold hover:border-black hover:text-black hover:bg-zinc-50 transition">+ TAMBAH SOAL BARU</button>
                        </div>
                    );
                }
                
                // --- VIEW: RESULTS (LIVE MONITORED) ---
                if (viewMode === 'RESULTS') {
                    return (
                        <div className="max-w-4xl mx-auto animate-in fade-in">
                            {/* [NEW] GIMMICK LEADERBOARD (NOW INLINE) */}
                            {showLeaderboard && (
                                <LeaderboardView 
                                    results={results.filter(r => r.finish_time)} 
                                    onClose={() => setShowLeaderboard(false)} 
                                />
                            )}

                            {!showLeaderboard && (
                                <>
                                    <div className="flex justify-between items-center mb-6">
                                        <button onClick={() => setViewMode('LIST')} className="text-sm font-bold text-zinc-500 hover:text-black">← KEMBALI</button>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setShowLeaderboard(true)} className="px-4 py-2 bg-yellow-400 text-yellow-900 border border-yellow-500 text-xs font-black rounded hover:bg-yellow-500 shadow-md flex items-center gap-2 transition hover:scale-105 active:scale-95">
                                                📺 TAMPILKAN LEADERBOARD
                                            </button>
                                            <button onClick={() => handleResetAttempt(null)} className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 shadow-md">RESET SEMUA DATA</button>
                                            <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold border border-red-100 animate-pulse">
                                                <div className="w-2 h-2 bg-red-500 rounded-full"></div> Live Monitor
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <h2 className="text-2xl font-bold mb-6">Hasil: {activeQuiz.title}</h2>
                                    <div className="card-mono overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-zinc-100 border-b text-xs uppercase font-bold text-zinc-500"><tr><th className="p-4">Rank</th><th className="p-4">Nama Siswa</th><th className="p-4">Nilai</th><th className="p-4">Waktu Selesai</th><th className="p-4 text-center">Aksi</th></tr></thead>
                                            <tbody className="divide-y">
                                                {results.map((r, i) => {
                                                    const scoreClass = r.score >= 75 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
                                                    return (
                                                        <tr key={i} className="hover:bg-zinc-50">
                                                            <td className="p-4 text-zinc-500">{r.finish_time ? ('#' + (i+1)) : '-'}</td>
                                                            <td className="p-4 font-bold">{r.student_name}</td>
                                                            <td className="p-4">{r.finish_time ? (<span className={'px-2 py-1 rounded text-xs font-bold ' + scoreClass}>{r.score}</span>) : (<span className="text-xs font-bold text-red-500 bg-red-100 px-2 py-1 rounded">0</span>)}</td>
                                                            <td className="p-4 text-zinc-500">{r.finish_time ? new Date(r.finish_time).toLocaleString('id-ID') : (<span className="text-red-500 font-bold text-xs uppercase">BELUM / ABSEN</span>)}</td>
                                                            <td className="p-4 text-center">
                                                                <button onClick={() => handleResetAttempt(r.student_id)} className="text-zinc-400 hover:text-red-600 p-1" title="Reset Ujian Siswa Ini">
                                                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {results.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-zinc-400">Belum ada siswa di kelas ini.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                    );
                }
            }

            return (
                <AuthGuard>
                    <div className="animate-in fade-in duration-500">
                        {/* GLOBAL MODALS */}
                        <CustomAlert isOpen={alertState.isOpen} type={alertState.type} message={alertState.message} onClose={closeAlert} />
                        <CustomConfirm isOpen={confirmState.isOpen} message={confirmState.message} onConfirm={confirmState.onConfirm} onCancel={() => setConfirmState({ ...confirmState, isOpen: false })} />
                        <URLInputModal isOpen={urlModal.isOpen} onClose={() => setUrlModal({ isOpen: false, targetIdx: null })} onConfirm={handleConfirmUrl} />

                        {/* LOCAL MODALS */}
                        <ActivationModal isOpen={activationModal.isOpen} onClose={() => setActivationModal({ isOpen: false, quizId: null })} onConfirm={(date) => confirmToggle(activationModal.quizId, true, date)} />
                        <EditQuizModal isOpen={editModal.isOpen} quiz={editModal.quiz} students={students} onClose={() => setEditModal({isOpen: false, quiz: null})} onSave={handleSaveSettings} />
                        <CopyQuizModal isOpen={copyModal.isOpen} classes={classes} onClose={() => setCopyModal({ isOpen: false, quizId: null })} onConfirm={handleCopyQuiz} />

                        <div className="mb-8"><h2 className="text-3xl font-bold text-zinc-900">Quiz & Ujian</h2><p className="text-zinc-500 mt-2">Buat soal pilihan ganda, acak soal, dan atur jadwal.</p></div>
                        
                        {!activePeriod ? (<div className="card-mono p-8 text-center"><p className="text-zinc-500">Pilih periode akademik terlebih dahulu.</p></div>) : renderContent()}
                    </div>
                </AuthGuard>
            );
        }

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<QuizApp />);
    `;

    return getLayoutHtml({
        title: 'Quiz & Ujian',
        user: { name: 'Guru' },
        activePeriod,
        initialData,
        contentComponent
    });
}