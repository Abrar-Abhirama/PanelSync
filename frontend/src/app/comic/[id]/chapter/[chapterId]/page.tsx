'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { useAuth } from '../../../../contexts/AuthContext';
import Cookies from 'js-cookie';

export default function ChapterReadingPage() {
  const params = useParams();
  const [chapter, setChapter] = useState<any>(null);
  const [allChapters, setAllChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChapterList, setShowChapterList] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const { user, token, isLoading: isAuthLoading, openLoginModal } = useAuth();
  const [showPaywall, setShowPaywall] = useState(false);

  // Paywall Logic & Tracking Progress
  useEffect(() => {
    if (isAuthLoading) return;
    
    if (!user) {
      const hasRead = Cookies.get('free_chapter_read');
      if (hasRead) {
        setShowPaywall(true);
      } else {
        Cookies.set('free_chapter_read', 'true', { expires: 30 }); // Allow 1 free chapter
      }
    } else {
      setShowPaywall(false);
      
      // TRACK PROGRESS IN BACKGROUND
      if (token && params.id && params.chapterId) {
        fetch(`http://localhost:5000/api/user/read/${params.id}/${params.chapterId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }).catch(err => console.error('Failed to track progress:', err));
      }
    }
  }, [user, token, isAuthLoading, params.id, params.chapterId]);

  useEffect(() => {
    if (!params.chapterId) return;
    // Fetch the specific chapter and all its pages from the backend
    fetch(`http://localhost:5000/api/comics/chapters/${params.chapterId}`)
      .then((res) => res.json())
      .then((data) => {
        setChapter(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch chapter', err);
        setLoading(false);
      });

    // Fetch the full comic to get the list of all chapters for our popup
    fetch(`http://localhost:5000/api/comics/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.chapters) {
          setAllChapters(data.chapters);
        }
      });
  }, [params.chapterId, params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-xl animate-pulse">Loading pages...</p>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold mb-4">Chapter not found</h1>
        <Link href={`/comic/${params.id}`} className="text-purple-400 hover:text-purple-300">
          ← Back to Comic
        </Link>
      </div>
    );
  }

  return (
    <main 
      className="min-h-screen bg-[#050505] text-white selection:bg-emerald-500/30 cursor-pointer"
      onClick={() => setShowUI(!showUI)}
    >
      {/* Comic Pages Container */}
      <div className="pt-24 pb-24 flex flex-col items-center w-full md:max-w-[720px] mx-auto bg-black shadow-2xl min-h-screen">
        {chapter.pages && chapter.pages.length > 0 ? (
          chapter.pages.map((page: any) => (
            <div key={page.id} className="w-full relative mb-1 bg-gray-900 min-h-[400px] flex items-center justify-center">
              {/* Fallback text while image loads */}
              <span className="absolute text-gray-700 text-sm">Page {page.pageNumber}</span>
              
              {/* The Actual Comic Page Image */}
              <img 
                src={`http://localhost:5000/api/proxy?url=${encodeURIComponent(page.imageUrl)}`} 
                alt={`Page ${page.pageNumber}`}
                className="w-full h-auto relative z-10"
                loading="lazy" // Helps performance by only loading images as you scroll to them
              />
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center mt-32 text-center p-6 bg-[#0a0a0c] border border-white/5 rounded-2xl max-w-md mx-auto relative z-20" onClick={(e) => e.stopPropagation()}>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mb-6 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
            <h2 className="text-2xl font-bold text-white mb-3">Summoning Pages...</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              The background worker is currently extracting the image pages for this chapter directly from the source.
            </p>
            <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-500/20">
              Refresh the page in a few seconds!
            </p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div 
        className={`fixed bottom-0 w-full bg-[#0a0a0c]/80 backdrop-blur-xl p-4 border-t border-white/5 flex justify-center z-50 transition-transform duration-300 ${
          showUI ? 'translate-y-0' : 'translate-y-full'
        }`}
        onClick={(e) => e.stopPropagation()} // Prevent closing when interacting with buttons
      >
        <div className="flex items-center gap-4 w-full md:max-w-[720px] justify-between">
          {/* Previous Chapter */}
          {chapter.prevChapterId ? (
            <Link 
              href={`/comic/${params.id}/chapter/${chapter.prevChapterId}`}
              className="flex-1 max-w-[140px] flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Prev
            </Link>
          ) : (
            <div className="flex-1 max-w-[140px] flex items-center justify-center gap-2 py-2.5 bg-white/5 opacity-50 rounded-lg text-sm font-medium cursor-not-allowed text-gray-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Prev
            </div>
          )}

          {/* Chapter List Popup Trigger */}
          <button 
            onClick={() => setShowChapterList(true)}
            className="text-gray-300 hover:text-emerald-400 font-bold transition-colors text-sm flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg flex-1 mx-2 truncate"
            title={chapter.title || `Chapter ${chapter.chapterNumber}`}
          >
            <span className="truncate">{chapter.title || `Chapter ${chapter.chapterNumber}`}</span>
            <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>

          {/* Next Chapter */}
          {chapter.nextChapterId ? (
            <Link 
              href={`/comic/${params.id}/chapter/${chapter.nextChapterId}`}
              className="flex-1 max-w-[140px] flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] text-white rounded-lg text-sm font-medium transition-all"
            >
              Next
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
          ) : (
            <div className="flex-1 max-w-[140px] flex items-center justify-center gap-2 py-2.5 bg-white/5 opacity-50 rounded-lg text-sm font-medium cursor-not-allowed text-gray-500">
              Next
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </div>
          )}
        </div>
      </div>

      {/* Chapter List Modal */}
      {showChapterList && (
        <div 
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex justify-center items-end sm:items-center p-4 cursor-default"
          onClick={(e) => {
            e.stopPropagation();
            setShowChapterList(false); // Close if clicking backdrop
          }}
        >
          <div 
            className="bg-[#0a0a0c] border border-white/10 w-full max-w-md max-h-[70vh] rounded-2xl flex flex-col shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:fade-in duration-300"
            onClick={(e) => e.stopPropagation()} // Prevent close if clicking inside modal
          >
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3 className="font-bold text-lg text-emerald-400">Chapters</h3>
              <button onClick={() => setShowChapterList(false)} className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="overflow-y-auto p-3 flex flex-col gap-2">
              {allChapters.map((chap) => {
                const isActive = chap.id === chapter.id;
                return (
                  <Link 
                    key={chap.id}
                    href={`/comic/${params.id}/chapter/${chap.id}`} 
                    onClick={() => setShowChapterList(false)} 
                    className={`p-4 rounded-xl transition-all flex justify-between items-center ${
                      isActive 
                        ? 'bg-emerald-500/20 border border-emerald-500/30' 
                        : 'bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10'
                    }`}
                  >
                    <span className={`font-medium ${isActive ? 'text-emerald-400' : 'text-gray-300'}`}>
                      {chap.title || `Chapter ${chap.chapterNumber}`}
                    </span>
                    {isActive && <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Paywall Overlay */}
      {showPaywall && (
        <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center p-4 bg-[#0a0a0c]/90 backdrop-blur-xl">
          <div className="text-center max-w-md">
            <div className="bg-emerald-500/20 text-emerald-400 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-6">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h2 className="text-3xl font-black text-white mb-4">
              Unlock Unlimited Reading
            </h2>
            <p className="text-gray-400 mb-8 leading-relaxed">
              You've enjoyed your free chapter! To continue reading and to bookmark your favorite comics, please log in.
            </p>
            <button 
              onClick={openLoginModal}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] w-full"
            >
              Log In
            </button>
            <Link href="/" className="block mt-6 text-gray-500 hover:text-white transition-colors">
              Return to Library
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
