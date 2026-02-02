import { useState, useEffect } from 'react';
import { useAlert } from '../components/Alert';

export const useGradesData = () => {
    const { showAlert } = useAlert();
    const [loading, setLoading] = useState(false);

    // Data State
    const [classes, setClasses] = useState([]);
    const [activePeriod, setActivePeriod] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);
    const [students, setStudents] = useState([]); // Students merged with Grades
    const [gradesData, setGradesData] = useState({}); // Map: studentId -> gradeObj

    // Initial Fetch (Classes & Active Period)
    useEffect(() => {
        const fetchInitial = async () => {
            setLoading(true);
            try {
                // 1. Get Active Period & Classes from Dashboard/Init API or specialized endpoints
                // Assuming we can reuse the dashboard data logic or fetch separately
                // Ideally, we fetch Active Period + Classes linked to that period

                // Fetch Active Period
                const periodRes = await fetch('/api/periods?active=true'); // Or use existing store
                let period = null;
                if (periodRes.ok) {
                    const periods = await periodRes.json();
                    period = periods.find(p => p.is_active) || periods[0];
                    setActivePeriod(period);
                }

                if (period) {
                    const classesRes = await fetch(`/api/classes?period_id=${period.id}`);
                    if (classesRes.ok) {
                        const classesData = await classesRes.json();
                        setClasses(classesData);
                    }
                }
            } catch (err) {
                console.error("Error loading initial data:", err);
                showAlert('Gagal memuat data kelas.', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchInitial();
    }, []);

    // Fetch Grades for Selected Class
    const selectClass = async (cls) => {
        setSelectedClass(cls);
        setLoading(true);
        try {
            // Parallel Fetch: Students & Grades
            // Actually, the legacy controller /api/students?class_id=X returns students
            // And /api/grades?class_id=X returns grades joined with students
            // Let's check gradeController... it does a JOIN students using class_id

            const res = await fetch(`/api/grades?class_id=${cls.id}`);
            if (res.ok) {
                const data = await res.json();

                // Helper to map array to object for easier O(1) access
                const map = {};
                data.forEach(g => {
                    // g contains: student_id, student_name, uh, uts, uas, tugas, final_grade
                    map[g.student_id] = g;
                });

                setStudents(data); // The API returns list of students with grades already joined
                setGradesData(map);
            } else {
                showAlert('Gagal memuat data nilai.', 'error');
            }
        } catch (err) {
            console.error(err);
            showAlert('Terjadi kesalahan koneksi.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Calculate Final Grade (Client-Side Preview)
    const calculateFinal = (g) => {
        const uh = parseFloat(g.uh || 0);
        const uts = parseFloat(g.uts || 0);
        const uas = parseFloat(g.uas || 0);
        const tugas = parseFloat(g.tugas || 0);

        // Formula: UH 30%, UTS 20%, UAS 30%, Tugas 20%
        return (uh * 0.3) + (uts * 0.2) + (uas * 0.3) + (tugas * 0.2);
    };

    // Save Grade
    const saveGrade = async (studentId, gradeValues) => {
        if (!activePeriod) return;

        try {
            const payload = {
                periodId: activePeriod.id,
                studentId: studentId,
                uh: parseFloat(gradeValues.uh || 0),
                uts: parseFloat(gradeValues.uts || 0),
                uas: parseFloat(gradeValues.uas || 0),
                tugas: parseFloat(gradeValues.tugas || 0)
            };

            const res = await fetch('/api/grades', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok) {
                // Update Local State with Server Response (Final Grade)
                setGradesData(prev => ({
                    ...prev,
                    [studentId]: {
                        ...prev[studentId],
                        ...gradeValues,
                        final_grade: data.finalGrade
                    }
                }));

                // Also update the students array since we iterate that
                setStudents(prev => prev.map(s =>
                    s.student_id === studentId
                        ? { ...s, ...gradeValues, final_grade: data.finalGrade }
                        : s
                ));

                showAlert('Nilai berhasil disimpan.', 'success');
                return true;
            } else {
                showAlert(data.error || 'Gagal menyimpan nilai.', 'error');
                return false;
            }
        } catch (err) {
            console.error(err);
            showAlert('Kesalahan koneksi saat menyimpan.', 'error');
            return false;
        }
    };

    return {
        loading,
        classes,
        activePeriod,
        selectedClass,
        students,
        gradesData,
        selectClass,
        saveGrade,
        calculateFinal,
        setSelectedClass // To go back to class list
    };
};
