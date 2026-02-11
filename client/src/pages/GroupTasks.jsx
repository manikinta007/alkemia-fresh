import React, { useState, useEffect } from 'react';
import { fetchApi } from '../utils/api';
import { useAlertContext } from '../components/Alert';

// Sub-Components
import { CreateGroupTaskModal, WeightModal, DiscussionModal } from './GroupTasks/GroupTaskModals';
import { ClassGrid, GroupTaskList } from './GroupTasks/GroupTaskList';
import { GroupTaskEditor } from './GroupTasks/GroupTaskEditor';
import { GroupTaskGrading } from './GroupTasks/GroupTaskGrading';
import ImagePickerModal from '../components/ImagePickerModal';

export default function GroupTasks() {
    // --- GLOBAL VIEW STATE ---
    const [viewMode, setViewMode] = useState('LIST'); // LIST, EDITOR, GRADING
    const [classes, setClasses] = useState([]);
    const [activePeriod, setActivePeriod] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);

    // --- DATA STATE ---
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingClasses, setLoadingClasses] = useState(true);
    const [activeTask, setActiveTask] = useState(null);
    const [groupSets, setGroupSets] = useState([]);

    // --- EDITOR FORM STATE ---
    const [headerForm, setHeaderForm] = useState({
        title: '', description: '', deadline: '', groupSetId: null, pgWeight: 0
    });
    const [questions, setQuestions] = useState([]);
    const [saving, setSaving] = useState(false);

    // --- GRADING STATE ---
    const [groupSubmissions, setGroupSubmissions] = useState([]);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [gradeInput, setGradeInput] = useState({ feedback: '', essayScores: {} });

    // --- MODALS STATE ---
    const [createModal, setCreateModal] = useState(false);
    const [weightModal, setWeightModal] = useState(false);
    const [discussionModal, setDiscussionModal] = useState(false);
    const [urlModal, setUrlModal] = useState({ isOpen: false, targetIdx: null });

    const { showAlert, showConfirm } = useAlertContext();

    // --- INITIAL FETCH ---
    useEffect(() => {
        fetchClasses();
        fetchActivePeriod();
    }, []);

    const fetchClasses = async () => {
        setLoadingClasses(true);
        try {
            const res = await fetchApi('/api/classes');
            if (res.ok) setClasses(await res.json());
        } catch (e) { console.error(e); }
        setLoadingClasses(false);
    };

    const fetchActivePeriod = async () => {
        try {
            const res = await fetchApi('/api/periods');
            if (res.ok) {
                const data = await res.json();
                const active = data.find(p => p.is_active === 1);
                if (active) setActivePeriod(active);
            }
        } catch (e) { console.error(e); }
    };

    // --- API FETCHERS ---
    const fetchTasks = async (classId) => {
        setLoading(true);
        try {
            const res = await fetchApi(`/api/group-tasks?classId=${classId}`);
            if (res.ok) setTasks(await res.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const fetchGroupSets = async (classId) => {
        try {
            const res = await fetchApi(`/api/groups/sets?class_id=${classId}`);
            if (res.ok) setGroupSets(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchTaskDetail = async (taskId, mode = 'EDITOR') => {
        try {
            const res = await fetchApi(`/api/group-tasks/${taskId}`);
            if (res.ok) {
                const data = await res.json();
                setActiveTask(data);

                // Populate Form State
                setHeaderForm({
                    id: data.id,
                    title: data.title,
                    description: data.description || '',
                    deadline: data.deadline || '',
                    groupSetId: data.group_set_id,
                    pgWeight: data.pg_weight || 0
                });

                // Parse questions
                const parsedQuestions = (data.questions || []).map(q => ({
                    ...q,
                    questionText: q.question_text || '',
                    questionImageUrl: q.question_image_url || '',
                    correctKey: q.correct_key || '',
                    options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : [],
                    weight: q.weight || 0,
                    charLimit: q.char_limit || 500
                }));
                setQuestions(parsedQuestions);

                if (mode === 'EDITOR') setViewMode('EDITOR');
                if (mode === 'GRADING') {
                    setSelectedSubmission(null);
                    fetchGroupSubmissions(taskId);

                    const totalEssayWeight = parsedQuestions.reduce((acc, q) => acc + (q.weight || 0), 0);
                    const hasQuestions = parsedQuestions.length > 0;
                    if (hasQuestions && (data.pg_weight || 0) === 0 && totalEssayWeight === 0) {
                        setWeightModal(true);
                    }
                    setViewMode('GRADING');
                }
            }
        } catch (e) { showAlert('Gagal memuat detail tugas kelompok', 'error'); }
    };

    const fetchGroupSubmissions = async (taskId) => {
        try {
            const res = await fetchApi(`/api/group-tasks/submissions?taskId=${taskId}`);
            if (res.ok) {
                const data = await res.json();
                // Members are now included directly in the response
                setGroupSubmissions(data);
            }
        } catch (e) { console.error(e); }
    };

    const fetchSubmissionDetail = async (submissionId) => {
        try {
            const res = await fetchApi(`/api/group-tasks/submission-detail?submissionId=${submissionId}`);
            if (res.ok) {
                const data = await res.json();
                setSelectedSubmission(data);

                // Pre-fill essay scores for graded answers
                const scores = {};
                data.answers.forEach(a => {
                    if (a.type !== 'pg' && a.is_graded === 1) {
                        const w = a.weight || 0;
                        const s = a.score || 0;
                        scores[a.answer_id] = w > 0 ? Math.round((s / w) * 100) : 0;
                    }
                });

                setGradeInput({
                    feedback: data.submission.feedback || '',
                    essayScores: scores
                });
            }
        } catch (e) { console.error(e); }
    };

    // --- ACTION HANDLERS ---

    const handleSelectClass = (cls) => {
        setSelectedClass(cls);
        fetchTasks(cls.id);
        fetchGroupSets(cls.id);
    };

    const handleCreateHeader = async () => {
        if (!headerForm.title) return showAlert('Judul wajib diisi', 'error');
        if (!headerForm.groupSetId) return showAlert('Pilih set kelompok terlebih dahulu', 'error');
        if (!activePeriod) return showAlert('Tidak ada periode akademik aktif', 'error');

        setSaving(true);
        try {
            const payload = {
                class_id: selectedClass.id,
                period_id: activePeriod.id,
                group_set_id: headerForm.groupSetId,
                title: headerForm.title,
                description: headerForm.description,
                deadline: headerForm.deadline,
                questions: []
            };
            const res = await fetchApi('/api/group-tasks', { method: 'POST', body: JSON.stringify(payload) });
            if (res.ok) {
                setCreateModal(false);
                const newTask = await res.json();

                // Reset Form
                setHeaderForm({ title: '', description: '', deadline: '', groupSetId: null, pgWeight: 0 });
                setQuestions([]);

                // Refresh List
                fetchTasks(selectedClass.id);
                showAlert('Draft tugas kelompok dibuat. Silakan lengkapi soal.', 'success');
            } else {
                const errData = await res.json();
                showAlert(errData.error || 'Gagal membuat tugas', 'error');
            }
        } catch (e) { showAlert('Gagal membuat tugas', 'error'); }
        setSaving(false);
    };

    const handleSaveFullTask = async () => {
        setSaving(true);
        try {
            const payload = {
                id: headerForm.id,
                title: headerForm.title,
                description: headerForm.description,
                deadline: headerForm.deadline,
                group_set_id: headerForm.groupSetId,
                pg_weight: headerForm.pgWeight,
                questions: questions.map(q => ({
                    id: q.id,
                    type: q.type,
                    text: q.questionText,
                    image: q.questionImageUrl || null,
                    options: q.type === 'pg' ? q.options : null,
                    correct_key: q.correctKey || null,
                    weight: q.weight || 0
                }))
            };
            const res = await fetchApi('/api/group-tasks/update', { method: 'PUT', body: JSON.stringify(payload) });
            if (res.ok) {
                const data = await res.json();
                showAlert(data.message || 'Perubahan tersimpan.', 'success');

                if (viewMode === 'GRADING') {
                    await fetchGroupSubmissions(headerForm.id);
                } else {
                    setViewMode('LIST');
                    fetchTasks(selectedClass.id);
                }
            } else { showAlert('Gagal menyimpan.', 'error'); }
        } catch (e) { showAlert('Error koneksi.', 'error'); }
        setSaving(false);
    };

    const handleSaveIdentityOnly = async () => {
        setSaving(true);
        try {
            const payload = {
                id: headerForm.id,
                title: headerForm.title,
                description: headerForm.description,
                deadline: headerForm.deadline,
                group_set_id: headerForm.groupSetId,
                pg_weight: headerForm.pgWeight,
                questions: questions.map(q => ({
                    id: q.id,
                    type: q.type,
                    text: q.questionText,
                    image: q.questionImageUrl || null,
                    options: q.type === 'pg' ? q.options : null,
                    correct_key: q.correctKey || null,
                    weight: q.weight || 0
                }))
            };
            const res = await fetchApi('/api/group-tasks/update', { method: 'PUT', body: JSON.stringify(payload) });
            if (res.ok) showAlert('Identitas tugas berhasil diperbarui!', 'success');
        } catch (e) { showAlert('Gagal menyimpan.', 'error'); }
        setSaving(false);
    };

    const handleDeleteTask = async (id) => {
        const confirmed = await showConfirm('Hapus tugas kelompok ini beserta semua data nilainya? Tindakan tidak bisa dibatalkan.');
        if (!confirmed) return;
        try {
            await fetchApi(`/api/group-tasks/delete?id=${id}`, { method: 'DELETE' });
            fetchTasks(selectedClass.id);
            showAlert('Tugas kelompok berhasil dihapus', 'success');
        } catch (e) { showAlert('Gagal menghapus', 'error'); }
    };

    const handleToggleStatus = async (task) => {
        const newStatus = task.is_active ? 0 : 1;
        const confirmMsg = newStatus ? "Tugas akan muncul di dashboard siswa. Lanjutkan?" : "Tugas akan disembunyikan (Draft). Lanjutkan?";
        const confirmed = await showConfirm(confirmMsg);
        if (!confirmed) return;
        try {
            const res = await fetchApi('/api/group-tasks/toggle', {
                method: 'POST',
                body: JSON.stringify({ id: task.id, isActive: newStatus })
            });
            if (res.ok) fetchTasks(selectedClass.id);
        } catch (e) { showAlert('Gagal mengubah status.', 'error'); }
    };

    // Save Grade
    const handleSaveGrade = async (calculatedScore, next = false) => {
        if (!selectedSubmission) return;

        const detailScores = {};
        selectedSubmission.answers.forEach(a => {
            if (a.type !== 'pg') {
                const quality = gradeInput.essayScores[a.answer_id];
                if (quality !== undefined && quality !== '') {
                    const points = (Number(quality) / 100) * (a.weight || 0);
                    detailScores[a.answer_id] = points;
                }
            }
        });

        try {
            const res = await fetchApi('/api/group-tasks/grade', {
                method: 'POST',
                body: JSON.stringify({
                    submissionId: selectedSubmission.submission.id,
                    grade: calculatedScore,
                    feedback: gradeInput.feedback,
                    essayScores: detailScores
                })
            });
            if (res.ok) {
                showAlert('Nilai tersimpan: ' + calculatedScore, 'success');
                await fetchGroupSubmissions(activeTask.id);
                if (next) {
                    // Find next submission
                    const currentGroupId = selectedSubmission.submission.group_id;
                    const currIdx = groupSubmissions.findIndex(g => g.group_id === currentGroupId);
                    // Find next group that has a submission
                    let nextSub = null;
                    for (let i = currIdx + 1; i < groupSubmissions.length; i++) {
                        if (groupSubmissions[i].submission) {
                            nextSub = groupSubmissions[i].submission;
                            break;
                        }
                    }
                    if (nextSub) {
                        fetchSubmissionDetail(nextSub.id);
                    } else {
                        setSelectedSubmission(null);
                        showAlert("Semua kelompok telah dinilai.", "success");
                    }
                }
            }
        } catch (e) { showAlert('Gagal menyimpan nilai', 'error'); }
    };

    const handlePublishGrade = async (taskId, isPublished) => {
        try {
            const res = await fetchApi('/api/group-tasks/publish', {
                method: 'POST',
                body: JSON.stringify({ taskId, isPublished })
            });
            if (res.ok) {
                const data = await res.json();
                showAlert(data.message, 'success');
                if (activeTask) fetchGroupSubmissions(activeTask.id);
            } else {
                showAlert('Gagal mengubah status publish', 'error');
            }
        } catch (e) { showAlert('Error koneksi', 'error'); }
    };

    // Discussion
    const handleSaveDiscussion = async (taskId, formData) => {
        try {
            const res = await fetchApi('/api/group-tasks/discussion', {
                method: 'POST',
                body: JSON.stringify({ taskId, ...formData })
            });
            if (res.ok) {
                const data = await res.json();
                showAlert(data.message, 'success');
                setDiscussionModal(false);
                fetchTasks(selectedClass.id);
            } else {
                showAlert('Gagal menyimpan konfigurasi.', 'error');
            }
        } catch (e) { showAlert('Error koneksi.', 'error'); }
    };

    // --- RENDERER ORCHESTRATOR ---

    // 1. SELECT CLASS MODE
    if (!selectedClass) {
        return <ClassGrid classes={classes} onSelect={handleSelectClass} loading={loadingClasses} />;
    }

    // Modals shared across modes
    const modals = (
        <>
            <CreateGroupTaskModal
                isOpen={createModal}
                onClose={() => setCreateModal(false)}
                form={headerForm}
                setForm={setHeaderForm}
                groupSets={groupSets}
                onCreate={handleCreateHeader}
                saving={saving}
            />

            <DiscussionModal
                isOpen={discussionModal}
                onClose={() => setDiscussionModal(false)}
                task={activeTask}
                onSave={handleSaveDiscussion}
            />
        </>
    );

    // URL Modal handler
    const handleConfirmUrl = (url) => {
        const idx = urlModal.targetIdx;
        if (idx === null || !url) {
            setUrlModal({ isOpen: false, targetIdx: null });
            return;
        }
        const imgHtml = `<br><img src="${url}" class="w-full max-w-sm rounded-lg border border-zinc-200 my-2 shadow-sm"><br>`;
        const newQuestions = questions.map((q, i) =>
            i === idx ? { ...q, questionText: (q.questionText || '') + imgHtml } : q
        );
        setQuestions(newQuestions);
        setUrlModal({ isOpen: false, targetIdx: null });
        showAlert('Gambar berhasil disisipkan.', 'success');
    };

    // 2. LIST MODE
    if (viewMode === 'LIST') {
        return (
            <>
                {modals}
                <GroupTaskList
                    selectedClass={selectedClass}
                    tasks={tasks}
                    loading={loading}
                    onBack={() => setSelectedClass(null)}
                    onCreate={() => setCreateModal(true)}
                    onEdit={(id) => fetchTaskDetail(id, 'EDITOR')}
                    onGrade={(id) => fetchTaskDetail(id, 'GRADING')}
                    onDelete={handleDeleteTask}
                    onToggleStatus={handleToggleStatus}
                    onDiscussion={(task) => {
                        setActiveTask(task);
                        setDiscussionModal(true);
                    }}
                />
            </>
        );
    }

    // 3. EDITOR MODE
    if (viewMode === 'EDITOR') {
        return (
            <>
                {modals}

                <ImagePickerModal
                    isOpen={urlModal.isOpen}
                    onClose={() => setUrlModal({ isOpen: false, targetIdx: null })}
                    onSelect={handleConfirmUrl}
                />

                <GroupTaskEditor
                    headerForm={headerForm}
                    setHeaderForm={setHeaderForm}
                    questions={questions}
                    setQuestions={setQuestions}
                    saving={saving}
                    onSaveFull={handleSaveFullTask}
                    onSaveIdentity={handleSaveIdentityOnly}
                    onCancel={() => setViewMode('LIST')}
                    onOpenUrlModal={(idx) => setUrlModal({ isOpen: true, targetIdx: idx })}
                />
            </>
        );
    }

    // 4. GRADING MODE
    if (viewMode === 'GRADING') {
        const totalEssayWeight = questions.filter(q => q.type !== 'pg').reduce((a, b) => a + (b.weight || 0), 0);
        const totalWeight = headerForm.pgWeight + totalEssayWeight;
        const isValidWeight = totalWeight === 100;

        return (
            <>
                {modals}
                <WeightModal
                    isOpen={weightModal}
                    onClose={() => setWeightModal(false)}
                    pgWeight={headerForm.pgWeight}
                    setPgWeight={(val) => setHeaderForm({ ...headerForm, pgWeight: val })}
                    questions={questions}
                    isValidWeight={isValidWeight}
                    totalWeight={totalWeight}
                    onUpdateWeight={(idx, val) => {
                        const newQ = [...questions];
                        newQ[idx].weight = val;
                        setQuestions(newQ);
                    }}
                    onDistribute={() => {
                        const essayQs = questions.filter(q => q.type !== 'pg');
                        if (essayQs.length === 0) return;
                        const remaining = 100 - headerForm.pgWeight;
                        if (remaining < 0) return showAlert('Bobot PG > 100%!', 'error');
                        const perQ = Math.floor(remaining / essayQs.length);
                        const rem = remaining % essayQs.length;
                        const newQ = questions.map(q => q.type === 'pg' ? q : { ...q, weight: perQ });
                        const firstEssay = newQ.findIndex(q => q.type !== 'pg');
                        if (firstEssay !== -1) newQ[firstEssay].weight += rem;
                        setQuestions(newQ);
                    }}
                    onSave={async () => {
                        try {
                            setSaving(true);
                            const payload = {
                                id: headerForm.id,
                                pg_weight: headerForm.pgWeight,
                                questions: questions.map(q => ({ id: q.id, weight: q.weight || 0 }))
                            };
                            const res = await fetchApi('/api/group-tasks/update-weights', { method: 'PUT', body: JSON.stringify(payload) });
                            if (res.ok) {
                                showAlert('Bobot berhasil disimpan!', 'success');
                                setWeightModal(false);
                            } else {
                                showAlert('Gagal menyimpan bobot.', 'error');
                            }
                        } catch (e) {
                            showAlert('Error koneksi.', 'error');
                        } finally {
                            setSaving(false);
                        }
                    }}
                />

                <GroupTaskGrading
                    task={headerForm}
                    questions={questions}
                    groupSubmissions={groupSubmissions}
                    selectedSubmission={selectedSubmission}
                    gradeInput={gradeInput}
                    setGradeInput={setGradeInput}
                    onSelectSubmission={fetchSubmissionDetail}
                    onSave={handleSaveGrade}
                    onPublish={handlePublishGrade}
                    onBack={() => setViewMode('LIST')}
                    onOpenWeightModal={() => setWeightModal(true)}
                    pgWeight={headerForm.pgWeight}
                    showConfirm={showConfirm}
                />
            </>
        );
    }

    return null;
}
