import React from 'react';

export const Skeleton = ({ className }) => (
    <div className={`animate-pulse bg-zinc-200 rounded-md ${className}`} />
);

export const CardSkeleton = () => (
    <div className="bg-white border border-zinc-200 p-6 rounded-2xl">
        <Skeleton className="h-8 w-3/4 mb-4" />
        <Skeleton className="h-4 w-1/2" />
    </div>
);

export const TableSkeleton = ({ rows = 5 }) => (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-24 rounded-md" />
        </div>
        <div className="divide-y divide-zinc-100">
            {[...Array(rows)].map((_, i) => (
                <div key={i} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full">
                        <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                        <Skeleton className="h-5 w-48" />
                    </div>
                    <div className="flex gap-1">
                        <Skeleton className="w-10 h-9 rounded-md" />
                        <Skeleton className="w-10 h-9 rounded-md" />
                        <Skeleton className="w-10 h-9 rounded-md" />
                        <Skeleton className="w-10 h-9 rounded-md" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export const GridSkeleton = ({ count = 6 }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(count)].map((_, i) => (
            <CardSkeleton key={i} />
        ))}
    </div>
);

export const ListSkeleton = ({ count = 4 }) => (
    <div className="space-y-4">
        {[...Array(count)].map((_, i) => (
            <div key={i} className="bg-white border border-zinc-200 p-6 rounded-xl flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex-1 w-full space-y-3">
                    <Skeleton className="h-6 w-3/4 sm:w-1/3" />
                    <Skeleton className="h-4 w-1/2 sm:w-1/4" />
                    <div className="flex gap-2 pt-1">
                        <Skeleton className="h-6 w-20 rounded-md" />
                        <Skeleton className="h-6 w-20 rounded-md" />
                        <Skeleton className="h-6 w-20 rounded-md" />
                    </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Skeleton className="h-10 w-24 rounded-lg" />
                    <Skeleton className="h-10 w-24 rounded-lg" />
                </div>
            </div>
        ))}
    </div>
);
