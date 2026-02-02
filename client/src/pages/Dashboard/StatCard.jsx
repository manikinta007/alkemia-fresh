import React from 'react';
import { Link } from 'react-router-dom';

export const StatCard = ({ color, label, value, link }) => {
    const colorClasses = {
        blue: { border: 'bg-blue-500' },
        teal: { border: 'bg-teal-500' },
        purple: { border: 'bg-purple-500' }
    };

    const selectedColor = colorClasses[color] || colorClasses.blue;

    const Content = () => (
        <>
            <div className={`absolute top-0 left-0 w-full h-1 ${selectedColor.border}`}></div>
            <div className="flex flex-col justify-between h-full">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-4xl font-bold text-zinc-900 tracking-tight">{value}</p>
            </div>
        </>
    );

    const containerClasses = "bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition duration-200 relative overflow-hidden block h-full";

    if (link) {
        return (
            <Link to={link} className={containerClasses}>
                <Content />
            </Link>
        );
    }

    return (
        <div className={containerClasses}>
            <Content />
        </div>
    );
};
