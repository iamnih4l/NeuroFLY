import os
import sys
import json
import urllib.request
import urllib.parse
from abc import ABC, abstractmethod
from typing import List, Dict, Optional
from datetime import datetime
import src.config

class NewsItem:
    def __init__(self, id: str, title: str, source: str, published_at: str, 
                 url: str, description: Optional[str] = None, 
                 image_url: Optional[str] = None, category: Optional[str] = None,
                 is_demo: bool = False):
        self.id = id
        self.title = title
        self.description = description
        self.url = url
        self.source = source
        self.published_at = published_at
        self.image_url = image_url
        self.category = category
        self.is_demo = is_demo

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'url': self.url,
            'source': self.source,
            'publishedAt': self.published_at,
            'imageUrl': self.image_url,
            'category': self.category,
            'isDemo': self.is_demo
        }

class NewsProvider(ABC):
    @abstractmethod
    def fetch_latest(self, category: str = 'general', limit: int = 10) -> List[NewsItem]:
        pass

class MockNewsProvider(NewsProvider):
    """Fallback provider if API keys are not available."""
    def fetch_latest(self, category: str = 'general', limit: int = 10) -> List[NewsItem]:
        import time
        now = datetime.now().isoformat()
        return [
            NewsItem(
                id=f"mock-{int(time.time())}",
                title="Scientists Observe Synthetic Dopamine Cascade",
                description="A new computational model has successfully demonstrated stable novelty adaptation.",
                url="http://example.com/mock-news",
                source="NeuroFly Daily",
                published_at=now,
                category=category,
                is_demo=True
            )
        ]

class NewsAPIDotOrgProvider(NewsProvider):
    def __init__(self):
        self.api_key = os.environ.get('NEWS_API_KEY')
        if not self.api_key:
            print("WARNING: NEWS_API_KEY environment variable is not set. Falling back to MockNewsProvider.", file=sys.stderr)
            
    def fetch_latest(self, category: str = 'general', limit: int = 10) -> List[NewsItem]:
        if not self.api_key:
            return MockNewsProvider().fetch_latest(category, limit)
            
        url = f"https://newsapi.org/v2/top-headlines?country=us&category={category}&pageSize={limit}&apiKey={self.api_key}"
        
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'NeuroFly/1.0'})
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode())
                
            items = []
            for art in data.get('articles', []):
                items.append(NewsItem(
                    id=art.get('url', str(hash(art.get('title')))),
                    title=art.get('title', ''),
                    description=art.get('description'),
                    url=art.get('url', ''),
                    source=art.get('source', {}).get('name', 'Unknown'),
                    published_at=art.get('publishedAt', ''),
                    image_url=art.get('urlToImage'),
                    category=category
                ))
            return items
        except Exception as e:
            print(f"ERROR: Failed to fetch from NewsAPI: {e}", file=sys.stderr)
            return MockNewsProvider().fetch_latest(category, limit)

class NewsFactory:
    @staticmethod
    def get_provider() -> NewsProvider:
        if os.environ.get('YOUTUBE_API_KEY'):
            from src.api.youtube_provider import YouTubeLiveProvider
            return YouTubeLiveProvider()
        elif os.environ.get('NEWS_API_KEY'):
            return NewsAPIDotOrgProvider()
        return MockNewsProvider()
