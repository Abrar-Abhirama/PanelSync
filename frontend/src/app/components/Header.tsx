'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '../contexts/AuthContext';

export default function Header() {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { user, logout, openLoginModal } = useAuth();
  const router = useRouter();

  // Instant Live Search with Debounce
  useEffect(() => {
    if (!isTyping) return;
    
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`);
      } else {
        router.push(`/`);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, isTyping, router]);

  useEffect(() => {
    const controlNavbar = () => {
      if (typeof window !== 'undefined') {
        if (window.scrollY > lastScrollY && window.scrollY > 50) {
          // Scrolling down
          setIsVisible(false);
        } else {
          // Scrolling up
          setIsVisible(true);
        }
        setLastScrollY(window.scrollY);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', controlNavbar);
      return () => window.removeEventListener('scroll', controlNavbar);
    }
  }, [lastScrollY]);

  return (
    <header 
      className={`fixed top-0 left-0 w-full z-[100] bg-[#0a0a0c]/80 backdrop-blur-xl border-b border-white/5 transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500">
          PanelSync.
        </Link>
        
        <div className="flex items-center gap-8">
          <div className="relative flex items-center gap-2 hidden md:flex">
            {/* Filter Dropdown */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="bg-white/5 border border-white/10 hover:border-emerald-500/50 hover:text-emerald-400 text-gray-300 rounded-full px-4 py-2 text-sm font-bold transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                Filter
              </button>
              
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)}></div>
                  <div className="absolute top-full left-0 mt-2 w-48 bg-[#0a0a0c]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-2 z-50">
                    <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-white/5 mb-1">
                      Genres
                    </div>
                    {['Action', 'Fantasy', 'Adventure', 'Regression', 'Reincarnation', 'System', 'Martial Arts'].map(genre => (
                      <button
                        key={genre}
                        onClick={() => {
                          setIsFilterOpen(false);
                          router.push(`/?genre=${encodeURIComponent(genre)}`);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors"
                      >
                        {genre}
                      </button>
                    ))}
                    <div className="border-t border-white/5 mt-1 pt-1">
                      <button
                        onClick={() => {
                          setIsFilterOpen(false);
                          router.push(`/`);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:text-white transition-colors"
                      >
                        Clear Filter
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <form onSubmit={(e) => e.preventDefault()} className="relative">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsTyping(true);
              }}
              placeholder="Search comics..." 
              className="bg-white/5 border border-white/10 rounded-full py-2 pl-4 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all w-64"
            />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-400 transition-colors pointer-events-none">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </button>
          </form>
          </div>

          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/" className="text-gray-300 hover:text-emerald-400 font-medium transition-colors">
              Library
            </Link>
            {user && (
              <>
                <Link href="/bookmarks" className="text-gray-300 hover:text-emerald-400 font-medium transition-colors">
                  Bookmarks
                </Link>
                <Link href="/history" className="text-gray-300 hover:text-emerald-400 font-medium transition-colors">
                  History
                </Link>
              </>
            )}
            {!user && (
              <button onClick={openLoginModal} className="text-gray-300 hover:text-emerald-400 transition-colors font-medium">
                Bookmarks
              </button>
            )}
            
            {user ? (
              <div className="flex items-center gap-4 ml-4 pl-4 border-l border-white/10">
                <span className="text-white font-bold">{user.username}</span>
                <button 
                  onClick={logout}
                  className="text-gray-500 hover:text-red-400 transition-colors text-xs uppercase tracking-wider font-bold"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button 
                onClick={openLoginModal}
                className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-500 hover:text-white px-4 py-1.5 rounded-full transition-colors border border-emerald-500/30 font-bold ml-4"
              >
                Login
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
