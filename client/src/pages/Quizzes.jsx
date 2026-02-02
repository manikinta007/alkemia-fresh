import React, { useState, useEffect } from 'react';
import { Award } from 'lucide-react';
import { useAlertContext } from '../components/Alert';
import { useQuizData } from '../hooks/useQuizData';

import { QuizList } from './Quizzes/QuizList';
import { QuestionEditor } from './Quizzes/QuestionEditor';
import { QuizResults } from './Quizzes/QuizResults';
import { EditQuizModal } from './Quizzes/QuizModals';
import { ListSkeleton } from '../components/Skeleton';

export default function Quizzes() {
    const { showAlert, showConfirm } = useAlertContext();
    const {
        classes,
        activePeriod,
        quizzes,
        students,
        questions,
        results,
        loading,
        setQuestions,
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
    } = useQuizData(showAlert, showConfirm);

    const [selectedClass, setSelectedClass] = useState(null);
    const [viewMode, setViewMode] = useState('LIST'); // LIST, QUESTIONS, RESULTS
    const [activeQuiz, setActiveQuiz] = useState(null);
    const [editModal, setEditModal] = useState({ isOpen: false, quiz: null });

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const handleSelectClass = (cls) => {
        setSelectedClass(cls);
        if (cls) fetchQuizzes(cls.id);
        setViewMode('LIST');
    };

    const handleManageQuestions = (quiz) => {
        setActiveQuiz(quiz);
        fetchQuestions(quiz.id);
        setViewMode('QUESTIONS');
    };

    const handleViewResults = (quiz) => {
        setActiveQuiz(quiz);
        setViewMode('RESULTS');
    };

    const handleCreateQuiz = async (payload, callback) => {
        const success = await createQuiz({ ...payload, periodId: activePeriod.id }, () => {
            fetchQuizzes(selectedClass.id);
            if (callback) callback();
        });
    };

    const handleEditQuiz = (quiz) => {
        setEditModal({ isOpen: true, quiz });
    };

    const handleSaveSettings = async (formData) => {
        await updateQuiz(formData, () => {
            setEditModal({ isOpen: false, quiz: null });
            fetchQuizzes(selectedClass.id);
        });
    };

    return (
        <div className="animate-in fade-in duration-500 pb-20">
            {/* Global Edit Modal */}
            <EditQuizModal
                isOpen={editModal.isOpen}
                quiz={editModal.quiz}
                students={students}
                onClose={() => setEditModal({ isOpen: false, quiz: null })}
                onSave={handleSaveSettings}
            />

            {/* Header */}
            {viewMode === 'LIST' && (
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-zinc-900 flex items-center gap-3">
                        <Award className="text-orange-600" size={32} />
                        Kuis & Ujian
                    </h2>
                    <p className="text-zinc-500 mt-2">Buat soal pilihan ganda, acak soal, dan atur jadwal.</p>
                </div>
            )}

            {!activePeriod ? (
                loading ? (
                    <ListSkeleton count={3} />
                ) : (
                    <div className="bg-white border border-zinc-200 rounded-xl p-8 text-center text-zinc-500">Pilih periode akademik terlebih dahulu.</div>
                )
            ) : (
                <>
                    {viewMode === 'LIST' && (
                        <QuizList
                            classes={classes}
                            selectedClass={selectedClass}
                            onSelectClass={handleSelectClass}
                            quizzes={quizzes}
                            loading={loading}
                            onCreate={handleCreateQuiz}
                            onToggleStatus={(id, status, date) => toggleQuizStatus(id, status, date, () => fetchQuizzes(selectedClass.id))}
                            onEdit={handleEditQuiz}
                            onCopy={(id, targetClassId) => copyQuiz(id, targetClassId, () => fetchQuizzes(selectedClass.id))}
                            onDelete={(id) => deleteQuiz(id, () => fetchQuizzes(selectedClass.id))}
                            onManageQuestions={handleManageQuestions}
                            onViewResults={handleViewResults}
                        />
                    )}

                    {viewMode === 'QUESTIONS' && activeQuiz && (
                        <QuestionEditor
                            activeQuiz={activeQuiz}
                            questions={questions}
                            setQuestions={setQuestions}
                            onSave={() => saveQuestions(activeQuiz.id, questions, () => {
                                setViewMode('LIST');
                                fetchQuizzes(selectedClass.id);
                            })}
                            onCancel={() => setViewMode('LIST')}
                        />
                    )}

                    {viewMode === 'RESULTS' && activeQuiz && (
                        <QuizResults
                            activeQuiz={activeQuiz}
                            results={results}
                            fetchResults={fetchResults}
                            onReset={(quizId, studentId) => resetAttempt(quizId, studentId, () => fetchResults(quizId))}
                            onBack={() => setViewMode('LIST')}
                        />
                    )}
                </>
            )}
        </div>
    );
}
