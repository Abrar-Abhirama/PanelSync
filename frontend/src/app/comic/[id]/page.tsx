'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function ComicDetail() {
  const params = useParams();
  const [comic, setComic] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    
    fetch(`http://localhost:5000/api/comics/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setComic(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch comic', err);
        setLoading(false);
      });
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
        <p className="text-xl animate-pulse">Loading comic...</p>
      </div>
    );
  }

  if (!comic) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold mb-4">Comic not found</h1>
        <Link href="/" className="text-purple-400 hover:text-purple-300">
          ← Back to Library
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-purple-400 hover:text-purple-300 mb-8 inline-block">
          ← Back to Library
        </Link>

        <div className="flex flex-col md:flex-row gap-8 bg-gray-800 p-6 rounded-xl shadow-lg">
          {/* Cover Image */}
          <div className="w-full md:w-1/3 flex-shrink-0">
            <div className="aspect-[2/3] relative rounded-lg overflow-hidden shadow-md">
              <img 
                src={comic.coverUrl} 
                alt={comic.title}
                className="object-cover w-full h-full"
              />
            </div>
          </div>

          {/* Comic Details */}
          <div className="w-full md:w-2/3 flex flex-col">
            <h1 className="text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
              {comic.title}
            </h1>
            <p className="text-gray-300 mb-8 leading-relaxed">
              {comic.description}
            </p>

            <h2 className="text-2xl font-semibold mb-4">Chapters</h2>
            
            {comic.chapters && comic.chapters.length > 0 ? (
              <div className="flex flex-col gap-3">
                {comic.chapters.map((chapter: any) => (
                  <Link 
                    key={chapter.id} 
                    href={`/comic/${comic.id}/chapter/${chapter.id}`}
                    className="bg-gray-700 hover:bg-gray-600 p-4 rounded-lg transition-colors flex justify-between items-center group"
                  >
                    <span className="font-medium group-hover:text-purple-400 transition-colors">
                      {chapter.title || `Chapter ${chapter.chapterNumber}`}
                    </span>
                    <span className="text-purple-400">Read →</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 italic">No chapters available yet.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
