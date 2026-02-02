// views/student/landing.js
// Bagian 1: Halaman Landing (PWA Install / Claim Identity / Auto-Login)
// FIXED: Property Name Mismatch (data.class -> data.classInfo)

export function getStudentLandingPage() {
    return `<!DOCTYPE html>
  <html lang="id">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>Portal Siswa - AlkeMia</title>
      
      <link rel="manifest" href="/manifest.json">
      <meta name="theme-color" content="#000000">
      
      <meta name="apple-mobile-web-app-capable" content="yes">
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
      <meta name="apple-mobile-web-app-title" content="AlkeMia">
      <link rel="apple-touch-icon" href="https://iili.io/f4HD692.png">
      
      <script src="https://cdn.tailwindcss.com"></script>
      <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
      <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
      <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; -webkit-tap-highlight-color: transparent; }
        .pt-safe { padding-top: env(safe-area-inset-top); }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
      </style>
  </head>
  <body class="bg-black text-white flex flex-col items-center justify-center min-h-screen p-6 text-center">
      
      <div id="root" class="w-full max-w-md"></div>

      <script type="text/babel">
          const { useState, useEffect } = React;

          // --- 0. SECURITY HELPER: DEVICE ID (UUID) ---
          const getOrCreateDeviceId = () => {
              let uuid = localStorage.getItem('student_device_id');
              if (!uuid) {
                  if (typeof crypto.randomUUID === 'function') {
                      uuid = crypto.randomUUID();
                  } else {
                      uuid = 'dev-' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
                  }
                  localStorage.setItem('student_device_id', uuid);
              }
              return uuid;
          };

          // --- COMPONENTS ---
          const SimpleModal = ({ isOpen, title, message, onClose, isError }) => {
              if (!isOpen) return null;
              return (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
                      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-xs w-full p-6 text-center shadow-2xl transform transition-all scale-100 animate-in zoom-in-95">
                          <div className={"w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 " + (isError ? "bg-red-900/30 text-red-500" : "bg-blue-900/30 text-blue-500")}>
                              <span className="text-2xl">{isError ? "!" : "ℹ"}</span>
                          </div>
                          <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                          <p className="text-zinc-400 text-sm mb-6">{message}</p>
                          <button onClick={onClose} className="w-full py-3 bg-white text-black rounded-xl font-bold hover:bg-zinc-200 transition">OK</button>
                      </div>
                  </div>
              );
          };

          const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
              if (!isOpen) return null;
              return (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm">
                      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-xs w-full p-6 text-center shadow-2xl">
                          <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                          <p className="text-zinc-400 text-sm mb-6">{message}</p>
                          <div className="flex gap-3">
                              <button onClick={onCancel} className="flex-1 py-3 border border-zinc-700 text-zinc-300 rounded-xl font-bold hover:bg-zinc-800">BATAL</button>
                              <button onClick={onConfirm} className="flex-1 py-3 bg-white text-black rounded-xl font-bold hover:bg-zinc-200">YA, LANJUT</button>
                          </div>
                      </div>
                  </div>
              );
          };

          function Landing() {
              const [isStandalone, setIsStandalone] = useState(false);
              const [loading, setLoading] = useState(true);
              const [classData, setClassData] = useState(null);
              const [students, setStudents] = useState([]);
              const [claimedIds, setClaimedIds] = useState([]);
              const [error, setError] = useState('');
              const [deferredPrompt, setDeferredPrompt] = useState(null);

              const [alertModal, setAlertModal] = useState({ open: false, title: '', msg: '', isError: false });
              const [confirmModal, setConfirmModal] = useState({ open: false, title: '', msg: '', idToClaim: null });

              // --- 1. AUTO LOGIN CHECK ---
              useEffect(() => {
                  getOrCreateDeviceId(); // Pastikan ID dibuat
                  const checkSession = async () => {
                      const token = localStorage.getItem('student_token');
                      if (token) {
                          window.location.href = '/student/portal';
                          return; 
                      }
                      initPwaFlow();
                  };
                  checkSession();
              }, []);

              // --- 2. LOGIKA PWA & LOAD DATA ---
              const initPwaFlow = async () => {
                  const checkStandalone = () => {
                      const isApp = 
                          window.matchMedia('(display-mode: standalone)').matches || 
                          window.navigator.standalone === true ||
                          document.referrer.includes('android-app://');
                      
                      setIsStandalone(isApp);
                  };
                  checkStandalone();
                  window.addEventListener('resize', checkStandalone);
                  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); setDeferredPrompt(e); });

                  // Cek URL params
                  const urlParams = new URLSearchParams(window.location.search);
                  const c = urlParams.get('c');
                  const t = urlParams.get('t');

                  // Simpan ke localStorage jika ada (untuk dibawa ke PWA setelah install)
                  if (c && t) localStorage.setItem('pending_class_scan', JSON.stringify({ c, t }));

                  // Ambil dari storage (prioritas) atau URL
                  const savedScan = JSON.parse(localStorage.getItem('pending_class_scan') || '{}');
                  const activeC = c || savedScan.c;
                  const activeT = t || savedScan.t;

                  if (activeC && activeT) {
                      try {
                          const res = await fetch(\`/api/student/verify?c=\${activeC}&t=\${activeT}\`);
                          if (res.ok) {
                              const data = await res.json();
                              // [FIXED] Menggunakan data.classInfo (bukan data.class)
                              setClassData(data.classInfo); 
                              setStudents(data.students);
                              
                              // Parse claimed status jika ada
                              // (Format students dari server sudah termasuk device_count, kita sesuaikan)
                              const claimed = data.students.filter(s => s.device_count > 0).map(s => s.id);
                              setClaimedIds(claimed);
                          } else {
                              setError("QR Code tidak valid atau kadaluarsa.");
                              // Jangan hapus dulu, siapa tau cuma error jaringan sementara
                          }
                      } catch (e) {
                          setError("Gagal memuat data kelas.");
                      }
                  }
                  setLoading(false);
              };

              const handleInstall = () => {
                  if (deferredPrompt) {
                      deferredPrompt.prompt();
                      deferredPrompt.userChoice.then((choiceResult) => { setDeferredPrompt(null); });
                  } else {
                      setAlertModal({ open: true, title: "Install Manual", msg: "Tap menu browser (titik tiga) lalu pilih 'Add to Home Screen' atau 'Install App'.", isError: false });
                  }
              };

              const confirmClaim = (studentId) => {
                  setConfirmModal({ 
                      open: true, 
                      title: "Konfirmasi Identitas", 
                      msg: "Pastikan ini nama Anda. Akun akan terkunci di HP ini dan tidak bisa dipindah.", 
                      idToClaim: studentId 
                  });
              };

              const handleClaim = async () => {
                  const studentId = confirmModal.idToClaim;
                  setConfirmModal({ ...confirmModal, open: false });
                  
                  // [SECURITY UPDATE] Ambil Device ID
                  const deviceId = getOrCreateDeviceId();

                  try {
                      // Pastikan classId diambil dari state yang sudah di-load
                      const currentClassId = classData ? classData.id : null;
                      if (!currentClassId) return;

                      const res = await fetch('/api/student/claim', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                              classId: currentClassId, 
                              studentId, 
                              deviceInfo: navigator.userAgent,
                              deviceId: deviceId // <--- KIRIM UUID
                          })
                      });
                      
                      const data = await res.json();
                      if (data.success) {
                          localStorage.setItem('student_token', data.token); // [FIXED] data.token (bukan data.studentToken)
                          localStorage.removeItem('pending_class_scan'); 
                          window.location.href = '/student/portal';
                      } else {
                          setAlertModal({ open: true, title: "Gagal", msg: data.error, isError: true });
                      }
                  } catch (e) {
                      setAlertModal({ open: true, title: "Error", msg: "Gagal login. Periksa koneksi.", isError: true });
                  }
              };

              // TAMPILAN JIKA BELUM INSTALL PWA
              if (!isStandalone && !loading) {
                  return (
                      <div className="flex flex-col items-center justify-center min-h-[80vh] animate-in fade-in duration-500">
                          <SimpleModal isOpen={alertModal.open} title={alertModal.title} message={alertModal.msg} isError={alertModal.isError} onClose={() => setAlertModal({...alertModal, open: false})} />
                          
                          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30"><span className="text-4xl">🎓</span></div>
                          <h1 className="text-2xl font-bold mb-2">Portal Siswa</h1>
                          <p className="text-zinc-400 mb-8 max-w-xs mx-auto text-sm">Aplikasi wajib diinstall untuk melanjutkan absensi dan ujian.</p>

                          <div className="w-full space-y-4">
                              {classData && (
                                  <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 mb-6">
                                      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">KELAS TERDETEKSI</p>
                                      <p className="text-lg font-bold text-white">{classData.name}</p>
                                  </div>
                              )}
                              <button onClick={handleInstall} className="w-full py-4 bg-white text-black rounded-xl font-bold text-lg hover:bg-zinc-200 transition-transform active:scale-95 shadow-lg">📲 INSTALL APLIKASI</button>
                              <div className="text-xs text-zinc-500 mt-6 px-4">
                                  <p className="mb-2">Setelah install:</p>
                                  <ol className="list-decimal text-left pl-4 space-y-1">
                                      <li>Tutup browser ini.</li>
                                      <li>Buka aplikasi <b>Portal Siswa</b> di layar utama HP Anda.</li>
                                      <li>Nama Anda akan muncul disana.</li>
                                  </ol>
                              </div>
                          </div>
                      </div>
                  );
              }

              // TAMPILAN UTAMA (PWA MODE)
              return (
                  <div className="w-full animate-in fade-in duration-500 text-left pt-safe pt-12">
                       <SimpleModal isOpen={alertModal.open} title={alertModal.title} message={alertModal.msg} isError={alertModal.isError} onClose={() => setAlertModal({...alertModal, open: false})} />
                       <ConfirmModal isOpen={confirmModal.open} title={confirmModal.title} message={confirmModal.msg} onConfirm={handleClaim} onCancel={() => setConfirmModal({...confirmModal, open: false})} />

                       <h2 className="text-2xl font-bold mb-1">Selamat Datang 👋</h2>
                       <p className="text-zinc-400 mb-6 text-sm">Silakan pilih nama Anda untuk masuk.</p>
                       
                       {loading ? (
                           <div className="text-center py-10"><div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
                       ) : error ? (
                           <div className="bg-red-900/20 text-red-400 p-4 rounded-xl border border-red-900/50 text-center text-sm">
                               {error} <br/>
                               <p className="mt-2 text-zinc-500 text-xs">Minta link QR baru dari Guru.</p>
                           </div>
                       ) : classData ? (
                           <div>
                               <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 mb-6 flex justify-between items-center">
                                   <div><p className="text-xs text-zinc-500">KELAS</p><p className="font-bold text-lg">{classData.name}</p></div>
                                   <div className="text-right"><p className="text-xs text-zinc-500">TAHUN</p><p className="font-bold">{classData.year}</p></div>
                               </div>
                               <div className="space-y-3 pb-10">
                                   {students.map(s => {
                                       const isClaimed = s.device_count > 0; // Menggunakan data langsung dari server
                                       return (
                                           <button key={s.id} onClick={() => !isClaimed && confirmClaim(s.id)} disabled={isClaimed} className={\`w-full p-4 rounded-xl flex items-center justify-between transition-all active:scale-95 \${isClaimed ? 'bg-zinc-900/50 opacity-50 cursor-not-allowed' : 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-800'}\`}>
                                               <span className="font-bold text-base">{s.name}</span>
                                               {isClaimed ? <span className="text-[10px] bg-zinc-800 px-2 py-1 rounded text-zinc-500">DIGUNAKAN</span> : <span className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center text-xs">➜</span>}
                                           </button>
                                       )
                                   })}
                               </div>
                           </div>
                       ) : (
                           <div className="text-center text-zinc-500 mt-10"><p>Data tidak ditemukan.</p><p className="text-xs mt-2">Silakan scan ulang QR Code dari Guru.</p></div>
                       )}
                  </div>
              );
          }
          const root = ReactDOM.createRoot(document.getElementById('root'));
          root.render(<Landing />);
      </script>

      <script>
          if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                      .then(registration => console.log('SW registered'))
                      .catch(registrationError => console.log('SW registration failed: ', registrationError));
              });
          }
      </script>
  </body>
  </html>`;
}