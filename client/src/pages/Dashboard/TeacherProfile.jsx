import { Link } from 'react-router-dom';
import { Users, Settings } from 'lucide-react';

export const TeacherProfile = ({ user, school }) => {
    return (
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm flex flex-col justify-between">
            <div>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500">
                        <Users size={20} />
                    </div>
                    <div>
                        <p className="text-xs text-zinc-400 font-bold uppercase">Guru Pengampu</p>
                        <p className="font-bold text-zinc-900">{user.name}</p>
                    </div>
                </div>
                <div className="h-px bg-zinc-100 my-4"></div>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500">
                        <Settings size={20} />
                    </div>
                    <div>
                        <p className="text-xs text-zinc-400 font-bold uppercase">Sekolah</p>
                        <p className="font-bold text-zinc-900 text-sm truncate">{school?.name || '-'}</p>
                    </div>
                </div>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-100">
                <Link to="/settings" className="block w-full text-center py-2 text-xs font-bold text-zinc-400 hover:text-black hover:bg-zinc-50 rounded-lg transition">
                    PENGATURAN PROFIL
                </Link>
            </div>
        </div>
    );
};
