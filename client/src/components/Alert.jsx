import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, ChevronRight, Check } from 'lucide-react';

// --- KOMPONEN GLOBAL: ALERT ---
export const CustomAlert = ({ isOpen, type, message, onClose }) => {
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

// --- KOMPONEN GLOBAL: CONFIRM ---
export const CustomConfirm = ({ isOpen, message, onConfirm, onCancel }) => {
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

// --- KOMPONEN HELPER: USE ALERT (HOOK) ---
export const useAlert = () => {
    const [alertState, setAlertState] = useState({ isOpen: false, type: 'success', message: '' });
    const [confirmState, setConfirmState] = useState({ isOpen: false, message: '', onConfirm: null });

    const showAlert = (msg, type = 'success') => {
        setAlertState({ isOpen: true, type, message: msg });
    };

    const showConfirm = (msg, onConfirmCallback) => {
        setConfirmState({ isOpen: true, message: msg, onConfirm: onConfirmCallback });
    };

    const closeAlert = () => setAlertState(prev => ({ ...prev, isOpen: false }));
    const closeConfirm = () => setConfirmState(prev => ({ ...prev, isOpen: false }));

    const AlertComponent = () => (
        <>
            <CustomAlert
                isOpen={alertState.isOpen}
                type={alertState.type}
                message={alertState.message}
                onClose={closeAlert}
            />
            <CustomConfirm
                isOpen={confirmState.isOpen}
                message={confirmState.message}
                onConfirm={() => {
                    if (confirmState.onConfirm) confirmState.onConfirm();
                    closeConfirm();
                }}
                onCancel={closeConfirm}
            />
        </>
    );

    return { showAlert, showConfirm, AlertComponent };
};
// --- CONTEXT & PROVIDER FOR GLOBAL USAGE ---
const AlertContext = React.createContext();

export const AlertProvider = ({ children }) => {
    const { showAlert, showConfirm, AlertComponent } = useAlert();

    return (
        <AlertContext.Provider value={{ showAlert, showConfirm }}>
            {children}
            <AlertComponent />
        </AlertContext.Provider>
    );
};

export const useAlertContext = () => React.useContext(AlertContext);
