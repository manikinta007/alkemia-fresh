// views/login.js
// Halaman Login Guru - Tema "Reactor Core" (Typewriter Edition)
// FIXED: Ukuran Hexagon Responsif (Aman di HP & Desktop)

export function getLoginPage() {
    return `<!DOCTYPE html>
  <html lang="id">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Login - AlkeMia</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
      <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
      <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      
      <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; overflow: hidden; background: #09090b; }
        
        /* --- 1. HEXAGON ANIMATION (Background) --- */
        .benzene-svg {
            /* UPDATE: UKURAN RESPONSIF */
            width: 90vw; /* 90% lebar layar di HP */
            height: 90vw; /* Biar tetap persegi */
            
            /* Batas Maksimal di Layar Besar */
            max-width: 500px; 
            max-height: 500px;
            
            overflow: visible;
        }
        
        .hex-path {
            fill: none;
            stroke: #ea580c;
            stroke-width: 6;
            stroke-linecap: round;
            stroke-linejoin: round;
            filter: drop-shadow(0 0 25px #ea580c);
            
            stroke-dasharray: 600;
            stroke-dashoffset: 600;
            
            /* Sequence: Draw -> Wait -> Undraw */
            animation: hexCycle 2.8s ease-in-out forwards;
        }

        @keyframes hexCycle {
            0% { stroke-dashoffset: 600; opacity: 1; }
            40% { stroke-dashoffset: 0; }   /* Selesai Gambar */
            60% { stroke-dashoffset: 0; }   /* Tahan */
            100% { stroke-dashoffset: -600; opacity: 0; } /* Hapus & Hilang */
        }

        /* --- 2. LOGO POP-IN --- */
        .logo-enter {
            opacity: 0; transform: scale(0.8);
            animation: popIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) 1.5s forwards;
        }
        @keyframes popIn { to { opacity: 1; transform: scale(1); } }

        /* --- 3. TYPEWRITER EFFECT --- */
        .char-reveal {
            opacity: 0;
            display: inline-block;
            transform: translateY(5px);
            animation: typeAndGlow 0.3s forwards;
        }

        @keyframes typeAndGlow {
            to { 
                opacity: 1; 
                transform: translateY(0);
                text-shadow: 0 0 15px rgba(234, 88, 12, 0.8); 
            }
        }

        /* --- 4. FORM SLIDE UP --- */
        .form-enter {
            opacity: 0; transform: translateY(30px);
            animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 2.6s forwards;
        }
        @keyframes slideUp { to { opacity: 1; transform: translateY(0); } }

        /* --- UI COMPONENTS --- */
        .glass-panel {
            background: rgba(20, 20, 23, 0.85);
            backdrop-filter: blur(24px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9);
            width: 100%; max-width: 380px;
        }

        .input-dark {
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: white; transition: 0.3s;
        }
        .input-dark:focus {
            background: rgba(0, 0, 0, 0.9);
            border-color: #f97316; outline: none;
            box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.2);
        }

        .btn-primary {
            background: #ea580c; color: white; transition: all 0.3s;
            box-shadow: 0 0 20px rgba(234, 88, 12, 0.3);
        }
        .btn-primary:hover {
            background: #c2410c; transform: translateY(-2px);
            box-shadow: 0 0 30px rgba(234, 88, 12, 0.5);
        }

        .fade-out-active {
            animation: fadeToBlack 0.8s forwards !important; pointer-events: none;
        }
        @keyframes fadeToBlack { to { opacity: 0; filter: blur(10px); } }
        
        /* Particles */
        .chem-glow {
            position: absolute; color: rgba(234, 88, 12, 0.05);
            font-weight: 900; z-index: 0; animation: float 14s infinite ease-in-out;
        }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }
      </style>
  </head>
  <body>
      <div class="fixed inset-0 pointer-events-none overflow-hidden bg-[#09090b]">
          <div class="chem-glow text-8xl top-10 left-10">C₆H₆</div>
          <div class="chem-glow text-[10rem] bottom-[-20px] right-[-20px] opacity-[0.03]">⬡</div>
          <div class="absolute inset-0 opacity-[0.05]" style="background-image: radial-gradient(#fff 1px, transparent 1px); background-size: 40px 40px;"></div>
      </div>

      <div id="root" class="relative z-50 w-full min-h-screen"></div>

      <script type="text/babel">
          const { useState, useEffect } = React;

          // KOMPONEN: TEKS MENGETIK
          const TypingText = ({ text, startDelay, className, speed = 0.05 }) => {
            return (
                <div className={className}>
                    {text.split('').map((char, i) => (
                        <span 
                            key={i} 
                            className="char-reveal" 
                            style={{ 
                                animationDelay: (startDelay + (i * speed)) + 's' 
                            }}
                        >
                            {char === ' ' ? '\u00A0' : char}
                        </span>
                    ))}
                </div>
            );
          };
  
          function LoginView() {
              const [form, setForm] = useState({ username: '', password: '' });
              const [error, setError] = useState('');
              const [loading, setLoading] = useState(false);

              useEffect(() => { localStorage.clear(); }, []);
  
              const handleSubmit = async (e) => {
                  e.preventDefault();
                  setError(''); setLoading(true);
                  try {
                      const res = await fetch('/api/login', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(form)
                      });
                      const data = await res.json();
                      if (res.ok && data.success) {
                          if (data.csrfToken) localStorage.setItem('csrf_token', data.csrfToken);
                          localStorage.setItem('user', JSON.stringify(data.user));
                          localStorage.setItem('school', JSON.stringify(data.school));
                          localStorage.setItem('activePeriod', JSON.stringify(data.activePeriod));
                          document.body.classList.add('fade-out-active');
                          setTimeout(() => { window.location.href = '/dashboard'; }, 800);
                      } else { setError(data.error || 'Login gagal'); setLoading(false); }
                  } catch (err) { setError('Koneksi error'); setLoading(false); }
              };
  
              return (
                  <div className="flex flex-col items-center justify-center min-h-screen w-full relative">
                      
                      {/* --- LAYER 1: HEXAGON ANIMATION --- */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                          <svg className="benzene-svg" viewBox="0 0 100 100">
                              <path className="hex-path" d="M50 5 L90 27.5 L90 72.5 L50 95 L10 72.5 L10 27.5 Z" />
                          </svg>
                      </div>

                      {/* --- LAYER 2: CONTENT --- */}
                      <div className="relative z-10 flex flex-col items-center w-full max-w-md px-4">
                          
                          {/* HEADER AREA */}
                          <div className="text-center mb-8 h-32 flex flex-col items-center justify-end">
                              <img 
                                  src="https://iili.io/f4HrxUX.png" 
                                  alt="Logo" 
                                  className="logo-enter w-24 h-24 object-contain drop-shadow-[0_0_25px_rgba(234,88,12,0.6)] mb-3" 
                              />
                              
                              <TypingText 
                                  text="AlkeMia" 
                                  startDelay={1.8} 
                                  className="text-4xl font-black text-white tracking-tight"
                              />

                              <TypingText 
                                  text="Akselerasi Literasi Kelas Kimia" 
                                  startDelay={2.2} 
                                  speed={0.03}
                                  className="text-orange-500 text-[10px] font-bold tracking-[0.3em] uppercase mt-1"
                              />
                          </div>

                          {/* FORM */}
                          <div className="glass-panel rounded-2xl p-8 form-enter">
                              {error && (
                                  <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded text-center animate-pulse">
                                      {error}
                                  </div>
                              )}

                              <form onSubmit={handleSubmit} className="space-y-5">
                                  <div>
                                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">ID Guru</label>
                                      <input 
                                          type="text" 
                                          className="w-full mt-1 px-4 py-3.5 rounded-lg input-dark text-sm font-medium placeholder-zinc-600 focus:text-white"
                                          placeholder="Username"
                                          value={form.username} 
                                          onChange={e => setForm({...form, username: e.target.value})} 
                                          required 
                                      />
                                  </div>

                                  <div>
                                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">KATA SANDI</label>
                                      <input 
                                          type="password" 
                                          className="w-full mt-1 px-4 py-3.5 rounded-lg input-dark text-sm font-medium placeholder-zinc-600 focus:text-white"
                                          placeholder="••••••••"
                                          value={form.password} 
                                          onChange={e => setForm({...form, password: e.target.value})} 
                                          required 
                                      />
                              </div>

                                  <button 
                                      disabled={loading} 
                                      className="w-full py-4 btn-primary rounded-lg font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed tracking-wider mt-2"
                                  >
                                      {loading ? 'AUTHENTICATING...' : 'ENTER SYSTEM'}
                                  </button>
                              </form>
                          </div>
                          
                          <div className="mt-8 text-center form-enter" style={{animationDelay: '2.8s'}}>
                              <p className="text-[10px] text-zinc-600">© 2026 AlkeMia Learning System</p>
                          </div>
                      </div>

                  </div>
              );
          }
  
          const root = ReactDOM.createRoot(document.getElementById('root'));
          root.render(<LoginView />);
      </script>
  </body>
  </html>`;
}