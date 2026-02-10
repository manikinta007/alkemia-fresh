import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Save, Users, Crown, Info, AlertTriangle } from 'lucide-react';

const StudentGroupTaskDetail = () => {
    const { taskId } = useParams();
    const navigate = useNavigate();
    // Removed useAuth, using localStorage directly

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [task, setTask] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [group, setGroup] = useState(null);
    const [submission, setSubmission] = useState(null);
    const [answers, setAnswers] = useState({}); // { questionId: { text, image, option } }
    const [error, setError] = useState(null);

    // Leader Logic
    const [isLeader, setIsLeader] = useState(false);
    const [leaderName, setLeaderName] = useState("");
    const [leaderSelectedBy, setLeaderSelectedBy] = useState(null);

    // Auth
    const token = localStorage.getItem('student_token');
    const deviceId = localStorage.getItem('student_device_id');

    useEffect(() => {
        if (!token) {
            navigate('/student');
            return;
        }
        fetchTaskDetail();
    }, [taskId, token]);

    const fetchTaskDetail = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/student/group-task-detail?taskId=${taskId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Device-Id': deviceId
                }
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Failed to fetch task');

            setTask(data.task);
            setQuestions(data.questions);
            setGroup(data.group);
            setSubmission(data.submission);

            // Leader Logic
            // data.currentStudentId is returning from backend now
            const myId = data.currentStudentId;
            const currentLeaderId = data.group.leader_id;
            setIsLeader(myId === currentLeaderId);

            if (currentLeaderId) {
                const leader = data.group.members.find(m => m.id === currentLeaderId);
                setLeaderName(leader ? leader.name : "Unknown");
                if (data.group.leader_selected_by) {
                    try {
                        setLeaderSelectedBy(JSON.parse(data.group.leader_selected_by));
                    } catch (e) { setLeaderSelectedBy(null); }
                }
            }

            // Map existing answers
            if (data.answers) {
                const initialAnswers = {};
                data.answers.forEach(ans => {
                    initialAnswers[ans.question_id] = {
                        text: ans.answer_text,
                        image: ans.answer_image_url,
                        option: ans.answer_text
                    };
                });
                setAnswers(initialAnswers);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerChange = (qId, field, value) => {
        setAnswers(prev => ({
            ...prev,
            [qId]: {
                ...prev[qId],
                [field]: value
            }
        }));
    };

    const handleImageUpload = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        return data.url;
    };

    const submitTask = async (isDraft = false) => {
        if (!isDraft && !isLeader) {
            alert("Hanya Ketua Kelompok yang dapat mengirim tugas ini!");
            return;
        }

        if (!isDraft && !confirm("Apakah Anda yakin ingin mengirim tugas ini? Setelah dikirim, jawaban tidak dapat diubah.")) return;

        setSubmitting(true);
        try {
            // Upload images first if any (simple blob check logic needed if not already uploaded)
            // Assuming image upload happens immediately on selection or here. 
            // For simplicity, let's assume images are strings (URLs) or we handle upload separately.

            const payload = {
                taskId,
                responses: answers,
                isDraft
            };

            const response = await fetch('/api/student/group-tasks/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'X-Device-Id': localStorage.getItem('device_id')
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            alert(data.message);
            if (!isDraft) navigate('/student/tasks');
            else fetchTaskDetail(); // Refresh to see draft status
        } catch (err) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSelectLeader = async (studentId) => {
        if (!confirm("Apakah Anda yakin memilih anggota ini sebagai Ketua? Ini akan dicatat sistem.")) return;

        try {
            const response = await fetch(`/api/groups/${group.id}/leader`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ studentId })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            fetchTaskDetail(); // Refresh to update UI
        } catch (err) {
            alert(err.message);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading task...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    const isReadOnly = submission?.is_graded === 1 || (submission?.is_graded === 0 && submission?.submitted_at); // Submitted logic

    return (
        <div className="max-w-4xl mx-auto p-4 pb-24">
            <button onClick={() => navigate('/student/tasks')} className="flex items-center text-gray-600 mb-4">
                <ArrowLeft size={20} className="mr-2" /> Kembali
            </button>

            {/* HEADER */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold mb-2">{task.title}</h1>
                        <div className="flex items-center text-gray-600 text-sm gap-4">
                            <span className="flex items-center bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                <Users size={14} className="mr-1" /> {group.name}
                            </span>
                            <span>Deadline: {new Date(task.deadline).toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-gray-500">Status</div>
                        <div className={`font-bold ${submission?.is_graded === 1 ? 'text-green-600' : 'text-orange-500'}`}>
                            {submission?.is_graded === 1 ? 'DINILAI' : (submission ? 'DIKUMPULKAN' : 'BELUM DIKERJAKAN')}
                        </div>
                        {submission?.grade && <div className="text-3xl font-bold text-green-600 mt-1">{submission.grade}</div>}
                    </div>
                </div>

                {/* LEADER SECTION */}
                <div className="mt-6 border-t pt-4">
                    <h3 className="text-sm font-semibold text-gray-500 mb-2 flex items-center">
                        <Crown size={16} className="mr-1 text-yellow-500" /> Ketua Kelompok
                    </h3>

                    {group.leader_id ? (
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
                            <div className="font-medium text-gray-800 flex items-center justify-between">
                                <span>{leaderName} {isLeader && "(Anda)"}</span>
                            </div>
                            {leaderSelectedBy && (
                                <div className="text-xs text-gray-500 mt-1 flex items-center">
                                    <Info size={12} className="mr-1" />
                                    Dipilih oleh {leaderSelectedBy.by_name} pada {new Date(leaderSelectedBy.at).toLocaleDateString('id-ID')}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-red-50 border border-red-200 rounded p-4">
                            <div className="flex items-start">
                                <AlertTriangle size={20} className="text-red-500 mr-2 mt-0.5" />
                                <div className="flex-1">
                                    <h4 className="font-semibold text-red-700 text-sm">Kelompok belum memiliki ketua!</h4>
                                    <p className="text-red-600 text-xs mb-3">Tugas hanya dapat dikirim oleh Ketua. Silakan sepakati dan pilih salah satu anggota.</p>

                                    <div className="flex flex-wrap gap-2">
                                        {group.members.map(member => (
                                            <button
                                                key={member.id}
                                                onClick={() => handleSelectLeader(member.id)}
                                                className="bg-white border border-red-300 text-red-700 text-xs px-3 py-1.5 rounded hover:bg-red-50 transition"
                                            >
                                                Pilih {member.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* QUESTIONS */}
            <div className="space-y-6">
                {questions.map((q, idx) => (
                    <div key={q.id} className="bg-white rounded-lg shadow p-6">
                        <div className="font-semibold mb-4 flex">
                            <span className="mr-2">{idx + 1}.</span>
                            <div className="flex-1">
                                {q.question_text}
                                {q.question_image_url && (
                                    <img src={q.question_image_url} alt="Soal" className="mt-2 max-h-64 rounded" />
                                )}
                            </div>
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded h-fit">Bobot: {q.weight}</span>
                        </div>

                        {/* INPUT AREA based on Type */}
                        {!isReadOnly ? (
                            <div className="mt-4">
                                {q.type === 'essay' && (
                                    <textarea
                                        className="w-full border rounded p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                        rows="4"
                                        placeholder="Tulis jawaban kelompok di sini..."
                                        value={answers[q.id]?.text || ''}
                                        onChange={(e) => handleAnswerChange(q.id, 'text', e.target.value)}
                                    />
                                )}
                                {/* Add other types here (PG, Image) if needed as per previous files */}
                            </div>
                        ) : (
                            <div className="mt-4 bg-gray-50 p-4 rounded text-gray-700">
                                {answers[q.id]?.text || <em className="text-gray-400">Tidak ada jawaban</em>}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* FEEDBACK IF GRADED */}
            {submission?.feedback && (
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-bold text-blue-800 mb-2">Umpan Balik Guru:</h3>
                    <p className="text-blue-700">{submission.feedback}</p>
                </div>
            )}

            {/* ACTIONS */}
            {!isReadOnly && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-10 flex justify-between items-center max-w-4xl mx-auto rounded-t-xl shadow-lg">
                    <button
                        onClick={() => submitTask(true)}
                        disabled={submitting}
                        className="flex items-center px-6 py-2 border rounded-full text-gray-600 hover:bg-gray-50"
                    >
                        <Save size={18} className="mr-2" /> Simpan Draft
                    </button>

                    <button
                        onClick={() => submitTask(false)}
                        disabled={submitting || !group.leader_id || !isLeader}
                        className={`flex items-center px-8 py-2 rounded-full font-semibold text-white transition ${!group.leader_id || (group.leader_id && !isLeader)
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                        title={!isLeader ? (group.leader_id ? "Hanya Ketua yang dapat mengirim" : "Pilih Ketua terlebih dahulu") : ""}
                    >
                        {submitting ? 'Mengirim...' : (
                            <>
                                <Send size={18} className="mr-2" /> Kirim Tugas
                            </>
                        )}
                    </button>

                    {/* Helper Text for disabled state */}
                    {(!group.leader_id || !isLeader) && (
                        <div className="absolute right-4 bottom-16 bg-black text-white text-xs px-2 py-1 rounded opacity-75">
                            {!group.leader_id ? "⚠️ Pilih Ketua dulu" : (!isLeader ? "🔒 Menunggu Ketua" : "")}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StudentGroupTaskDetail;
