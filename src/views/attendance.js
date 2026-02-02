// views/attendance.js
// Halaman Presensi Guru
// Fitur: Input Harian, Rekap Bulanan, Export CSV, Tandai Semua Hadir
// Update: Custom Confirm Modal (Pengganti Alert Bawaan)

import { getLayoutHtml } from './layout.js';
import { UI_COMPONENTS } from './ui.js';

export function getAttendancePage(classes = [], activePeriod = null) {
    const initialData = { classes, activePeriod };
  
    const contentComponent = `
        ${UI_COMPONENTS}

        const { useState, useEffect, useRef } = React;
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        const { classes: initialClasses, activePeriod: initialPeriod } = window.__INITIAL_DATA__;

        // Helper: Format Tanggal Indonesia
        const formatDateID = (isoDate) => {
            if (!isoDate) return '';
            return new Date(isoDate).toLocaleDateString('id-ID', { 
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' 
            });
        };

        // --- COMPONENT: EXPORT MODAL ---
        const ExportModal = ({ isOpen, onClose, classId }) => {
            if (!isOpen) return null;
            const [type, setType] = useState('daily'); // daily | recap
            const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
            const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
            
            // State untuk Quick Chips
            const [availableDates, setAvailableDates] = useState([]);
            const [loadingDates, setLoadingDates] = useState(false);

            // Fetch Available Dates saat Modal dibuka
            useEffect(() => {
                if (isOpen && classId && type === 'daily') {
                    setLoadingDates(true);
                    window.secureFetch(\`/api/attendance?type=dates&class_id=\${classId}\`)
                        .then(res => res.json())
                        .then(data => {
                            setAvailableDates(data || []);
                        })
                        .catch(err => console.error("Gagal load tanggal:", err))
                        .finally(() => setLoadingDates(false));
                }
            }, [isOpen, classId, type]);

            const handleDownload = () => {
                let url = \`/api/attendance/export?type=\${type}&class_id=\${classId}\`;
                if (type === 'daily') url += \`&date=\${date}\`;
                if (type === 'recap') url += \`&month=\${month}\`;
                
                // Trigger Download
                window.open(url, '_blank');
                onClose();
            };

            return (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 transform transition-all scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M224,152a8,8,0,0,1-8,8H192v32a8,8,0,0,1-16,0V160H144a8,8,0,0,1,0-16h32V112a8,8,0,0,1,16,0v32h32A8,8,0,0,1,224,152ZM88,216H40a8,8,0,0,1-8-8V152a8,8,0,0,1,8-8H88a8,8,0,0,1,8,8v56A8,8,0,0,1,88,216Zm56-88H96a8,8,0,0,1-8-8V48a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v72A8,8,0,0,1,144,128Z" opacity="0.2"></path><path d="M224,144H200V112a8,8,0,0,0-16,0v32H144a8,8,0,0,0,0,16h40v32a8,8,0,0,0,16,0V160h24a8,8,0,0,0,0-16ZM88,136H40a16,16,0,0,0-16,16v56a16,16,0,0,0,16,16H88a16,16,0,0,0,16-16V152A16,16,0,0,0,88,136Zm0,72H40V152H88Zm56-176H40A16,16,0,0,0,24,48v72a16,16,0,0,0,16,16h96a8,8,0,0,0,0-16H40V48h96V120a8,8,0,0,0,16,0V48A16,16,0,0,0,144,32Z"></path></svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-zinc-900">Download Laporan</h3>
                                <p className="text-xs text-zinc-500">Format CSV (Excel Compatible)</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Jenis Laporan</label>
                                <div className="flex bg-zinc-100 p-1 rounded-lg">
                                    <button onClick={() => setType('daily')} className={"flex-1 py-2 text-xs font-bold rounded-md transition " + (type === 'daily' ? "bg-white shadow text-black" : "text-zinc-500 hover:text-zinc-700")}>Harian</button>
                                    <button onClick={() => setType('recap')} className={"flex-1 py-2 text-xs font-bold rounded-md transition " + (type === 'recap' ? "bg-white shadow text-black" : "text-zinc-500 hover:text-zinc-700")}>Rekap Bulanan</button>
                                </div>
                            </div>

                            {type === 'daily' ? (
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Pilih Tanggal</label>
                                    <input type="date" className="w-full px-4 py-3 rounded-lg border border-zinc-300 focus:border-black outline-none font-mono text-sm" value={date} onChange={e => setDate(e.target.value)} />
                                    
                                    {/* QUICK CHIPS SECTION */}
                                    <div className="mt-3">
                                        <p className="text-[10px] text-zinc-400 uppercase font-bold mb-2 flex justify-between items-center">
                                            Data Tersedia
                                            {loadingDates && <span className="animate-pulse">Loading...</span>}
                                        </p>
                                        
                                        {!loadingDates && availableDates.length === 0 && (
                                            <div className="text-xs text-zinc-400 italic bg-zinc-50 p-2 rounded border border-zinc-100">
                                                Belum ada data absensi untuk kelas ini.
                                            </div>
                                        )}

                                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto scrollbar-thin">
                                            {availableDates.map(d => (
                                                <button
                                                    key={d}
                                                    onClick={() => setDate(d)}
                                                    className={\`px-3 py-1.5 text-xs font-mono rounded border transition \${
                                                        date === d
                                                        ? 'bg-zinc-800 text-white border-zinc-800 shadow-md'
                                                        : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50'
                                                    }\`}
                                                >
                                                    {formatDateID(d)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Pilih Bulan</label>
                                    <input type="month" className="w-full px-4 py-3 rounded-lg border border-zinc-300 focus:border-black outline-none font-mono text-sm" value={month} onChange={e => setMonth(e.target.value)} />
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button onClick={onClose} className="flex-1 py-3 border border-zinc-200 text-zinc-600 rounded-xl font-bold hover:bg-zinc-50 transition">BATAL</button>
                            <button onClick={handleDownload} className="flex-1 py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition shadow-lg">DOWNLOAD</button>
                        </div>
                    </div>
                </div>
            );
        };

        function Attendance() {
            const [classes] = useState(initialClasses || []);
            const [activePeriod] = useState(initialPeriod || null);
            
            const [selectedClass, setSelectedClass] = useState(null);
            // Default tanggal hari ini
            const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
            
            const [students, setStudents] = useState([]);
            const [loading, setLoading] = useState(false);
            const [submitting, setSubmitting] = useState(false);
            const [deleting, setDeleting] = useState(false);
            
            // Mode Edit: Apakah data untuk tanggal ini sudah ada di server?
            const [dataExists, setDataExists] = useState(false);
            
            const [showExportModal, setShowExportModal] = useState(false);
            const [alertState, setAlertState] = useState({ isOpen: false, type: 'success', message: '' });
            
            // [NEW] Custom Confirm State
            const [confirmState, setConfirmState] = useState({ isOpen: false, message: '', onConfirm: null });

            // Fetch Data
            useEffect(() => {
                if (selectedClass && date) {
                    fetchAttendance();
                }
            }, [selectedClass, date]);

            const fetchAttendance = async () => {
                setLoading(true);
                setDataExists(false); // Reset dulu
                try {
                    const res = await window.secureFetch(\`/api/attendance?class_id=\${selectedClass.id}&date=\${date}\`);
                    if (res.ok) {
                        const data = await res.json();
                        setStudents(data);
                        // Cek apakah ada minimal satu siswa yang statusnya tidak null
                        const hasData = data.some(s => s.status !== null);
                        setDataExists(hasData);
                    }
                } catch (e) {
                    console.error(e);
                } finally {
                    setLoading(false);
                }
            };

            const handleStatusChange = (studentId, status) => {
                setStudents(prev => prev.map(s => 
                    s.student_id === studentId ? { ...s, status } : s
                ));
            };

            const markAllPresent = () => {
                setStudents(prev => prev.map(s => ({ ...s, status: 'H' })));
            };

            // --- REFACTORED: LOGIC EKSEKUSI (Dipisahkan dari Tombol) ---
            
            const executeSave = async () => {
                // Tutup modal confirm dulu
                setConfirmState({ ...confirmState, isOpen: false });
                
                setSubmitting(true);
                try {
                    const payload = {
                        classId: selectedClass.id,
                        date: date,
                        data: students.map(s => ({
                            student_id: s.student_id,
                            status: s.status 
                        }))
                    };

                    const res = await window.secureFetch('/api/attendance', {
                        method: 'POST',
                        body: JSON.stringify(payload)
                    });

                    if (res.ok) {
                        setAlertState({ isOpen: true, type: 'success', message: 'Data absensi berhasil disimpan.' });
                        setDataExists(true);
                    } else {
                        throw new Error('Gagal menyimpan');
                    }
                } catch (e) {
                    setAlertState({ isOpen: true, type: 'error', message: 'Terjadi kesalahan saat menyimpan data.' });
                } finally {
                    setSubmitting(false);
                }
            };

            const executeDelete = async () => {
                 // Tutup modal confirm dulu
                setConfirmState({ ...confirmState, isOpen: false });

                setDeleting(true);
                try {
                    const res = await window.secureFetch(\`/api/attendance?class_id=\${selectedClass.id}&date=\${date}\`, {
                        method: 'DELETE'
                    });

                    if (res.ok) {
                        setAlertState({ isOpen: true, type: 'success', message: 'Data absensi berhasil dihapus.' });
                        // Reset tampilan ke kosong
                        setStudents(prev => prev.map(s => ({ ...s, status: null })));
                        setDataExists(false);
                    } else {
                        throw new Error('Gagal menghapus');
                    }
                } catch (e) {
                    setAlertState({ isOpen: true, type: 'error', message: 'Gagal menghapus data.' });
                } finally {
                    setDeleting(false);
                }
            };

            // --- BUTTON HANDLERS (Memicu Custom Confirm) ---

            const handleSaveClick = () => {
                // 1. Validasi Ketat
                const incomplete = students.some(s => s.status === null);
                if (incomplete) {
                    setAlertState({ isOpen: true, type: 'error', message: 'Tidak dapat menyimpan. Masih ada siswa yang belum diabsen.' });
                    return;
                }

                // 2. Jika Data Exists -> Munculkan Custom Confirm
                if (dataExists) {
                    setConfirmState({
                        isOpen: true,
                        message: \`Data presensi untuk tanggal \${formatDateID(date)} sudah ada. Apakah Anda yakin ingin memperbaruinya?\`,
                        onConfirm: executeSave
                    });
                } else {
                    // Jika baru, langsung simpan
                    executeSave();
                }
            };

            const handleDeleteClick = () => {
                setConfirmState({
                    isOpen: true,
                    message: \`Yakin ingin MENGHAPUS seluruh data presensi tanggal \${formatDateID(date)}? Data yang dihapus tidak bisa dikembalikan.\`,
                    onConfirm: executeDelete
                });
            };

            return (
                <AuthGuard>
                    <div className="animate-in fade-in duration-500 pb-20">
                        {/* GLOBAL ALERTS */}
                        <CustomAlert 
                            isOpen={alertState.isOpen} 
                            type={alertState.type} 
                            message={alertState.message} 
                            onClose={() => setAlertState({...alertState, isOpen: false})} 
                        />
                        
                        <CustomConfirm
                            isOpen={confirmState.isOpen}
                            message={confirmState.message}
                            onConfirm={confirmState.onConfirm}
                            onCancel={() => setConfirmState({ ...confirmState, isOpen: false })}
                        />
                        
                        {/* HEADER */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                            <div>
                                <h2 className="text-3xl font-bold text-zinc-900 flex items-center gap-3">
                                    {ICONS.clipboard} Presensi
                                </h2>
                                <p className="text-zinc-500 mt-1">Kelola kehadiran siswa harian.</p>
                            </div>
                        </div>

                        {!activePeriod ? (
                             <div className="card-mono p-8 text-center"><p className="text-zinc-500">Pilih periode akademik terlebih dahulu.</p></div>
                        ) : (
                            <div className="space-y-6">
                                {/* CONTROLS CARD */}
                                <div className="card-mono p-6 bg-white sticky top-4 z-10 shadow-sm">
                                    <div className="flex flex-col md:flex-row gap-4 items-end">
                                        <div className="w-full md:w-1/3">
                                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Pilih Kelas</label>
                                            <select 
                                                className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:border-black outline-none bg-zinc-50"
                                                value={selectedClass?.id || ''}
                                                onChange={e => {
                                                    const cls = classes.find(c => c.id == e.target.value);
                                                    setSelectedClass(cls);
                                                }}
                                            >
                                                <option value="">-- Pilih Kelas --</option>
                                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="w-full md:w-1/3">
                                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Tanggal</label>
                                            <input 
                                                type="date" 
                                                className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:border-black outline-none bg-zinc-50 font-mono text-sm"
                                                value={date}
                                                onChange={e => setDate(e.target.value)}
                                            />
                                        </div>
                                        <div className="w-full md:w-1/3 flex gap-2">
                                            <button 
                                                disabled={!selectedClass}
                                                onClick={() => setShowExportModal(true)}
                                                className="flex-1 py-3 border border-zinc-200 text-zinc-600 font-bold rounded-lg hover:bg-zinc-50 disabled:opacity-50 transition"
                                            >
                                                DOWNLOAD
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* ATTENDANCE LIST */}
                                {selectedClass && (
                                    <div className="card-mono p-0 overflow-hidden bg-white">
                                        <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                                            <div className="text-sm font-bold text-zinc-500">
                                                DAFTAR SISWA ({students.length})
                                                {dataExists && <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full uppercase tracking-wider">Terisi</span>}
                                            </div>
                                            <button 
                                                onClick={markAllPresent}
                                                className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-md transition"
                                            >
                                                TANDAI SEMUA HADIR
                                            </button>
                                        </div>

                                        {loading ? (
                                            <div className="p-12 text-center text-zinc-400 italic">Mengambil data...</div>
                                        ) : (
                                            <div className="divide-y divide-zinc-100">
                                                {students.length === 0 ? (
                                                    <div className="p-8 text-center text-zinc-400">Belum ada siswa di kelas ini.</div>
                                                ) : (
                                                    students.map((student, idx) => (
                                                        <div key={student.student_id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50 transition">
                                                            <div className="flex items-center gap-4">
                                                                <span className="w-8 h-8 flex items-center justify-center bg-zinc-100 rounded-full text-xs font-bold text-zinc-500 font-mono">
                                                                    {idx + 1}
                                                                </span>
                                                                <span className="font-bold text-zinc-800">{student.name}</span>
                                                            </div>
                                                            
                                                            <div className="flex bg-zinc-100 rounded-lg p-1 gap-1">
                                                                {[
                                                                    { val: 'H', label: 'Hadir', color: 'bg-green-500 text-white' },
                                                                    { val: 'S', label: 'Sakit', color: 'bg-yellow-500 text-white' },
                                                                    { val: 'I', label: 'Izin', color: 'bg-blue-500 text-white' },
                                                                    { val: 'A', label: 'Alpa', color: 'bg-red-500 text-white' }
                                                                ].map(opt => (
                                                                    <button
                                                                        key={opt.val}
                                                                        onClick={() => handleStatusChange(student.student_id, opt.val)}
                                                                        className={\`w-10 h-10 rounded-md text-xs font-bold transition flex items-center justify-center \${
                                                                            student.status === opt.val 
                                                                            ? opt.color + ' shadow-md scale-105' 
                                                                            : 'text-zinc-400 hover:bg-white hover:text-zinc-600'
                                                                        }\`}
                                                                        title={opt.label}
                                                                    >
                                                                        {opt.val}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* FLOATING ACTION BUTTONS */}
                        {selectedClass && (
                            <div className="fixed bottom-6 right-6 left-6 md:left-72 z-40 flex gap-3">
                                {/* Tombol Hapus (Hanya muncul jika Data Exists) */}
                                {dataExists && (
                                    <button
                                        onClick={handleDeleteClick}
                                        disabled={deleting || loading}
                                        className="w-16 md:w-20 bg-red-600 text-white font-bold rounded-xl shadow-2xl hover:bg-red-700 active:scale-95 transition disabled:opacity-70 flex items-center justify-center"
                                        title="Hapus Data Tanggal Ini"
                                    >
                                        {ICONS.trash}
                                    </button>
                                )}

                                {/* Tombol Simpan Utama */}
                                <button 
                                    onClick={handleSaveClick}
                                    disabled={submitting || loading}
                                    className="flex-1 py-4 bg-black text-white font-bold rounded-xl shadow-2xl hover:bg-zinc-800 active:scale-95 transition disabled:opacity-70 flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <span>MENYIMPAN...</span>
                                    ) : (
                                        <>
                                            {dataExists ? (
                                                <> {ICONS.edit} PERBARUI DATA </>
                                            ) : (
                                                <> {ICONS.check} SIMPAN DATA PRESENSI </>
                                            )}
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        <ExportModal 
                            isOpen={showExportModal} 
                            onClose={() => setShowExportModal(false)} 
                            classId={selectedClass?.id} 
                        />
                    </div>
                </AuthGuard>
            );
        }

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<Attendance />);
    `;

    return getLayoutHtml({
        title: 'Presensi Siswa',
        user: { name: 'Guru' },
        activePeriod,
        initialData,
        contentComponent
    });
}