import React from 'react';

interface NewsItem {
  id: string;
  title: string;
  description?: string;
  url: string;
  source: string;
  publishedAt: string;
  imageUrl?: string;
  category?: string;
  isDemo?: boolean;
}

interface WorldFeedProps {
  newsItem: NewsItem | null;
  isWatching: boolean;
}

const WorldFeed: React.FC<WorldFeedProps> = ({ newsItem, isWatching }) => {
  return (
    <div className="w-full h-full bg-black/80 border border-gray-800 backdrop-blur-md p-4 flex flex-col font-mono pointer-events-auto overflow-hidden">
      <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
        <h2 className="text-cyan-500 font-bold tracking-widest text-sm">THE WORLD</h2>
        <div className="flex items-center gap-2">
          {newsItem && (
            newsItem.isDemo ? 
              <span className="text-yellow-500 text-[10px] border border-yellow-500 px-1">DEMO DATA</span> : 
              <span className="text-red-500 text-[10px] border border-red-500 px-1 animate-pulse">LIVE INTERNET</span>
          )}
        </div>
      </div>
      
      {!newsItem ? (
        <div className="text-gray-500 text-xs text-center py-10">
          WAITING FOR STIMULUS...
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {newsItem.url && newsItem.url.includes("youtube.com/embed") ? (
            <div className="w-full h-48 bg-black border border-gray-800 overflow-hidden relative">
              <iframe 
                src={newsItem.url} 
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={newsItem.title}
              ></iframe>
            </div>
          ) : newsItem.imageUrl ? (
            <div className="w-full h-32 bg-gray-900 border border-gray-800 overflow-hidden relative">
              <img src={newsItem.imageUrl} alt="News" className="object-cover w-full h-full opacity-60 mix-blend-screen" />
              <div className="absolute inset-0 bg-cyan-900/20"></div>
            </div>
          ) : null}
          
          <h3 className="text-white text-sm font-bold uppercase">{newsItem.title}</h3>
          
          {newsItem.description && (
            <p className="text-gray-400 text-xs line-clamp-3">{newsItem.description}</p>
          )}
          
          <div className="flex justify-between items-center mt-2 text-gray-500 text-[10px]">
            <span>{newsItem.source}</span>
            <span>{new Date(newsItem.publishedAt).toLocaleTimeString()}</span>
          </div>
          
          <div className="flex justify-between items-center mt-2 border-t border-gray-800 pt-2">
            <span className="text-gray-500 text-[10px]">
              ANALYSIS INPUT <span className="text-gray-600">○ UNAVAILABLE</span>
            </span>
            {isWatching && (
              <span className="text-cyan-400 text-xs tracking-widest animate-pulse">[ WATCHING ]</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorldFeed;
