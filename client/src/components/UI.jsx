import React from 'react';

export const Card = ({ children, className = "" }) => (
    <div className={`bg-white border border-zinc-200 rounded-xl shadow-sm p-6 ${className}`}>
        {children}
    </div>
);

export const Spinner = () => (
    <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
    </div>
);

// Re-export Alert if needed or just use it from Alert.jsx
// But Grades.jsx imports { Alert } from '../components/UI', so we can export a simple version or wrapper
export const Alert = ({ type = "info", message, className = "" }) => {
    if (!message) return null;

    const colors = {
        success: "bg-green-50 text-green-700 border-green-200",
        error: "bg-red-50 text-red-700 border-red-200",
        warning: "bg-orange-50 text-orange-700 border-orange-200",
        info: "bg-blue-50 text-blue-700 border-blue-200"
    };

    return (
        <div className={`p-4 rounded-lg border text-sm ${colors[type] || colors.info} ${className}`}>
            {message}
        </div>
    );
};
