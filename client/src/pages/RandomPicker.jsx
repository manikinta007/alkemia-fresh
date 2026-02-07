import React, { useState, useEffect, useRef } from 'react';
import { fetchApi } from '../utils/api';
import { Users, Shuffle, Play, RotateCcw, Copy, Check, Dices, UsersRound } from 'lucide-react';

export default function RandomPicker() {
    // State
    const [classes, setClasses] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [students, setStudents] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]); // IDs of students to include
    const [mode, setMode] = useState('picker'); // 'picker' or 'group'
    const [isSpinning, setIsSpinning] = useState(false);
    const [winner, setWinner] = useState(null);
    const [excludedWinners, setExcludedWinners] = useState([]); // Exclude previous winners
    const [groups, setGroups] = useState([]);
    const [groupCount, setGroupCount] = useState(4);
    const [copied, setCopied] = useState(false);

    // Refs for animation
    const spinIntervalRef = useRef(null);
    const currentIndexRef = useRef(0);
    const [displayName, setDisplayName] = useState('');

    // Load classes on mount
    useEffect(() => {
        loadClasses();
    }, []);

    // Load students when class changes
    useEffect(() => {
        if (selectedClassId) {
            loadStudents(selectedClassId);
            setWinner(null);
            setGroups([]);
            setExcludedWinners([]);
        }
    }, [selectedClassId]);

    const loadClasses = async () => {
        try {
            const res = await fetchApi('/api/classes');
            const data = await res.json();
            setClasses(data || []);
            if (data?.length > 0) {
                setSelectedClassId(data[0].id.toString());
            }
        } catch (e) {
            console.error('Failed to load classes:', e);
        }
    };

    const loadStudents = async (classId) => {
        try {
            const res = await fetchApi(`/api/classes/students?class_id=${classId}`);
            const data = await res.json();
            const studentList = data || [];
            setStudents(studentList);
            setSelectedStudents(studentList.map(s => s.id)); // Select all by default
        } catch (e) {
            console.error('Failed to load students:', e);
        }
    };

    const toggleStudent = (id) => {
        setSelectedStudents(prev =>
            prev.includes(id)
                ? prev.filter(sid => sid !== id)
                : [...prev, id]
        );
    };

    const selectAll = () => setSelectedStudents(students.map(s => s.id));
    const deselectAll = () => setSelectedStudents([]);

    // ========================================
    // PICKER MODE (Spin Wheel Effect)
    // ========================================
    const startSpin = () => {
        const pool = students.filter(s =>
            selectedStudents.includes(s.id) && !excludedWinners.includes(s.id)
        );

        if (pool.length === 0) {
            alert('Tidak ada siswa yang tersedia untuk diundi!');
            return;
        }

        setIsSpinning(true);
        setWinner(null);
        currentIndexRef.current = 0;

        // Spinning animation - show names rapidly then slow down
        let speed = 50; // Start fast
        let iterations = 0;
        const maxIterations = 30 + Math.floor(Math.random() * 10);

        const spin = () => {
            currentIndexRef.current = (currentIndexRef.current + 1) % pool.length;
            setDisplayName(pool[currentIndexRef.current].name);
            iterations++;

            if (iterations >= maxIterations) {
                // Stop and declare winner
                clearInterval(spinIntervalRef.current);
                const winnerStudent = pool[currentIndexRef.current];
                setWinner(winnerStudent);
                setIsSpinning(false);
            } else {
                // Gradually slow down
                if (iterations > maxIterations * 0.6) {
                    speed = 150;
                } else if (iterations > maxIterations * 0.8) {
                    speed = 300;
                }
                clearInterval(spinIntervalRef.current);
                spinIntervalRef.current = setInterval(spin, speed);
            }
        };

        spinIntervalRef.current = setInterval(spin, speed);
    };

    const excludeWinner = () => {
        if (winner) {
            setExcludedWinners(prev => [...prev, winner.id]);
            setWinner(null);
        }
    };

    const resetExcluded = () => {
        setExcludedWinners([]);
        setWinner(null);
    };

    // ========================================
    // GROUP MODE
    // ========================================
    const generateGroups = () => {
        const pool = students.filter(s => selectedStudents.includes(s.id));

        if (pool.length === 0) {
            alert('Pilih minimal 1 siswa!');
            return;
        }

        // Shuffle array
        const shuffled = [...pool].sort(() => Math.random() - 0.5);

        // Divide into groups
        const result = [];
        const perGroup = Math.ceil(shuffled.length / groupCount);

        for (let i = 0; i < groupCount; i++) {
            const start = i * perGroup;
            const end = start + perGroup;
            const members = shuffled.slice(start, end);
            if (members.length > 0) {
                result.push({
                    name: `Kelompok ${i + 1}`,
                    members: members
                });
            }
        }

        setGroups(result);
    };

    const copyGroupsToClipboard = () => {
        const text = groups.map(g =>
            `${g.name}:\n${g.members.map((m, i) => `  ${i + 1}. ${m.name}`).join('\n')}`
        ).join('\n\n');

        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // ========================================
    // RENDER
    // ========================================
    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center shadow-sm">
                    <Dices className="text-orange-500" size={28} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900">Random Picker</h1>
                    <p className="text-sm text-zinc-500">Pilih siswa acak atau buat kelompok otomatis</p>
                </div>
            </div>

            {/* Class Selector */}
            <div className="bg-white rounded-xl border border-zinc-200 p-4 mb-6 shadow-sm">
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Pilih Kelas</label>
                <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-zinc-200 bg-zinc-50 font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                    {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            {/* Mode Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setMode('picker')}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${mode === 'picker'
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                        }`}
                >
                    <Shuffle size={18} />
                    Pilih Acak
                </button>
                <button
                    onClick={() => setMode('group')}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${mode === 'group'
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                        }`}
                >
                    <UsersRound size={18} />
                    Buat Kelompok
                </button>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Left: Student List */}
                <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-zinc-800 flex items-center gap-2">
                            <Users size={18} />
                            Daftar Siswa ({selectedStudents.length}/{students.length})
                        </h3>
                        <div className="flex gap-2">
                            <button onClick={selectAll} className="text-xs text-orange-600 font-bold hover:underline">Semua</button>
                            <span className="text-zinc-300">|</span>
                            <button onClick={deselectAll} className="text-xs text-zinc-500 font-bold hover:underline">Kosongkan</button>
                        </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto space-y-1">
                        {students.map(s => (
                            <label
                                key={s.id}
                                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedStudents.includes(s.id)
                                    ? 'bg-orange-50 border border-orange-200'
                                    : 'hover:bg-zinc-50 border border-transparent'
                                    } ${excludedWinners.includes(s.id) ? 'opacity-40 line-through' : ''}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedStudents.includes(s.id)}
                                    onChange={() => toggleStudent(s.id)}
                                    className="w-4 h-4 accent-orange-600"
                                />
                                <span className="text-sm font-medium text-zinc-700">{s.name}</span>
                                {excludedWinners.includes(s.id) && (
                                    <span className="text-xs bg-zinc-200 text-zinc-500 px-2 py-0.5 rounded-full ml-auto">Sudah</span>
                                )}
                            </label>
                        ))}
                        {students.length === 0 && (
                            <p className="text-center text-zinc-400 py-8">Pilih kelas untuk melihat siswa</p>
                        )}
                    </div>
                </div>

                {/* Right: Action Area */}
                <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm flex flex-col">
                    {mode === 'picker' ? (
                        <>
                            {/* Spin Display */}
                            <div className={`flex-1 flex flex-col items-center justify-center py-8 rounded-xl mb-4 ${isSpinning
                                ? 'bg-zinc-700'
                                : winner
                                    ? 'bg-zinc-800'
                                    : 'bg-zinc-100'
                                }`}>
                                <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${isSpinning || winner ? 'text-zinc-400' : 'text-zinc-500'
                                    }`}>
                                    {isSpinning ? 'Mengacak...' : winner ? '🎉 Terpilih!' : 'Siap Diundi'}
                                </p>
                                <p className={`text-3xl font-black tracking-tight ${isSpinning ? 'text-white' : winner ? 'text-orange-500' : 'text-zinc-400'
                                    }`}>
                                    {isSpinning ? displayName : winner ? winner.name : '???'}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="space-y-2">
                                <button
                                    onClick={startSpin}
                                    disabled={isSpinning || selectedStudents.length === 0}
                                    className="w-full py-4 bg-orange-600 hover:bg-orange-700 disabled:bg-zinc-300 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
                                >
                                    <Play size={22} />
                                    {isSpinning ? 'Mengacak...' : 'MULAI ACAK'}
                                </button>

                                {winner && (
                                    <button
                                        onClick={excludeWinner}
                                        className="w-full py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Check size={18} />
                                        Tandai Sudah & Acak Lagi
                                    </button>
                                )}

                                {excludedWinners.length > 0 && (
                                    <button
                                        onClick={resetExcluded}
                                        className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-700 font-medium flex items-center justify-center gap-1"
                                    >
                                        <RotateCcw size={14} />
                                        Reset ({excludedWinners.length} sudah dipilih)
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Group Generator */}
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Jumlah Kelompok</label>
                                <input
                                    type="number"
                                    min="2"
                                    max="20"
                                    value={groupCount}
                                    onChange={(e) => setGroupCount(parseInt(e.target.value) || 2)}
                                    className="w-full px-4 py-3 rounded-lg border border-zinc-200 bg-zinc-50 font-bold text-center text-xl focus:ring-2 focus:ring-orange-500"
                                />
                            </div>

                            <button
                                onClick={generateGroups}
                                disabled={selectedStudents.length === 0}
                                className="w-full py-4 bg-orange-600 hover:bg-orange-700 disabled:bg-zinc-300 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors shadow-sm mb-4"
                            >
                                <Shuffle size={22} />
                                BUAT KELOMPOK
                            </button>

                            {/* Groups Result */}
                            {groups.length > 0 && (
                                <div className="flex-1 overflow-y-auto space-y-3">
                                    {groups.map((group, i) => (
                                        <div key={i} className="bg-zinc-50 rounded-lg p-3 border border-zinc-200">
                                            <h4 className="font-bold text-zinc-700 mb-2">{group.name}</h4>
                                            <ul className="space-y-1">
                                                {group.members.map((m, j) => (
                                                    <li key={m.id} className="text-sm text-zinc-600">
                                                        {j + 1}. {m.name}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}

                                    <button
                                        onClick={copyGroupsToClipboard}
                                        className="w-full py-3 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                                    >
                                        {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                                        {copied ? 'Tersalin!' : 'Salin ke Clipboard'}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
