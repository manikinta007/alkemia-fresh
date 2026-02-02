// render.js
// ALKEMIA CORE RENDERER (OPTIMIZED)
// Fitur: Branding + Decoration (Floating Atoms)
// Note: SPA Router dihapus karena sudah ditangani View Transitions di layout.js

const APP_NAME = "AlkeMia";
const FAVICON_URL = "https://iili.io/f4HD692.png"; 

// --- 1. DECORATION SCRIPT (Hiasan Atom Kimia Background) ---
const DECORATION_SCRIPT = `
<script>
// Fungsi untuk merandom posisi elemen kimia
function refreshDecorations() {
    const layer = document.getElementById('alkemia-layer'); 
    if (!layer) return;
    
    // Reset isi layer (sisakan gradient background)
    layer.innerHTML = '<div id="alkemia-gradient"></div>';
    
    const symbols = ['H₂O', 'CO₂', 'NaCl', 'C₆H₆', 'Fe²⁺', 'Au', 'Ag', 'H₂SO₄', 'NH₃', '⬡', '⚛️', '🧪', 'O₂', 'N₂', 'Cl⁻', 'Mg²⁺', 'pH', 'e⁻'];
    
    // Buat 6 elemen melayang acak
    for (let i = 0; i < 6; i++) {
        const sym = symbols[Math.floor(Math.random() * symbols.length)];
        const div = document.createElement('div'); 
        div.className = 'chem-item'; 
        div.textContent = sym;
        
        // Random posisi, rotasi, dan durasi animasi
        div.style.cssText = \`
            right: \${Math.floor(Math.random()*250)+20}px; 
            bottom: \${Math.floor(Math.random()*150)+20}px; 
            font-size: \${(Math.random()*1.5+1).toFixed(1)}rem; 
            transform: rotate(\${Math.floor(Math.random()*60)-30}deg); 
            animation-delay: \${(Math.random()*2).toFixed(1)}s; 
            animation-duration: \${(Math.random()*3+5).toFixed(1)}s;
        \`;
        layer.appendChild(div);
    }
}

// Jalankan saat halaman pertama kali dimuat
document.addEventListener('DOMContentLoaded', refreshDecorations);

// Jalankan ulang saat View Transition selesai (saat pindah halaman)
document.addEventListener('pageshow', refreshDecorations);
</script>
`;

// --- 2. MAIN RENDER FUNCTION ---
export function renderPage(htmlContent) {
  const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/i);
  const pageTitle = titleMatch ? titleMatch[1] : "";
  
  // Deteksi halaman agar script tidak bocor ke tempat yang salah
  const isLoginPage = pageTitle.includes('Login');
  const isStudentPage = pageTitle.includes('Siswa') || pageTitle.includes('Portal');

  // 1. GLOBAL REPLACEMENT (Branding)
  let modifiedHtml = htmlContent
      .replace(/Teacher Database|Teacher DB/g, APP_NAME)
      .replace('© 2024', '© 2026'); 

  // 2. INJECT FAVICON
  const faviconHtml = `<link rel="shortcut icon" type="image/png" href="${FAVICON_URL}">`;
  modifiedHtml = modifiedHtml.replace('</head>', `${faviconHtml}\n</head>`);

  // 3. INJECT DECORATION (Hanya untuk Halaman Guru Dashboard dkk)
  if (!isLoginPage && !isStudentPage) {
      
      // CSS Khusus Hiasan (Floating Atoms)
      const extraStyles = `
      <style>
        /* Container di pojok kanan bawah */
        #alkemia-layer { 
            position: fixed; bottom: 0; right: 0; 
            width: 40vw; height: 40vh; 
            pointer-events: none; z-index: 0; 
            overflow: hidden; 
            opacity: 0.6; /* Supaya tidak terlalu mengganggu */
        }
        
        /* Gradient Halus */
        #alkemia-gradient { 
            position: absolute; bottom: -50px; right: -50px; 
            width: 100%; height: 100%; 
            background: radial-gradient(circle at 100% 100%, rgba(251, 146, 60, 0.25) 0%, rgba(253, 186, 116, 0.1) 40%, rgba(255, 255, 255, 0) 70%); 
            filter: blur(20px); 
        }
        
        /* Animasi Naik Turun Pudar */
        @keyframes float-chem {
            0% { transform: translateY(0px) rotate(0deg); opacity: 0.1; }
            50% { transform: translateY(-20px) rotate(5deg); opacity: 0.4; }
            100% { transform: translateY(0px) rotate(0deg); opacity: 0.1; }
        }
        
        .chem-item { 
            position: absolute; 
            color: #ea580c; /* Orange Alkemia */
            font-weight: 800; 
            user-select: none; 
            font-family: 'Plus Jakarta Sans', sans-serif; 
            animation: float-chem 8s ease-in-out infinite; 
        }
      </style>
      `;

      // Elemen HTML Hiasan
      const htmlDecoration = `<div id="alkemia-layer"><div id="alkemia-gradient"></div></div>`;
      
      // Suntikkan ke HTML
      modifiedHtml = modifiedHtml.replace('</head>', `${extraStyles}\n</head>`);
      modifiedHtml = modifiedHtml.replace('</body>', `${htmlDecoration}\n${DECORATION_SCRIPT}\n</body>`);
  }

  // Header optimasi cache
  return new Response(modifiedHtml, {
    headers: { 
        "Content-Type": "text/html;charset=UTF-8",
        "Cache-Control": "no-cache, no-store, must-revalidate"
    }
  });
}