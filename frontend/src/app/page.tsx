'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from './contexts/AuthContext';


function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, token, openLoginModal } = useAuth();
  
  const currentPage = parseInt(searchParams.get('page') || '1');
  const searchQuery = searchParams.get('q') || '';
  const selectedGenre = searchParams.get('genre') || '';
  const selectedSource = searchParams.get('source') || '';

  const [comics, setComics] = useState([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
  const [recentReads, setRecentReads] = useState<any[]>([]);

  // Fetch comics
  useEffect(() => {
    setLoading(true);
    let url = `/api/comics?page=${currentPage}&limit=20&q=${encodeURIComponent(searchQuery)}`;
    if (selectedGenre) {
      url += `&genre=${encodeURIComponent(selectedGenre)}`;
    }
    if (selectedSource) {
      url += `&source=${encodeURIComponent(selectedSource)}`;
    }
    
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setComics(data.data || []);
        setMeta(data.meta || null);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch comics', err);
        setLoading(false);
      });
  }, [currentPage, searchQuery, selectedGenre, selectedSource]);

  // Fetch user's bookmarks
  useEffect(() => {
    if (user && token) {
      // Fetch bookmarks
      fetch('/api/bookmarks', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        const ids = new Set<number>(data.map((c: any) => c.id));
        setBookmarkedIds(ids);
      })
      .catch(console.error);

      // Fetch recent reads (Limit 15 for scrollable row)
      fetch('/api/user/recent?limit=15', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        setRecentReads(data);
      })
      .catch(console.error);
    } else {
      setBookmarkedIds(new Set());
      setRecentReads([]);
    }
  }, [user, token]);

  const toggleBookmark = async (e: React.MouseEvent, comicId: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || !token) {
      openLoginModal();
      return;
    }

    try {
      const res = await fetch('/api/bookmarks/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ comicId })
      });
      const data = await res.json();
      
      setBookmarkedIds(prev => {
        const newSet = new Set(prev);
        if (data.bookmarked) {
          newSet.add(comicId);
        } else {
          newSet.delete(comicId);
        }
        return newSet;
      });
    } catch (err) {
      console.error('Failed to toggle bookmark', err);
    }
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`/?${params.toString()}`);
  };

  const getPageNumbers = () => {
    if (!meta) return [];
    const total = meta.totalPages;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', total];
    } else if (currentPage >= total - 3) {
      return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    } else {
      return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', total];
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      
      {/* RECENT READS SECTION */}
      {user && recentReads.length > 0 && !searchQuery && (
        <div className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <h2 className="text-2xl font-bold text-white">Continue Reading</h2>
            </div>
            <Link href="/history" className="text-emerald-400 hover:text-emerald-300 text-sm font-bold flex items-center gap-1 transition-colors">
              View All <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
          </div>
          <div className="flex overflow-x-auto gap-6 pb-6 snap-x custom-scrollbar-x">
            {recentReads.map((progress: any) => (
              <Link 
                href={`/comic/${progress.comic.id}/chapter/${progress.chapter.id}`}
                key={progress.comic.id}
                className="snap-start shrink-0 w-[300px] group flex gap-4 bg-white/5 border border-white/5 hover:border-emerald-500/30 hover:bg-white/10 rounded-xl p-3 transition-all hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1 items-center"
              >
                <div className="w-16 h-20 shrink-0 rounded-lg overflow-hidden shadow-lg">
                  <img src={`/api/proxy?url=${encodeURIComponent(progress.comic.coverUrl)}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="font-bold text-white text-sm truncate group-hover:text-emerald-400 transition-colors">
                    {progress.comic.title}
                  </h3>
                  <p className="text-emerald-500 text-xs font-semibold mt-1 truncate">
                    {progress.chapter.title || `Chapter ${progress.chapter.chapterNumber}`}
                  </p>
                  <p className="text-gray-500 text-xs mt-1 truncate">
                    {new Date(progress.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* LATEST UPDATES / SEARCH RESULTS */}
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">
            {searchQuery 
              ? `Search Results for "${searchQuery}"` 
              : selectedGenre 
                ? `${selectedGenre} Comics` 
                : "Latest Updates"}
          </h2>
          <p className="text-gray-400 text-sm">
            {searchQuery 
              ? `Found ${meta?.total || 0} comics matching your search.` 
              : selectedGenre
                ? `Found ${meta?.total || 0} ${selectedGenre.toLowerCase()} comics.`
                : "Read the newest chapters from your favorite series."}
          </p>
        </div>

        {/* SOURCE FILTER */}
        <div>
          <select
            className="bg-[#1a1a24] border border-white/10 text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 outline-none appearance-none pr-8 cursor-pointer shadow-lg hover:border-emerald-500/50 transition-colors"
            value={selectedSource}
            onChange={(e) => {
              const val = e.target.value;
              const params = new URLSearchParams(searchParams.toString());
              if (val) {
                params.set('source', val);
              } else {
                params.delete('source');
              }
              params.set('page', '1'); // reset page
              router.push(`/?${params.toString()}`);
            }}
            style={{
              backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.5rem center',
              backgroundSize: '1em 1em'
            }}
          >
            <option value="">Select Source: All</option>
            <option value="Asura Scans">Asura Scans</option>
            <option value="MangaDex">MangaDex</option>
          </select>
        </div>
      </div>



      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
        </div>
      ) : comics.length > 0 ? (
        <>
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

                  {/* Source Badge */}
                  <div className={`absolute top-2 left-2 backdrop-blur-md px-2 py-1 rounded border shadow-lg z-10 text-[10px] font-bold tracking-wider uppercase ${
                    comic.sourceName === 'MangaDex' 
                      ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' 
                      : 'bg-red-500/20 border-red-500/50 text-red-400'
                  }`}>
                    {comic.sourceName || 'AsuraScans'}
                  </div>

                  {/* Bookmark Badge (Persistent if bookmarked) */}
                  {bookmarkedIds.has(comic.id) && (
                    <div className="absolute top-0 right-4 w-6 h-8 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] z-10" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)' }}></div>
                  )}
                  
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
                      Read Now
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
                      {comic._count?.chapters ? `${comic._count.chapters} Chapters` : 'Tap to fetch chapters'}
                    </p>
                    <button 
                      onClick={(e) => toggleBookmark(e, comic.id)}
                      className="p-1.5 rounded-md hover:bg-white/10 transition-colors z-20"
                      title={bookmarkedIds.has(comic.id) ? "Remove Bookmark" : "Add Bookmark"}
                    >
                      <svg className={`w-5 h-5 ${bookmarkedIds.has(comic.id) ? 'text-emerald-400 fill-emerald-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination Controls */}
          {meta && meta.totalPages > 1 && (
            <div className="flex justify-center items-center gap-6 mt-16">
              <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="cursor-pointer px-6 py-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors border border-white/10 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Previous
              </button>
              
              <div className="flex items-center gap-2">
                {getPageNumbers().map((pageNum, idx) => (
                  pageNum === '...' ? (
                    <span key={`ellipsis-${idx}`} className="text-gray-500 px-2">...</span>
                  ) : (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum as number)}
                      className={`cursor-pointer w-10 h-10 rounded-xl font-medium transition-all flex items-center justify-center ${
                        currentPage === pageNum 
                          ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                ))}
              </div>

              <button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === meta.totalPages}
                className="cursor-pointer px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium shadow-[0_0_15px_rgba(16,185,129,0.3)] rounded-xl transition-all flex items-center gap-2"
              >
                Next
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
          <p className="text-gray-400 text-lg mb-2">No comics found.</p>
          <p className="text-gray-500 text-sm">Try searching for a different title.</p>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0c] text-white selection:bg-emerald-500/30 pt-20">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
        </div>
      }>
        <HomeContent />
      </Suspense>
    </main>
  );
}
