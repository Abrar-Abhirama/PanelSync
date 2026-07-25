'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthLoading) return;
    
    if (!user) {
      router.push('/');
      return;
    }

    if (token) {
      fetch('http://localhost:5000/api/user/recent?limit=100', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        setHistory(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
    }
  }, [user, token, isAuthLoading, router]);

  if (isAuthLoading || loading) {
    return (
      <main className="min-h-screen pt-24 pb-12">
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header Section */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white mb-2 flex items-center gap-3">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Reading History
            </h1>
            <p className="text-gray-400 text-sm">Pick up right where you left off.</p>
          </div>
        </div>

        {/* Empty State */}
        {history.length === 0 ? (
          <div className="text-center py-20 border border-white/5 rounded-2xl bg-white/5">
            <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <h2 className="text-xl font-bold text-white mb-2">No history yet</h2>
            <p className="text-gray-500 text-sm mb-6">Start reading some comics to see your progress here!</p>
            <Link href="/" className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-500 hover:text-white px-6 py-2.5 rounded-full transition-colors border border-emerald-500/30 font-bold inline-block">
              Browse Library
            </Link>
          </div>
        ) : (
          /* Grid of History Items */
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 gap-y-10">
            {history.map((progress: any, index: number) => (
              <Link 
                href={`/comic/${progress.comic.id}/chapter/${progress.chapter.id}`}
                key={progress.comic.id} 
                className="group flex flex-col gap-3 h-full"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Comic Cover */}
                <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 transition-all duration-300 group-hover:ring-emerald-500/50 group-hover:shadow-emerald-500/20 group-hover:-translate-y-2">
                  <img 
                    src={progress.comic.coverUrl} 
                    alt={progress.comic.title}
                    className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                  />
                  
                  {/* Rating Badge */}
                  {progress.comic.rating && (
                    <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-1 border border-white/10 z-10">
                      <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                      <span className="text-white text-xs font-bold">{progress.comic.rating}</span>
                    </div>
                  )}

                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/50 to-transparent p-3 pt-12 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded shadow-lg">
                      Resume
                    </span>
                  </div>
                </div>
                
                {/* Comic Info */}
                <div className="flex flex-col gap-1 px-1 flex-1">
                  <h2 className="font-bold text-base leading-tight line-clamp-2 text-gray-100 group-hover:text-emerald-400 transition-colors min-h-[2.5rem]">
                    {progress.comic.title}
                  </h2>
                  <div className="flex justify-between items-center mt-auto">
                    <p className="text-emerald-500 text-sm font-bold line-clamp-1">
                      {progress.chapter.title || `Chapter ${progress.chapter.chapterNumber}`}
                    </p>
                  </div>
                  <p className="text-gray-500 text-xs line-clamp-1">
                    {new Date(progress.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
