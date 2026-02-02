// views/lab.js
// Halaman Virtual Lab (Integrated Iframe)
// Tampil di area konten utama, tidak menutupi sidebar.

import { getLayoutHtml } from './layout.js';

export function getLabPage(activePeriod = null) {
    const LAB_URL = "https://alkemia-lab.altratimuri.workers.dev/";

    const contentComponent = `
        const { useState, useEffect } = React;
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        
        if (!user) window.location.href = '/';

        function VirtualLabPage() {
            // Update nama user di sidebar (jika reload)
            useEffect(() => {
                if(user && user.name) {
                    const sidebarName = document.querySelector('aside .p-6 p.text-zinc-400');
                    if(sidebarName) sidebarName.innerText = user.name;
                }
            }, []);

            return (
                <div className="w-full h-full flex flex-col animate-in">
                    <div className="mb-6 flex justify-between items-end">
                        <div>
                            <h2 className="text-3xl font-bold text-zinc-900">Virtual Laboratory</h2>
                            <p className="text-zinc-500 mt-1">Simulasi Praktikum Interaktif</p>
                        </div>
                        <a href="${LAB_URL}" target="_blank" className="text-xs font-bold text-blue-600 hover:underline">
                            Buka di Tab Baru ↗
                        </a>
                    </div>

                    {/* Container Iframe Full Height relative terhadap sisa layar */}
                    <div className="flex-1 bg-black rounded-xl overflow-hidden shadow-2xl border border-zinc-200 relative min-h-[600px]">
                        <iframe 
                            src="${LAB_URL}" 
                            className="absolute inset-0 w-full h-full border-0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" 
                            allowFullScreen
                        ></iframe>
                    </div>
                </div>
            );
        }

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<VirtualLabPage />);
    `;

    return getLayoutHtml({
        title: 'Virtual Lab',
        user: { name: 'Guru' },
        activePeriod,
        initialData: {},
        contentComponent
    });
}