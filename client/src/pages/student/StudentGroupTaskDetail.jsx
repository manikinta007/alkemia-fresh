import React, { useState, useEffect, useRef } from 'react';
import { processContentForDisplay } from '../../utils/imageUtils';

export default function StudentGroupTaskDetail({ student, taskId, onBack }) {
    const [task, setTask] = useState(null);
    const [group, setGroup] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [submission, setSubmission] = useState(null);
    const [answers, setAnswers] = useState({}); // { qId: { text, image, option } }
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // UPLOAD STATE
    const [uploading, setUploading] = useState({});

    useEffect(() => {
        fetchDetail();
    }, [taskId]);

    const fetchDetail = async () => {
        try {
            const token = localStorage.getItem('student_token');
            const res = await fetch(`/api/student/group-task-detail?taskId=${taskId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTask(data.task);
                setGroup(data.group);
                setQuestions(data.questions);
                setSubmission(data.submission);

                // Map existing answers
                const ansMap = {};
                (data.answers || []).forEach(a => {
                    ansMap[a.question_id] = {
                        text: a.answer_text,
                        image: a.answer_image_url
                    };
                });
                setAnswers(ansMap);
            }
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleAnswerChange = (qId, field, val) => {
        setAnswers(prev => ({
            ...prev,
            [qId]: { ...prev[qId], [field]: val }
        }));
    };

    const handleFileUpload = async (qId, file) => {
        if (!file) return;
        setUploading(p => ({ ...p, [qId]: true }));
        try {
            const formData = new FormData();
            formData.append('file', file);
            const token = localStorage.getItem('student_token');

            const res = await fetch('/api/student/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                handleAnswerChange(qId, 'image', data.url);
            } else {
                alert('Gagal upload gambar');
            }
        } catch (e) { alert('Error koneksi'); }
        setUploading(p => ({ ...p, [qId]: false }));
    };

    const handleSubmit = async (isDraft) => {
        if (!confirm(isDraft ? "Simpan draft?" : "Kumpulkan tugas final?")) return;
        setSubmitting(true);
        try {
            const token = localStorage.getItem('student_token');
            const payload = {
                taskId,
                isDraft,
                responses: answers
            };

            const res = await fetch('/api/student/group-tasks/submit', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert(isDraft ? "Draft tersimpan" : "Tugas dikumpulkan!");
                if (!isDraft) onBack(); // Go back only on final submit
                else fetchDetail(); // Refresh to ensure sync
            } else {
                const err = await res.json();
                alert(err.error || "Gagal submit");
            }
        } catch (e) { alert("Error sistem"); }
        setSubmitting(false);
    };

    if (loading) return <div className="p-8 text-center text-white">Memuat...</div>;
    if (!task) return <div className="p-8 text-center text-white">Tugas tidak ditemukan</div>;

    const isReadOnly = submission?.is_graded === 1 || (submission?.is_graded === 0 && submission?.submitted_by);
    // Logic: Draft (-1) is editable. Submitted (0) is Read Only (Waiting Grade). Graded (1) is Read Only.

    return (
        <div className="flex flex-col h-full bg-zinc-950 text-white animate-in slide-in-from-bottom-4">
            {/* HEADER */}
            <div className="bg-zinc-900 border-b border-zinc-800 p-4 sticky top-0 z-20 shadow-lg pt-safe flex justify-between items-center">
                <button onClick={onBack} className="text-zinc-400 font-bold hover:text-white">Batal</button>
                <div className="text-center">
                    <h3 className="font-bold text-sm text-white">{task.title}</h3>
                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                        GROUP: {group.name}
                    </div>
                </div>
                <div className="w-8"></div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
                {/* INFO CARD */}
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                    <p className="text-sm text-zinc-300 font-medium mb-4">{task.description}</p>
                    <div className="text-xs text-zinc-500">
                        <p className="font-bold text-zinc-400 mb-1">ANGGOTA KELOMPOK:</p>
                        <ul className="list-disc list-inside">
                            {group.members.map((m, i) => <li key={i}>{m.name}</li>)}
                        </ul>
                    </div>
                </div>

                {submission?.feedback && (
                    <div className="bg-blue-900/20 border border-blue-800 p-4 rounded-xl">
                        <p className="text-xs font-bold text-blue-400 mb-1">FEEDBACK GURU (Nilai: {submission.grade})</p>
                        <p className="text-sm text-blue-100">{submission.feedback}</p>
                    </div>
                )}

                {/* QUESTIONS */}
                {questions.map((q, idx) => (
                    <div key={q.id} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                        <div className="mb-3 flex items-center justify-between">
                            <span className="text-xs font-bold bg-zinc-800 px-2 py-1 rounded text-orange-500">
                                NO {idx + 1} ({q.weight} Poin)
                            </span>
                            {isReadOnly && answers[q.id]?.score !== undefined && (
                                <span className="text-xs font-bold text-green-500">
                                    Skor: {answers[q.id].score}
                                </span>
                            )}
                        </div>

                        <div className="mb-4 text-sm text-zinc-200 whitespace-pre-wrap">{q.question_text}</div>
                        {q.question_image_url && <img src={q.question_image_url} className="mb-4 rounded max-h-48" alt="Soal" />}

                        {/* INPUTS */}
                        {q.type === 'pg' && (
                            <div className="space-y-2">
                                {(q.options ? JSON.parse(q.options) : []).map((opt, oIdx) => (
                                    <div
                                        key={oIdx}
                                        onClick={() => !isReadOnly && handleAnswerChange(q.id, 'text', opt)}
                                        className={`p-3 border rounded-lg cursor-pointer text-sm font-medium transition ${answers[q.id]?.text === opt
                                                ? 'bg-orange-600 border-orange-500 text-white'
                                                : 'bg-black border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                                            }`}
                                    >
                                        {opt}
                                    </div>
                                ))}
                            </div>
                        )}

                        {q.type === 'essay_text' && (
                            <textarea
                                className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-sm text-white focus:border-orange-500 outline-none"
                                rows="4"
                                placeholder="Jawaban..."
                                value={answers[q.id]?.text || ''}
                                onChange={e => handleAnswerChange(q.id, 'text', e.target.value)}
                                disabled={isReadOnly}
                            ></textarea>
                        )}

                        {q.type === 'essay_image' && (
                            <div>
                                {answers[q.id]?.image && (
                                    <div className="relative mb-2 w-fit">
                                        <img src={answers[q.id].image} className="h-32 rounded border border-zinc-700" alt="Jawaban" />
                                        {!isReadOnly && (
                                            <button
                                                onClick={() => handleAnswerChange(q.id, 'image', null)}
                                                className="absolute -top-2 -right-2 bg-red-600 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs"
                                            >X</button>
                                        )}
                                    </div>
                                )}
                                {!answers[q.id]?.image && !isReadOnly && (
                                    <label className="block w-full p-8 border-2 border-dashed border-zinc-800 rounded-lg text-center cursor-pointer hover:border-zinc-600">
                                        <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(q.id, e.target.files[0])} />
                                        <span className="text-zinc-500 text-sm">
                                            {uploading[q.id] ? 'Mengupload...' : 'Klik untuk upload gambar'}
                                        </span>
                                    </label>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* FOOTER */}
            {!isReadOnly && (
                <div className="bg-zinc-900 border-t border-zinc-800 p-4 sticky bottom-0 z-20 pb-safe flex gap-4">
                    <button
                        onClick={() => handleSubmit(true)}
                        disabled={submitting}
                        className="flex-1 py-3 bg-zinc-800 text-zinc-300 font-bold rounded-xl text-sm"
                    >
                        Simpan Draft
                    </button>
                    <button
                        onClick={() => handleSubmit(false)}
                        disabled={submitting}
                        className="flex-[2] py-3 bg-orange-600 text-white font-bold rounded-xl text-sm"
                    >
                        {submitting ? 'Mengirim...' : 'Kirim Tugas'}
                    </button>
                </div>
            )}
        </div>
    );
}
