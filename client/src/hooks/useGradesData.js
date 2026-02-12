import { useState, useEffect, useCallback } from 'react';
import { useAlert } from '../components/Alert';
import { fetchApi } from '../utils/api';

export const useGradesData = () => {
    const { showAlert } = useAlert();
    const [loading, setLoading] = useState(false);

    // Data State
    const [classes, setClasses] = useState([]);
    const [activePeriod, setActivePeriod] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);

    // Grade Integration State
    const [config, setConfig] = useState({ kkm: 75, show_grade_breakdown: 0, components: [] });
    const [gradeRecap, setGradeRecap] = useState({ kkm: 75, components: [], students: [] });
    const [savingCell, setSavingCell] = useState(null); // `${compId}_${studentId}`

    // Initial Fetch (Classes & Active Period)
    useEffect(() => {
        const fetchInitial = async () => {
            setLoading(true);
            try {
                const periodRes = await fetchApi('/api/periods?active=true');
                let period = null;
                if (periodRes.ok) {
                    const periods = await periodRes.json();
                    period = periods.find(p => p.is_active) || periods[0];
                    setActivePeriod(period);
                }

                if (period) {
                    const classesRes = await fetchApi(`/api/classes?period_id=${period.id}`);
                    if (classesRes.ok) {
                        const classesData = await classesRes.json();
                        setClasses(classesData);
                    }

                    // Seed default components if none exist
                    await fetchApi('/api/grade-config/seed', {
                        method: 'POST',
                        body: JSON.stringify({ period_id: period.id })
                    });

                    // Load config
                    const configRes = await fetchApi(`/api/grade-config?period_id=${period.id}`);
                    if (configRes.ok) {
                        setConfig(await configRes.json());
                    }
                }
            } catch (err) {
                console.error("Error loading initial data:", err);
                showAlert('Gagal memuat data.', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchInitial();
    }, []);

    // Fetch grade recap when class is selected
    const selectClass = useCallback(async (cls) => {
        setSelectedClass(cls);
        if (!cls || !activePeriod) return;
        setLoading(true);
        try {
            const res = await fetchApi(`/api/grade-recap?class_id=${cls.id}&period_id=${activePeriod.id}`);
            if (res.ok) {
                setGradeRecap(await res.json());
            } else {
                showAlert('Gagal memuat rekap nilai.', 'error');
            }
        } catch (err) {
            console.error(err);
            showAlert('Kesalahan koneksi.', 'error');
        } finally {
            setLoading(false);
        }
    }, [activePeriod]);

    // Silent reload (no loading/toast, for cell-level operations)
    const silentReload = useCallback(async () => {
        if (selectedClass && activePeriod) {
            const res = await fetchApi(`/api/grade-recap?class_id=${selectedClass.id}&period_id=${activePeriod.id}`);
            if (res.ok) setGradeRecap(await res.json());
        }
    }, [selectedClass, activePeriod]);

    // Reload recap (with loading + toast)
    const reloadRecap = useCallback(async () => {
        if (selectedClass && activePeriod) {
            setLoading(true);
            try {
                const res = await fetchApi(`/api/grade-recap?class_id=${selectedClass.id}&period_id=${activePeriod.id}`);
                if (res.ok) {
                    setGradeRecap(await res.json());
                    showAlert('Data nilai berhasil diperbarui!', 'success');
                }
            } catch {
                showAlert('Gagal memuat ulang data.', 'error');
            } finally {
                setLoading(false);
            }
        }
    }, [selectedClass, activePeriod]);

    // Save config
    const saveConfig = useCallback(async (newConfig) => {
        if (!activePeriod) return false;
        try {
            const res = await fetchApi('/api/grade-config', {
                method: 'POST',
                body: JSON.stringify({ period_id: activePeriod.id, ...newConfig })
            });
            const data = await res.json();
            if (res.ok) {
                showAlert('Konfigurasi berhasil disimpan!', 'success');
                // Reload config
                const configRes = await fetchApi(`/api/grade-config?period_id=${activePeriod.id}`);
                if (configRes.ok) setConfig(await configRes.json());
                // Reload recap if class selected
                if (selectedClass) await reloadRecap();
                return true;
            } else {
                showAlert(data.error || 'Gagal menyimpan konfigurasi.', 'error');
                return false;
            }
        } catch (err) {
            showAlert('Kesalahan koneksi.', 'error');
            return false;
        }
    }, [activePeriod, selectedClass, reloadRecap]);

    // Save single cell value
    const saveCellValue = useCallback(async (componentId, studentId, value, isOverride) => {
        if (!selectedClass) return false;
        const cellKey = `${componentId}_${studentId}`;
        setSavingCell(cellKey);
        try {
            const res = await fetchApi('/api/grade-recap/save', {
                method: 'POST',
                body: JSON.stringify({
                    component_id: componentId,
                    class_id: selectedClass.id,
                    student_id: studentId,
                    value,
                    is_override: isOverride
                })
            });
            if (res.ok) {
                await silentReload();
                return true;
            }
            return false;
        } catch {
            return false;
        } finally {
            setSavingCell(null);
        }
    }, [selectedClass, silentReload]);

    // Reset override
    const resetOverride = useCallback(async (componentId, studentId) => {
        if (!selectedClass) return;
        try {
            await fetchApi('/api/grade-recap/reset-override', {
                method: 'POST',
                body: JSON.stringify({
                    component_id: componentId,
                    class_id: selectedClass.id,
                    student_id: studentId
                })
            });
            await silentReload();
        } catch (err) {
            showAlert('Gagal mereset override.', 'error');
        }
    }, [selectedClass, silentReload]);

    // Apply remedial
    const applyRemedial = useCallback(async (studentId) => {
        if (!selectedClass || !activePeriod) return;
        try {
            const res = await fetchApi('/api/grade-recap/remedial', {
                method: 'POST',
                body: JSON.stringify({
                    class_id: selectedClass.id,
                    student_id: studentId,
                    period_id: activePeriod.id
                })
            });
            if (res.ok) {
                showAlert('Remedial berhasil diterapkan!', 'success');
                await reloadRecap();
            }
        } catch (err) {
            showAlert('Gagal menerapkan remedial.', 'error');
        }
    }, [selectedClass, activePeriod, reloadRecap]);

    // Undo remedial
    const undoRemedial = useCallback(async (studentId) => {
        if (!selectedClass) return;
        try {
            await fetchApi('/api/grade-recap/undo-remedial', {
                method: 'POST',
                body: JSON.stringify({
                    class_id: selectedClass.id,
                    student_id: studentId
                })
            });
            await reloadRecap();
        } catch (err) {
            showAlert('Gagal membatalkan remedial.', 'error');
        }
    }, [selectedClass, reloadRecap]);

    // Save remedial evidence override
    const saveRemedialEvidence = useCallback(async (taskId, studentId, value) => {
        if (!selectedClass) return false;
        const cellKey = `rem_${taskId}_${studentId}`;
        setSavingCell(cellKey);
        try {
            const res = await fetchApi('/api/grade-recap/save-remedial-evidence', {
                method: 'POST',
                body: JSON.stringify({
                    task_id: taskId,
                    class_id: selectedClass.id,
                    student_id: studentId,
                    value
                })
            });
            if (res.ok) {
                await silentReload();
                return true;
            }
            return false;
        } catch {
            return false;
        } finally {
            setSavingCell(null);
        }
    }, [selectedClass, silentReload]);

    // Reset remedial evidence override
    const resetRemedialEvidence = useCallback(async (taskId, studentId) => {
        if (!selectedClass) return;
        try {
            await fetchApi('/api/grade-recap/reset-remedial-evidence', {
                method: 'POST',
                body: JSON.stringify({
                    task_id: taskId,
                    class_id: selectedClass.id,
                    student_id: studentId
                })
            });
            await silentReload();
        } catch (err) {
            showAlert('Gagal mereset override remedial.', 'error');
        }
    }, [selectedClass, silentReload]);

    // CSV Preview
    const csvPreview = useCallback(async (rows) => {
        if (!selectedClass) return null;
        try {
            const res = await fetchApi('/api/grade-recap/csv-preview', {
                method: 'POST',
                body: JSON.stringify({ class_id: selectedClass.id, rows })
            });
            if (res.ok) return await res.json();
            return null;
        } catch {
            return null;
        }
    }, [selectedClass]);

    // CSV Upload
    const csvUpload = useCallback(async (componentId, entries) => {
        if (!selectedClass) return false;
        try {
            const res = await fetchApi('/api/grade-recap/csv-upload', {
                method: 'POST',
                body: JSON.stringify({
                    component_id: componentId,
                    class_id: selectedClass.id,
                    entries
                })
            });
            if (res.ok) {
                const data = await res.json();
                showAlert(data.message, 'success');
                await reloadRecap();
                return true;
            }
            return false;
        } catch {
            showAlert('Gagal mengimpor CSV.', 'error');
            return false;
        }
    }, [selectedClass, reloadRecap]);

    // Save final grade override
    const saveFinalGrade = useCallback(async (studentId, value) => {
        if (!selectedClass) return false;
        const cellKey = `final_${studentId}`;
        setSavingCell(cellKey);
        try {
            const res = await fetchApi('/api/grade-recap/save-final', {
                method: 'POST',
                body: JSON.stringify({
                    class_id: selectedClass.id,
                    student_id: studentId,
                    value
                })
            });
            if (res.ok) {
                await silentReload();
                return true;
            }
            return false;
        } catch {
            return false;
        } finally {
            setSavingCell(null);
        }
    }, [selectedClass, silentReload]);

    // Reset final grade override
    const resetFinalGrade = useCallback(async (studentId) => {
        if (!selectedClass) return;
        try {
            await fetchApi('/api/grade-recap/reset-final', {
                method: 'POST',
                body: JSON.stringify({
                    class_id: selectedClass.id,
                    student_id: studentId
                })
            });
            await silentReload();
        } catch {
            showAlert('Gagal mereset override nilai akhir.', 'error');
        }
    }, [selectedClass, silentReload]);

    // Download grades as CSV
    const downloadGradesCsv = useCallback(() => {
        const { components, students, remedial_columns = [] } = gradeRecap;
        if (!students.length) return;
        const remedialHeaders = remedial_columns.map(rc => `Remedial: ${rc.task_title}`);
        const headers = ['No', 'Nama', ...components.map(c => c.name), 'Nilai Akhir', ...remedialHeaders];
        const rows = students.map((s, i) => {
            const remedialScores = remedial_columns.map(rc => {
                const re = (s.remedial_evidence || []).find(r => r.task_id === rc.task_id);
                return re?.effective_score ?? '';
            });
            return [
                i + 1,
                s.student_name,
                ...s.values.map(v => v.effective_value ?? ''),
                s.final_grade,
                ...remedialScores
            ];
        });
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rekap_nilai_${selectedClass?.name || 'kelas'}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [gradeRecap, selectedClass]);

    // Toggle show/hide grades for the selected class
    const toggleGrades = useCallback(async () => {
        if (!selectedClass) return;
        const newStatus = selectedClass.show_grades === 1 ? 0 : 1;

        // Optimistic update
        setSelectedClass(prev => ({ ...prev, show_grades: newStatus }));
        setClasses(prev => prev.map(c => c.id === selectedClass.id ? { ...c, show_grades: newStatus } : c));

        try {
            await fetchApi('/api/classes/toggle-grades', {
                method: 'POST',
                body: JSON.stringify({ classId: selectedClass.id, showGrades: newStatus === 1 })
            });
            showAlert(newStatus === 1 ? 'Nilai ditampilkan ke siswa' : 'Nilai disembunyikan dari siswa', 'success');
        } catch (err) {
            // Revert on error
            setSelectedClass(prev => ({ ...prev, show_grades: selectedClass.show_grades }));
            showAlert('Gagal mengubah status tampilan nilai', 'error');
        }
    }, [selectedClass]);

    return {
        loading,
        classes,
        activePeriod,
        selectedClass,
        config,
        gradeRecap,
        savingCell,
        selectClass,
        setSelectedClass,
        saveConfig,
        saveCellValue,
        resetOverride,
        applyRemedial,
        undoRemedial,
        csvPreview,
        csvUpload,
        reloadRecap,
        saveFinalGrade,
        resetFinalGrade,
        downloadGradesCsv,
        saveRemedialEvidence,
        resetRemedialEvidence,
        toggleGrades
    };
};
