// views/student/portal.js
// Bagian 3: Portal Utama Siswa (Dashboard, Materi, Nilai)
// FINAL: Added Tasks/Remedial Menu + Smart Grading Integration

import { CBT_COMPONENTS } from './cbt.js';
import { STUDENT_TASK_COMPONENT } from './studentTasks.js';

export function getStudentPortalPage() {
    // [FIX] String Concatenation untuk menghindari Nested Backtick Error
    return `<!DOCTYPE html>
  <html lang="id">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>Dashboard Siswa - AlkeMia</title>
      <link rel="manifest" href="/manifest.json">
      <meta name="theme-color" content="#09090b">
      <script src="https://cdn.tailwindcss.com"></script>
      <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
      <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
      <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; -webkit-tap-highlight-color: transparent; background-color: #09090b; }
        .pt-safe { padding-top: env(safe-area-inset-top); }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .glass-nav {
            background: rgba(24, 24, 27, 0.85);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-top: 1px solid rgba(255,255,255,0.08);
        }
      </style>
  </head>
  <body class="text-white h-screen flex flex-col overflow-hidden bg-zinc-950">
      <div id="root" class="flex-1 flex flex-col h-full"></div>

      <script type="text/babel">
          const { useState, useEffect, useRef } = React;

          // --- INJECT KOMPONEN TAMBAHAN (CONCATENATION) ---
    ` + CBT_COMPONENTS + `
    ` + STUDENT_TASK_COMPONENT + `

          // --- [SECURITY] HEADER HELPER ---
          const getHeaders = () => {
              const token = localStorage.getItem('student_token');
              const deviceId = localStorage.getItem('student_device_id');
              if (!token) { window.location.href = '/student'; return null; }
              return {
                  'Authorization': \`Bearer \${token}\`,
                  'X-Student-Token': token, 
                  'X-Device-Id': deviceId || '' 
              };
          };

          const Icons = {
              Materi: () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>,
              Tugas: () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/></svg>,
              Quiz: () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
              Nilai: () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>,
              Profil: () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
              Refresh: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>,
              Time: () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
              Close: () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          };

          const QuizCard = ({ quiz, onStart, onReview }) => {
              const [status, setStatus] = useState('LOADING'); 
              const [btnText, setBtnText] = useState('...');
              const quizRef = useRef(quiz);
              quizRef.current = quiz;

              useEffect(() => {
                  const checkTime = () => {
                      const q = quizRef.current;
                      if (q.my_score !== null) { setStatus('DONE'); return; }
                      
                      // Cek Kunci Absensi
                      if (q.is_locked_attendance) { 
                          setStatus('LOCKED_ATTENDANCE'); 
                          setBtnText('ANDA TIDAK HADIR DAN TIDAK BERHAK MENGIKUTI QUIZ'); 
                          return; 
                      }

                      if (!q.scheduled_at) { setStatus('OPEN'); setBtnText('KERJAKAN'); return; }
                      const now = new Date();
                      const start = new Date(q.scheduled_at);
                      const toleranceMs = (q.tolerance_minutes || 0) * 60000;
                      const lateLimit = new Date(start.getTime() + toleranceMs);

                      if (now < start) { setStatus('LOCKED'); setBtnText('BELUM DIMULAI'); }
                      else if (now > lateLimit) { setStatus('LATE'); setBtnText('TERLAMBAT'); }
                      else { setStatus('OPEN'); setBtnText('KERJAKAN'); }
                  };
                  checkTime();
                  const interval = setInterval(checkTime, 1000);
                  return () => clearInterval(interval);
              }, [quiz.my_score, quiz.is_locked_attendance]);

              const isBtnDisabled = ['LOCKED', 'LATE', 'DONE', 'LOADING', 'LOCKED_ATTENDANCE'].includes(status);
              
              let btnClass = "bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/20";
              if (status === 'LOCKED') btnClass = "bg-zinc-800 text-zinc-500 border border-zinc-700";
              if (status === 'LATE') btnClass = "bg-red-900/50 text-red-400 border border-red-900";
              if (status === 'DONE') btnClass = "bg-green-900/30 text-green-400 border border-green-900";
              if (status === 'LOCKED_ATTENDANCE') btnClass = "bg-zinc-900 text-red-600 border border-red-900/30 opacity-60 cursor-not-allowed";

              return (
                  <div className="bg-zinc-900 rounded-2xl p-5 mb-4 relative border border-zinc-800/50 shadow-sm">
                      {status === 'DONE' && <div className="absolute top-4 right-4"><div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div></div>}
                      {status === 'LOCKED_ATTENDANCE' && <div className="absolute top-4 right-4"><div className="text-lg">🔒</div></div>}
                      
                      <h3 className="font-bold text-lg text-zinc-100 mb-1 leading-snug">{quiz.title}</h3>
                      <p className="text-xs text-zinc-500 mb-4 line-clamp-2 leading-relaxed">{quiz.description || 'Tidak ada deskripsi tambahan.'}</p>
                      
                      <div className="flex gap-4 mb-5">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 bg-black/40 px-2 py-1 rounded-md border border-zinc-800">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                              {quiz.duration}m
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 bg-black/40 px-2 py-1 rounded-md border border-zinc-800">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                              {quiz.question_count} Soal
                          </div>
                      </div>

                      {quiz.scheduled_at && status !== 'DONE' && (
                          <div className="mb-4 text-xs flex justify-between items-center text-zinc-500 bg-zinc-950/50 p-2 rounded-lg">
                              <span>Jadwal:</span>
                              <span className="font-mono text-zinc-300">{new Date(quiz.scheduled_at).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</span>
                          </div>
                      )}
                      
                      {status === 'DONE' ? (
                          <div className="space-y-3">
                              <div className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                                  <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Nilai Anda</span>
                                  <span className="text-2xl font-bold text-white">{quiz.my_score}</span>
                              </div>
                              {quiz.show_results === 1 && (
                                  <button onClick={() => onReview(quiz.id)} className="w-full py-3 border border-zinc-700 text-zinc-300 rounded-xl font-bold text-xs uppercase tracking-wide hover:bg-zinc-800 transition">
                                      Lihat Pembahasan
                                  </button>
                              )}
                          </div>
                      ) : (
                          <button onClick={() => onStart(quiz.id)} disabled={isBtnDisabled} className={\`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wide transition-all active:scale-[0.98] whitespace-normal leading-tight h-auto \${btnClass}\`}>
                              {status === 'LOCKED_ATTENDANCE' && <div className=\"mb-1 text-lg\">🚫</div>}
                              {btnText}
                          </button>
                      )}
                  </div>
              );
          };

          function App() {
              const [tab, setTab] = useState('MATERI');
              const [data, setData] = useState(null);
              const [activeQuizId, setActiveQuizId] = useState(null);
              const [reviewQuizId, setReviewQuizId] = useState(null);
              const [selectedMaterial, setSelectedMaterial] = useState(null);
              const [isRefreshing, setIsRefreshing] = useState(false);
              const [error, setError] = useState(null);

              const loadData = async () => {
                  const headers = getHeaders(); 
                  if (!headers) return; 

                  try {
                      setIsRefreshing(true);
                      const res = await fetch('/api/student/dashboard', { headers: headers });
                      
                      if (res.status === 401 || res.status === 403) { 
                          localStorage.removeItem('student_token');
                          alert("Sesi berakhir."); window.location.href = '/student'; return;
                      }

                      if (!res.ok) throw new Error(\`Server Error: \${res.status}\`);
                      const json = await res.json();
                      if (json.error) throw new Error(json.error);

                      setData(json);
                      setIsRefreshing(false);
                  } catch (e) {
                      console.error(e); setError(e.message); setIsRefreshing(false);
                  }
              };

              useEffect(() => { loadData(); }, []);

              const getEmbedUrl = (url) => {
                  if (!url) return '';
                  if (url.includes('drive.google.com')) return url.replace('/view', '/preview');
                  if (url.includes('youtube.com') || url.includes('youtu.be')) {
                      const v = url.split('v=')[1] || url.split('/').pop();
                      return 'https://www.youtube.com/embed/' + v;
                  }
                  return url;
              };

              if (activeQuizId && data) {
                  const currentQuiz = data.quizzes.find(q => q.id === activeQuizId);
                  return <QuizRunner quizId={activeQuizId} studentId={data.student.id} duration={currentQuiz ? currentQuiz.duration : 60} onFinish={() => { setActiveQuizId(null); loadData(); }} />;
              }
              
              if (reviewQuizId && data) {
                  return <QuizReview quizId={reviewQuizId} studentId={data.student.id} onBack={() => setReviewQuizId(null)} />;
              }

              if (!data) return (
                  <div className="flex flex-col items-center justify-center h-screen bg-zinc-950">
                      {error ? (
                          <div className="text-center p-6">
                              <p className="text-red-500 font-bold mb-2">Gagal Memuat Data</p>
                              <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white text-black rounded-lg font-bold text-sm">Muat Ulang</button>
                          </div>
                      ) : (
                          <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                      )}
                  </div>
              );

              const { student, materials, grade, quizzes } = data;

              return (
                  <div className="flex flex-col h-full bg-zinc-950">
                      <header className="px-5 pt-safe pt-6 pb-2 bg-zinc-950 z-10">
                          <div className="flex justify-between items-start mb-6">
                              <div>
                                  <p className="text-xs text-zinc-500 font-medium mb-0.5">Selamat Datang,</p>
                                  <h1 className="text-xl font-bold text-white tracking-tight">{student.name.split(' ')[0]}</h1>
                              </div>
                              <div className="flex items-center gap-3">
                                  <button onClick={loadData} disabled={isRefreshing} className="w-10 h-10 flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded-full text-orange-500 active:scale-95 transition shadow-lg">
                                      <span className={isRefreshing ? "animate-spin" : ""}><Icons.Refresh /></span>
                                  </button>
                                  <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 font-bold text-sm shadow-lg">{student.name.substring(0,2)}</div>
                              </div>
                          </div>
                          
                          <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 p-4 rounded-2xl border border-zinc-700/50 flex justify-between items-center shadow-lg">
                              <div>
                                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-1">KELAS AKTIF</p>
                                  <p className="text-lg font-bold text-white">{student.class_name}</p>
                              </div>
                              <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
                              </div>
                          </div>
                      </header>

                      <main className="flex-1 overflow-y-auto p-5 hide-scrollbar pb-24">
                          {tab === 'MATERI' && (
                              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                  <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2 pl-1">Bahan Ajar</h2>
                                  {materials.length === 0 && <div className="text-center text-zinc-600 py-10 text-sm italic">Belum ada materi dibagikan.</div>}
                                  {materials.map(m => (
                                      <div key={m.id} onClick={() => setSelectedMaterial(m)} className="group bg-zinc-900 p-4 rounded-2xl border border-zinc-800 active:scale-[0.98] transition cursor-pointer flex gap-4 items-start">
                                          <div className="w-10 h-10 rounded-xl bg-orange-900/20 text-orange-500 flex items-center justify-center shrink-0 border border-orange-500/10 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                                          </div>
                                          <div>
                                              <div className="flex items-center gap-2 mb-1">
                                                  <span className="text-[10px] font-bold text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 uppercase">{m.file_type || 'DOC'}</span>
                                                  <span className="text-[10px] text-zinc-600">{new Date(m.created_at).toLocaleDateString()}</span>
                                              </div>
                                              <h3 className="font-bold text-sm text-zinc-200 leading-tight mb-1">{m.title}</h3>
                                              <p className="text-xs text-zinc-500 line-clamp-1">{m.description || 'Klik untuk membuka'}</p>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}

                          {tab === 'TUGAS' && (
                              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                  <StudentTasks student={data.student} onBack={() => setTab('MATERI')} />
                              </div>
                          )}

                          {tab === 'QUIZ' && (
                              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                  <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3 pl-1">Daftar Ujian (CBT)</h2>
                                  {quizzes.length === 0 && <div className="text-center text-zinc-600 py-10 text-sm italic">Belum ada ujian aktif.</div>}
                                  {quizzes.map(q => <QuizCard key={q.id} quiz={q} onStart={setActiveQuizId} onReview={setReviewQuizId} />)}
                              </div>
                          )}

                          {tab === 'NILAI' && (
                              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                  <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3 pl-1">Laporan Akademik</h2>
                                  {data.gradesHidden ? (
                                      <div className="text-center py-16 bg-zinc-900 rounded-2xl border border-zinc-800 border-dashed">
                                          <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">⏳</div>
                                          <p className="text-zinc-400 font-bold text-sm">Nilai Masih Dalam Proses</p>
                                          <p className="text-zinc-600 text-xs mt-1">Silakan cek kembali secara berkala.</p>
                                      </div>
                                  ) : !grade ? (
                                      <div className="text-center text-zinc-600 py-10 text-sm italic">Data nilai belum tersedia.</div>
                                  ) : (
                                      <div className="space-y-4">
                                          <div className="bg-gradient-to-br from-orange-600 to-red-600 p-6 rounded-3xl text-center shadow-lg shadow-orange-900/20 relative overflow-hidden">
                                              <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                                              <p className="text-white/80 text-xs uppercase tracking-widest font-bold mb-1 relative z-10">NILAI AKHIR</p>
                                              <p className="text-6xl font-black text-white relative z-10">{grade.final_grade}</p>
                                          </div>
                                          <div className="grid grid-cols-2 gap-3">
                                              {[{l:'UH',v:grade.uh}, {l:'TUGAS',v:grade.tugas}, {l:'UTS',v:grade.uts}, {l:'UAS',v:grade.uas}].map((g,i) => (
                                                  <div key={i} className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                                                      <p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">{g.l}</p>
                                                      <p className="text-xl font-bold text-white">{g.v}</p>
                                                  </div>
                                              ))}
                                          </div>
                                      </div>
                                  )}
                              </div>
                          )}

                          {tab === 'PROFIL' && (
                              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 pt-10 text-center">
                                  <div className="w-24 h-24 bg-zinc-900 rounded-full border-4 border-zinc-800 mx-auto flex items-center justify-center text-4xl mb-6 text-zinc-600 shadow-xl">
                                      {student.name.substring(0,2)}
                                  </div>
                                  <h2 className="text-xl font-bold text-white mb-6">{student.name}</h2>
                                  <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden divide-y divide-zinc-800 text-left">
                                      <div className="p-4 flex justify-between">
                                          <span className="text-sm text-zinc-400">Kelas</span>
                                          <span className="text-sm font-bold text-white">{student.class_name}</span>
                                      </div>
                                      <div className="p-4 flex justify-between">
                                          <span className="text-sm text-zinc-400">Status Perangkat</span>
                                          <span className="text-sm font-bold text-green-500 flex items-center gap-1">
                                              <span className="w-2 h-2 rounded-full bg-green-500"></span> Terverifikasi
                                          </span>
                                      </div>
                                      <div className="p-4 flex justify-between">
                                          <span className="text-sm text-zinc-400">Versi Aplikasi</span>
                                          <span className="text-sm font-mono text-zinc-500">v2.1 (Secure)</span>
                                      </div>
                                  </div>
                              </div>
                          )}
                      </main>

                      <div className="fixed bottom-0 left-0 w-full p-4 pb-safe z-50">
                          <nav className="glass-nav rounded-2xl flex justify-between items-center p-1.5 shadow-2xl">
                              {['MATERI', 'TUGAS', 'QUIZ', 'NILAI', 'PROFIL'].map(t => {
                                  const isActive = tab === t;
                                  return (
                                      <button 
                                          key={t} 
                                          onClick={() => setTab(t)} 
                                          className={\`flex-1 flex flex-col items-center justify-center py-3 rounded-xl transition-all duration-200 \${isActive ? 'text-orange-500 bg-white/5' : 'text-zinc-500 hover:text-zinc-300'}\`}
                                      >
                                          <span className={\`mb-1 transition-transform \${isActive ? 'scale-110' : ''}\`}>
                                              {t === 'MATERI' && <Icons.Materi />}
                                              {t === 'TUGAS' && <Icons.Tugas />}
                                              {t === 'QUIZ' && <Icons.Quiz />}
                                              {t === 'NILAI' && <Icons.Nilai />}
                                              {t === 'PROFIL' && <Icons.Profil />}
                                          </span>
                                          <span className="text-[10px] font-bold tracking-wide">{t}</span>
                                      </button>
                                  )
                              })}
                          </nav>
                      </div>

                      {selectedMaterial && (
                          <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in slide-in-from-bottom duration-300">
                              <div className="flex items-center justify-between px-4 py-4 bg-zinc-900 text-white shadow-md pt-safe border-b border-zinc-800">
                                  <h3 className="text-sm font-bold truncate pr-4 text-zinc-200">{selectedMaterial.title}</h3>
                                  <button onClick={() => setSelectedMaterial(null)} className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white transition">
                                      <Icons.Close />
                                  </button>
                              </div>
                              <div className="flex-1 bg-black relative">
                                  <iframe src={getEmbedUrl(selectedMaterial.file_url)} className="w-full h-full border-0" allow="autoplay; encrypted-media; fullscreen" allowFullScreen></iframe>
                              </div>
                          </div>
                      )}
                  </div>
              );
          }
          const root = ReactDOM.createRoot(document.getElementById('root'));
          root.render(<App />);
      </script>

      <script>
          if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
          }
      </script>
  </body>
  </html>`;
}