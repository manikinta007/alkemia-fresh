import { useState, useEffect } from 'react';

export const useDashboardData = () => {
    const [data, setData] = useState({ stats: {}, activePeriod: null, school: {} });
    const [todaySchedules, setTodaySchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [scheduleLoading, setScheduleLoading] = useState(false);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    useEffect(() => {
        if (data.activePeriod) {
            fetchTodaySchedule(data.activePeriod.id);
        }
    }, [data.activePeriod]);

    const fetchDashboardData = async () => {
        try {
            const res = await fetch('/api/dashboard');
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (e) {
            console.error("Dashboard Load Error:", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchTodaySchedule = async (periodId) => {
        setScheduleLoading(true);
        try {
            const res = await fetch(`/api/schedules?period_id=${periodId}`);
            if (res.ok) {
                const allSchedules = await res.json();

                let todayNum = new Date().getDay();
                if (todayNum === 0) todayNum = 7;

                const todayData = allSchedules.filter(s => s.day === todayNum);
                todayData.sort((a, b) => a.start_time.localeCompare(b.start_time));

                setTodaySchedules(todayData);
            }
        } catch (e) {
            console.error("Gagal load jadwal:", e);
        } finally {
            setScheduleLoading(false);
        }
    };

    return {
        data,
        todaySchedules,
        loading,
        scheduleLoading
    };
};
