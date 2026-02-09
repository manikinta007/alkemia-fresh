import React, { useState, useEffect, useRef } from 'react';
import { fetchApi } from '../utils/api';
import { Users, Shuffle, Play, RotateCcw, Copy, Check, Dices, UsersRound, Save, FolderOpen, Trash2, ArrowLeft, ChevronRight } from 'lucide-react';
import { useAlertContext } from '../components/Alert';

export default function RandomPicker() {
    // State
    const [classes, setClasses] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [students, setStudents] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]); // IDs of students to include
    const [mode, setMode] = useState('picker'); // 'picker' | 'group' | 'saved'

    // Picker State
    const [isSpinning, setIsSpinning] = useState(false);
    const [winner, setWinner] = useState(null);
    const [excludedWinners, setExcludedWinners] = useState([]); // Exclude previous winners
    const [displayName, setDisplayName] = useState('');

    // Group State
    const [groups, setGroups] = useState([]);
    const [groupSettings, setGroupSettings] = useState({
        method: 'count', // 'count' (Jumlah Kelompok) | 'size' (Anggota per Kelompok)
        value: 5
    });
    const [copied, setCopied] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Saved Groups State
    const [savedSets, setSavedSets] = useState([]);
    const [loadingSets, setLoadingSets] = useState(false);
    const [selectedSet, setSelectedSet] = useState(null);

    // Context & Refs
    const { showAlert, showConfirm, showPrompt } = useAlertContext();
    const spinIntervalRef = useRef(null);
    const currentIndexRef = useRef(0);

    // Load classes on mount
    useEffect(() => {
        loadClasses();
    }, []);

    // Load students & sets when class changes
    useEffect(() => {
        if (selectedClassId) {
            loadStudents(selectedClassId);
            setWinner(null);
            setGroups([]);
            setExcludedWinners([]);
            loadSavedSets(selectedClassId);
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

    const loadSavedSets = async (classId) => {
        setLoadingSets(true);
        try {
            const res = await fetchApi(`/api/groups/sets?class_id=${classId}`);
            if (res.ok) {
                const data = await res.json();
                setSavedSets(data || []);
            }
        } catch (e) {
            console.error('Failed to load saved sets:', e);
        } finally {
            setLoadingSets(false);
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
            showAlert('Tidak ada siswa yang tersedia untuk diundi!', 'error');
            return;
        }

        setIsSpinning(true);
        setWinner(null);
        currentIndexRef.current = 0;

        // Spinning animation
        let speed = 50;
        let iterations = 0;
        const maxIterations = 30 + Math.floor(Math.random() * 10);

        const spin = () => {
            currentIndexRef.current = (currentIndexRef.current + 1) % pool.length;
            setDisplayName(pool[currentIndexRef.current].name);
            iterations++;

            if (iterations >= maxIterations) {
                clearInterval(spinIntervalRef.current);
                const winnerStudent = pool[currentIndexRef.current];
                setWinner(winnerStudent);
                setIsSpinning(false);
            } else {
                if (iterations > maxIterations * 0.6) speed = 150;
                else if (iterations > maxIterations * 0.8) speed = 300;
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
            showAlert('Pilih minimal 1 siswa!', 'error');
            return;
        }

        // Shuffle array
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        const result = [];
        const total = shuffled.length;

        let numGroups;

        if (groupSettings.method === 'count') {
            // By Number of Groups (e.g., 5 groups)
            // Limit numGroups to total students (can't have more groups than students)
            numGroups = Math.max(1, Math.min(groupSettings.value, total));
        } else {
            // By Members per Group (e.g., Max 8 people/group)
            // Calculate minimum number of groups needed to satisfy the max size constraint
            // Example: 30 students, max 8. 30/8 = 3.75 -> need 4 groups.
            // 30 / 4 groups = 7.5 -> Groups will be 8, 8, 7, 7.
            const maxSize = Math.max(1, groupSettings.value);
            numGroups = Math.ceil(total / maxSize);
        }

        // Balanced Distribution Algorithm
        // Distribute 'total' items into 'numGroups' buckets as evenly as possible.
        // Base size = floor(total / numGroups)
        // Remainder = total % numGroups
        // The first 'remainder' groups get (baseSize + 1), the rest get baseSize.

        const baseSize = Math.floor(total / numGroups);
        const remainder = total % numGroups;
        let currentIndex = 0;

        for (let i = 0; i < numGroups; i++) {
            // Determine size for this group
            // If we have remainder > 0, distribute one extra member to this group
            const size = i < remainder ? baseSize + 1 : baseSize;

            if (size > 0) {
                const members = shuffled.slice(currentIndex, currentIndex + size);
                result.push({
                    name: `Kelompok ${i + 1}`,
                    members: members,
                    memberIds: members.map(m => m.id)
                });
                currentIndex += size;
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

    const saveGroups = async () => {
        if (groups.length === 0) return;

        const name = await showPrompt("Beri nama untuk kumpulan kelompok ini:", `Kelompok ${new Date().toLocaleDateString()}`);
        if (!name) return;

        setIsSaving(true);
        try {
            const res = await fetchApi('/api/groups/sets', {
                method: 'POST',
                body: JSON.stringify({
                    classId: parseInt(selectedClassId),
                    name,
                    groups: groups
                })
            });

            if (res.ok) {
                showAlert("Kelompok berhasil disimpan!", "success");
                // Optional: Clear groups or keep them? Keeping them allows multiple saves/edits.
                loadSavedSets(selectedClassId);
            } else {
                showAlert("Gagal menyimpan kelompok", "error");
            }
        } catch (e) {
            showAlert("Terjadi kesalahan", "error");
        } finally {
            setIsSaving(false);
        }
    };

    // ========================================
    // SAVED GROUPS ACTIONS
    // ========================================
    const deleteGroupSet = async (setId) => {
        if (!await showConfirm("Hapus kelompok tersimpan ini?")) return;
        try {
            await fetchApi(`/api/groups/sets/${setId}`, { method: 'DELETE' });
            setSelectedSet(null);
            loadSavedSets(selectedClassId);
            showAlert("Kelompok dihapus", "success");
        } catch (e) {
            showAlert("Gagal menghapus", "error");
        }
    }

    const viewGroupSet = async (setId) => {
        setLoadingSets(true);
        try {
            const res = await fetchApi(`/api/groups/sets/${setId}`);
            if (res.ok) {
                setSelectedSet(await res.json());
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingSets(false);
        }
    }


    // ========================================
    // RENDER
    // ========================================
    return (
        <div className="w-full">
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
            <div className="flex gap-2 mb-6 bg-zinc-100 p-1 rounded-xl">
                <button
                    onClick={() => setMode('picker')}
                    className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${mode === 'picker'
                        ? 'bg-white text-orange-600 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700'
                        }`}
                >
                    <Shuffle size={18} />
                    Pilih Acak
                </button>
                <button
                    onClick={() => setMode('group')}
                    className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${mode === 'group'
                        ? 'bg-white text-orange-600 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700'
                        }`}
                >
                    <UsersRound size={18} />
                    Buat Kelompok
                </button>
                <button
                    onClick={() => setMode('saved')}
                    className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${mode === 'saved'
                        ? 'bg-white text-orange-600 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700'
                        }`}
                >
                    <FolderOpen size={18} />
                    Tersimpan
                </button>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Left: Student List (Only for Picker/Group modes) */}
                {mode !== 'saved' && (
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
                )}

                {/* Left (Placeholder for Saved Mode Layout Balance) */}
                {mode === 'saved' && selectedSet && (
                    <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
                        <button onClick={() => setSelectedSet(null)} className="mb-4 text-sm font-bold text-zinc-500 hover:text-orange-600 flex items-center">
                            <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Daftar
                        </button>
                        <h3 className="font-bold text-xl text-zinc-900 mb-2">{selectedSet.name}</h3>
                        <p className="text-sm text-zinc-500 mb-6">Dibuat: {new Date(selectedSet.created_at).toLocaleDateString()}</p>
                        <div className="space-y-4 max-h-[500px] overflow-y-auto">
                            {selectedSet.groups.map(g => (
                                <div key={g.id} className="bg-zinc-50 rounded-lg p-3 border border-zinc-200">
                                    <h4 className="font-bold text-zinc-800 text-sm mb-2">{g.name}</h4>
                                    <ul className="space-y-1 pl-4 list-disc marker:text-zinc-300">
                                        {g.members.map(m => (
                                            <li key={m.id} className="text-sm text-zinc-600">{m.name}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {mode === 'saved' && !selectedSet && (
                    <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm flex items-center justify-center text-zinc-400 italic">
                        Pilih arsip kelompok di sebelah kanan untuk melihat detail.
                    </div>
                )}

                {/* Right: Action Area */}
                <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm flex flex-col">
                    {mode === 'picker' && (
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
                    )}

                    {mode === 'group' && (
                        <>
                            {/* Group Generator Controls */}
                            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 mb-4">
                                <div className="flex gap-2 mb-3">
                                    <button
                                        onClick={() => setGroupSettings({ ...groupSettings, method: 'count' })}
                                        className={`flex-1 py-2 text-xs font-bold rounded-lg border transition ${groupSettings.method === 'count' ? 'bg-white border-orange-200 text-orange-600 shadow-sm' : 'border-transparent text-zinc-400 hover:bg-zinc-200'}`}
                                    >
                                        Jumlah Kelompok
                                    </button>
                                    <button
                                        onClick={() => setGroupSettings({ ...groupSettings, method: 'size' })}
                                        className={`flex-1 py-2 text-xs font-bold rounded-lg border transition ${groupSettings.method === 'size' ? 'bg-white border-orange-200 text-orange-600 shadow-sm' : 'border-transparent text-zinc-400 hover:bg-zinc-200'}`}
                                    >
                                        Anggota per Kelompok
                                    </button>
                                </div>

                                <label className="block text-center text-xs font-bold text-zinc-500 uppercase mb-2">
                                    {groupSettings.method === 'count' ? 'Total Kelompok yang Diinginkan' : 'Maksimal Siswa per Kelompok'}
                                </label>
                                <div className="flex items-center justify-center gap-3">
                                    <button onClick={() => setGroupSettings({ ...groupSettings, value: Math.max(1, groupSettings.value - 1) })} className="p-3 bg-white border rounded-lg hover:bg-zinc-100 font-bold">-</button>
                                    <input
                                        type="number"
                                        min="1"
                                        value={groupSettings.value}
                                        onChange={(e) => setGroupSettings({ ...groupSettings, value: parseInt(e.target.value) || 1 })}
                                        className="w-20 text-center text-2xl font-bold bg-transparent border-none focus:ring-0"
                                    />
                                    <button onClick={() => setGroupSettings({ ...groupSettings, value: groupSettings.value + 1 })} className="p-3 bg-white border rounded-lg hover:bg-zinc-100 font-bold">+</button>
                                </div>
                            </div>

                            <button
                                onClick={generateGroups}
                                disabled={selectedStudents.length === 0}
                                className="w-full py-4 bg-orange-600 hover:bg-orange-700 disabled:bg-zinc-300 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors shadow-sm mb-4"
                            >
                                <Shuffle size={22} />
                                {groups.length > 0 ? 'ACAK ULANG' : 'GENERATE KELOMPOK'}
                            </button>

                            {/* Groups Result */}
                            {groups.length > 0 && (
                                <div className="flex-1 overflow-y-auto space-y-3">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={saveGroups}
                                            disabled={isSaving}
                                            className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors text-sm"
                                        >
                                            <Save size={16} />
                                            {isSaving ? 'Menyimpan...' : 'Simpan'}
                                        </button>
                                        <button
                                            onClick={copyGroupsToClipboard}
                                            className="flex-1 py-2 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors text-sm"
                                        >
                                            {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                                            {copied ? 'Tersalin!' : 'Copy'}
                                        </button>
                                    </div>

                                    {groups.map((group, i) => (
                                        <div key={i} className="bg-zinc-50 rounded-lg p-3 border border-zinc-200">
                                            <h4 className="font-bold text-zinc-700 mb-2">{group.name}</h4>
                                            <ul className="space-y-1 pl-4 list-decimal marker:text-zinc-400">
                                                {group.members.map((m) => (
                                                    <li key={m.id} className="text-sm text-zinc-600">
                                                        {m.name}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {mode === 'saved' && (
                        <div className="flex-1 overflow-y-auto space-y-2">
                            {savedSets.length === 0 ? (
                                <div className="text-center py-10 text-zinc-400">Belum ada kelompok tersimpan.</div>
                            ) : (
                                savedSets.map(set => (
                                    <div key={set.id} onClick={() => viewGroupSet(set.id)} className={`p-4 rounded-xl border cursor-pointer transition flex justify-between items-center ${selectedSet?.id === set.id ? 'bg-orange-50 border-orange-300' : 'bg-white border-zinc-200 hover:border-orange-300'}`}>
                                        <div>
                                            <h4 className="font-bold text-zinc-900">{set.name}</h4>
                                            <p className="text-xs text-zinc-500">{new Date(set.created_at).toLocaleDateString()} • {set.group_count} Kelompok</p>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); deleteGroupSet(set.id); }} className="p-2 hover:bg-red-50 text-zinc-300 hover:text-red-500 rounded-full transition">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
