// views/ui.js
// CENTRALIZED UI COMPONENTS & SECURITY HELPER
// Update: Menambahkan URLInputModal agar bisa dipakai Global
// [NEW] Menambahkan Icon Clipboard untuk Presensi

export const UI_COMPONENTS = `
    // --- GLOBAL ICONS (PHOSPHOR BOLD/DUOTONE STYLE) ---
    const ICONS = {
        dashboard: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M216,48V208a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V48A16,16,0,0,1,56,32H200A16,16,0,0,1,216,48Z" opacity="0.2"></path><path d="M200,24H56A24,24,0,0,0,32,48V208a24,24,0,0,0,24,24H200a24,24,0,0,0,24-24V48A24,24,0,0,0,200,24Zm8,184a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8V48a8,8,0,0,1,8-8H200a8,8,0,0,1,8,8ZM88,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48-32v96a8,8,0,0,1-16,0V72a8,8,0,0,1,16,0Zm48,64v32a8,8,0,0,1-16,0V136a8,8,0,0,1,16,0Z"></path></svg>,
        calendar: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M208,48V88H48V48Z" opacity="0.2"></path><path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A24,24,0,0,0,24,56V208a24,24,0,0,0,24,24H208a24,24,0,0,0,24-24V56A24,24,0,0,0,208,32ZM72,48h16V64a8,8,0,0,0,16,0V48h48V64a8,8,0,0,0,16,0V48h40V80H48V48Zm136,160H48V96H208V208Z"></path></svg>,
        users: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M232,56V200a16,16,0,0,1-16,16H40a16,16,0,0,1-16-16V56A16,16,0,0,1,40,40H216A16,16,0,0,1,232,56Z" opacity="0.2"></path><path d="M216,32H40A24,24,0,0,0,16,56V200a24,24,0,0,0,24,24H216a24,24,0,0,0,24-24V56A24,24,0,0,0,216,32Zm8,168a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V56a8,8,0,0,1,8-8H216a8,8,0,0,1,8,8ZM160,168a8,8,0,0,1-8,8H56a8,8,0,0,1,0-16h96A8,8,0,0,1,160,168Z"></path></svg>,
        exam: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M224,176a8,8,0,0,1-8,8H168a8,8,0,0,1,0-16h48A8,8,0,0,1,224,176Z" opacity="0.2"></path><path d="M224,48H48a8,8,0,0,0-8,8V208a24,24,0,0,0,24,24H192a24,24,0,0,0,24-24V56A8,8,0,0,0,224,48Zm8,160a8,8,0,0,1-8,8H64a8,8,0,0,1-8-8V64H216V208Zm-40-24a8,8,0,0,1-8,8H120a8,8,0,0,1,0-16h56A8,8,0,0,1,192,184Zm0-32a8,8,0,0,1-8,8H120a8,8,0,0,1,0-16h56A8,8,0,0,1,192,152Zm0-32a8,8,0,0,1-8,8H120a8,8,0,0,1,0-16h56A8,8,0,0,1,192,120Z"></path></svg>,
        lab: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M74.83,112l-40.6,88.42A16,16,0,0,0,48.77,224H207.23a16,16,0,0,0,14.54-23.58L181.17,112Z" opacity="0.2"></path><path d="M214.5,196.77l-40.6-88.42A8,8,0,0,0,166.63,104H136V40h16a8,8,0,0,0,0-16H104a8,8,0,0,0,0,16h16v64H89.37a8,8,0,0,0-7.27,4.35L41.5,196.77A16,16,0,0,0,56,220.37H200A16,16,0,0,0,214.5,196.77ZM56,204.37l33.82-73.65L96.63,120h62.74l6.81,10.72L200,204.37Z"></path></svg>,
        trash: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor"><path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1-8,8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"></path></svg>,
        edit: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor"><path d="M92.7,216H48a8,8,0,0,1-8-8V163.3a7.91,7.91,0,0,1,2.3-5.6l120-120a8,8,0,0,1,11.4,0l44.6,44.6a8,8,0,0,1,0,11.4l-120,120A7.91,7.91,0,0,1,92.7,216Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"></path></svg>,
        check: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor"><path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"></path></svg>,
        warning: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 256 256" fill="currentColor"><path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.38A8.5,8.5,0,0,1,215.45,208H40.55a8.5,8.5,0,0,1-7.48-4.62,8.35,8.35,0,0,1,0-8.18L120.55,43.42a8.76,8.76,0,0,1,14.9,0l87.45,151.87A8.35,8.35,0,0,1,222.93,203.38ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm8,40a12,12,0,1,1-12-12A12,12,0,0,1,128,184Z"></path></svg>,
        fire: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 256 256" fill="currentColor"><path d="M149.2,21.07a8,8,0,0,0-12.13-2.67C126.39,25.86,88,54.71,88,104a8,8,0,0,1-16,0c0-14.89,3.84-26.79,6-32.61A8,8,0,0,0,67.63,60.6C40.38,82.5,24,112.54,24,144a104,104,0,0,0,208,0c0-62.1-41.25-104.09-82.8-122.93ZM128,232a88.1,88.1,0,0,1-88-88c0-26.46,12.78-52.57,34.87-73.34a107.4,107.4,0,0,0-1,25.75A24,24,0,0,0,97.6,125.13l13.66,13.66a8,8,0,0,0,11.31-11.32L108.91,113.8a8,8,0,0,1,8.34-12.72c19.12,6.85,32.75,25.46,32.75,46.92a8,8,0,0,0,16,0,51.84,51.84,0,0,0-6.17-24.16c27.6,15.69,54.17,45.41,54.17,88.16A88.1,88.1,0,0,1,128,232Z"></path></svg>,
        clipboard: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M200,32H163.74a47.92,47.92,0,0,0-71.48,0H56A16,16,0,0,0,40,48V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V48A16,16,0,0,0,200,32Zm-72,0a32,32,0,0,1,32,32H96A32,32,0,0,1,128,32Zm72,184H56V48H82.75A47.93,47.93,0,0,0,80,64v8a8,8,0,0,0,8,8h80a8,8,0,0,0,8-8V64a47.93,47.93,0,0,0-2.75-16H200Z" opacity="0.2"></path><path d="M216,40V208a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V40A16,16,0,0,1,56,24H200A16,16,0,0,1,216,40Zm-16,0H56V208H200V40Z"></path><path d="M160,80a32,32,0,0,1-64,0h64Z" opacity="0.2"></path><path d="M88,112a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H96A8,8,0,0,1,88,112Zm8,40h64a8,8,0,0,0,0-16H96a8,8,0,0,0,0,16Zm0,24h40a8,8,0,0,0,0-16H96a8,8,0,0,0,0,16ZM216,48v16a8,8,0,0,1-8,8H171.1a48.09,48.09,0,0,1-5.18,12.57A8,8,0,0,1,158.5,86,32,32,0,0,0,128,64h0a32,32,0,0,0-30.5,22,8,8,0,0,1-7.42-1.42A48.09,48.09,0,0,1,84.9,72H48a8,8,0,0,1-8-8V48A24,24,0,0,1,64,24H82.75a47.93,47.93,0,0,1,90.5,0H192A24,24,0,0,1,216,48Zm-16,8H173.28a63.85,63.85,0,0,0-6.14-16H192a8,8,0,0,0,8-8V48a8,8,0,0,0-8-8H163.74a47.92,47.92,0,0,0-71.48,0H64a8,8,0,0,0-8,8v4.29a24,24,0,0,1,8.34,16.29A63.8,63.8,0,0,0,82.72,56H56V216H200ZM128,40a16,16,0,0,1,16,16H112A16,16,0,0,1,128,40Z"></path></svg>,
    };

    // --- GLOBAL HELPER: SECURE FETCH (CSRF PROTECTION) ---
    window.secureFetch = async (url, options = {}) => {
        const headers = options.headers || {};
        const csrfToken = localStorage.getItem('csrf_token');
        const method = options.method ? options.method.toUpperCase() : 'GET';
        
        if (['POST', 'PUT', 'DELETE'].includes(method)) {
            if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
            
            // Fix Upload: Jangan set Content-Type jika FormData
            const isFormData = options.body instanceof FormData;
            if (!headers['Content-Type'] && !isFormData) {
                headers['Content-Type'] = 'application/json';
            }
        }

        try {
            const response = await fetch(url, { ...options, headers });
            if (response.status === 401 || (response.status === 403 && method !== 'GET')) {
                const clone = response.clone();
                try {
                    const errData = await clone.json();
                    if (errData.error && (errData.error.includes("Unauthorized") || errData.error.includes("CSRF"))) {
                        if (!window._authAlertShown) {
                            window._authAlertShown = true;
                            alert("Sesi keamanan Anda telah berakhir. Silakan login ulang.");
                            localStorage.clear();
                            window.location.href = '/';
                        }
                        return response;
                    }
                } catch (e) {}
            }
            return response;
        } catch (e) { throw e; }
    };

    // --- KOMPONEN GLOBAL: AUTH GUARD ---
    const AuthGuard = ({ children }) => {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (!user) { window.location.href = '/'; return null; }
        return children;
    };

    // --- KOMPONEN GLOBAL: CUSTOM ALERT (Success/Error) ---
    const CustomAlert = ({ isOpen, type, message, onClose }) => {
        if (!isOpen) return null;
        const isSuccess = type === 'success';
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 text-center transform transition-all scale-100 animate-in zoom-in-95 duration-200">
                    <div className={"w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 " + (isSuccess ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600")}>
                        <span className="text-3xl">{isSuccess ? "✓" : "!"}</span>
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900 mb-2">{isSuccess ? "Berhasil" : "Gagal"}</h3>
                    <p className="text-zinc-500 text-sm mb-6">{message}</p>
                    <button onClick={onClose} className="w-full py-3 bg-black text-white rounded-lg font-bold hover:bg-zinc-800 transition active:scale-95">TUTUP</button>
                </div>
            </div>
        );
    };

    // --- KOMPONEN GLOBAL: CUSTOM CONFIRM (Yes/No) ---
    const CustomConfirm = ({ isOpen, message, onConfirm, onCancel }) => {
        if (!isOpen) return null;
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 text-center transform transition-all scale-100 animate-in zoom-in-95 duration-200">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-zinc-100 text-zinc-600">
                        <span className="text-3xl">?</span>
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900 mb-2">Konfirmasi</h3>
                    <p className="text-zinc-500 text-sm mb-6">{message}</p>
                    <div className="flex gap-3">
                        <button onClick={onCancel} className="flex-1 py-3 border border-zinc-200 text-zinc-600 rounded-lg font-bold hover:bg-zinc-50 transition active:scale-95">BATAL</button>
                        <button onClick={onConfirm} className="flex-1 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition active:scale-95">YA, LANJUTKAN</button>
                    </div>
                </div>
            </div>
        );
    };

    // --- [BARU] KOMPONEN GLOBAL: URL INPUT MODAL (Input Link Gambar) ---
    const URLInputModal = ({ isOpen, onClose, onConfirm }) => {
        if (!isOpen) return null;
        const [url, setUrl] = React.useState('');
        const handleSubmit = () => { if (!url.trim()) return; onConfirm(url); setUrl(''); };

        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all scale-100 animate-in zoom-in-95">
                    <div className="flex items-center gap-3 mb-4 text-zinc-900">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M136.37,187.53a12,12,0,0,1,0,17l-5.94,5.94a60,60,0,0,1-84.85-84.85l24.85-24.85A60,60,0,0,1,152.68,98a12,12,0,1,1-16.36,17.56,36,36,0,0,0-49.7-1.66L61.77,138.74a36,36,0,0,0,50.91,50.91l5.94-5.94a12,12,0,0,1,17-.18Zm76.57-146.24a60,60,0,0,0-84.85,0l-5.94,5.94a12,12,0,0,0,17,17l5.94-5.94a36,36,0,0,1,50.91,50.91l-24.85,24.85a36,36,0,0,1-49.7-1.66,12,12,0,1,0-16.36,17.56,60,60,0,0,0,82.25,2.78l24.85-24.85A60,60,0,0,0,212.94,41.29Z"></path></svg>
                        </div>
                        <div><h3 className="text-lg font-bold">Sisipkan Gambar</h3><p className="text-xs text-zinc-500">Mendukung Google Drive & Direct Link.</p></div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Tempel Tautan (URL)</label>
                            <input type="text" autoFocus className="w-full px-4 py-3 rounded-lg border border-zinc-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition font-mono text-sm" placeholder="https://drive.google.com/..." value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
                        </div>
                        <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200"><p className="text-[10px] text-zinc-500 leading-relaxed"><span className="font-bold text-zinc-700">Tips:</span> Pastikan akses file di Google Drive diatur ke <b>"Siapa saja yang memiliki link"</b>.</p></div>
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button onClick={onClose} className="flex-1 py-3 border border-zinc-200 text-zinc-600 rounded-xl font-bold hover:bg-zinc-50 transition">BATAL</button>
                        <button onClick={handleSubmit} className="flex-1 py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition shadow-lg">SISIPKAN</button>
                    </div>
                </div>
            </div>
        );
    };
`;