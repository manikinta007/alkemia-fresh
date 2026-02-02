import { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '../utils/api';

export const useClassesData = (showAlert) => {
    const [activePeriod, setActivePeriod] = useState(null);
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [students, setStudents] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(false);

    // Initial Fetch
    const fetchActivePeriod = useCallback(async () => {
        try {
            const res = await fetchApi('/api/dashboard');
            if (res.ok) {
                const data = await res.json();
                if (data.activePeriod) {
                    setActivePeriod(data.activePeriod);
                    fetchClasses(data.activePeriod.id);
                }
            }
        } catch (e) {
            console.error("Failed to fetch active period", e);
        }
    }, []);

    const fetchClasses = async (periodId) => {
        try {
            const res = await fetchApi(`/api/classes?period_id=${periodId}`);
            if (res.ok) setClasses(await res.json());
        } catch (e) { console.error("Failed to fetch classes", e); }
    };

    const fetchStudents = async (classId) => {
        setLoadingStudents(true);
        try {
            const res = await fetchApi(`/api/students?class_id=${classId}`);
            if (res.ok) setStudents(await res.json());
        } catch (err) { console.error(err); }
        finally { setLoadingStudents(false); }
    };

    const selectClass = (cls) => {
        setSelectedClass(cls);
        if (cls) fetchStudents(cls.id);
        else setStudents([]);
    };

    // --- Class Operations ---

    const createClass = async (name) => {
        if (!activePeriod) return false;
        try {
            const res = await fetchApi('/api/classes', {
                method: 'POST',
                body: JSON.stringify({ periodId: activePeriod.id, name })
            });
            if (res.ok) {
                fetchClasses(activePeriod.id);
                return true;
            }
        } catch (e) { console.error(e); }
        return false;
    };

    const updateClass = async (id, newName) => {
        try {
            const res = await fetchApi('/api/classes', {
                method: 'PUT',
                body: JSON.stringify({ id, name: newName })
            });
            if (res.ok) {
                fetchClasses(activePeriod.id);
                if (selectedClass && selectedClass.id === id) {
                    setSelectedClass(prev => ({ ...prev, name: newName }));
                }
                if (showAlert) showAlert('Nama kelas berhasil diperbarui.', 'success');
                return true;
            }
        } catch (e) { if (showAlert) showAlert('Error server.', 'error'); }
        return false;
    };

    const deleteClass = async (id) => {
        try {
            const res = await fetchApi('/api/classes?id=' + id, { method: 'DELETE' });
            if (res.ok) {
                fetchClasses(activePeriod.id);
                if (selectedClass && selectedClass.id === id) setSelectedClass(null);
                if (showAlert) showAlert('Kelas berhasil dihapus.', 'success');
                return true;
            }
        } catch (e) { if (showAlert) showAlert('Error server.', 'error'); }
        return false;
    };

    const toggleGrades = async (cls) => {
        if (!cls) return;
        const newStatus = cls.show_grades === 1 ? 0 : 1;
        const updatedClass = { ...cls, show_grades: newStatus };

        // Optimistic update
        setSelectedClass(updatedClass);
        setClasses(prev => prev.map(c => c.id === updatedClass.id ? updatedClass : c));

        try {
            await fetchApi('/api/classes/toggle-grades', {
                method: 'POST',
                body: JSON.stringify({ classId: cls.id, showGrades: newStatus === 1 })
            });
        } catch (err) {
            fetchClasses(activePeriod.id); // Revert on error
        }
    };

    // --- Student Operations ---

    const addStudent = async (name) => {
        if (!selectedClass) return false;
        try {
            const res = await fetchApi('/api/students', {
                method: 'POST',
                body: JSON.stringify({ periodId: activePeriod.id, classId: selectedClass.id, name })
            });
            if (res.ok) {
                fetchStudents(selectedClass.id);
                return true;
            }
        } catch (e) { console.error(e); }
        return false;
    };

    const updateStudent = async (id, name) => {
        try {
            const res = await fetchApi('/api/students', {
                method: 'PUT',
                body: JSON.stringify({ id, name })
            });
            if (res.ok) {
                fetchStudents(selectedClass.id);
                return true;
            }
        } catch (e) { console.error(e); }
        return false;
    };

    const removeStudent = async (id) => {
        try {
            const res = await fetchApi('/api/students?id=' + id, { method: 'DELETE' });
            if (res.ok) {
                fetchStudents(selectedClass.id);
                if (showAlert) showAlert('Siswa berhasil dihapus.', 'success');
                return true;
            }
        } catch (e) { console.error(e); }
        return false;
    };

    const removeStudentsBulk = async (ids) => {
        try {
            const res = await fetchApi('/api/students', {
                method: 'DELETE',
                body: JSON.stringify({ ids: Array.from(ids) })
            });
            if (res.ok) {
                fetchStudents(selectedClass.id);
                if (showAlert) showAlert('Siswa terpilih berhasil dihapus.', 'success');
                return true;
            }
        } catch (err) { if (showAlert) showAlert('Terjadi kesalahan server.', 'error'); }
        return false;
    };

    const resetStudentDevice = async (id) => {
        try {
            await fetchApi('/api/student/unlock', {
                method: 'POST',
                body: JSON.stringify({ studentId: id })
            });
            if (showAlert) showAlert('Akses siswa berhasil di-reset.', 'success');
            return true;
        } catch (e) { console.error(e); }
        return false;
    };

    const importStudents = async (names) => {
        if (!selectedClass || names.length === 0) return false;
        try {
            await fetchApi('/api/students/bulk', {
                method: 'POST',
                body: JSON.stringify({ periodId: activePeriod.id, classId: selectedClass.id, names: names })
            });
            if (showAlert) showAlert('Berhasil import ' + names.length + ' siswa!', 'success');
            fetchStudents(selectedClass.id);
            return true;
        } catch (e) { console.error(e); }
        return false;
    };

    return {
        activePeriod,
        classes,
        selectedClass,
        students,
        loadingStudents,
        fetchActivePeriod,
        selectClass,
        createClass,
        updateClass,
        deleteClass,
        toggleGrades,
        addStudent,
        updateStudent,
        removeStudent,
        removeStudentsBulk,
        resetStudentDevice,
        importStudents
    };
};
