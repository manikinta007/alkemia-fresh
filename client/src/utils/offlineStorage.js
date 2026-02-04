// offlineStorage.js
// IndexedDB utility for Offline CBT Mode
// Handles quiz package caching and answer storage

const DB_NAME = 'AlkemiaOfflineCBT';
const DB_VERSION = 1;
const STORE_QUIZ = 'quizPackages';
const STORE_ANSWERS = 'answers';

/**
 * Opens the IndexedDB database
 */
export const openDatabase = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Quiz packages store
            if (!db.objectStoreNames.contains(STORE_QUIZ)) {
                db.createObjectStore(STORE_QUIZ, { keyPath: 'quizId' });
            }

            // Answers store
            if (!db.objectStoreNames.contains(STORE_ANSWERS)) {
                db.createObjectStore(STORE_ANSWERS, { keyPath: 'quizId' });
            }
        };
    });
};

/**
 * Saves quiz package to IndexedDB
 */
export const saveQuizPackage = async (quizId, packageData) => {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_QUIZ, 'readwrite');
        const store = tx.objectStore(STORE_QUIZ);

        const data = {
            quizId: quizId,
            ...packageData,
            savedAt: new Date().toISOString()
        };

        const request = store.put(data);
        request.onsuccess = () => resolve(data);
        request.onerror = () => reject(request.error);
    });
};

/**
 * Gets quiz package from IndexedDB
 */
export const getQuizPackage = async (quizId) => {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_QUIZ, 'readonly');
        const store = tx.objectStore(STORE_QUIZ);

        const request = store.get(quizId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

/**
 * Saves answers to IndexedDB
 */
export const saveAnswers = async (quizId, answers) => {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_ANSWERS, 'readwrite');
        const store = tx.objectStore(STORE_ANSWERS);

        const data = {
            quizId: quizId,
            answers: answers,
            updatedAt: new Date().toISOString()
        };

        const request = store.put(data);
        request.onsuccess = () => resolve(data);
        request.onerror = () => reject(request.error);
    });
};

/**
 * Gets answers from IndexedDB
 */
export const getAnswers = async (quizId) => {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_ANSWERS, 'readonly');
        const store = tx.objectStore(STORE_ANSWERS);

        const request = store.get(quizId);
        request.onsuccess = () => resolve(request.result?.answers || {});
        request.onerror = () => reject(request.error);
    });
};

/**
 * Clears all quiz data after submission
 */
export const clearQuizData = async (quizId) => {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_QUIZ, STORE_ANSWERS], 'readwrite');

        tx.objectStore(STORE_QUIZ).delete(quizId);
        tx.objectStore(STORE_ANSWERS).delete(quizId);

        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
    });
};

/**
 * Checks if quiz package exists
 */
export const hasQuizPackage = async (quizId) => {
    const pkg = await getQuizPackage(quizId);
    return !!pkg;
};
