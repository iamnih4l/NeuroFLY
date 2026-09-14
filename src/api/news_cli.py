import sys
import json
import argparse
import os
from src.state.news_cache import NewsCacheManager

if __name__ == "__main__":
    try:
        env_path = os.path.join(os.path.dirname(__file__), '../../.env')
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                for line in f:
                    if '=' in line and not line.startswith('#'):
                        k, v = line.strip().split('=', 1)
                        # Remove quotes if present
                        v = v.strip('"\'')
                        os.environ[k] = v
    except:
        pass

    parser = argparse.ArgumentParser()
    parser.add_argument('--action', choices=['current', 'status', 'refresh'], required=True)
    args = parser.parse_args()

    cache = NewsCacheManager()

    try:
        if args.action == 'current':
            article = cache.get_current_article()
            if article:
                print(json.dumps([article]))
            else:
                print(json.dumps([]))
        elif args.action == 'status':
            print(json.dumps(cache.get_status()))
        elif args.action == 'refresh':
            print(json.dumps(cache.fetch_and_cache(force=True)))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)
