import React from 'react';
import { TriangleAlert } from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';
import { StatCard } from './Dashboard/StatCard';
import { Skeleton, GridSkeleton } from '../components/Skeleton';
import { ScheduleItem } from './Dashboard/ScheduleItem';
import { QuickAction } from './Dashboard/QuickAction';
import { TeacherProfile } from './Dashboard/TeacherProfile';

export default function Dashboard() {
    const { data, todaySchedules, loading, scheduleLoading } = useDashboardData();
    const { stats, activePeriod, school } = data;
    const user = JSON.parse(localStorage.getItem('user') || '{"name": "Guru"}');

    const isNow = (start, end) => {
        const now = new Date();
        const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
        return currentTime >= start && currentTime <= end;
    };

    if (loading) return (
        <div className="pb-20">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-8 w-32 rounded-full hidden md:block" />
            </div>

            {/* Stats Skeleton */}
            <GridSkeleton count={3} />

            {/* Schedule & Quick Actions Skeleton */}
            <div className="grid md:grid-cols-3 gap-6 mt-10">
                <div className="md:col-span-2">
                    <Skeleton className="h-6 w-48 mb-4" />
                    <GridSkeleton count={2} />
                </div>
                <div className="md:col-span-1">
                    <Skeleton className="h-64 w-full rounded-2xl" />
                </div>
            </div>
        </div>
    );

    return (
        <div className="pb-20">
            {/* HEADER */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">Dashboard</h2>
                    <p className="text-zinc-500 mt-1">Selamat Datang, {user.name}.</p>
                </div>
                <div className="text-right hidden md:block">
                    <span className="px-4 py-2 bg-white rounded-full border border-zinc-200 text-sm font-semibold text-zinc-600 shadow-sm">
                        {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                </div>
            </div>

            {!activePeriod && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-6 py-4 rounded-xl mb-8 flex items-center gap-4 shadow-sm">
                    <TriangleAlert className="animate-pulse" size={24} />
                    <div>
                        <p className="font-bold">Periode Akademik Belum Aktif!</p>
                        <p className="text-sm">Silakan ke menu "Periode Akademik" untuk mengaktifkan tahun ajaran.</p>
                    </div>
                </div>
            )}

            {/* JADWAL MENGAJAR HARI INI */}
            {activePeriod && (
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-1.5 h-6 bg-teal-500 rounded-full"></div>
                        <h3 className="text-lg font-bold text-zinc-800">
                            Jadwal Mengajar Hari Ini
                        </h3>
                        {scheduleLoading && <span className="text-xs text-zinc-400 animate-pulse ml-auto">Sinkronisasi data...</span>}
                    </div>

                    {todaySchedules.length === 0 ? (
                        <div className="bg-white border border-zinc-200 border-dashed rounded-xl p-10 text-center">
                            <p className="text-zinc-500 font-medium">Tidak ada jadwal mengajar hari ini.</p>
                            <p className="text-xs text-zinc-400 mt-1">Anda bisa menyiapkan materi atau beristirahat.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {todaySchedules.map((sch) => (
                                <ScheduleItem
                                    key={sch.id}
                                    schedule={sch}
                                    active={isNow(sch.start_time, sch.end_time)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* SECTION: STATISTIK */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
                <StatCard color="blue" label="Total Kelas" value={stats.classes || 0} link="/classes" />
                <StatCard color="teal" label="Total Siswa" value={stats.students || 0} link="/classes" />
                <StatCard color="purple" label="Bahan Ajar" value={stats.materials || 0} link="/materials" />
            </div>

            {/* SECTION: AKSI CEPAT & INFO */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
                <QuickAction />
                <TeacherProfile user={user} school={school} />
            </div>
        </div>
    );
}
