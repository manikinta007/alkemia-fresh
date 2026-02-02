import { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '../utils/api';

export const useAttendanceData = (showAlert, showConfirm) => {
    // State
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Data State
    const [classes, setClasses] = useState([]);
    const [activePeriod, setActivePeriod] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [students, setStudents] = useState([]);

    // Status State
    const [dataExists, setDataExists] = useState(false);

    // Export State
    const [availableDates, setAvailableDates] = useState([]);
    const [loadingDates, setLoadingDates] = useState(false);

    // Initial Data Fetch
    useEffect(() => {
        const fetchInitial = async () => {
            setLoading(true);
            try {
                // Fetch Dashboard to get Active Period (or dedicated endpoint)
                // We'll use classes endpoint which usually returns period info or filtered by it
                // Better: Fetch periods first or use common API

                // For now, let's assume we fetch all periods and find active, OR fetch classes which returns active period context usually
                // Let's copy pattern from useGradesData or useQuizzesData

                // 1. Get Active Period
                const periodRes = await fetchApi('/api/periods?active=true');
                let period = null;
                if (periodRes.ok) {
                    const periods = await periodRes.json();
                    period = periods.find(p => p.is_active) || periods[0];
                    setActivePeriod(period);
                }

                // 2. Get Classes
                if (period) {
                    const classesRes = await fetchApi(`/api/classes?period_id=${period.id}`);
                    if (classesRes.ok) {
                        const classesData = await classesRes.json();
                        setClasses(classesData);
                    }
                }
            } catch (err) {
                console.error("Error loading initial data:", err);
                if (showAlert) showAlert('Gagal memuat data awal.', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchInitial();
    }, []);

    // Fetch Attendance Data when Class or Date changes
    useEffect(() => {
        if (selectedClass) {
            fetchAvailableDates(selectedClass.id); // Fetch history dates
        }

        if (selectedClass && date) {
            fetchAttendance();
        } else {
            setStudents([]);
            setDataExists(false);
        }
    }, [selectedClass, date]);

    const fetchAttendance = async () => {
        if (!selectedClass || !date) return;

        setLoading(true);
        setDataExists(false);
        try {
            const res = await fetchApi(`/api/attendance?class_id=${selectedClass.id}&date=${date}`);
            if (res.ok) {
                const data = await res.json();
                setStudents(data);
                // Check if any student has a status (meaning data exists in DB)
                const hasData = data.some(s => s.status !== null);
                setDataExists(hasData);
            } else {
                if (showAlert) showAlert('Gagal memuat data presensi.', 'error');
            }
        } catch (e) {
            console.error(e);
            if (showAlert) showAlert('Kesalahan koneksi.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Actions
    const handleStatusChange = (studentId, status) => {
        setStudents(prev => prev.map(s =>
            s.student_id === studentId ? { ...s, status } : s
        ));
    };

    const markAllPresent = () => {
        setStudents(prev => prev.map(s => ({ ...s, status: s.status || 'H' })));
    };

    const saveAttendance = async () => {
        // Validation
        const incomplete = students.some(s => s.status === null);
        if (incomplete) {
            if (showAlert) showAlert('Masih ada siswa yang belum diabsen (Status kosong).', 'error');
            return;
        }

        const execute = async () => {
            setSubmitting(true);
            try {
                const payload = {
                    classId: selectedClass.id,
                    date: date,
                    data: students.map(s => ({
                        student_id: s.student_id,
                        status: s.status
                    }))
                };

                const res = await fetchApi('/api/attendance', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    if (showAlert) showAlert('Data presensi berhasil disimpan.', 'success');
                    setDataExists(true);
                    // Refresh data just in case? No need if optimistic update
                } else {
                    const err = await res.json();
                    if (showAlert) showAlert(err.error || 'Gagal menyimpan.', 'error');
                }
            } catch (e) {
                if (showAlert) showAlert('Terjadi kesalahan saat menyimpan.', 'error');
            } finally {
                setSubmitting(false);
            }
        };

        if (dataExists && showConfirm) {
            showConfirm(
                `Data presensi tanggal ${date} sudah ada. Apakah anda yakin ingin memperbarui data?`,
                execute
            );
        } else {
            execute();
        }
    };

    const deleteAttendance = async () => {
        if (!dataExists) return;

        const execute = async () => {
            setDeleting(true);
            try {
                const res = await fetchApi(`/api/attendance?class_id=${selectedClass.id}&date=${date}`, {
                    method: 'DELETE'
                });

                if (res.ok) {
                    if (showAlert) showAlert('Data presensi berhasil dihapus.', 'success');
                    // Reset statuses to null
                    setStudents(prev => prev.map(s => ({ ...s, status: null })));
                    setDataExists(false);
                } else {
                    if (showAlert) showAlert('Gagal menghapus data.', 'error');
                }
            } catch (e) {
                if (showAlert) showAlert('Kesalahan saat menghapus.', 'error');
            } finally {
                setDeleting(false);
            }
        };

        if (showConfirm) {
            showConfirm(
                `Hapus permanen data presensi tanggal ${date}? Data yang dihapus tidak bisa dikembalikan.`,
                execute
            );
        }
    };

    // Helper for Export Logic
    const fetchAvailableDates = async (classId) => {
        setLoadingDates(true);
        try {
            const res = await fetchApi(`/api/attendance?type=dates&class_id=${classId}`);
            if (res.ok) {
                const dates = await res.json();
                setAvailableDates(dates);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingDates(false);
        }
    };

    return {
        // State
        loading, submitting, deleting,
        classes, activePeriod,
        selectedClass, setSelectedClass,
        date, setDate,
        students, dataExists,

        // Export specific
        availableDates, loadingDates,

        // Actions
        handleStatusChange,
        markAllPresent,
        saveAttendance,
        deleteAttendance,
        fetchAvailableDates
    };
};
