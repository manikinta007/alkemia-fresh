import React, { useState, useEffect } from 'react';
import { Trophy, RefreshCcw, WifiOff } from 'lucide-react';
import { LiveLeaderboard } from './LiveLeaderboard';
import { fetchApi } from '../../utils/api';

export const QuizResults = ({ activeQuiz, results, fetchResults, onReset, onBack }) => {
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [offlineData, setOfflineData] = useState([]);
    const [lastUpdate, setLastUpdate] = useState(null);

    const isOfflineMode = activeQuiz.is_offline_mode === 1;

    // Poll for offline monitoring data (if offline mode)
    useEffect(() => {
        if (!isOfflineMode) {
            // Online mode: use existing results polling
            fetchResults(activeQuiz.id);
            const interval = setInterval(() => { fetchResults(activeQuiz.id); }, 5000);
            return () => clearInterval(interval);
        }

        // Offline mode: use offline-monitor endpoint
        const fetchOffline = async () => {
            try {
                const res = await fetchApi(`/api/quiz/${activeQuiz.id}/offline-monitor`);
                const data = await res.json();
                setOfflineData(data.students || []);
                setLastUpdate(new Date());
            } catch (e) {
                console.error('Offline monitor error:', e);
            }
        };
        fetchOffline();
        const interval = setInterval(fetchOffline, 10000);
        return () => clearInterval(interval);
    }, [activeQuiz, isOfflineMode]);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'downloading': return <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">📥 DOWNLOAD</span>;
            case 'ready': return <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">⏳ SIAP</span>;
            case 'in_exam': return <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold animate-pulse">✍️ MENGERJAKAN</span>;
            case 'submitted': return <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">✅ SELESAI</span>;
            default: return <span className="text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full font-bold">— BELUM</span>;
        }
    };

    // Data to display (offline or online)
    const displayData = isOfflineMode ? offlineData : results;

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in pb-20">
            {showLeaderboard && (
                <LiveLeaderboard
                    results={(isOfflineMode ? offlineData : results).filter(r => r.finish_time || r.offline_status === 'submitted')}
                    onClose={() => setShowLeaderboard(false)}
                />
            )}

            <div className="flex justify-between items-center mb-6">
                <button onClick={onBack} className="text-sm font-bold text-zinc-500 hover:text-black">← KEMBALI</button>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowLeaderboard(true)} className="px-4 py-2 bg-yellow-400 text-yellow-900 border border-yellow-500 text-xs font-black rounded hover:bg-yellow-500 shadow-md flex items-center gap-2 transition hover:scale-105 active:scale-95">
                        <Trophy size={16} /> TAMPILKAN LEADERBOARD
                    </button>
                    <button onClick={() => onReset(activeQuiz.id, null)} className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 shadow-md flex items-center gap-2">
                        <RefreshCcw size={16} /> RESET SEMUA DATA
                    </button>
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold border border-red-100 animate-pulse">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div> Live Monitor
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Hasil: {activeQuiz.title}</h2>
                {isOfflineMode && (
                    <div className="flex items-center gap-2 text-xs text-purple-600">
                        <WifiOff size={14} />
                        <span className="font-bold">MODE OFFLINE</span>
                        {lastUpdate && <span className="text-purple-400">| Update: {lastUpdate.toLocaleTimeString('id-ID')}</span>}
                    </div>
                )}
            </div>

            <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-zinc-100 border-b border-zinc-200 text-xs uppercase font-bold text-zinc-500">
                        <tr>
                            <th className="p-4">Rank</th>
                            <th className="p-4">Nama Siswa</th>
                            {isOfflineMode && <th className="p-4">Status</th>}
                            {isOfflineMode && <th className="p-4 text-center">📱</th>}
                            {isOfflineMode && <th className="p-4 text-center">📡</th>}
                            <th className="p-4">Nilai</th>
                            <th className="p-4">Waktu Selesai</th>
                            <th className="p-4 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {displayData.map((r, i) => {
                            const isFinished = r.finish_time || r.offline_status === 'submitted';
                            const scoreClass = (r.score || 0) >= 75 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
                            const studentId = r.student_id;
                            const studentName = r.student_name || r.name;

                            return (
                                <tr key={studentId || i} className="hover:bg-zinc-50 transition">
                                    <td className="p-4 text-zinc-500">{isFinished ? ('#' + (i + 1)) : '-'}</td>
                                    <td className="p-4 font-bold text-zinc-800">{studentName}</td>
                                    {isOfflineMode && <td className="p-4">{getStatusBadge(r.offline_status)}</td>}
                                    {isOfflineMode && (
                                        <td className="p-4 text-center">
                                            {(r.tabSwitchCount || 0) > 0 ? (
                                                <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">{r.tabSwitchCount}</span>
                                            ) : <span className="text-zinc-300">0</span>}
                                        </td>
                                    )}
                                    {isOfflineMode && (
                                        <td className="p-4 text-center">
                                            {(r.connectionCount || 0) > 0 ? (
                                                <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">{r.connectionCount}</span>
                                            ) : <span className="text-zinc-300">0</span>}
                                        </td>
                                    )}
                                    <td className="p-4">
                                        {isFinished ? (
                                            <span className={'px-2 py-1 rounded text-xs font-bold ' + scoreClass}>{r.score ?? 0}</span>
                                        ) : (
                                            <span className="text-xs text-zinc-400">-</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-zinc-500 font-mono text-xs">
                                        {r.finish_time ? new Date(r.finish_time).toLocaleString('id-ID') : (
                                            <span className="text-red-500 font-bold text-xs uppercase">BELUM</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        <button onClick={() => onReset(activeQuiz.id, studentId)} className="text-zinc-400 hover:text-red-600 p-1 transition" title="Reset Ujian Siswa Ini">
                                            <RefreshCcw size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {displayData.length === 0 && <tr><td colSpan={isOfflineMode ? 8 : 5} className="p-8 text-center text-zinc-400">Belum ada siswa di kelas ini.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
