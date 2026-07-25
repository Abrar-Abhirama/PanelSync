'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

export default function ComicDetail() {
  const params = useParams();
  const [comic, setComic] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [readingProgress, setReadingProgress] = useState<any>(null);
  const { user, token, openLoginModal } = useAuth();

  useEffect(() => {
    if (!params.id) return;
    
    fetch(`http://localhost:5000/api/comics/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setComic(data);
        setLoading(false);
        
        // GHOST SYNC: Check for new chapters in the background
        fetch(`http://localhost:5000/api/comics/${params.id}/sync`, { method: 'POST' })
          .then(res => res.json())
          .then(syncData => {
            if (syncData.updated && syncData.chapters) {
              // Update state with newly found chapters seamlessly!
              setComic((prev: any) => ({ ...prev, chapters: syncData.chapters }));
            }
          })
          .catch(err => console.error('Ghost sync failed:', err));
      })
      .catch((err) => {
        console.error('Failed to fetch comic', err);
        setLoading(false);
      });

    // Check if bookmarked
    if (user && token) {
      fetch(`http://localhost:5000/api/bookmarks/check/${params.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => setIsBookmarked(data.bookmarked))
      .catch(console.error);

      // Check reading progress
      fetch(`http://localhost:5000/api/user/progress/${params.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data && data.chapter) {
          setReadingProgress(data);
        }
      })
      .catch(console.error);

    } else {
      setIsBookmarked(false);
      setReadingProgress(null);
    }
  }, [params.id, user, token]);

  const toggleBookmark = async () => {
    if (!user || !token) {
      openLoginModal();
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/bookmarks/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ comicId: params.id })
      });
      const data = await res.json();
      setIsBookmarked(data.bookmarked);
    } catch (err) {
      console.error('Failed to toggle bookmark', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!comic) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] text-white flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold mb-4">Comic not found</h1>
        <Link href="/" className="text-emerald-400 hover:text-emerald-300">
          ← Back to Library
        </Link>
      </div>
    );
  }

  const firstChapterId = comic.chapters?.length > 0 ? comic.chapters[comic.chapters.length - 1].id : null;

  return (
    <main className="min-h-screen bg-[#0a0a0c] text-white selection:bg-emerald-500/30 relative z-0">
      
      {/* Blurred Background Banner */}
      <div className="absolute top-0 left-0 w-full h-[60vh] overflow-hidden -z-10 pointer-events-none">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20 blur-[100px] scale-150"
          style={{ backgroundImage: `url(${comic.coverUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/80 to-transparent" />
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-28 pb-24">
        
        {/* Main Details Section */}
        <div className="flex flex-col md:flex-row gap-10 bg-[#0a0a0c]/60 backdrop-blur-xl border border-white/10 p-6 md:p-10 rounded-2xl shadow-2xl mb-12">
          
          {/* Cover Image */}
          <div className="w-full md:w-[280px] shrink-0">
            <div className="aspect-[2/3] relative rounded-xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)] ring-1 ring-white/20">
              <img 
                src={comic.coverUrl} 
                alt={comic.title}
                className="object-cover w-full h-full"
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col flex-1 pt-2">
            <h1 className="text-4xl md:text-5xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500 leading-tight pb-1">
              {comic.title}
            </h1>
            
            <div className="flex flex-wrap gap-4 mb-4">
              <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border flex items-center gap-2 ${
                comic.sourceName === 'MangaDex' 
                  ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' 
                  : 'bg-red-500/10 text-red-400 border-red-500/30'
              }`}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {comic.sourceName || 'AsuraScans'}
              </span>

              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                {comic.chapters?.length || 0} Chapters
              </span>
              {comic.rating && (
                <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  {comic.rating}
                </span>
              )}
              {comic.releaseDate && (
                <span className="bg-white/5 text-gray-300 border border-white/10 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                  {comic.releaseDate}
                </span>
              )}
            </div>



            {comic.author && (
              <p className="text-emerald-400 font-medium mb-4 text-sm tracking-wide">
                By {comic.author}
              </p>
            )}

            <p className="text-gray-300 mb-8 leading-relaxed text-lg line-clamp-6">
              {comic.description}
            </p>

            {/* Genres */}
            {comic.genres && comic.genres.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {comic.genres.map((genre: string) => (
                    <span 
                      key={genre}
                      className="bg-white/5 border border-white/10 text-gray-300 px-3 py-1 rounded-full text-xs font-semibold hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/50 transition-colors cursor-default"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-auto pt-6">
              {/* Action Buttons */}
              <div className="flex gap-4">
                {comic.chapters && comic.chapters.length > 0 && (
                  <Link 
                    href={readingProgress ? `/comic/${comic.id}/chapter/${readingProgress.chapterId}` : `/comic/${comic.id}/chapter/${firstChapterId}`}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex justify-center items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    {readingProgress ? `Continue Reading...` : `Start Reading`}
                  </Link>
                )}

                <button 
                  onClick={toggleBookmark}
                  className={`flex-1 font-bold py-3.5 px-6 rounded-xl transition-all flex justify-center items-center gap-2 border ${
                    isBookmarked 
                      ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
                      : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                  }`}
                >
                  <svg className={`w-5 h-5 ${isBookmarked ? 'fill-emerald-400' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                  {isBookmarked ? 'Bookmarked' : 'Add Bookmark'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Chapters Section */}
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <span className="w-2 h-8 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
          Chapter List
        </h2>
        
        {comic.chapters && comic.chapters.length > 0 ? (
          <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {comic.chapters.map((chapter: any) => (
                <Link 
                  key={chapter.id} 
                  href={`/comic/${comic.id}/chapter/${chapter.id}`}
                  className="group bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500/30 p-4 rounded-xl transition-all flex justify-between items-center hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-0.5"
                >
                  <span className="font-medium text-gray-300 group-hover:text-emerald-400 transition-colors">
                    {chapter.title || `Chapter ${chapter.chapterNumber}`}
                  </span>
                  <span className="text-xs font-semibold text-gray-500 group-hover:text-emerald-500 transition-colors uppercase tracking-wider">
                    Read
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 p-8 rounded-xl text-center">
            <p className="text-gray-400 italic">No chapters available yet.</p>
          </div>
        )}
      </div>
    </main>
  );
}
