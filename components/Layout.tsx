
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../src/firebase';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  const [domoNome, setDomoNome] = React.useState(localStorage.getItem('domo_nome') || 'DOMO');
  const [domoCor, setDomoCor] = React.useState(localStorage.getItem('domo_cor') || '#085041');
  const [domoLogo, setDomoLogo] = React.useState(localStorage.getItem('domo_logo') || '');

  React.useEffect(() => {
    const handleUpdate = () => {
      setDomoNome(localStorage.getItem('domo_nome') || 'DOMO');
      setDomoCor(localStorage.getItem('domo_cor') || '#085041');
      setDomoLogo(localStorage.getItem('domo_logo') || '');
    };
    window.addEventListener('domoBrandingChanged', handleUpdate);
    return () => window.removeEventListener('domoBrandingChanged', handleUpdate);
  }, []);

  const navItems = [
    { path: '/', label: 'Painel', icon: '🐾' },
    { path: '/cadastro', label: 'Cadastro', icon: '📝' },
    { path: '/medicacao', label: 'Medicação', icon: '💊' },
    { path: '/hotel', label: 'Hotel', icon: '🏨' },
    { path: '/relatorios', label: 'Mensagens', icon: '💬' },
    { path: '/settings', label: 'Ajustes', icon: '⚙️' },
  ];

  const handleLogout = async () => {
    if (window.confirm('Deseja realmente sair do sistema?')) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error("Erro ao fazer logout:", err);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header 
        className="py-4 px-6 sticky top-0 z-40 transition-all border-b"
        style={{ 
          backgroundColor: domoCor + '0A', // Soft background with 4% opacity
          borderColor: domoCor + '1A' // Border with 10% opacity
        }}
      >
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2.5 group">
            {domoLogo ? (
              <img src={domoLogo} alt="Logo" className="w-9 h-9 object-contain rounded-lg" />
            ) : (
              <span className="text-3xl group-hover:rotate-12 transition-transform">🐶</span>
            )}
            <h1 
              className="text-2xl font-black tracking-tight transition-colors"
              style={{ color: domoCor }}
            >
              {domoNome}
            </h1>
          </Link>
          
          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden md:flex gap-6">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="flex items-center gap-1 font-extrabold text-[11px] uppercase tracking-wider transition-colors py-2 px-1"
                    style={{ 
                      color: isActive ? domoCor : '#64748b',
                      borderBottom: isActive ? `2.5px solid ${domoCor}` : '2.5px solid transparent'
                    }}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <Link 
              to="/grupos" 
              title="Gerenciar Grupos"
              className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-sm border-2 transition-all ${
                location.pathname === '/grupos' 
                  ? 'bg-sky-500 text-white border-sky-600 rotate-90' 
                  : 'bg-sky-50 text-sky-500 border-sky-100 hover:border-sky-300 hover:scale-110'
              }`}
            >
              +
            </Link>

            {auth.currentUser && (
              <button
                onClick={handleLogout}
                title="Sair do Sistema"
                className="w-10 h-10 bg-rose-50 text-rose-500 border-2 border-rose-100 hover:border-rose-300 hover:bg-rose-100 rounded-full flex items-center justify-center text-lg shadow-sm transition-all cursor-pointer active:scale-95"
              >
                🚪
              </button>
            )}
          </div>
        </div>
      </header>


      <main className="flex-grow max-w-4xl w-full mx-auto p-4 pb-8">
        {children}
      </main>

      <footer className="w-full py-6 text-center text-slate-400 text-[10px] uppercase tracking-widest font-bold border-t border-slate-100 bg-white pb-24 md:pb-6">
        <p>© {new Date().getFullYear()} DOMO. Todos os direitos reservados.</p>
      </footer>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-2 flex justify-around items-center z-50">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center p-2 rounded-xl transition-all"
              style={{
                backgroundColor: isActive ? domoCor + '12' : 'transparent',
                color: isActive ? domoCor : '#94a3b8'
              }}
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-[10px] font-black uppercase tracking-wider">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default Layout;
