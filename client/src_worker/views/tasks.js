// views/tasks.js
// PARENT ORCHESTRATOR (UPDATED V10)
// Update: Mendukung Master Key (Discussion Logic), Penyimpanan Detail Nilai Essay & Kalkulasi Poin + Publish Grades
// Update V10: Wiring Master Key Button & Discussion Modal

import { getLayoutHtml } from './layout.js';
import { UI_COMPONENTS } from './ui.js';

// Import Komponen Anak (String Injection)
import { TASK_MODALS_COMPONENT } from './tasks/taskModals.js';
import { TASK_LIST_COMPONENT } from './tasks/taskList.js';
import { TASK_EDITOR_COMPONENT } from './tasks/taskEditor.js';
import { TASK_GRADING_COMPONENT } from './tasks/taskGrading.js';

export function getTasksPage(classes = [], activePeriod = null) {
    const initialData = { classes, activePeriod };

    const contentComponent = `
        ${UI_COMPONENTS}
        ${TASK_MODALS_COMPONENT}
        ${TASK_LIST_COMPONENT}
        ${TASK_EDITOR_COMPONENT}
        ${TASK_GRADING_COMPONENT}

        const { useState, useEffect, useRef, useMemo } = React;
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        const { classes: initialClasses, activePeriod: initialPeriod } = window.__INITIAL_DATA__;

        function TasksApp() {
            // --- GLOBAL VIEW STATE ---
            const [viewMode, setViewMode] = useState('LIST'); // LIST, EDITOR, GRADING
            const [classes, setClasses] = useState(initialClasses || []);
            const [activePeriod, setActivePeriod] = useState(initialPeriod || null);
            const [selectedClass, setSelectedClass] = useState(null);
            
            // --- DATA STATE ---
            const [tasks, setTasks] = useState([]);
            const [loading, setLoading] = useState(false);
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
            const [urlModal, setUrlModal] = useState({ isOpen: false, targetIdx: null });
            const [studentModal, setStudentModal] = useState(false);
            const [weightModal, setWeightModal] = useState(false);
            const [discussionModal, setDiscussionModal] = useState(false); // [BARU V10]
            
            const [alertState, setAlertState] = useState({ isOpen: false, type: 'success', message: '' });
            const [confirmState, setConfirmState] = useState({ isOpen: false, message: '', onConfirm: null });

            // --- UI HELPERS ---
            const showAlert = (type, message) => setAlertState({ isOpen: true, type, message });
            const closeAlert = () => setAlertState({ ...alertState, isOpen: false });
            const showConfirm = (message, onConfirm) => setConfirmState({ isOpen: true, message, onConfirm });
            const closeConfirm = () => setConfirmState({ isOpen: false, message: '', onConfirm: null });

            // --- API FETCHERS ---
            const fetchTasks = async (classId) => {
                setLoading(true);
                try {
                    const res = await window.secureFetch(\`/api/tasks?class_id=\${classId}\`);
                    if(res.ok) setTasks(await res.json());
                } catch(e) { console.error(e); }
                setLoading(false);
            };

            const fetchStudents = async (classId) => {
                try {
                    const res = await window.secureFetch(\`/api/classes/students?class_id=\${classId}\`);
                    if(res.ok) setStudents(await res.json());
                } catch(e) { console.error(e); }
            };

            const fetchTaskDetail = async (taskId, mode = 'EDITOR') => {
                try {
                    const res = await window.secureFetch(\`/api/tasks/detail?id=\${taskId}\`);
                    if(res.ok) {
                        const data = await res.json();
                        setActiveTask(data); // [NOTE] Data discussion_text dll sudah tersimpan di sini dari backend
                        
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
                        
                        if(mode === 'EDITOR') setViewMode('EDITOR');
                        if(mode === 'GRADING') {
                            fetchSubmissions(taskId);
                            // Auto-trigger Weight Modal jika belum disetting
                            const totalEssayWeight = (data.questions || []).reduce((acc, q) => acc + (q.weight || 0), 0);
                            const hasQuestions = (data.questions || []).length > 0;
                            
                            if(hasQuestions && data.pg_weight === 0 && totalEssayWeight === 0) {
                                setWeightModal(true);
                            }
                            setViewMode('GRADING');
                        }
                    }
                } catch(e) { showAlert('error', 'Gagal memuat detail tugas'); }
            };

            const fetchSubmissions = async (taskId) => {
                try {
                    const res = await window.secureFetch(\`/api/tasks/submissions?task_id=\${taskId}\`);
                    if(res.ok) setSubmissions(await res.json());
                } catch(e) { console.error(e); }
            };

            const fetchSubmissionDetail = async (submissionId) => {
                try {
                    const res = await window.secureFetch(\`/api/tasks/submission-detail?submission_id=\${submissionId}\`);
                    if(res.ok) {
                        const data = await res.json();
                        setSelectedSubmission(data);
                        
                        // Konversi score poin dari DB menjadi skala 0-100 untuk input GUI
                        const scores = {};
                        data.answers.forEach(a => {
                            if(a.type !== 'pg') {
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
                } catch(e) { console.error(e); }
            };

            // --- ACTION HANDLERS (LOGIC) ---

            const handleSelectClass = (cls) => {
                setSelectedClass(cls);
                fetchTasks(cls.id);
                fetchStudents(cls.id);
            };

            const handleCreateHeader = async () => {
                if(!headerForm.title) return showAlert('error', 'Judul wajib diisi');
                if(headerForm.targetType === 'specific' && headerForm.allowedStudents.length === 0) return showAlert('error', 'Pilih minimal 1 siswa remedial!');

                setSaving(true);
                try {
                    const payload = { periodId: activePeriod.id, classId: selectedClass.id, ...headerForm, questions: [] };
                    const res = await window.secureFetch('/api/tasks', { method: 'POST', body: JSON.stringify(payload) });
                    if(res.ok) {
                        setCreateModal(false);
                        setHeaderForm({ title: '', description: '', deadline: '', targetType: 'all', allowedStudents: [], pgWeight: 0 });
                        fetchTasks(selectedClass.id);
                        showAlert('success', 'Draft tugas dibuat. Silakan lengkapi soal.');
                    }
                } catch(e) { showAlert('error', 'Gagal membuat tugas'); }
                setSaving(false);
            };

            const handleSaveFullTask = async () => {
                if(headerForm.targetType === 'specific' && headerForm.allowedStudents.length === 0) return showAlert('error', 'Pilih minimal 1 siswa remedial!');
                setSaving(true);
                try {
                    const payload = { ...headerForm, questions };
                    const res = await window.secureFetch('/api/tasks', { method: 'PUT', body: JSON.stringify(payload) });
                    if(res.ok) {
                        const data = await res.json();
                        showAlert('success', data.message || 'Perubahan tersimpan.');
                        
                        if (viewMode === 'GRADING') {
                            await fetchSubmissions(headerForm.id);
                        } else {
                            setViewMode('LIST');
                            fetchTasks(selectedClass.id);
                        }
                    } else { showAlert('error', 'Gagal menyimpan.'); }
                } catch(e) { showAlert('error', 'Error koneksi.'); }
                setSaving(false);
            };

            const handleSaveIdentityOnly = async () => {
                setSaving(true);
                try {
                    const payload = { ...headerForm, questions }; 
                    const res = await window.secureFetch('/api/tasks', { method: 'PUT', body: JSON.stringify(payload) });
                    if(res.ok) showAlert('success', 'Identitas tugas berhasil diperbarui!');
                } catch(e) { showAlert('error', 'Gagal menyimpan.'); }
                setSaving(false);
            };

            const handleDeleteTask = (id) => {
                showConfirm('Hapus tugas ini beserta semua data nilainya?', async () => {
                    closeConfirm();
                    try {
                        await window.secureFetch(\`/api/tasks?id=\${id}\`, { method: 'DELETE' });
                        fetchTasks(selectedClass.id);
                        showAlert('success', 'Tugas berhasil dihapus');
                    } catch(e) { showAlert('error', 'Gagal menghapus'); }
                });
            };

            const handleToggleStatus = (task) => {
                const newStatus = task.is_active ? 0 : 1; 
                const confirmMsg = newStatus ? "Tugas akan muncul di dashboard siswa. Lanjutkan?" : "Tugas akan disembunyikan (Draft). Lanjutkan?";
                showConfirm(confirmMsg, async () => {
                    closeConfirm();
                    try {
                        const res = await window.secureFetch('/api/tasks/toggle', {
                            method: 'POST',
                            body: JSON.stringify({ id: task.id, isActive: newStatus })
                        });
                        if(res.ok) fetchTasks(selectedClass.id);
                    } catch(e) { showAlert('error', 'Gagal mengubah status.'); }
                });
            };

            // Save Grade dengan Detail Poin Essay
            const handleSaveGrade = async (calculatedScore, next = false) => {
                if(!selectedSubmission) return;
                
                const detailScores = {};
                selectedSubmission.answers.forEach(a => {
                    if (a.type !== 'pg') {
                        const quality = gradeInput.essayScores[a.answer_id] || 0; 
                        const points = (quality / 100) * (a.weight || 0);
                        detailScores[a.answer_id] = points;
                    }
                });

                try {
                    const res = await window.secureFetch('/api/tasks/grade', {
                        method: 'POST',
                        body: JSON.stringify({ 
                            submissionId: selectedSubmission.submission.id,
                            grade: calculatedScore,
                            feedback: gradeInput.feedback,
                            essayScores: detailScores 
                        })
                    });
                    if(res.ok) {
                        showAlert('success', 'Nilai tersimpan: ' + calculatedScore);
                        await fetchSubmissions(activeTask.id);
                        if(next) {
                            const currIdx = submissions.findIndex(s => s.id === selectedSubmission.submission.id);
                            if(currIdx < submissions.length - 1) fetchSubmissionDetail(submissions[currIdx + 1].id);
                            else setSelectedSubmission(null);
                        }
                    }
                } catch(e) { showAlert('error', 'Gagal menyimpan nilai'); }
            };

            const handlePublishGrade = async (target, isPublished, type) => {
                const payload = { isPublished };
                if (type === 'TASK') payload.taskId = target;
                else payload.submissionId = target; 

                try {
                    const res = await window.secureFetch('/api/tasks/publish', {
                        method: 'POST',
                        body: JSON.stringify(payload)
                    });
                    if (res.ok) {
                        const data = await res.json();
                        showAlert('success', data.message);
                        if (activeTask) fetchSubmissions(activeTask.id);
                    } else {
                        showAlert('error', 'Gagal mengubah status publish');
                    }
                } catch (e) { showAlert('error', 'Error koneksi'); }
            };

            // [NEW V10] Handle Save Discussion
            const handleSaveDiscussion = async (taskId, formData) => {
                try {
                    const res = await window.secureFetch('/api/tasks/discussion', {
                        method: 'POST',
                        body: JSON.stringify({ taskId, ...formData })
                    });
                    if(res.ok) {
                        const data = await res.json();
                        showAlert('success', data.message);
                        setDiscussionModal(false);
                        fetchTasks(selectedClass.id); // Refresh list
                    } else {
                        showAlert('error', 'Gagal menyimpan konfigurasi.');
                    }
                } catch(e) { showAlert('error', 'Error koneksi.'); }
            };

            // --- RENDERER ORCHESTRATOR ---

            const globalComponents = (
                <>
                    <CustomAlert isOpen={alertState.isOpen} type={alertState.type} message={alertState.message} onClose={closeAlert} />
                    <CustomConfirm 
                        isOpen={confirmState.isOpen} 
                        message={confirmState.message} 
                        onConfirm={confirmState.onConfirm} 
                        onClose={closeConfirm}
                        onCancel={closeConfirm} 
                    />
                    
                    <CreateTaskModal 
                        isOpen={createModal} 
                        onClose={() => setCreateModal(false)} 
                        form={headerForm} 
                        setForm={setHeaderForm} 
                        students={students} 
                        onCreate={handleCreateHeader} 
                        saving={saving} 
                    />
                    
                    {/* [NEW V10] Discussion Modal */}
                    <DiscussionModal 
                        isOpen={discussionModal}
                        onClose={() => setDiscussionModal(false)}
                        task={activeTask}
                        onSave={handleSaveDiscussion}
                    />
                </>
            );

            if (!selectedClass) {
                return (
                    <>
                        {globalComponents}
                        <ClassGrid classes={classes} onSelect={handleSelectClass} />
                    </>
                );
            }

            if (viewMode === 'LIST') {
                return (
                    <>
                        {globalComponents}
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
                            // [UPDATE V10] Sambungkan tombol Master Key
                            onDiscussion={(task) => {
                                setActiveTask(task);
                                setDiscussionModal(true);
                            }}
                        />
                    </>
                );
            }

            if (viewMode === 'EDITOR') {
                return (
                    <>
                        {globalComponents}
                        <URLInputModal 
                            isOpen={urlModal.isOpen} 
                            onClose={() => setUrlModal({ isOpen: false, targetIdx: null })} 
                            onConfirm={(url) => {
                                const idx = urlModal.targetIdx;
                                if (idx !== null) {
                                    let finalUrl = url;
                                    // Use uc?export=view format and Proxy
                                    if (url.includes('drive.google.com') && (url.includes('/view') || url.includes('/file/d/'))) {
                                        const idMatch = url.match(/\\/d\\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
                                        if (idMatch && idMatch[1]) {
                                            const directUrl = \`https://drive.google.com/uc?export=view&id=\${idMatch[1]}\`;
                                            finalUrl = \`/api/proxy?url=\${encodeURIComponent(directUrl)}\`;
                                        }
                                    }
                                    const imgHtml = \`<br><img src="\${finalUrl}" class="w-full max-w-sm rounded-lg border border-zinc-200 my-2 shadow-sm" loading="lazy"><br>\`;
                                    const newQ = [...questions];
                                    newQ[idx].questionText = (newQ[idx].questionText || '') + imgHtml;
                                    setQuestions(newQ);
                                }
                                setUrlModal({ isOpen: false, targetIdx: null });
                            }} 
                        />
                        <StudentModal 
                            isOpen={studentModal}
                            onClose={() => setStudentModal(false)}
                            students={students}
                            selectedIds={headerForm.allowedStudents}
                            onChange={(newIds) => setHeaderForm({...headerForm, allowedStudents: newIds})}
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
                            onOpenUrlModal={(idx) => {
                                console.log("Opening URL Modal for idx:", idx);
                                setUrlModal({ isOpen: true, targetIdx: idx });
                            }}
                            onOpenStudentModal={() => setStudentModal(true)}
                        />
                    </>
                );
            }

            if (viewMode === 'GRADING') {
                const totalEssayWeight = questions.filter(q => q.type !== 'pg').reduce((a, b) => a + (b.weight || 0), 0);
                const totalWeight = headerForm.pgWeight + totalEssayWeight;
                const isValidWeight = totalWeight === 100;

                return (
                    <>
                        {globalComponents}
                        <WeightModal 
                            isOpen={weightModal}
                            onClose={() => setWeightModal(false)}
                            pgWeight={headerForm.pgWeight}
                            setPgWeight={(val) => setHeaderForm({...headerForm, pgWeight: val})}
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
                                if(essayQs.length === 0) return;
                                const remaining = 100 - headerForm.pgWeight;
                                if(remaining < 0) return showAlert('error', 'Bobot PG > 100%!');
                                const perQ = Math.floor(remaining / essayQs.length);
                                const rem = remaining % essayQs.length;
                                const newQ = questions.map(q => q.type === 'pg' ? q : { ...q, weight: perQ });
                                const firstEssay = newQ.findIndex(q => q.type !== 'pg');
                                if(firstEssay !== -1) newQ[firstEssay].weight += rem;
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
                            pgWeight={headerForm.pgWeight}
                        />
                    </>
                );
            }
        }

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<TasksApp />);
    `;

    return getLayoutHtml({
        title: 'Tugas & Remedial',
        user: { name: 'Guru' },
        activePeriod,
        initialData,
        contentComponent
    });
}