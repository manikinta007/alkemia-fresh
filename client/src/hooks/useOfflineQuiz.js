// useOfflineQuiz.js
// Custom hook for Offline CBT Mode
// Handles connectivity detection, timer, and violations

import { useState, useEffect, useRef, useCallback } from 'react';
import { saveAnswers, getAnswers, clearQuizData } from '../utils/offlineStorage';

export const useOfflineQuiz = (quizId, duration) => {
    // Connectivity state
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // Timer state (using performance.now for anti-manipulation)
    const [timeLeft, setTimeLeft] = useState(duration * 60); // seconds
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const startTimeRef = useRef(null);
    const timerIntervalRef = useRef(null);

    // Answers state
    const [answers, setAnswers] = useState({});

    // Violations tracking
    const [violations, setViolations] = useState([]);
    const violationCountRef = useRef(0);

    // Duration tracking for submission
    const [durationSeconds, setDurationSeconds] = useState(0);

    // ========== CONNECTIVITY DETECTION ==========
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // ========== TIMER (performance.now based) ==========
    const startTimer = useCallback(() => {
        startTimeRef.current = performance.now();
        setIsTimerRunning(true);

        timerIntervalRef.current = setInterval(() => {
            if (startTimeRef.current) {
                const elapsed = (performance.now() - startTimeRef.current) / 1000;
                const remaining = Math.max(0, (duration * 60) - elapsed);
                setTimeLeft(Math.floor(remaining));
                setDurationSeconds(Math.floor(elapsed));

                if (remaining <= 0) {
                    stopTimer();
                }
            }
        }, 1000);
    }, [duration]);

    const stopTimer = useCallback(() => {
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
        setIsTimerRunning(false);

        // Calculate final duration
        if (startTimeRef.current) {
            const elapsed = (performance.now() - startTimeRef.current) / 1000;
            setDurationSeconds(Math.floor(elapsed));
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
        };
    }, []);

    // ========== ANSWERS MANAGEMENT ==========
    const updateAnswer = useCallback(async (questionId, answer) => {
        const newAnswers = { ...answers, [questionId]: answer };
        setAnswers(newAnswers);

        // Persist to IndexedDB
        try {
            await saveAnswers(quizId, newAnswers);
        } catch (e) {
            console.error('Failed to save answer to IndexedDB:', e);
        }
    }, [answers, quizId]);

    // Load saved answers on mount
    useEffect(() => {
        const loadSavedAnswers = async () => {
            try {
                const saved = await getAnswers(quizId);
                if (saved && Object.keys(saved).length > 0) {
                    setAnswers(saved);
                }
            } catch (e) {
                console.error('Failed to load answers from IndexedDB:', e);
            }
        };

        if (quizId) {
            loadSavedAnswers();
        }
    }, [quizId]);

    // ========== VIOLATION TRACKING ==========
    const addViolation = useCallback((type) => {
        violationCountRef.current += 1;
        const newViolation = {
            type,
            count: violationCountRef.current,
            atSecond: durationSeconds,
            timestamp: new Date().toISOString()
        };
        setViolations(prev => [...prev, newViolation]);
        return violationCountRef.current;
    }, [durationSeconds]);

    // ========== CLEANUP ==========
    const clearData = useCallback(async () => {
        try {
            await clearQuizData(quizId);
        } catch (e) {
            console.error('Failed to clear quiz data:', e);
        }
    }, [quizId]);

    // ========== FORMAT ANSWERS FOR SUBMISSION ==========
    const getFormattedAnswers = useCallback(() => {
        return Object.keys(answers).map(qId => ({
            question_id: parseInt(qId),
            answer: answers[qId]
        }));
    }, [answers]);

    return {
        // Connectivity
        isOnline,

        // Timer
        timeLeft,
        isTimerRunning,
        startTimer,
        stopTimer,
        durationSeconds,

        // Answers
        answers,
        updateAnswer,
        getFormattedAnswers,

        // Violations
        violations,
        violationCount: violationCountRef.current,
        addViolation,

        // Cleanup
        clearData
    };
};
