'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function ChapterReadingPage() {
  const params = useParams();
  const [chapter, setChapter] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
  }, [params.chapterId]);

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
    <main className="min-h-screen bg-black text-white">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 w-full bg-gray-900/90 backdrop-blur-sm p-4 z-50 flex justify-between items-center border-b border-gray-800">
        <Link href={`/comic/${params.id}`} className="text-gray-300 hover:text-purple-400 transition-colors flex items-center gap-2">
          <span>←</span> Back to Info
        </Link>
        <span className="font-semibold text-gray-200">
          {chapter.title || `Chapter ${chapter.chapterNumber}`}
        </span>
        <div className="w-20"></div> {/* Spacer to keep title centered */}
      </nav>

      {/* Comic Pages Container */}
      <div className="pt-20 pb-12 flex flex-col items-center max-w-3xl mx-auto">
        {chapter.pages && chapter.pages.length > 0 ? (
          chapter.pages.map((page: any) => (
            <div key={page.id} className="w-full relative mb-1 bg-gray-900 min-h-[400px] flex items-center justify-center">
              {/* Fallback text while image loads */}
              <span className="absolute text-gray-700 text-sm">Page {page.pageNumber}</span>
              
              {/* The Actual Comic Page Image */}
              <img 
                src={page.imageUrl} 
                alt={`Page ${page.pageNumber}`}
                className="w-full h-auto relative z-10"
                loading="lazy" // Helps performance by only loading images as you scroll to them
              />
            </div>
          ))
        ) : (
          <p className="text-gray-400 mt-20">No pages found in this chapter.</p>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 w-full bg-gray-900/90 backdrop-blur-sm p-4 border-t border-gray-800 flex justify-center">
        <Link 
          href={`/comic/${params.id}`}
          className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-full font-medium transition-colors"
        >
          Finish Reading
        </Link>
      </div>
    </main>
  );
}
