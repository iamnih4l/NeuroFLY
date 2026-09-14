import sqlite3
import json
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, Optional

from src.api.news_provider import NewsFactory

class NewsCacheManager:
    """
    Manages the offline-first Quota-Safe World Feed cache.
    Ensures NeuroFly does not exhaust YouTube Data API limits by separating
    Watch Mode polling from external API fetches.
    """
    def __init__(self, db_path: str = 'data/results.db'):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        c.execute('''
            CREATE TABLE IF NOT EXISTS news_articles (
                id TEXT PRIMARY KEY,
                title TEXT,
                description TEXT,
                url TEXT,
                embed_url TEXT,
                source TEXT,
                published_at TEXT,
                image_url TEXT,
                category TEXT,
                is_demo BOOLEAN,
                fetched_at REAL
            )
        ''')
        
        c.execute('''
            CREATE TABLE IF NOT EXISTS news_metadata (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                last_fetch_at REAL,
                requests_today INTEGER,
                current_article_id TEXT,
                exposure_id_counter INTEGER
            )
        ''')
        
        # Initialize metadata row if not exists
        c.execute('INSERT OR IGNORE INTO news_metadata (id, last_fetch_at, requests_today, current_article_id, exposure_id_counter) VALUES (1, 0.0, 0, NULL, 0)')
        
        conn.commit()
        conn.close()

    def get_status(self) -> Dict[str, Any]:
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('SELECT last_fetch_at, requests_today, current_article_id FROM news_metadata WHERE id = 1')
        row = c.fetchone()
        
        c.execute('SELECT COUNT(*) FROM news_articles')
        count = c.fetchone()[0]
        conn.close()
        
        import os
        interval = float(os.environ.get('YOUTUBE_DISCOVERY_INTERVAL_MINUTES', 15))
        
        if row:
            last_fetch_at = row[0]
            next_fetch_at = last_fetch_at + (interval * 60)
            return {
                "provider": "YouTubeLiveProvider",
                "requests_today": row[1],
                "last_fetch_at": datetime.fromtimestamp(last_fetch_at).isoformat() if last_fetch_at > 0 else None,
                "next_fetch_at": datetime.fromtimestamp(next_fetch_at).isoformat() if last_fetch_at > 0 else None,
                "cached_articles": count,
                "current_article_id": row[2]
            }
        return {}

    def fetch_and_cache(self, force: bool = False) -> Dict[str, Any]:
        """
        Polls the external provider only if the interval has passed or forced.
        """
        import os
        interval = float(os.environ.get('YOUTUBE_DISCOVERY_INTERVAL_MINUTES', 15))
        
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('SELECT last_fetch_at, requests_today FROM news_metadata WHERE id = 1')
        row = c.fetchone()
        
        last_fetch_at = row[0] if row else 0.0
        requests_today = row[1] if row else 0
        now = time.time()
        
        if not force and (now - last_fetch_at < interval * 60):
            conn.close()
            return {"fetched": False, "reason": "RATE_LIMIT_INTERVAL", "next_fetch_at": datetime.fromtimestamp(last_fetch_at + interval * 60).isoformat()}
            
        provider = NewsFactory.get_provider()
        items = provider.fetch_latest(limit=5)
        
        fetched_count = 0
        if items:
            for item in items:
                embed_url = getattr(item, 'embed_url', item.url)
                try:
                    c.execute('''
                        INSERT OR REPLACE INTO news_articles (id, title, description, url, embed_url, source, published_at, image_url, category, is_demo, fetched_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        item.id, item.title, item.description, item.url, embed_url, item.source, 
                        item.published_at, item.image_url, item.category, item.is_demo, now
                    ))
                    fetched_count += 1
                except sqlite3.Error as e:
                    pass
                    
            c.execute('UPDATE news_metadata SET last_fetch_at = ?, requests_today = requests_today + 1 WHERE id = 1', (now,))
            
            # Always update current article to the freshest one when we successfully fetch
            c.execute('UPDATE news_metadata SET current_article_id = ?, exposure_id_counter = exposure_id_counter + 1 WHERE id = 1', (items[0].id,))
                
            conn.commit()
            
        conn.close()
        
        return {
            "fetched": True,
            "new_articles": fetched_count,
            "provider": type(provider).__name__,
            "next_fetch_at": datetime.fromtimestamp(now + interval * 60).isoformat()
        }

    def get_current_article(self) -> Optional[Dict[str, Any]]:
        """
        Returns the currently active cached article. Rotates it if needed.
        """
        self.fetch_and_cache(force=False)
        
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        c.execute('SELECT current_article_id, exposure_id_counter FROM news_metadata WHERE id = 1')
        meta = c.fetchone()
        if not meta or not meta['current_article_id']:
            conn.close()
            return None
            
        c.execute('SELECT * FROM news_articles WHERE id = ?', (meta['current_article_id'],))
        article = c.fetchone()
        conn.close()
        
        if article:
            return dict(article)
        return None
