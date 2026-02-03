import React, { useState, useEffect } from 'react';
import { fetchApi } from '../utils/api';
import { useAlertContext } from '../components/Alert';
import { X } from 'lucide-react';
import { convertToProxyUrl } from '../utils/imageUtils';

// Sub-Components
import { CreateTaskModal, StudentModal, WeightModal, DiscussionModal } from './Tasks/TaskModals';
import { ClassGrid, TaskList } from './Tasks/TaskList';
import { TaskEditor } from './Tasks/TaskEditor';
import { TaskGrading } from './Tasks/TaskGrading';
import ImagePickerModal from '../components/ImagePickerModal';

export default function Tasks() {
    // --- GLOBAL VIEW STATE ---
    const [viewMode, setViewMode] = useState('LIST'); // LIST, EDITOR, GRADING
    const [classes, setClasses] = useState([]);
    const [activePeriod, setActivePeriod] = useState(null); // Assuming handled by global context or fetch
    const [selectedClass, setSelectedClass] = useState(null);

    // --- DATA STATE ---
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingClasses, setLoadingClasses] = useState(true);
    const [activeTask, setActiveTask] = useState(null);
    const [students, setStudents] = useState([]);

    // --- EDITOR FORM STATE (Lifted Up) ---
    const [headerForm, setHeaderForm] = useState({
        title: '', description: '', deadline: '',
        targetType: 'all', allowedStudents: [], pgWeight: 0
    });
    const [questions, setQuestions] = useState([]);
    const [saving, setSaving] = useState(false);

    // --- GRADING STATE (Lifted Up) ---
    const [submissions, setSubmissions] = useState([]);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [gradeInput, setGradeInput] = useState({ feedback: '', essayScores: {} });

    // --- MODALS STATE ---
    const [createModal, setCreateModal] = useState(false);
    const [studentModal, setStudentModal] = useState(false);
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
            // Asumsi ada endpoint ini atau ambil dari list periods
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
            const res = await fetchApi(`/api/tasks?class_id=${classId}`);
            if (res.ok) setTasks(await res.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const fetchStudents = async (classId) => {
        try {
            const res = await fetchApi(`/api/classes/students?class_id=${classId}`);
            if (res.ok) setStudents(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchTaskDetail = async (taskId, mode = 'EDITOR') => {
        try {
            const res = await fetchApi(`/api/tasks/detail?id=${taskId}`);
            if (res.ok) {
                const data = await res.json();
                setActiveTask(data);

                // Populate Form State
                setHeaderForm({
                    id: data.id,
                    title: data.title,
                    description: data.description || '',
                    deadline: data.deadline || '',
                    targetType: data.target_type,
                    allowedStudents: data.allowedStudents || [],
                    pgWeight: data.pg_weight || 0
                });
                setQuestions(data.questions || []);

                if (mode === 'EDITOR') setViewMode('EDITOR');
                if (mode === 'GRADING') {
                    fetchSubmissions(taskId);
                    // Auto-trigger Weight Modal jika belum disetting (Smart Logic legacy)
                    const totalEssayWeight = (data.questions || []).reduce((acc, q) => acc + (q.weight || 0), 0);
                    const hasQuestions = (data.questions || []).length > 0;

                    if (hasQuestions && data.pg_weight === 0 && totalEssayWeight === 0) {
                        setWeightModal(true);
                    }
                    setViewMode('GRADING');
                }
            }
        } catch (e) { showAlert('Gagal memuat detail tugas', 'error'); }
    };

    const fetchSubmissions = async (taskId) => {
        try {
            const res = await fetchApi(`/api/tasks/submissions?task_id=${taskId}`);
            if (res.ok) setSubmissions(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchSubmissionDetail = async (submissionId) => {
        try {
            const res = await fetchApi(`/api/tasks/submission-detail?submission_id=${submissionId}`);
            if (res.ok) {
                const data = await res.json();
                setSelectedSubmission(data);

                // Konversi score poin dari DB menjadi skala 0-100 untuk input GUI
                const scores = {};
                data.answers.forEach(a => {
                    if (a.type !== 'pg') {
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

    // ... (rest of code)

    // --- ACTION HANDLERS (LOGIC) ---

    // [RESTORED] Missing in previous edit
    const handleSelectClass = (cls) => {
        setSelectedClass(cls);
        fetchTasks(cls.id);
        fetchStudents(cls.id);
    };

    const handleCreateHeader = async () => {
        if (!headerForm.title) return showAlert('Judul wajib diisi', 'error');
        if (headerForm.targetType === 'specific' && headerForm.allowedStudents.length === 0) return showAlert('Pilih minimal 1 siswa remedial!', 'error');
        if (!activePeriod) return showAlert('Tidak ada periode akademik aktif', 'error');

        setSaving(true);
        try {
            const payload = {
                classId: selectedClass.id,
                periodId: activePeriod.id, // [FIX] Include Period ID
                ...headerForm,
                questions: []
            };
            const res = await fetchApi('/api/tasks', { method: 'POST', body: JSON.stringify(payload) });
            if (res.ok) {
                setCreateModal(false);
                const newTask = await res.json();


                // Reset Form
                setHeaderForm({ title: '', description: '', deadline: '', targetType: 'all', allowedStudents: [], pgWeight: 0 });
                // Reset Questions
                setQuestions([]);

                // Refresh List
                fetchTasks(selectedClass.id);
                showAlert('Draft tugas dibuat. Silakan lengkapi soal.', 'success');

                // Optional: Langsung masuk mode edit?
                // Legacy: Just refresh list.
            }
        } catch (e) { showAlert('Gagal membuat tugas', 'error'); }
        setSaving(false);
    };

    const handleSaveFullTask = async () => {
        if (headerForm.targetType === 'specific' && headerForm.allowedStudents.length === 0) return showAlert('Pilih minimal 1 siswa remedial!', 'error');
        setSaving(true);
        try {
            const payload = { ...headerForm, questions };
            const res = await fetchApi('/api/tasks', { method: 'PUT', body: JSON.stringify(payload) });
            if (res.ok) {
                const data = await res.json();
                showAlert(data.message || 'Perubahan tersimpan.', 'success');

                if (viewMode === 'GRADING') {
                    await fetchSubmissions(headerForm.id);
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
            const payload = { ...headerForm, questions };
            const res = await fetchApi('/api/tasks', { method: 'PUT', body: JSON.stringify(payload) });
            if (res.ok) showAlert('Identitas tugas berhasil diperbarui!', 'success');
        } catch (e) { showAlert('Gagal menyimpan.', 'error'); }
        setSaving(false);
    };

    const handleDeleteTask = async (id) => {
        const confirmed = await showConfirm('Hapus tugas ini beserta semua data nilainya? Tindakan tidak bisa dibatalkan.');
        if (!confirmed) return;
        try {
            await fetchApi(`/api/tasks?id=${id}`, { method: 'DELETE' });
            fetchTasks(selectedClass.id);
            showAlert('Tugas berhasil dihapus', 'success');
        } catch (e) { showAlert('Gagal menghapus', 'error'); }
    };

    const handleToggleStatus = async (task) => {
        const newStatus = task.is_active ? 0 : 1;
        const confirmMsg = newStatus ? "Tugas akan muncul di dashboard siswa. Lanjutkan?" : "Tugas akan disembunyikan (Draft). Lanjutkan?";
        const confirmed = await showConfirm(confirmMsg);
        if (!confirmed) return;
        try {
            const res = await fetchApi('/api/tasks/toggle', {
                method: 'POST',
                body: JSON.stringify({ id: task.id, isActive: newStatus })
            });
            if (res.ok) fetchTasks(selectedClass.id);
        } catch (e) { showAlert('Gagal mengubah status.', 'error'); }
    };

    // Save Grade dengan Detail Poin Essay
    const handleSaveGrade = async (calculatedScore, next = false) => {
        if (!selectedSubmission) return;

        const detailScores = {};
        selectedSubmission.answers.forEach(a => {
            if (a.type !== 'pg') {
                const quality = gradeInput.essayScores[a.answer_id] || 0;
                const points = (quality / 100) * (a.weight || 0);
                detailScores[a.answer_id] = points;
            }
        });

        try {
            const res = await fetchApi('/api/tasks/grade', {
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
                await fetchSubmissions(activeTask.id);
                if (next) {
                    // Logic Next Submission
                    const currIdx = submissions.findIndex(s => s.student_id === selectedSubmission.submission.student_id);
                    // Note: submissions state stores list of summary objects, not full detail.
                    // We need to find the index in `submissions` list.
                    if (currIdx !== -1 && currIdx < submissions.length - 1) {
                        const nextId = submissions[currIdx + 1].id;
                        fetchSubmissionDetail(nextId);
                    } else {
                        setSelectedSubmission(null);
                        showAlert("Semua siswa telah dinilai.", "success");
                    }
                }
            }
        } catch (e) { showAlert('Gagal menyimpan nilai', 'error'); }
    };

    const handlePublishGrade = async (target, isPublished, type) => {
        const payload = { isPublished };
        if (type === 'TASK') payload.taskId = target;
        else payload.submissionId = target;

        try {
            const res = await fetchApi('/api/tasks/publish', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const data = await res.json();
                showAlert(data.message, 'success');
                if (activeTask) fetchSubmissions(activeTask.id);
            } else {
                showAlert('Gagal mengubah status publish', 'error');
            }
        } catch (e) { showAlert('Error koneksi', 'error'); }
    };

    // Handle Save Discussion
    const handleSaveDiscussion = async (taskId, formData) => {
        try {
            const res = await fetchApi('/api/tasks/discussion', {
                method: 'POST',
                body: JSON.stringify({ taskId, ...formData })
            });
            if (res.ok) {
                const data = await res.json();
                showAlert(data.message, 'success');
                setDiscussionModal(false);
                fetchTasks(selectedClass.id); // Refresh list
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

    // Components used across modes
    const modals = (
        <>
            <CreateTaskModal
                isOpen={createModal}
                onClose={() => setCreateModal(false)}
                form={headerForm}
                setForm={setHeaderForm}
                students={students}
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

    // 2. LIST MODE
    if (viewMode === 'LIST') {
        return (
            <>
                {modals}
                <TaskList
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

    // --- URL MODAL HANDLER (for injecting images) ---
    const handleConfirmUrl = (url) => {
        const idx = urlModal.targetIdx;
        if (idx === null || !url) {
            setUrlModal({ isOpen: false, targetIdx: null });
            return;
        }

        // Use convertToProxyUrl for Google Drive links (uses thumbnail endpoint which works)
        // convertToProxyUrl handles Google Drive links (uses thumbnail endpoint via proxy)
        const finalUrl = convertToProxyUrl(url);

        const message = finalUrl !== url
            ? 'Link Google Drive berhasil dikonversi (via proxy).'
            : 'Gambar berhasil disisipkan.';

        // Insert image HTML into question text
        const imgHtml = `<br><img src="${finalUrl}" class="w-full max-w-sm rounded-lg border border-zinc-200 my-2 shadow-sm"><br>`;
        // FIX: Create new question object (immutable update) to trigger React re-render
        const newQuestions = questions.map((q, i) =>
            i === idx
                ? { ...q, questionText: (q.questionText || '') + imgHtml }
                : q
        );
        setQuestions(newQuestions);

        setUrlModal({ isOpen: false, targetIdx: null });
        showAlert(message, 'success');
    };

    // 3. EDITOR MODE
    if (viewMode === 'EDITOR') {
        return (
            <>
                {modals}
                <StudentModal
                    isOpen={studentModal}
                    onClose={() => setStudentModal(false)}
                    students={students}
                    selectedIds={headerForm.allowedStudents}
                    onChange={(newIds) => setHeaderForm({ ...headerForm, allowedStudents: newIds })}
                />

                <ImagePickerModal
                    isOpen={urlModal.isOpen}
                    onClose={() => setUrlModal({ isOpen: false, targetIdx: null })}
                    onSelect={handleConfirmUrl}
                />

                <TaskEditor
                    headerForm={headerForm}
                    setHeaderForm={setHeaderForm}
                    questions={questions}
                    setQuestions={setQuestions}
                    saving={saving}
                    onSaveFull={handleSaveFullTask}
                    onSaveIdentity={handleSaveIdentityOnly}
                    onCancel={() => setViewMode('LIST')}
                    onOpenStudentModal={() => setStudentModal(true)}
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
                    onSave={() => {
                        handleSaveFullTask();
                        setWeightModal(false);
                    }}
                />

                <TaskGrading
                    task={headerForm}
                    students={students}
                    questions={questions}
                    submissions={submissions}
                    selectedSubmission={selectedSubmission}
                    gradeInput={gradeInput}
                    setGradeInput={setGradeInput}
                    onSelectSubmission={fetchSubmissionDetail}
                    onSave={handleSaveGrade}
                    onPublish={handlePublishGrade}
                    onBack={() => setViewMode('LIST')}
                    onOpenWeightModal={() => setWeightModal(true)}
                    onOpenUrlModal={(idx) => setUrlModal({ isOpen: true, targetIdx: idx })}
                    pgWeight={headerForm.pgWeight}
                />
            </>
        );
    }

    return null;
}
