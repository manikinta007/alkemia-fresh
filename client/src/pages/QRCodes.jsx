import React, { useState, useEffect, useRef } from 'react';
import { fetchApi } from '../utils/api';
import { useAlertContext } from '../components/Alert';
import { QrCode, RefreshCw, Download, Monitor, Users, AlertTriangle, X, Minimize2, Maximize2 } from 'lucide-react';
import { GridSkeleton } from '../components/Skeleton';

/* 
  FULLSCREEN QR MODAL 
  - Loads QRCode.js from CDN if not present
  - Generates QR
  - Polls for login stats
*/
const FullscreenQRModal = ({ cls, onClose }) => {
    const { showAlert, showConfirm } = useAlertContext();
    const [qrData, setQrData] = useState(null);
    const [claimStatus, setClaimStatus] = useState(null);
    const [libLoaded, setLibLoaded] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    const qrContainerRef = useRef(null);

    // Load Library
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

    // Fetch Data
    useEffect(() => {
        const fetchQR = async () => {
            try {
                const res = await fetchApi('/api/qr/generate', {
                    method: 'POST',
                    body: JSON.stringify({ classId: cls.id })
                });
                if (res.ok) setQrData(await res.json());
            } catch (e) {
                console.error(e);
                showAlert('Gagal generate QR', 'error');
            }
        };

        const fetchStatus = async () => {
            try {
                const res = await fetchApi('/api/qr/info?class_id=' + cls.id);
                if (res.ok) setClaimStatus(await res.json());
            } catch (e) { console.error(e); }
        };

        fetchQR();
        fetchStatus();

        // Poll status every 5 seconds
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, [cls.id]);

    // Render QR
    useEffect(() => {
        if (qrData && qrContainerRef.current && libLoaded && window.QRCode) {
            qrContainerRef.current.innerHTML = "";
            try {
                new window.QRCode(qrContainerRef.current, {
                    text: window.location.origin + qrData.qrUrl,
                    width: 300,
                    height: 300,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: window.QRCode.CorrectLevel.H
                });
            } catch (e) {
                console.error("Render QR Failed", e);
            }
        }
    }, [qrData, libLoaded]);

    const handleReset = async () => {
        showConfirm(
            'Reset Akses Kelas?',
            async () => {
                setIsResetting(true);
                try {
                    const res = await fetchApi('/api/student/reset-claims', {
                        method: 'POST',
                        body: JSON.stringify({ classId: cls.id })
                    });
                    if (res.ok) {
                        showAlert('Reset Berhasil! Semua siswa logout.', 'success');
                        // Refresh stats
                        const statusRes = await fetchApi('/api/qr/info?class_id=' + cls.id);
                        if (statusRes.ok) setClaimStatus(await statusRes.json());
                    } else {
                        showAlert('Gagal reset', 'error');
                    }
                } catch (e) {
                    showAlert('Error reset', 'error');
                } finally {
                    setIsResetting(false);
                }
            },
            'Perhatian: Semua siswa yang sedang login di kelas ini akan dikeluarkan (logout).'
        );
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
                showAlert('QR belum siap download', 'error');
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center animate-in fade-in duration-300 text-white">
            <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 transition">
                <X size={32} />
            </button>

            <div className="w-full max-w-5xl px-6 flex flex-col md:flex-row items-center justify-center gap-12">
                {/* QR Section */}
                <div className="flex flex-col items-center text-center">
                    <h2 className="text-4xl md:text-5xl font-bold mb-8 tracking-tight">
                        KELAS <span className="text-zinc-600 mx-2">|</span> {cls.name}
                    </h2>

                    <div className="bg-white p-6 rounded-3xl shadow-2xl ring-8 ring-white/10 mb-8">
                        <div ref={qrContainerRef} className="w-[300px] h-[300px] flex items-center justify-center bg-white">
                            {!libLoaded ? <span className="text-black">Loading Lib...</span> :
                                !qrData ? <span className="text-black animate-pulse">Generating...</span> : ''}
                        </div>
                    </div>

                    <p className="text-zinc-500 text-sm font-mono tracking-[0.2em] uppercase">Scan untuk Masuk Kelas</p>
                </div>

                {/* Stats Section */}
                <div className="w-full max-w-sm space-y-6">
                    <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl backdrop-blur-md">
                        <div className="flex items-center gap-3 mb-4 text-zinc-400">
                            <Users size={18} />
                            <span className="text-xs uppercase font-bold tracking-widest">Kehadiran Live</span>
                        </div>

                        {claimStatus ? (
                            <div>
                                <div className="flex items-baseline gap-2 mb-2">
                                    <span className="text-5xl font-bold text-white">{claimStatus.claimedStudents}</span>
                                    <span className="text-zinc-500 text-lg">/ {claimStatus.totalStudents} Siswa</span>
                                </div>
                                <div className="w-full bg-zinc-800 h-3 rounded-full overflow-hidden">
                                    <div
                                        className="bg-green-500 h-full transition-all duration-700 ease-out"
                                        style={{ width: `${(claimStatus.claimedStudents / (claimStatus.totalStudents || 1)) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ) : <div className="h-16 animate-pulse bg-zinc-800 rounded-xl"></div>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={handleDownload}
                            disabled={!qrData}
                            className="py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition disabled:opacity-50 flex flex-col items-center justify-center gap-1"
                        >
                            <Download size={24} />
                            <span className="text-xs mt-1">DOWNLOAD QR</span>
                        </button>

                        <button
                            onClick={handleReset}
                            disabled={isResetting}
                            className="py-4 border border-zinc-700 text-zinc-300 font-bold rounded-xl hover:bg-red-900/30 hover:border-red-800 hover:text-red-400 transition flex flex-col items-center justify-center gap-1"
                        >
                            <RefreshCw size={24} className={isResetting ? 'animate-spin' : ''} />
                            <span className="text-xs mt-1">RESET AKSES</span>
                        </button>
                    </div>

                    {qrData && (
                        <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 text-center">
                            <p className="text-[10px] text-zinc-500 mb-2 uppercase font-bold">Alternatif Login</p>
                            <code className="text-xs text-orange-500 font-mono block truncate select-all">
                                {window.location.host}{qrData.qrUrl}
                            </code>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function QRCodes() {
    const { showAlert } = useAlertContext();
    const [classes, setClasses] = useState([]);
    const [activePeriod, setActivePeriod] = useState(null);
    const [activeClass, setActiveClass] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            try {
                const periodRes = await fetchApi('/api/periods?active=true');
                if (periodRes.ok) {
                    const periods = await periodRes.json();
                    const period = periods.find(p => p.is_active) || periods[0];
                    setActivePeriod(period);

                    if (period) {
                        const classesRes = await fetchApi(`/api/classes?period_id=${period.id}`);
                        if (classesRes.ok) setClasses(await classesRes.json());
                    }
                }
            } catch (e) {
                console.error(e);
                showAlert('Gagal memuat data', 'error');
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    if (loading && !classes.length) return (
        <div className="pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-zinc-900 flex items-center gap-3 tracking-tight">
                        <QrCode className="text-blue-600" size={32} />
                        QR Codes
                    </h2>
                    <p className="text-zinc-500 mt-1">Memuat data kelas...</p>
                </div>
            </div>
            <GridSkeleton count={6} />
        </div>
    );

    if (!activePeriod) return (
        <div className="p-10 text-center animate-in fade-in">
            <h2 className="text-xl font-bold text-zinc-400">Pilih Periode Aktif Dahulu</h2>
            <p className="text-zinc-500">Silakan atur periode di menu Akademik.</p>
        </div>
    );

    return (
        <div className="pb-20">
            {activeClass && (
                <FullscreenQRModal cls={activeClass} onClose={() => setActiveClass(null)} />
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-zinc-900 flex items-center gap-3 tracking-tight">
                        <QrCode className="text-blue-600" size={32} />
                        QR Codes
                    </h2>
                    <p className="text-zinc-500 mt-1">Pilih kelas untuk menampilkan QR Code akses siswa.</p>
                </div>
            </div>

            {loading ? (
                <GridSkeleton count={6} />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classes.map(cls => (
                        <div
                            key={cls.id}
                            onClick={() => setActiveClass(cls)}
                            className="bg-white border border-zinc-200 p-6 rounded-2xl cursor-pointer hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 group relative overflow-hidden"
                        >
                            <div className="absolute -right-6 -bottom-6 text-zinc-50 opacity-50 group-hover:opacity-100 group-hover:text-blue-50 transition duration-500 rotate-12">
                                <QrCode size={120} />
                            </div>

                            <div className="relative z-10">
                                <h3 className="text-2xl font-bold text-zinc-900 mb-1 group-hover:text-blue-700 transition">
                                    {cls.name}
                                </h3>
                                <div className="flex items-center gap-2 mt-4">
                                    <span className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition duration-300 flex items-center gap-2">
                                        <Monitor size={14} /> TAMPILKAN QR
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {classes.length === 0 && (
                        <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-200 rounded-2xl">
                            <p className="text-zinc-400">Belum ada kelas.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
