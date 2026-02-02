import { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '../utils/api';

export const useScheduleData = (showAlert, showConfirm) => {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    // Data
    const [schedules, setSchedules] = useState([]);
    const [classes, setClasses] = useState([]);
    const [activePeriod, setActivePeriod] = useState(null);
    const [userSubjects, setUserSubjects] = useState([]);

    // Fetch Initial Data
    useEffect(() => {
        const fetchInitial = async () => {
            setLoading(true);
            try {
                // 1. Get User Info (for subjects)
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                // Normalize subjects: user.subjects (array) or user.subject (string) or default
                let subjects = ['Mapel Umum'];
                if (user.subjects && Array.isArray(user.subjects) && user.subjects.length > 0) {
                    subjects = user.subjects;
                } else if (user.subject) {
                    subjects = [user.subject];
                }
                setUserSubjects(subjects);

                // 2. Get Active Period
                const periodRes = await fetchApi('/api/periods?active=true');
                if (periodRes.ok) {
                    const periods = await periodRes.json();
                    const activeProxy = periods.find(p => p.is_active) || periods[0];
                    setActivePeriod(activeProxy);

                    if (activeProxy) {
                        // 3. Parallel Fetch: Schedules & Classes
                        const [schedulesRes, classesRes] = await Promise.all([
                            fetchApi(`/api/schedules?period_id=${activeProxy.id}`),
                            fetchApi(`/api/classes?period_id=${activeProxy.id}`) // Assuming /api/classes supports filtering or just returns all active
                        ]);

                        if (schedulesRes.ok) {
                            setSchedules(await schedulesRes.json());
                        }

                        if (classesRes.ok) {
                            setClasses(await classesRes.json());
                        }
                    }
                }
            } catch (err) {
                console.error("Error loading schedule data:", err);
                if (showAlert) showAlert('Gagal memuat data jadwal.', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchInitial();
    }, []);

    const fetchSchedules = async () => {
        if (!activePeriod) return;
        setLoading(true);
        try {
            const res = await fetchApi(`/api/schedules?period_id=${activePeriod.id}`);
            if (res.ok) {
                setSchedules(await res.json());
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const addSchedule = async (formData) => {
        setSubmitting(true);
        try {
            const payload = {
                periodId: activePeriod.id,
                classId: formData.classId,
                day: parseInt(formData.day),
                startTime: formData.startTime,
                endTime: formData.endTime,
                subject: formData.subject
            };

            const res = await fetchApi('/api/schedules', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                if (showAlert) showAlert('Jadwal berhasil ditambahkan.', 'success');
                await fetchSchedules(); // Refresh list
                return true;
            } else {
                const err = await res.json();
                if (showAlert) showAlert(err.error || 'Gagal menyimpan.', 'error');
                return false;
            }
        } catch (e) {
            if (showAlert) showAlert('Terjadi kesalahan.', 'error');
            return false;
        } finally {
            setSubmitting(false);
        }
    };

    const deleteSchedule = async (id) => {
        if (showConfirm) {
            showConfirm('Yakin ingin menghapus jadwal ini?', async () => {
                setDeletingId(id);
                try {
                    const res = await fetchApi(`/api/schedules?id=${id}`, { method: 'DELETE' });
                    if (res.ok) {
                        if (showAlert) showAlert('Jadwal dihapus.', 'success');
                        setSchedules(prev => prev.filter(s => s.id !== id));
                    } else {
                        if (showAlert) showAlert('Gagal menghapus.', 'error');
                    }
                } catch (e) {
                    if (showAlert) showAlert('Kesalahan saat menghapus.', 'error');
                } finally {
                    setDeletingId(null);
                }
            });
        }
    };

    return {
        loading, submitting, deletingId,
        schedules, classes, activePeriod, userSubjects,
        addSchedule, deleteSchedule
    };
};
