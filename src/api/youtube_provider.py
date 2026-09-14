import os
import sys
import json
import urllib.request
import urllib.parse
from typing import List, Optional
from datetime import datetime
from src.api.news_provider import NewsProvider, NewsItem, MockNewsProvider

class YouTubeLiveProvider(NewsProvider):
    def __init__(self):
        self.api_key = os.environ.get('YOUTUBE_API_KEY')
        self.channel_id = os.environ.get('YOUTUBE_CHANNEL_ID')
        self.query = os.environ.get('YOUTUBE_NEWS_QUERY', 'live news')
        
        if not self.api_key:
            print("WARNING: YOUTUBE_API_KEY environment variable is not set. Falling back to MockNewsProvider.", file=sys.stderr)
            
    def fetch_latest(self, category: str = 'general', limit: int = 1) -> List[NewsItem]:
        if not self.api_key:
            return MockNewsProvider().fetch_latest(category, limit)
            
        try:
            # Step 1: Search for active live streams
            search_url = "https://www.googleapis.com/youtube/v3/search?part=snippet&eventType=live&type=video"
            if self.channel_id:
                search_url += f"&channelId={self.channel_id}"
            else:
                encoded_query = urllib.parse.quote(self.query)
                search_url += f"&q={encoded_query}"
                
            search_url += f"&maxResults={limit}&key={self.api_key}"
            
            req = urllib.request.Request(search_url, headers={'User-Agent': 'NeuroFly/1.0'})
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode())
                
            items = []
            for item in data.get('items', []):
                snippet = item.get('snippet', {})
                video_id = item.get('id', {}).get('videoId')
                
                if not video_id:
                    continue
                    
                title = snippet.get('title', 'Unknown Broadcast')
                description = snippet.get('description', '')
                channel_title = snippet.get('channelTitle', 'YouTube Live')
                published_at = snippet.get('publishedAt', datetime.now().isoformat())
                
                thumbnails = snippet.get('thumbnails', {})
                thumbnail_url = thumbnails.get('high', thumbnails.get('medium', thumbnails.get('default', {}))).get('url')
                
                # Construct embed URL
                embed_url = f"https://www.youtube.com/embed/{video_id}?autoplay=1&mute=1&controls=0&modestbranding=1&liveui=1"
                
                news_item = NewsItem(
                    id=video_id,
                    title=title,
                    source=channel_title,
                    published_at=published_at,
                    url=embed_url,
                    description=description,
                    image_url=thumbnail_url,
                    category=category,
                    is_demo=False
                )
                news_item.embed_url = embed_url
                items.append(news_item)
                
            if not items:
                print("WARNING: No live streams found.", file=sys.stderr)
                return MockNewsProvider().fetch_latest(category, limit)
                
            return items
            
        except Exception as e:
            print(f"ERROR: Failed to fetch from YouTube API: {e}", file=sys.stderr)
            return MockNewsProvider().fetch_latest(category, limit)
