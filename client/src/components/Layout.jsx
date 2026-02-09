import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Calendar,
    Users,
    ClipboardList,
    BookOpen,
    ListTodo,
    FlaskConical,
    QrCode,
    Settings,
    LogOut,
    Menu,
    X,
    Award,
    ChevronDown,
    ChevronRight,
    School,
    GraduationCap,
    MoreHorizontal,
    Image as ImageIcon,
    FileEdit,
    MessageSquare
} from 'lucide-react';
import { fetchApi } from '../utils/api';

const SidebarItem = ({ to, icon: Icon, label, nested = false }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2.5 rounded text-sm font-medium transition-all duration-200 group ` +
            (nested ? 'ml-4 ' : '') + // Indent for nested items
            (isActive
                ? 'bg-orange-600 text-white font-bold shadow-lg shadow-orange-600/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900')
        }
    >
        {({ isActive }) => (
            <>
                <Icon size={18} className={isActive ? 'opacity-100' : 'opacity-70'} />
                <span>{label}</span>
            </>
        )}
    </NavLink>
);

const SidebarGroup = ({ label, icon: Icon, children, initialOpen = false, currentPath }) => {
    // Check if any child link is active to auto-expand
    const isChildActive = React.Children.toArray(children).some(child => {
        if (React.isValidElement(child) && child.props.to) {
            return currentPath === child.props.to || currentPath.startsWith(child.props.to);
        }
        return false;
    });

    const [isOpen, setIsOpen] = useState(initialOpen || isChildActive);

    // Effect to auto-expand if navigated to a child route from elsewhere
    useEffect(() => {
        if (isChildActive) setIsOpen(true);
    }, [isChildActive]);

    return (
        <div className="mb-2">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-4 py-2 rounded text-xs font-bold uppercase tracking-widest transition-colors ${isChildActive || isOpen ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
            >
                <div className="flex items-center gap-2">
                    {Icon && <Icon size={16} />}
                    <span>{label}</span>
                </div>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    }`}
            >
                {/* Cloudflare-style vertical line container */}
                <div className="ml-[1.15rem] pl-3 border-l border-zinc-800 space-y-1 my-1">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    // Get user from localStorage (synced by api.js) or default
    const user = JSON.parse(localStorage.getItem('user') || '{"name": "Guru", "username": "guru"}');

    const handleLogout = async () => {
        try {
            await fetchApi('/api/auth/logout', { method: 'POST' });
        } catch (e) {
            console.error("Logout failed on server", e);
        }
        localStorage.removeItem('user');
        window.location.href = '/login';
    };

    return (
        <div className="flex min-h-screen bg-zinc-50 font-sans">
            {/* Sidebar Overlay (Mobile) */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:sticky top-0 left-0 h-screen bg-black text-white w-72 z-50 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } lg:translate-x-0 flex flex-col`}
            >
                <div className="p-6 border-b border-zinc-900 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-900/50">
                            <FlaskConical className="text-white" size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">AlkeMia</h1>
                            <p className="text-xs text-zinc-500 font-medium">Guru</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-b border-zinc-900 bg-zinc-900/50">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">PERIODE AKTIF</p>
                    <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-orange-500" />
                        <div>
                            <p className="text-sm font-bold text-white leading-tight">2024/2025</p>
                            <p className="text-xs text-zinc-400">Ganjil</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {/* DASHBOARD (Main) */}
                    <div className="mb-4 space-y-1">
                        <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" />
                        <SidebarItem to="/lab" icon={FlaskConical} label="Virtual Lab" />
                    </div>

                    {/* AKADEMIK */}
                    <SidebarGroup label="Akademik" icon={School} currentPath={location.pathname}>
                        <SidebarItem to="/periods" icon={Calendar} label="Periode" />
                        <SidebarItem to="/classes" icon={Users} label="Kelas & Siswa" />
                    </SidebarGroup>

                    {/* KBM */}
                    <SidebarGroup label="KBM" icon={BookOpen} currentPath={location.pathname}>
                        <SidebarItem to="/schedule" icon={Calendar} label="Jadwal" />
                        <SidebarItem to="/attendance" icon={ClipboardList} label="Presensi" />
                        <SidebarItem to="/materials" icon={BookOpen} label="Bahan Ajar" />
                        <SidebarItem to="/journal" icon={FileEdit} label="Jurnal Mengajar" />
                    </SidebarGroup>

                    {/* EVALUASI */}
                    <SidebarGroup label="Evaluasi" icon={Award} currentPath={location.pathname}>
                        <SidebarItem to="/tasks" icon={ListTodo} label="Tugas" />
                        <SidebarItem to="/quizzes" icon={Award} label="Kuis & Ujian" />
                        <SidebarItem to="/grades" icon={Award} label="Nilai" />
                        <SidebarItem to="/participation" icon={MessageSquare} label="Keaktifan" />
                    </SidebarGroup>

                    {/* LAINNYA */}
                    <SidebarGroup label="Lainnya" icon={MoreHorizontal} currentPath={location.pathname}>
                        <SidebarItem to="/gudang-gambar" icon={ImageIcon} label="Bank Gambar" />
                        <SidebarItem to="/qrcodes" icon={QrCode} label="QR Codes" />
                        <SidebarItem to="/settings" icon={Settings} label="Pengaturan" />
                    </SidebarGroup>
                </nav>

                <div className="p-4 border-t border-zinc-900">
                    <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-sm font-bold text-zinc-400 hover:bg-zinc-900 hover:text-red-500 transition-colors">
                        <LogOut size={20} />
                        <span>LOGOUT</span>
                    </button>
                    <div className="mt-4 px-4 text-[10px] text-zinc-600 text-center font-mono">
                        v2.0.0 (React Migration)
                    </div>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 w-full bg-white border-b border-zinc-200 z-30 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                        <FlaskConical className="text-white" size={16} />
                    </div>
                    <span className="font-bold text-zinc-900">AlkeMia</span>
                </div>
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-zinc-600">
                    {sidebarOpen ? <X /> : <Menu />}
                </button>
            </header>

            {/* Main Content */}
            <main className={`flex-1 transition-all duration-300 pt-16 lg:pt-0`}>
                <div className="w-full p-4 lg:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
