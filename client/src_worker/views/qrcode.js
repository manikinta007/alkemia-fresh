// views/qrcode.js
// QR Codes - Generate QR untuk akses siswa
// FIXED: Hapus Native Alert/Confirm, Ganti dengan Custom Dark Modal

import { getLayoutHtml } from './layout.js';
import { UI_COMPONENTS } from './ui.js';

export function getQRCodesPage(classes = [], activePeriod = null) {
    const initialData = { classes, activePeriod };
  
    const contentComponent = `
        ${UI_COMPONENTS}

        const { useState, useEffect, useRef } = React;
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        const { classes: initialClasses, activePeriod: initialPeriod } = window.__INITIAL_DATA__;

        // --- COMPONENT: FULLSCREEN QR MODAL ---
        const FullscreenQRModal = ({ cls, onClose, libLoaded, showAlert }) => {
            const [qrData, setQrData] = useState(null);
            const [claimStatus, setClaimStatus] = useState(null);
            
            // State untuk Custom Confirmation
            const [showConfirmReset, setShowConfirmReset] = useState(false);
            const [isResetting, setIsResetting] = useState(false);
            
            const qrContainerRef = useRef(null);

            useEffect(() => {
                fetchQR();
                fetchStatus();
                
                // Close on ESC key (Only if not confirming)
                const handleEsc = (e) => { 
                    if (e.key === 'Escape') {
                        if(showConfirmReset) setShowConfirmReset(false);
                        else onClose();
                    }
                };
                window.addEventListener('keydown', handleEsc);
                return () => window.removeEventListener('keydown', handleEsc);
            }, [showConfirmReset]); // Re-bind listener saat state berubah

            // Render QR Code saat data siap
            useEffect(() => {
                if (qrData && qrContainerRef.current && libLoaded && window.QRCode) {
                    qrContainerRef.current.innerHTML = "";
                    try {
                        new QRCode(qrContainerRef.current, {
                            text: window.location.origin + qrData.qrUrl,
                            width: 300, 
                            height: 300,
                            colorDark : "#000000",
                            colorLight : "#ffffff",
                            correctLevel : QRCode.CorrectLevel.H
                        });
                    } catch (e) {
                        console.error("Gagal render QR", e);
                    }
                }
            }, [qrData, libLoaded]);

            const fetchQR = async () => {
                try {
                    const res = await window.secureFetch('/api/qr/generate', {
                        method: 'POST',
                        body: JSON.stringify({ classId: cls.id })
                    });
                    if (res.ok) setQrData(await res.json());
                } catch (e) { console.error(e); }
            };

            const fetchStatus = async () => {
                try {
                    const res = await window.secureFetch('/api/qr/info?class_id=' + cls.id);
                    if (res.ok) setClaimStatus(await res.json());
                } catch (e) { console.error(e); }
            };

            // 1. Trigger saat tombol Reset ditekan (Buka Modal Konfirmasi)
            const handleResetClick = () => {
                setShowConfirmReset(true);
            };

            // 2. Eksekusi Reset (Dipanggil dari Modal Konfirmasi)
            const executeReset = async () => {
                setIsResetting(true);
                try {
                    await window.secureFetch('/api/student/reset-claims', {
                        method: 'POST',
                        body: JSON.stringify({ classId: cls.id })
                    });
                    showAlert('success', 'Reset Berhasil! Semua siswa logout.');
                    fetchStatus();
                } catch(e) { 
                    showAlert('error', 'Gagal reset'); 
                } finally {
                    setIsResetting(false);
                    setShowConfirmReset(false);
                }
            };

            const handleDownload = () => {
                if (qrContainerRef.current) {
                    const canvas = qrContainerRef.current.querySelector('canvas');
                    const img = qrContainerRef.current.querySelector('img');
                    let url = null;
                    if (canvas) url = canvas.toDataURL();
                    else if (img) url = img.src;

                    if (url) {
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'QR-KELAS-' + cls.name + '.png';
                        a.click();
                    } else {
                        showAlert('error', 'QR belum siap.');
                    }
                }
            };

            return (
                <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
                    
                    {/* --- CUSTOM CONFIRMATION POPUP (LAYER DIATAS QR) --- */}
                    {showConfirmReset && (
                        <div className="absolute inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in zoom-in-95 duration-200">
                            <div className="bg-zinc-900 border border-red-900/50 p-8 rounded-2xl w-full max-w-sm text-center shadow-[0_0_50px_rgba(220,38,38,0.2)]">
                                <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                                    <span className="text-3xl">⚠️</span>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Reset Akses Kelas?</h3>
                                <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                                    Tindakan ini akan <b>mengeluarkan (logout)</b> semua siswa yang sedang login di kelas ini. Mereka harus scan QR ulang.
                                </p>
                                <div className="flex flex-col gap-3">
                                    <button 
                                        onClick={executeReset} 
                                        disabled={isResetting}
                                        className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition shadow-lg shadow-red-900/20"
                                    >
                                        {isResetting ? 'MEMPROSES...' : 'YA, RESET SEKARANG'}
                                    </button>
                                    <button 
                                        onClick={() => setShowConfirmReset(false)} 
                                        disabled={isResetting}
                                        className="w-full py-3 bg-transparent border border-zinc-700 text-zinc-300 font-bold rounded-xl hover:bg-zinc-800 transition"
                                    >
                                        BATAL
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tombol Close Utama */}
                    <button onClick={onClose} className="absolute top-6 right-6 text-zinc-400 hover:text-white p-2 transition">
                        <span className="text-4xl leading-none">×</span>
                    </button>

                    <div className="w-full max-w-5xl px-6 flex flex-col md:flex-row items-center justify-center gap-12">
                        
                        {/* Area QR Code */}
                        <div className="flex flex-col items-center">
                            <h2 className="text-5xl font-bold text-white mb-8 tracking-tight">KELAS <span className="text-zinc-600 mx-2">|</span> {cls.name}</h2>
                            
                            <div className="bg-white p-6 rounded-3xl shadow-2xl ring-8 ring-white/10">
                                <div ref={qrContainerRef} className="min-w-[300px] min-h-[300px] flex items-center justify-center bg-white rounded-lg">
                                    {!libLoaded ? <span className="text-sm text-zinc-400">Loading Library...</span> : 
                                     !qrData ? <span className="text-sm text-zinc-400 animate-pulse">Generating QR...</span> : ''}
                                </div>
                            </div>
                            
                            <p className="text-zinc-500 mt-8 text-sm font-mono tracking-[0.2em] uppercase">Scan untuk Masuk Kelas</p>
                        </div>

                        {/* Area Info & Kontrol */}
                        <div className="w-full max-w-sm space-y-6">
                            {/* Kartu Status */}
                            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl backdrop-blur-md">
                                <p className="text-zinc-500 text-xs uppercase font-bold mb-3 tracking-widest">Kehadiran / Login</p>
                                {claimStatus ? (
                                    <div>
                                        <div className="flex items-baseline gap-2 mb-2">
                                            <span className="text-5xl font-bold text-white">{claimStatus.claimedStudents}</span>
                                            <span className="text-zinc-500 text-lg">/ {claimStatus.totalStudents} Siswa</span>
                                        </div>
                                        <div className="w-full bg-zinc-800 h-3 rounded-full overflow-hidden">
                                            <div className="bg-green-500 h-full transition-all duration-700 ease-out" style={{width: (claimStatus.claimedStudents / (claimStatus.totalStudents || 1) * 100) + '%'}}></div>
                                        </div>
                                    </div>
                                ) : <div className="animate-pulse h-12 bg-zinc-800 rounded"></div>}
                            </div>

                            {/* Tombol Aksi */}
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={handleDownload} disabled={!qrData} className="py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition disabled:opacity-50 flex flex-col items-center justify-center gap-1">
                                    <span className="text-xl">📥</span>
                                    <span className="text-xs">DOWNLOAD</span>
                                </button>
                                
                                {/* Tombol Reset (Memicu Custom Confirm) */}
                                <button onClick={handleResetClick} className="py-4 border border-zinc-700 text-zinc-300 font-bold rounded-xl hover:bg-red-900/30 hover:border-red-800 hover:text-red-400 transition flex flex-col items-center justify-center gap-1">
                                    <span className="text-xl">🔄</span>
                                    <span className="text-xs">RESET AKSES</span>
                                </button>
                            </div>
                            
                            {/* URL Text */}
                            {qrData && (
                                <div className="text-center pt-4">
                                    <p className="text-[10px] text-zinc-600 mb-2">JIKA KAMERA BERMASALAH, BUKA:</p>
                                    <code className="text-xs text-zinc-400 bg-zinc-900 px-3 py-2 rounded-lg block truncate font-mono select-all cursor-text border border-zinc-800">
                                        {window.location.origin}{qrData.qrUrl}
                                    </code>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        };

        function QRCodes() {
            const [classes, setClasses] = useState(initialClasses || []);
            const [activePeriod, setActivePeriod] = useState(initialPeriod || null);
            const [activeClass, setActiveClass] = useState(null); 
            const [alertState, setAlertState] = useState({ isOpen: false, type: 'success', message: '' });
            const [libLoaded, setLibLoaded] = useState(false);

            useEffect(() => {
                if (window.QRCode) {
                    setLibLoaded(true);
                } else {
                    const script = document.createElement('script');
                    script.src = "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js";
                    script.async = true;
                    script.onload = () => setLibLoaded(true);
                    document.body.appendChild(script);
                }
            }, []);

            return (
                <AuthGuard>
                    <div className="animate-in fade-in duration-500">
                        <CustomAlert isOpen={alertState.isOpen} type={alertState.type} message={alertState.message} onClose={() => setAlertState({...alertState, isOpen: false})} />

                        {activeClass && (
                            <FullscreenQRModal 
                                cls={activeClass} 
                                onClose={() => setActiveClass(null)} 
                                libLoaded={libLoaded}
                                showAlert={(type, msg) => setAlertState({ isOpen: true, type, message: msg })}
                            />
                        )}

                        <div className="mb-8">
                            <h2 className="text-3xl font-bold text-zinc-900">QR Codes - Akses Siswa</h2>
                            <p className="text-zinc-500 mt-2">Pilih kelas untuk menampilkan QR Code di layar besar (Mode Proyektor).</p>
                        </div>

                        {!activePeriod ? (
                            <div className="card-mono p-8 text-center">
                                <p className="text-zinc-500">Pilih periode akademik terlebih dahulu.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {classes.map(cls => (
                                    <div 
                                        key={cls.id} 
                                        onClick={() => setActiveClass(cls)}
                                        className="card-mono p-6 cursor-pointer hover:border-black hover:shadow-lg transition group relative overflow-hidden bg-white"
                                    >
                                        <div className="absolute -right-4 -top-4 text-zinc-50 opacity-50 group-hover:opacity-100 group-hover:text-zinc-100 transition duration-500">
                                            <span className="text-8xl">📱</span>
                                        </div>
                                        
                                        <div className="relative z-10">
                                            <h4 className="text-xl font-bold text-zinc-900 mb-2 group-hover:scale-105 transition origin-left flex items-center">
                                                KELAS <span className="text-zinc-300 mx-2 text-2xl font-light">|</span> {cls.name}
                                            </h4>
                                            
                                            <div className="flex items-center gap-2 mt-4">
                                                <span className="bg-black text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition duration-300">
                                                    TAMPILKAN QR ➜
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {classes.length === 0 && (
                                    <div className="col-span-3 card-mono p-12 text-center">
                                        <p className="text-zinc-400 mb-4">Belum ada kelas pada periode ini.</p>
                                        <a href="/classes" className="inline-block px-6 py-3 bg-black text-white rounded font-bold hover:bg-zinc-800 transition">Buat Kelas Baru</a>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </AuthGuard>
            );
        }

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<QRCodes />);
    `;

    return getLayoutHtml({
        title: 'QR Codes',
        user: { name: 'Guru' },
        activePeriod,
        initialData,
        contentComponent
    });
}