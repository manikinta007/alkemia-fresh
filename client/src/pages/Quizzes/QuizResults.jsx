import React, { useState, useEffect } from 'react';
import { Trophy, RefreshCcw, MonitorPlay } from 'lucide-react';
import { LiveLeaderboard } from './LiveLeaderboard';

export const QuizResults = ({ activeQuiz, results, fetchResults, onReset, onBack }) => {
    const [showLeaderboard, setShowLeaderboard] = useState(false);

    // Poll Results
    useEffect(() => {
        fetchResults(activeQuiz.id);
        const interval = setInterval(() => { fetchResults(activeQuiz.id); }, 5000);
        return () => clearInterval(interval);
    }, [activeQuiz]);

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in pb-20">
            {/* GIMMICK LEADERBOARD */}
            {showLeaderboard && (
                <LiveLeaderboard
                    results={results.filter(r => r.finish_time)}
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

            <h2 className="text-2xl font-bold mb-6">Hasil: {activeQuiz.title}</h2>

            <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-zinc-100 border-b border-zinc-200 text-xs uppercase font-bold text-zinc-500">
                        <tr>
                            <th className="p-4">Rank</th>
                            <th className="p-4">Nama Siswa</th>
                            <th className="p-4">Nilai</th>
                            <th className="p-4">Waktu Selesai</th>
                            <th className="p-4 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {results.map((r, i) => {
                            const scoreClass = r.score >= 75 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
                            return (
                                <tr key={i} className="hover:bg-zinc-50 transition">
                                    <td className="p-4 text-zinc-500">{r.finish_time ? ('#' + (i + 1)) : '-'}</td>
                                    <td className="p-4 font-bold text-zinc-800">{r.student_name}</td>
                                    <td className="p-4">{r.finish_time ? (<span className={'px-2 py-1 rounded text-xs font-bold ' + scoreClass}>{r.score}</span>) : (<span className="text-xs font-bold text-red-500 bg-red-100 px-2 py-1 rounded">0</span>)}</td>
                                    <td className="p-4 text-zinc-500 font-mono text-xs">{r.finish_time ? new Date(r.finish_time).toLocaleString('id-ID') : (<span className="text-red-500 font-bold text-xs uppercase">BELUM / ABSEN</span>)}</td>
                                    <td className="p-4 text-center">
                                        <button onClick={() => onReset(activeQuiz.id, r.student_id)} className="text-zinc-400 hover:text-red-600 p-1 transition" title="Reset Ujian Siswa Ini">
                                            <RefreshCcw size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {results.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-zinc-400">Belum ada siswa di kelas ini.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
