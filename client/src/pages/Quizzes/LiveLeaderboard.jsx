import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Maximize, Minimize } from 'lucide-react';

export const LiveLeaderboard = ({ results, onClose }) => {
    const [animatingIds, setAnimatingIds] = useState(new Set());
    const [isFullscreen, setIsFullscreen] = useState(false);
    const prevResultsRef = useRef({});
    const containerRef = useRef(null);

    // [LOGIC] Fullscreen API handlers
    const toggleFullscreen = async () => {
        try {
            if (!document.fullscreenElement) {
                await containerRef.current?.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (err) {
            console.error('Fullscreen error:', err);
        }
    };

    // [LOGIC] Listen for fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

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
        if (!start || !end) return '--:--';
        const diff = Math.floor((new Date(end) - new Date(start)) / 1000);
        const m = Math.floor(diff / 60);
        const s = diff % 60;
        return `${m}m ${s}s`;
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
        <div ref={containerRef} className="fixed inset-0 z-[9999] bg-zinc-900 text-white flex flex-col animate-in fade-in duration-300 overflow-hidden font-sans">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md z-50">
                <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_red]"></div>
                    <h2 className="text-2xl font-black tracking-tighter italic uppercase text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">LIVE LEADERBOARD</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleFullscreen}
                        className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full font-bold text-sm transition border border-zinc-700"
                        title={isFullscreen ? 'Keluar Fullscreen' : 'Fullscreen'}
                    >
                        {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                    </button>
                    <button onClick={onClose} className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-full font-bold text-sm transition border border-zinc-700">TUTUP</button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 relative flex flex-col custom-scrollbar">
                <div className="absolute inset-0 bg-zinc-900 pointer-events-none"></div>
                {/* Note: Removed stardust texture dependency for simplicity, kept gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-transparent to-zinc-900 pointer-events-none"></div>

                {/* PODIUM SECTION */}
                <div className="flex justify-center items-end gap-2 md:gap-8 mb-8 pt-40 min-h-[320px] z-10 flex-shrink-0">
                    {/* Rank 2 */}
                    <div className="flex flex-col items-center w-1/3 max-w-[200px] transition-all duration-500 relative">
                        <div className="mb-3 text-center animate-in slide-in-from-bottom duration-700 delay-100 w-full">
                            <div className={`text-lg md:text-xl font-black truncate w-full px-2 drop-shadow-md ${top3[1] ? 'text-zinc-300' : 'text-zinc-500 italic'}`}>
                                {top3[1] ? top3[1].student_name : "AYOOO, KAMU BISA!!!"}
                            </div>
                            {top3[1] && <div className="text-xs md:text-sm font-mono text-zinc-400 bg-black/40 px-2 py-1 rounded inline-block mt-1">⏱ {formatDuration(top3[1].start_time, top3[1].finish_time)}</div>}
                        </div>
                        <div className={`w-full h-40 md:h-56 bg-gradient-to-t from-zinc-500 to-zinc-300 rounded-t-3xl flex flex-col justify-end items-center pb-4 shadow-[0_0_40px_rgba(255,255,255,0.15)] border-t-4 border-zinc-200 relative transform transition-all duration-500 ${top3[1] && animatingIds.has(top3[1].student_id) ? 'scale-110 ring-4 ring-white shadow-[0_0_100px_white] z-20' : 'hover:scale-105'}`}>
                            <div className="text-5xl md:text-7xl font-black text-zinc-700/30">2</div>
                            <div className="absolute -top-10 md:-top-14 text-5xl md:text-7xl drop-shadow-xl animate-bounce" style={{ animationDuration: '3s' }}>🥈</div>
                            <div className="bg-black/30 backdrop-blur-sm px-4 py-1 rounded-full text-2xl md:text-3xl font-black mt-2 text-white border border-white/10">{top3[1] ? top3[1].score : "?"}</div>
                        </div>
                    </div>

                    {/* Rank 1 */}
                    <div className="flex flex-col items-center w-1/3 max-w-[240px] -mt-10 transition-all duration-500 relative z-20">
                        <div className="absolute -top-16 md:-top-20 text-6xl md:text-8xl drop-shadow-[0_0_30px_rgba(234,179,8,0.8)] animate-bounce z-20">👑</div>
                        <div className="mb-3 text-center animate-in slide-in-from-bottom duration-700 z-10 w-full">
                            <div className={`text-xl md:text-3xl font-black truncate w-full px-2 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] ${top3[0] ? 'text-yellow-400' : 'text-yellow-600/70 italic'}`}>
                                {top3[0] ? top3[0].student_name : "AYOOO, KAMU BISA!!!"}
                            </div>
                            {top3[0] && <div className="text-xs md:text-sm font-mono text-yellow-200/80 bg-black/40 px-2 py-1 rounded inline-block mt-1">⏱ {formatDuration(top3[0].start_time, top3[0].finish_time)}</div>}
                        </div>
                        <div className={`w-full h-56 md:h-72 bg-gradient-to-t from-yellow-600 via-yellow-500 to-yellow-300 rounded-t-3xl flex flex-col justify-end items-center pb-6 shadow-[0_0_60px_rgba(234,179,8,0.5)] border-t-4 border-yellow-100 relative transform transition-all duration-500 ring-4 ring-yellow-500/20 ${top3[0] && animatingIds.has(top3[0].student_id) ? 'scale-110 ring-4 ring-yellow-300 shadow-[0_0_100px_rgba(234,179,8,1)] z-20' : 'hover:scale-105'}`}>
                            <div className="text-7xl md:text-8xl font-black text-yellow-900/20">1</div>
                            <div className="bg-black/30 backdrop-blur-sm px-6 py-2 rounded-full text-4xl md:text-5xl font-black mt-2 text-white border border-white/20 shadow-inner">{top3[0] ? top3[0].score : "?"}</div>
                            <div className="absolute inset-0 overflow-hidden rounded-t-3xl"><div className="absolute top-0 left-1/4 w-2 h-2 bg-white rounded-full animate-ping"></div></div>
                        </div>
                    </div>

                    {/* Rank 3 */}
                    <div className="flex flex-col items-center w-1/3 max-w-[200px] transition-all duration-500 relative">
                        <div className="mb-3 text-center animate-in slide-in-from-bottom duration-700 delay-200 w-full">
                            <div className={`text-lg md:text-xl font-black truncate w-full px-2 drop-shadow-md ${top3[2] ? 'text-orange-300' : 'text-orange-800 italic'}`}>
                                {top3[2] ? top3[2].student_name : "AYOOO, KAMU BISA!!!"}
                            </div>
                            {top3[2] && <div className="text-xs md:text-sm font-mono text-zinc-400 bg-black/40 px-2 py-1 rounded inline-block mt-1">⏱ {formatDuration(top3[2].start_time, top3[2].finish_time)}</div>}
                        </div>
                        <div className={`w-32 h-32 md:h-44 bg-gradient-to-t from-orange-800 to-orange-400 rounded-t-3xl flex flex-col justify-end items-center pb-4 shadow-[0_0_30px_rgba(249,115,22,0.15)] border-t-4 border-orange-300 relative transform transition-all duration-500 ${top3[2] && animatingIds.has(top3[2].student_id) ? 'scale-110 ring-4 ring-orange-300 shadow-[0_0_100px_orange] z-20' : 'hover:scale-105'}`}>
                            <div className="text-4xl font-black text-orange-900/40">3</div>
                            <div className="absolute -top-10 md:-top-12 text-5xl md:text-7xl drop-shadow-xl animate-bounce" style={{ animationDuration: '2.5s' }}>🥉</div>
                            <div className="bg-black/20 px-4 py-1 rounded-full text-2xl font-black mt-2 text-white">{top3[2] ? top3[2].score : "?"}</div>
                        </div>
                    </div>
                </div>

                {/* LIST SECTION */}
                <div className="max-w-6xl mx-auto w-full flex flex-wrap justify-center gap-4 px-4 pb-20 z-10">
                    {listSlots.map((r, i) => {
                        const bgGradient = rankColors[i] || 'from-zinc-700 to-zinc-800';
                        const isAnimating = r && animatingIds.has(r.student_id);

                        return (
                            <div key={i} className={`relative overflow-hidden rounded-xl border border-white/5 p-1 transition-all duration-500 w-full md:w-[48%] lg:w-[32%] xl:w-[23%] min-w-[260px] ${isAnimating ? 'bg-white scale-105 z-20 shadow-[0_0_50px_rgba(255,255,255,0.5)]' : 'bg-zinc-800/40 hover:scale-105 hover:shadow-lg'}`}>
                                <div className={`flex items-center gap-4 h-full p-3 rounded-lg bg-gradient-to-br relative overflow-hidden transition-colors duration-500 ${isAnimating ? 'from-white to-zinc-100' : bgGradient}`}>
                                    <div className={`w-10 h-10 backdrop-blur-md rounded-lg flex items-center justify-center font-black text-lg shadow-inner border border-white/10 ${isAnimating ? 'bg-black text-white' : 'bg-black/30 text-white'}`}>#{i + 4}</div>
                                    <div className="flex-1 min-w-0 z-10">
                                        <div className={`font-bold truncate text-lg drop-shadow-md ${!r ? 'italic text-white/60' : ''} ${isAnimating ? 'text-black' : 'text-white'}`}>{r ? r.student_name : 'AYOOO, KAMU BISA!!!'}</div>
                                        <div className={`text-xs font-mono flex items-center gap-1 ${isAnimating ? 'text-zinc-600' : 'text-white/70'}`}><span>⏱</span> {r ? formatDuration(r.start_time, r.finish_time) : '--:--'}</div>
                                    </div>
                                    <div className={`backdrop-blur-md px-3 py-1 rounded-lg font-black text-2xl shadow-sm border border-white/20 ${isAnimating ? 'bg-black text-white' : 'bg-white/20 text-white'}`}>{r ? r.score : '?'}</div>
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
