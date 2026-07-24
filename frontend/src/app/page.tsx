'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [comics, setComics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch data from our Node.js backend
    fetch('http://localhost:5000/api/comics')
      .then((res) => res.json())
      .then((data) => {
        setComics(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch comics', err);
        setLoading(false);
      });
  }, []);

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          PanelSync Reader
        </h1>

        {loading ? (
          <p className="text-xl text-gray-400 animate-pulse">Loading comics...</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {comics.map((comic: any) => (
              <Link 
                href={`/comic/${comic.id}`}
                key={comic.id} 
                className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-purple-500/20 hover:-translate-y-1 transition-all duration-300 cursor-pointer block"
              >
                {/* Comic Cover Image */}
                <div className="relative aspect-[2/3] w-full">
                  <img 
                    src={comic.coverUrl} 
                    alt={comic.title}
                    className="object-cover w-full h-full"
                  />
                </div>
                
                {/* Comic Info */}
                <div className="p-4">
                  <h2 className="font-semibold text-lg line-clamp-1">{comic.title}</h2>
                  <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                    {comic.description}
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
