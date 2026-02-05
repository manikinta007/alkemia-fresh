import { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '../utils/api';

export const useJournalData = (showAlert, showConfirm) => {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    // Data
    const [journals, setJournals] = useState([]);
    const [classes, setClasses] = useState([]);
    const [activePeriod, setActivePeriod] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);

    // Filters
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');

    // Fetch Initial Data
    useEffect(() => {
        const fetchInitial = async () => {
            setLoading(true);
            try {
                // 1. Get Active Period
                const periodRes = await fetchApi('/api/periods?active=true');
                if (periodRes.ok) {
                    const periods = await periodRes.json();
                    const activeProxy = periods.find(p => p.is_active) || periods[0];
                    setActivePeriod(activeProxy);

                    if (activeProxy) {
                        // 2. Fetch Classes
                        const classesRes = await fetchApi(`/api/classes?period_id=${activeProxy.id}`);
                        if (classesRes.ok) {
                            setClasses(await classesRes.json());
                        }
                    }
                }

                // 3. Fetch Templates
                const templatesRes = await fetchApi('/api/journal-templates');
                let templatesData = [];
                if (templatesRes.ok) {
                    const data = await templatesRes.json();
                    templatesData = data.templates || [];
                    setTemplates(templatesData);
                }

                // 4. Fetch Settings to get active_template_id
                const settingsRes = await fetchApi('/api/journal-settings');
                if (settingsRes.ok) {
                    const settingsData = await settingsRes.json();
                    const activeTemplateId = settingsData.settings?.active_template_id;

                    if (activeTemplateId && templatesData.length > 0) {
                        // Find and set active template
                        const activeTemplate = templatesData.find(t => t.id === activeTemplateId);
                        if (activeTemplate) {
                            setSelectedTemplate(activeTemplate);
                        } else {
                            // Fallback to first template if active not found
                            setSelectedTemplate(templatesData[0]);
                        }
                    } else if (templatesData.length > 0) {
                        // No active set, use first template as default
                        setSelectedTemplate(templatesData[0]);
                    }
                } else if (templatesData.length > 0) {
                    // Settings fetch failed, fallback to first template
                    setSelectedTemplate(templatesData[0]);
                }
            } catch (err) {
                console.error("Error loading journal data:", err);
                if (showAlert) showAlert('Gagal memuat data jurnal.', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchInitial();
    }, []);

    // Fetch journals when filters change
    const fetchJournals = useCallback(async () => {
        if (!selectedClassId) {
            setJournals([]);
            return;
        }

        setLoading(true);
        try {
            let url = `/api/journals?class_id=${selectedClassId}`;
            if (selectedMonth) {
                url += `&month=${selectedMonth}`;
            }

            const res = await fetchApi(url);
            if (res.ok) {
                const data = await res.json();
                setJournals(data.journals || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [selectedClassId, selectedMonth]);

    useEffect(() => {
        fetchJournals();
    }, [fetchJournals]);

    // Create Journal
    const addJournal = async (formData) => {
        setSubmitting(true);
        try {
            const payload = {
                period_id: activePeriod?.id,
                class_id: parseInt(formData.class_id),
                date: formData.date,
                start_time: formData.start_time,
                end_time: formData.end_time,
                custom_data: formData.custom_data
            };

            const res = await fetchApi('/api/journals', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                if (showAlert) showAlert('Jurnal berhasil ditambahkan.', 'success');
                await fetchJournals();
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

    // Update Journal
    const updateJournal = async (formData) => {
        setSubmitting(true);
        try {
            const payload = {
                id: formData.id,
                period_id: activePeriod?.id,
                class_id: parseInt(formData.class_id),
                date: formData.date,
                start_time: formData.start_time,
                end_time: formData.end_time,
                custom_data: formData.custom_data
            };

            const res = await fetchApi('/api/journals', {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                if (showAlert) showAlert('Jurnal berhasil diperbarui.', 'success');
                await fetchJournals();
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

    // Delete Journal
    const deleteJournal = async (id) => {
        if (showConfirm) {
            const confirmed = await showConfirm('Yakin ingin menghapus jurnal ini?');
            if (!confirmed) return;

            setDeletingId(id);
            try {
                const res = await fetchApi(`/api/journals?id=${id}`, { method: 'DELETE' });
                if (res.ok) {
                    if (showAlert) showAlert('Jurnal dihapus.', 'success');
                    setJournals(prev => prev.filter(j => j.id !== id));
                } else {
                    if (showAlert) showAlert('Gagal menghapus.', 'error');
                }
            } catch (e) {
                if (showAlert) showAlert('Kesalahan saat menghapus.', 'error');
            } finally {
                setDeletingId(null);
            }
        }
    };

    // Fetch Attendance for a specific class and date
    const fetchAttendance = async (classId, date) => {
        try {
            const res = await fetchApi(`/api/journals/attendance?class_id=${classId}&date=${date}`);
            if (res.ok) {
                const data = await res.json();
                return data;
            }
        } catch (e) {
            console.error("Error fetching attendance:", e);
        }
        return { formatted: '-', attendance: { hadir: 0, sakit: 0, izin: 0, alpa: 0 } };
    };

    return {
        loading, submitting, deletingId,
        journals, classes, activePeriod, templates, selectedTemplate,
        selectedClassId, setSelectedClassId,
        selectedMonth, setSelectedMonth,
        setSelectedTemplate,
        addJournal, updateJournal, deleteJournal, fetchJournals, fetchAttendance
    };
};
