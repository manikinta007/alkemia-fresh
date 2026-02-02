import { useState, useCallback } from 'react';
import { fetchApi } from '../utils/api';

export const useQuizData = (showAlert, showConfirm) => {
    const [classes, setClasses] = useState([]);
    const [activePeriod, setActivePeriod] = useState(null);
    const [quizzes, setQuizzes] = useState([]);
    const [students, setStudents] = useState([]); // For creating quiz whitelist & results
    const [questions, setQuestions] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);

    // Initial Data Fetch
    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchApi('/api/dashboard');
            if (res.ok) {
                const data = await res.json();
                if (data.activePeriod) {
                    setActivePeriod(data.activePeriod);
                    const resClasses = await fetchApi(`/api/classes?period_id=${data.activePeriod.id}`);
                    if (resClasses.ok) setClasses(await resClasses.json());
                }
            }
        } catch (e) {
            console.error("Failed to fetch initial data", e);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchQuizzes = async (classId) => {
        setLoading(true);
        try {
            const res = await fetchApi('/api/quizzes?class_id=' + classId);
            if (res.ok) setQuizzes(await res.json());

            // Also fetch students for this class (needed for whitelist/results)
            const resStudents = await fetchApi('/api/student/claim-status?class_id=' + classId);
            if (resStudents.ok) setStudents(await resStudents.json());

        } catch (e) {
            if (showAlert) showAlert('error', 'Gagal mengambil data quiz.');
        } finally {
            setLoading(false);
        }
    };

    const fetchQuestions = async (quizId) => {
        setLoading(true);
        try {
            const res = await fetchApi('/api/quizzes/questions?quiz_id=' + quizId);
            if (res.ok) setQuestions(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchResults = async (quizId) => {
        try {
            const res = await fetchApi('/api/quizzes/results?quiz_id=' + quizId);
            if (res.ok) setResults(await res.json());
        } catch (e) {
            console.error(e);
        }
    };

    // Actions
    const createQuiz = async (payload, onSuccess) => {
        try {
            const res = await fetchApi('/api/quizzes', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                if (showAlert) showAlert('Quiz berhasil dibuat.', 'success');
                if (onSuccess) onSuccess();
                return true;
            } else {
                throw new Error('Gagal');
            }
        } catch (e) {
            if (showAlert) showAlert('Gagal membuat quiz.', 'error');
            return false;
        }
    };

    const updateQuiz = async (payload, onSuccess) => {
        try {
            const res = await fetchApi('/api/quizzes', {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                if (showAlert) showAlert('Pengaturan quiz disimpan.', 'success');
                if (onSuccess) onSuccess();
                return true;
            }
        } catch (e) {
            if (showAlert) showAlert('Gagal menyimpan pengaturan.', 'error');
        }
    };

    const deleteQuiz = async (id, onSuccess) => {
        showConfirm('Hapus quiz ini beserta soal dan nilainya?', async () => {
            try {
                const res = await fetchApi('/api/quizzes?id=' + id, { method: 'DELETE' });
                if (res.ok) {
                    if (showAlert) showAlert('Quiz berhasil dihapus.', 'success');
                    if (onSuccess) onSuccess();
                }
            } catch (e) {
                if (showAlert) showAlert('Gagal menghapus quiz.', 'error');
            }
        });
    };

    const toggleQuizStatus = async (id, isActive, scheduledAt, onSuccess) => {
        try {
            await fetchApi('/api/quizzes/toggle', {
                method: 'POST',
                body: JSON.stringify({ id, isActive, scheduledAt })
            });
            if (onSuccess) onSuccess();
        } catch (e) {
            if (showAlert) showAlert('Gagal mengubah status quiz.', 'error');
        }
    };

    const saveQuestions = async (quizId, questions, onSuccess) => {
        showConfirm('Simpan perubahan soal?', async () => {
            setLoading(true);
            try {
                const res = await fetchApi('/api/quizzes/questions', {
                    method: 'POST',
                    body: JSON.stringify({ quizId, questions })
                });
                if (res.ok) {
                    if (showAlert) showAlert('Soal berhasil disimpan!', 'success');
                    if (onSuccess) onSuccess();
                }
            } catch (e) {
                if (showAlert) showAlert('Gagal menyimpan soal.', 'error');
            } finally {
                setLoading(false);
            }
        });
    };

    const copyQuiz = async (sourceQuizId, targetClassId, onSuccess) => {
        try {
            const res = await fetchApi('/api/quizzes/copy', {
                method: 'POST',
                body: JSON.stringify({ sourceQuizId, targetClassId })
            });
            if (res.ok) {
                if (showAlert) showAlert('Quiz berhasil disalin.', 'success');
                if (onSuccess) onSuccess();
            } else {
                if (showAlert) showAlert('Gagal menyalin quiz.', 'error');
            }
        } catch (e) {
            if (showAlert) showAlert('Gagal terkoneksi.', 'error');
        }
    };

    const resetAttempt = async (quizId, studentId, onSuccess) => {
        const confirmMsg = studentId
            ? "Reset riwayat ujian siswa ini? Siswa harus mengerjakan ulang dari awal."
            : "PERHATIAN: Anda akan mereset SEMUA data ujian di kelas ini. Data nilai akan hilang permanen. Lanjutkan?";

        showConfirm(confirmMsg, async () => {
            try {
                const params = new URLSearchParams({ quiz_id: quizId });
                if (studentId) params.append('student_id', studentId);

                const res = await fetchApi('/api/quizzes/reset-attempt?' + params.toString(), { method: 'DELETE' });

                if (res.ok) {
                    if (showAlert) showAlert('Riwayat ujian berhasil direset.', 'success');
                    if (onSuccess) onSuccess();
                } else {
                    if (showAlert) showAlert('Gagal mereset data.', 'error');
                }
            } catch (e) {
                if (showAlert) showAlert('Terjadi kesalahan.', 'error');
            }
        });
    };

    return {
        classes,
        activePeriod,
        quizzes,
        students,
        questions,
        results,
        loading,
        setQuestions, // Allow manual updates in editor before save
        fetchInitialData,
        fetchQuizzes,
        fetchQuestions,
        fetchResults,
        createQuiz,
        updateQuiz,
        deleteQuiz,
        toggleQuizStatus,
        saveQuestions,
        copyQuiz,
        resetAttempt
    };
};
