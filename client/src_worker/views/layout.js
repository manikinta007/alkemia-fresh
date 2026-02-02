// views/layout.js
// MASTER LAYOUT TEMPLATE (SECURED)
// Fitur: SSR HTML Structure + Sidebar + Cinematic Slide Animation + Orange Menu + Phosphor Icons (Bold Duotone)

import { escapeHtml, safeJsonStringify } from '../utils.js';

export function getLayoutHtml({ title, user, activePeriod, initialData, contentComponent }) {
  // 1. DATA JSON UNTUK HYDRATION
  const jsonInitialData = safeJsonStringify(initialData || {});

  // 2. HTML SIDEBAR
  const safeUserName = escapeHtml(user?.name || 'Guru');
  const safeTitle = escapeHtml(title);
  
  // Sidebar tetap statis
  const sidebarHtml = `
    <aside style="view-transition-name: sidebar" class="w-64 bg-black text-white flex flex-col hidden md:flex h-screen fixed left-0 top-0 border-r border-zinc-800 z-50">
        <div class="p-6 border-b border-zinc-800">
            <h1 class="text-xl font-bold tracking-tight flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 256 256" fill="currentColor"><path d="M228,128a100,100,0,1,1-100-100A100,100,0,0,1,228,128Z" opacity="0.2"></path><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Z" fill="#ea580c"></path><circle cx="128" cy="128" r="40" fill="#ea580c"></circle></svg>
                AlkeMia
            </h1>
            <p class="text-xs text-zinc-400 mt-1 pl-8">${safeUserName}</p>
        </div>
        
        ${activePeriod ? `
        <div class="p-4 bg-zinc-900 border-b border-zinc-800">
            <p class="text-[10px] text-zinc-500 uppercase mb-1 tracking-widest">Periode Aktif</p>
            <p class="text-sm font-bold flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="currentColor"><path d="M208,40H48A16,16,0,0,0,32,56V200a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V56A16,16,0,0,0,208,40Z" opacity="0.2"></path><path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A24,24,0,0,0,24,56V200a24,24,0,0,0,24,24H208a24,24,0,0,0,24-24V56A24,24,0,0,0,208,32ZM72,48h16V64a8,8,0,0,0,16,0V48h48V64a8,8,0,0,0,16,0V48h40V80H48V48Zm136,152H48V96H208V200Z"></path></svg>
                ${activePeriod.year}
            </p>
            <p class="text-xs text-zinc-400 mt-0.5">${activePeriod.semester}</p>
        </div>` : ''}

        <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
            
            <a href="/dashboard" class="flex items-center gap-3 px-4 py-3 rounded text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all duration-200 group">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M216,48V208a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V48A16,16,0,0,1,56,32H200A16,16,0,0,1,216,48Z" opacity="0.2"></path><path d="M200,24H56A24,24,0,0,0,32,48V208a24,24,0,0,0,24,24H200a24,24,0,0,0,24-24V48A24,24,0,0,0,200,24Zm8,184a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8V48a8,8,0,0,1,8-8H200a8,8,0,0,1,8,8ZM88,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48-32v96a8,8,0,0,1-16,0V72a8,8,0,0,1,16,0Zm48,64v32a8,8,0,0,1-16,0V136a8,8,0,0,1,16,0Z"></path></svg>
                <span>Dashboard</span>
            </a>
            
            <a href="/lab" class="flex items-center gap-3 px-4 py-3 rounded text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all duration-200 group">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M74.83,112l-40.6,88.42A16,16,0,0,0,48.77,224H207.23a16,16,0,0,0,14.54-23.58L181.17,112Z" opacity="0.2"></path><path d="M214.5,196.77l-40.6-88.42A8,8,0,0,0,166.63,104H136V40h16a8,8,0,0,0,0-16H104a8,8,0,0,0,0,16h16v64H89.37a8,8,0,0,0-7.27,4.35L41.5,196.77A16,16,0,0,0,56,220.37H200A16,16,0,0,0,214.5,196.77ZM56,204.37l33.82-73.65L96.63,120h62.74l6.81,10.72L200,204.37Z"></path></svg>
                <span>Virtual Lab</span>
            </a>
            
            <div class="h-2 border-b border-zinc-800 my-2"></div>

            <a href="/periods" class="flex items-center gap-3 px-4 py-3 rounded text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all duration-200 group">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M208,48V88H48V48Z" opacity="0.2"></path><path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A24,24,0,0,0,24,56V200a24,24,0,0,0,24,24H208a24,24,0,0,0,24-24V56A24,24,0,0,0,208,32ZM72,48h16V64a8,8,0,0,0,16,0V48h48V64a8,8,0,0,0,16,0V48h40V80H48V48Zm136,160H48V96H208V208Z"></path></svg>
                <span>Periode Akademik</span>
            </a>

            <a href="/classes" class="flex items-center gap-3 px-4 py-3 rounded text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all duration-200 group">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M232,56V200a16,16,0,0,1-16,16H40a16,16,0,0,1-16-16V56A16,16,0,0,1,40,40H216A16,16,0,0,1,232,56Z" opacity="0.2"></path><path d="M216,32H40A24,24,0,0,0,16,56V200a24,24,0,0,0,24,24H216a24,24,0,0,0,24-24V56A24,24,0,0,0,216,32Zm8,168a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V56a8,8,0,0,1,8-8H216a8,8,0,0,1,8,8ZM160,168a8,8,0,0,1-8,8H56a8,8,0,0,1,0-16h96A8,8,0,0,1,160,168Z"></path></svg>
                <span>Kelas & Siswa</span>
            </a>

            <a href="/schedule" class="flex items-center gap-3 px-4 py-3 rounded text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all duration-200 group">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48h16V64a8,8,0,0,0,16,0V48h48V64a8,8,0,0,0,16,0V48h40V80H48V48Zm136,160H48V96H208V208Z" opacity="0.2"></path><path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A24,24,0,0,0,24,56V208a24,24,0,0,0,24,24H208a24,24,0,0,0,24-24V56A24,24,0,0,0,208,32ZM72,48h16V64a8,8,0,0,0,16,0V48h48V64a8,8,0,0,0,16,0V48h40V80H48V48Zm136,160H48V96H208V208Z"></path><circle cx="128" cy="132" r="12"></circle><circle cx="172" cy="132" r="12"></circle><circle cx="84" cy="132" r="12"></circle><circle cx="128" cy="172" r="12"></circle><circle cx="172" cy="172" r="12"></circle><circle cx="84" cy="172" r="12"></circle></svg>
                <span>Jadwal Mengajar</span>
            </a>

            <a href="/tasks" class="flex items-center gap-3 px-4 py-3 rounded text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all duration-200 group">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M216,64H176a48,48,0,0,0-96,0H40A16,16,0,0,0,24,80V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V80A16,16,0,0,0,216,64ZM128,32a32,32,0,0,1,32,32H96A32,32,0,0,1,128,32Zm88,168H40V80H80V96a8,8,0,0,0,16,0V80h64V96a8,8,0,0,0,16,0V80h40Z" opacity="0.2"></path><path d="M216,64H176V56a48,48,0,0,0-96,0v8H40a16,16,0,0,0-16,16V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V80A16,16,0,0,0,216,64ZM96,56a32,32,0,0,1,64,0v8H96ZM216,200H40V80H80V96a8,8,0,0,0,16,0V80h64V96a8,8,0,0,0,16,0V80h40Z"></path></svg>
                <span>Tugas</span>
            </a>

            <a href="/attendance" class="flex items-center gap-3 px-4 py-3 rounded text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all duration-200 group">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M200,32H163.74a47.92,47.92,0,0,0-71.48,0H56A16,16,0,0,0,40,48V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V48A16,16,0,0,0,200,32Zm-72,0a32,32,0,0,1,32,32H96A32,32,0,0,1,128,32Zm72,184H56V48H82.75A47.93,47.93,0,0,0,80,64v8a8,8,0,0,0,8,8h80a8,8,0,0,0,8-8V64a47.93,47.93,0,0,0-2.75-16H200Z" opacity="0.2"></path><path d="M216,40V208a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V40A16,16,0,0,1,56,24H200A16,16,0,0,1,216,40Zm-16,0H56V208H200V40Z"></path><path d="M160,80a32,32,0,0,1-64,0h64Z" opacity="0.2"></path><path d="M88,112a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H96A8,8,0,0,1,88,112Zm8,40h64a8,8,0,0,0,0-16H96a8,8,0,0,0,0,16Zm0,24h40a8,8,0,0,0,0-16H96a8,8,0,0,0,0,16ZM216,48v16a8,8,0,0,1-8,8H171.1a48.09,48.09,0,0,1-5.18,12.57A8,8,0,0,1,158.5,86,32,32,0,0,0,128,64h0a32,32,0,0,0-30.5,22,8,8,0,0,1-7.42-1.42A48.09,48.09,0,0,1,84.9,72H48a8,8,0,0,1-8-8V48A24,24,0,0,1,64,24H82.75a47.93,47.93,0,0,1,90.5,0H192A24,24,0,0,1,216,48Zm-16,8H173.28a63.85,63.85,0,0,0-6.14-16H192a8,8,0,0,0,8-8V48a8,8,0,0,0-8-8H163.74a47.92,47.92,0,0,0-71.48,0H64a8,8,0,0,0-8,8v4.29a24,24,0,0,1,8.34,16.29A63.8,63.8,0,0,0,82.72,56H56V216H200ZM128,40a16,16,0,0,1,16,16H112A16,16,0,0,1,128,40Z"></path></svg>
                <span>Presensi</span>
            </a>

            <a href="/grades" class="flex items-center gap-3 px-4 py-3 rounded text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all duration-200 group">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M224,176a8,8,0,0,1-8,8H168a8,8,0,0,1,0-16h48A8,8,0,0,1,224,176Z" opacity="0.2"></path><path d="M224,48H48a8,8,0,0,0-8,8V208a24,24,0,0,0,24,24H192a24,24,0,0,0,24-24V56A8,8,0,0,0,224,48Zm8,160a8,8,0,0,1-8,8H64a8,8,0,0,1-8-8V64H216V208Zm-40-24a8,8,0,0,1-8,8H120a8,8,0,0,1,0-16h56A8,8,0,0,1,192,184Zm0-32a8,8,0,0,1-8,8H120a8,8,0,0,1,0-16h56A8,8,0,0,1,192,152Zm0-32a8,8,0,0,1-8,8H120a8,8,0,0,1,0-16h56A8,8,0,0,1,192,120Z"></path></svg>
                <span>Nilai</span>
            </a>

            <a href="/materials" class="flex items-center gap-3 px-4 py-3 rounded text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all duration-200 group">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M208,40H64A32,32,0,0,0,32,72V200a32,32,0,0,0,32,32H208a16,16,0,0,0,16-16V56A16,16,0,0,0,208,40Z" opacity="0.2"></path><path d="M208,32H64A40,40,0,0,0,24,72V200a40,40,0,0,0,40,40H208a24,24,0,0,0,24-24V56A24,24,0,0,0,208,32Zm8,184a8,8,0,0,1-8,8H64a24,24,0,0,1-24-24V72A24,24,0,0,1,64,48H208a8,8,0,0,1,8,8Z"></path></svg>
                <span>Bahan Ajar</span>
            </a>

            <a href="/quizzes" class="flex items-center gap-3 px-4 py-3 rounded text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all duration-200 group">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M216,96a40,40,0,0,1-24-36.65V56H160a32,32,0,0,1,0-64,32,32,0,0,1,0,64h16V96a56,56,0,0,0,16.51,39.63A56,56,0,0,0,160,176H96a56,56,0,0,0-56-56V56H56a32,32,0,0,0,0,64" opacity="0.2"></path><path d="M205.66,138.34A64,64,0,0,1,216,96V56a8,8,0,0,0-8-8H165.31A24,24,0,1,0,128,51.31V56H96a8,8,0,0,0-8,8v42.69A64,64,0,0,1,50.34,154.34,64,64,0,0,1,8,200v8a24,24,0,0,0,43.31,14.69H96a8,8,0,0,0,8-8V172a64,64,0,0,1,50.34-63.66A64,64,0,0,1,200,154.34,64,64,0,0,1,248,192h0a24,24,0,0,0,24-24V160A64,64,0,0,1,205.66,138.34ZM152,24a8,8,0,0,1,16,0V48H152ZM24,208a8,8,0,0,1-8-8,48.05,48.05,0,0,0,48-48h0A48.05,48.05,0,0,0,24,208Zm133.31-8A48.05,48.05,0,0,0,200,165.31V200H157.31ZM248,168a8,8,0,0,1,8,8,48.05,48.05,0,0,0-48-48h0A48.05,48.05,0,0,0,248,168Z"></path></svg>
                <span>Quiz & Ujian</span>
            </a>

            <a href="/qrcodes" class="flex items-center gap-3 px-4 py-3 rounded text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all duration-200 group">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M112,48V96H64V48h48m0-16H64A16,16,0,0,0,48,48V96a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V48A16,16,0,0,0,112,32Z" opacity="0.2"></path><path d="M104,40H56A8,8,0,0,0,48,48V96a8,8,0,0,0,8,8h48a8,8,0,0,0,8-8V48A8,8,0,0,0,104,40Zm-8,48H64V56H96Zm48,56H56a8,8,0,0,0-8,8v48a8,8,0,0,0,8,8h48a8,8,0,0,0,8-8V152A8,8,0,0,0,144,144Zm-8,48H64V160h72Zm48-88H152a8,8,0,0,0-8,8v48a8,8,0,0,0,8,8h48a8,8,0,0,0,8-8V112A8,8,0,0,0,192,104Zm-8,48H160V120h24Zm40,32h-8v-8a8,8,0,0,0-16,0v24a8,8,0,0,0,8,8h16a8,8,0,0,0,0-16Zm16-32h-8v-8a8,8,0,0,0-16,0v8h-8a8,8,0,0,0,0,16h24a8,8,0,0,0,8-8V152A8,8,0,0,0,240,152Z"></path></svg>
                <span>QR Codes</span>
            </a>

            <a href="/settings" class="flex items-center gap-3 px-4 py-3 rounded text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all duration-200 group">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Z" opacity="0.2"></path><path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm88-29.84q.06-2.16.06-4.32a94.18,94.18,0,0,0-3.13-24.18l20.2-18.15a8,8,0,0,0,2.15-10.27l-24-41.57a8,8,0,0,0-9.87-2.92l-25.29,10.12a95.31,95.31,0,0,0-36-20.78V16a8,8,0,0,0-8-8H96a8,8,0,0,0-8-8V42.48a95.31,95.31,0,0,0-36,20.78L26.71,53.14a8,8,0,0,0-9.87,2.92l-24,41.57a8,8,0,0,0,2.15,10.27l20.2,18.15A94.18,94.18,0,0,0,11.94,150.16q0,2.16.06,4.32l-20.2,18.15a8,8,0,0,0-2.15,10.27l24,41.57a8,8,0,0,0,9.87,2.92l25.29-10.12a95.31,95.31,0,0,0,36,20.78V240a8,8,0,0,0,8,8h32a8,8,0,0,0,8-8V216.48a95.31,95.31,0,0,0,36-20.78l25.29,10.12a8,8,0,0,0,9.87-2.92l24-41.57a8,8,0,0,0-2.15-10.27Zm-52.64,30.3a8,8,0,0,0-4.52,10.91A79.4,79.4,0,0,1,166,189.65L144,180.88a8,8,0,0,0-10.24,4.24,80,80,0,0,1-11.43,6.62V192a8,8,0,0,0-8,8v24H112V200a8,8,0,0,0-8-8,79.86,79.86,0,0,1-31.57-12.86l-22,8.77a79.4,79.4,0,0,1-7.14-18.21,8,8,0,0,0-10.91-4.52l-22,8.77a79.4,79.4,0,0,1-12.86-31.57L40,144a8,8,0,0,0,4.24-10.24A80,80,0,0,1,37.62,122.33L19.41,122.33a8,8,0,0,0-4.52-10.91A79.4,79.4,0,0,1,22.06,93.21l22-8.77a8,8,0,0,0,4.52-10.91A79.4,79.4,0,0,1,56,66.35L34,57.58a8,8,0,0,0-2.15,14.79Z"></path></svg>
                <span>Pengaturan</span>
            </a>
        </nav>

        <div class="p-4 border-t border-zinc-800">
            <button onclick="localStorage.clear(); window.location.href='/logout';" class="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 rounded transition-colors group">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor"><path d="M120,216a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V40a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H56V208h56A8,8,0,0,1,120,216Zm109.66-93.66-40-40a8,8,0,0,0-11.32,11.32L204.69,120H104a8,8,0,0,0,0,16H204.69l-26.35,26.34a8,8,0,0,0,11.32,11.32l40-40A8,8,0,0,0,229.66,122.34Z"></path></svg>
                LOGOUT
            </button>
        </div>
    </aside>
  `;

  return `<!DOCTYPE html>
  <html lang="id">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      
      <meta name="view-transition" content="same-origin" />
      
      <title>${safeTitle} - Teacher DB</title>
      
      <script src="https://cdn.tailwindcss.com"></script>
      <script src="https://unpkg.com/nprogress@0.2.0/nprogress.js"></script>
      <link rel="stylesheet" href="https://unpkg.com/nprogress@0.2.0/nprogress.css" />

      <script>
        tailwind.config = {
          theme: {
            extend: {
              fontFamily: {
                sans: ['"Plus Jakarta Sans"', 'sans-serif'], 
              }
            }
          }
        }
      </script>

      <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
      <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
      <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
      
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
      
      <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #fafafa; -webkit-font-smoothing: antialiased; }
        .card-mono { background: white; border: 1px solid #e4e4e7; border-radius: 0.75rem; }
        .input-mono { background: #ffffff; border: 1px solid #d4d4d8; transition: all 0.2s; font-family: 'Plus Jakarta Sans', sans-serif; }
        .input-mono:focus { border-color: #18181b; outline: none; box-shadow: 0 0 0 1px #18181b; }
        
        /* --- STYLE MENU AKTIF (Gaya 1: Blok Orange + White Icon) --- */
        .nav-active { 
            background-color: #ea580c !important; /* Orange-600 */
            color: white !important; 
            font-weight: 700 !important;
            box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3);
        }
        
        /* Saat aktif, ubah warna icon duotone biar jelas */
        .nav-active svg path { opacity: 1; } /* Icon jadi solid putih semua */
        
        /* --- NPROGRESS --- */
        #nprogress .bar { background: #ea580c !important; height: 3px !important; }
        #nprogress .peg { box-shadow: 0 0 10px #ea580c, 0 0 5px #ea580c; }
        #nprogress .spinner { display: none; } 

        /* --- CINEMATIC SLIDE ANIMATIONS --- */
        
        ::view-transition-group(sidebar) {
            animation-duration: 0s; 
        }

        main {
            view-transition-name: content;
        }

        ::view-transition-old(content) {
            animation: fadeOut 0.4s ease-in-out both;
        }

        ::view-transition-new(content) {
            animation: slideInRight 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes fadeOut { 
            from { opacity: 1; transform: translateX(0); }
            to { opacity: 0; transform: translateX(-20px); } 
        }
        
        @keyframes slideInRight { 
            from { 
                opacity: 0; 
                transform: translateX(50px); 
            } 
            to { 
                opacity: 1; 
                transform: translateX(0); 
            } 
        }

        .animate-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      </style>
  </head>
  <body>
      ${sidebarHtml}

      <main class="flex-1 md:ml-64 p-8 relative h-screen overflow-y-auto flex flex-col">
          <div id="root" class="flex-1 flex flex-col"></div>
      </main>

      <div class="fixed bottom-4 right-6 z-50 select-none pointer-events-none opacity-60">
          <p class="text-[10px] font-light text-black tracking-widest font-sans">
              © 2026 AlkeMia Learning System
          </p>
      </div>

      <script>
          window.__INITIAL_DATA__ = ${jsonInitialData};

          // --- 1. HIGHLIGHT MENU OTOMATIS ---
          document.addEventListener('DOMContentLoaded', () => {
              const currentPath = window.location.pathname;
              const navLinks = document.querySelectorAll('aside nav a');
              
              navLinks.forEach(link => {
                  const linkHref = link.getAttribute('href');
                  if (linkHref === currentPath) {
                      link.classList.add('nav-active');
                      link.classList.remove('text-zinc-400', 'hover:text-white', 'hover:bg-zinc-900');
                  }
              });
          });

          // --- 2. NPROGRESS TRIGGER ---
          document.addEventListener('click', function(e) {
              const link = e.target.closest('a');
              if (link && link.href.startsWith(window.location.origin) && !link.hasAttribute('download') && link.target !== '_blank') {
                  NProgress.start();
              }
          });
          
          window.addEventListener('pageshow', () => NProgress.done());
      </script>

      <script type="text/babel">
          ${contentComponent}
      </script>
  </body>
  </html>`;
}