'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';

export default function BookmarksPage() {
  const [comics, setComics] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, token, isLoading: isAuthLoading, openLoginModal } = useAuth();

  useEffect(() => {
    if (isAuthLoading) return;

    if (!user || !token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/bookmarks`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then((res) => res.json())
      .then((data) => {
        setComics(data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch bookmarks', err);
        setLoading(false);
      });
  }, [user, token, isAuthLoading]);

  const toggleBookmark = async (e: React.MouseEvent, comicId: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || !token) return;

    try {
      const res = await fetch('/api/bookmarks/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ comicId })
      });
      
      // Since this is the bookmarks page, toggling it should remove it from the list immediately
      setComics(prev => prev.filter((c: any) => c.id !== comicId));
    } catch (err) {
      console.error('Failed to toggle bookmark', err);
    }
  };

  if (!isAuthLoading && !user) {
    return (
      <main className="min-h-screen bg-[#0a0a0c] text-white pt-32 pb-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="bg-emerald-500/20 text-emerald-400 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-6">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
          </div>
          <h2 className="text-3xl font-bold mb-4">Log in to view bookmarks</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            You need to be logged into your account to save and view your favorite comics.
          </p>
          <button 
            onClick={openLoginModal}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
          >
            Log In Now
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0c] text-white pt-24 pb-12 selection:bg-emerald-500/30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-10 flex items-center gap-3">
          <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
          <h2 className="text-3xl font-bold text-white">
            My Bookmarks
          </h2>
        </div>

        {loading || isAuthLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        ) : comics.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 gap-y-10">
            {comics.map((comic: any, index: number) => (
              <Link 
                href={`/comic/${comic.id}`}
                key={comic.id} 
                className="group flex flex-col gap-3 h-full"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Comic Cover with Glassmorphism Overlay */}
                <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 transition-all duration-300 group-hover:ring-emerald-500/50 group-hover:shadow-emerald-500/20 group-hover:-translate-y-2">
                  <img 
                    src={`/api/proxy?url=${encodeURIComponent(comic.coverUrl)}`}
                    alt={comic.title}
                    className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                  />
                  
                  {/* Rating Badge */}
                  {comic.rating && (
                    <div className="absolute top-2 right-2 bg-[#0a0a0c]/70 backdrop-blur-md px-1.5 py-0.5 rounded border border-yellow-500/30 flex items-center gap-1 shadow-lg z-10">
                      <svg className="w-2.5 h-2.5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                      <span className="text-[10px] font-bold text-yellow-400 leading-none">{comic.rating}</span>
                    </div>
                  )}
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-emerald-500/30">
                      Continue Reading
                    </span>
                  </div>
                </div>
                
                {/* Comic Info */}
                <div className="flex flex-col gap-1 px-1 flex-1">
                  <h2 className="font-bold text-base leading-tight line-clamp-2 text-gray-100 group-hover:text-emerald-400 transition-colors min-h-[2.5rem]">
                    {comic.title}
                  </h2>
                  <div className="flex justify-between items-center mt-auto">
                    <p className="text-sm text-gray-400 font-medium line-clamp-1">
                      {comic._count?.chapters ? `${comic._count.chapters} Chapters` : 'Updated recently'}
                    </p>
                    <button 
                      onClick={(e) => toggleBookmark(e, comic.id)}
                      className="p-1.5 rounded-md hover:bg-white/10 transition-colors z-20"
                      title="Remove Bookmark"
                    >
                      <svg className="w-5 h-5 text-emerald-400 fill-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10 mt-10">
            <div className="bg-white/5 w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            </div>
            <p className="text-gray-400 text-lg mb-2">You haven't bookmarked any comics yet.</p>
            <p className="text-gray-500 text-sm mb-6">Go to the library and add some to your collection!</p>
            <Link href="/" className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-500 hover:text-white px-6 py-2.5 rounded-full transition-colors border border-emerald-500/30 font-bold inline-block">
              Browse Library
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
