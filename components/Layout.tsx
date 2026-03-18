
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Painel', icon: '🐾' },
    { path: '/cadastro', label: 'Cadastro', icon: '📝' },
    { path: '/medicacao', label: 'Medicação', icon: '💊' },
    { path: '/hotel', label: 'Hotel', icon: '🏨' },
    { path: '/relatorios', label: 'Mensagens', icon: '💬' },
    { path: '/settings', label: 'Ajustes', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-emerald-50 border-b border-emerald-100 py-4 px-6 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-3xl group-hover:rotate-12 transition-transform">🐶</span>
            <h1 className="text-2xl font-bold text-emerald-800 tracking-tight">Kahu Care</h1>
          </Link>
          
          <div className="flex items-center gap-2 md:gap-6">
            <div className="hidden md:flex gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1 font-semibold transition-colors ${
                    location.pathname === item.path ? 'text-emerald-600 underline decoration-2 underline-offset-4' : 'text-slate-500 hover:text-emerald-500'
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
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
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-4xl w-full mx-auto p-4 pb-8">
        {children}
      </main>

      <footer className="w-full py-6 text-center text-slate-400 text-[10px] uppercase tracking-widest font-bold border-t border-slate-100 bg-white pb-24 md:pb-6">
        <p>© {new Date().getFullYear()} Kahu Care. Todos os direitos reservados.</p>
      </footer>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-2 flex justify-around items-center z-50">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center p-2 rounded-xl transition-all ${
              location.pathname === item.path ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400'
            }`}
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="text-xs font-bold">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
