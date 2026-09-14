import urllib.request
from io import BytesIO
from PIL import Image, ImageStat, ImageFilter
from typing import Dict, Any

class VisualEncoder:
    """
    Extracts deterministic visual features from a NewsItem's image URL.
    Uses Pillow (PIL) to perform real image analysis without heavy CV models.
    """
    
    @staticmethod
    def extract_features(news_item: Dict[str, Any]) -> Dict[str, float]:
        """
        Takes a dictionary representation of NewsItem, downloads the image,
        and computes normalized [0, 1] visual features.
        """
        image_url = news_item.get('imageUrl')
        
        # Default empty features
        features = {
            'brightness': 0.5,
            'contrast': 0.5,
            'color_diversity': 0.5,
            'edge_density': 0.5,
            'visual_complexity': 0.5
        }
        
        if not image_url:
            return features
            
        try:
            # Download image safely with a short timeout
            req = urllib.request.Request(image_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5) as response:
                img_data = response.read()
                
            with Image.open(BytesIO(img_data)) as img:
                img = img.convert('RGB')
                # Resize for performance
                img.thumbnail((256, 256))
                
                stat = ImageStat.Stat(img)
                
                # 1. Brightness: Normalize mean luminance (RMS)
                brightness = min(1.0, max(0.0, sum(stat.rms) / (3.0 * 255.0)))
                
                # 2. Contrast: Standard deviation of pixel values
                contrast = min(1.0, max(0.0, sum(stat.stddev) / (3.0 * 128.0)))
                
                # 3. Color Diversity: Count number of unique quantized colors
                quantized = img.quantize(colors=64)
                unique_colors = len(quantized.getcolors())
                color_diversity = min(1.0, unique_colors / 64.0)
                
                # 4. Edge Density: Apply FIND_EDGES filter and check mean intensity
                edges = img.convert('L').filter(ImageFilter.FIND_EDGES)
                edge_stat = ImageStat.Stat(edges)
                edge_density = min(1.0, max(0.0, edge_stat.mean[0] / 128.0))
                
                # 5. Visual Complexity: Combination of contrast, color diversity, and edges
                visual_complexity = min(1.0, (contrast * 0.3) + (color_diversity * 0.3) + (edge_density * 0.4))
                
                features = {
                    'brightness': round(brightness, 3),
                    'contrast': round(contrast, 3),
                    'color_diversity': round(color_diversity, 3),
                    'edge_density': round(edge_density, 3),
                    'visual_complexity': round(visual_complexity, 3)
                }
                
        except Exception as e:
            # If download fails, return neutral/fallback defaults
            # (e.g. timeout, 403 forbidden)
            print(f"VisualEncoder error fetching {image_url}: {e}")
            pass
            
        return features
