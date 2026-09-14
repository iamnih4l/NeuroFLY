import os
import sys
import json
import struct
from dotenv import load_dotenv

# Ensure we have access to src
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from src.data.connector import NeuPrintConnector

def build_full_cns_nbf():
    print("Loading environment...")
    load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))
    
    print("Connecting to NeuPrint...")
    connector = NeuPrintConnector()
    
    if not connector.client:
        print("ERROR: Cannot connect to NeuPrint. Missing token?")
        return

    print("Fetching ALL MaleCNS Neurons (this may take a moment)...")
    # Fetch all neurons with somas
    cypher = """
        MATCH (n:Neuron)
        WHERE exists(n.somaLocation)
        RETURN n.bodyId AS id, n.type AS type, n.somaLocation AS soma, n.rois AS rois
    """
    
    from neuprint import fetch_custom
    df = fetch_custom(cypher)
    
    total_neurons = len(df)
    print(f"Retrieved {total_neurons} neurons with soma locations.")
    
    if total_neurons == 0:
        print("ERROR: No neurons returned.")
        return
        
    print("Encoding NBF...")
    
    neurons_meta = []
    vertices = []
    indices = []
    
    vertex_offset = 0
    index_offset = 0
    
    brain_neurons = 0
    vnc_neurons = 0
    
    for i, row in df.iterrows():
        soma = row.get('soma', None)
        if not soma or 'coordinates' not in soma:
            continue
            
        coords = soma['coordinates']
        x, y, z = float(coords[0]), float(coords[1]), float(coords[2])
        
        rois = row.get('rois', [])
        is_brain = any('MB' in r or 'AL' in r or 'CX' in r or 'LH' in r for r in rois if r)
        is_vnc = any('VNC' in r or 'T1' in r or 'T2' in r or 'T3' in r for r in rois if r)
        
        if is_vnc:
            vnc_neurons += 1
        elif is_brain:
            brain_neurons += 1
            
        # Create a tiny line segment (cross) to represent the soma in LineSegments
        s = 0.5
        vertices.extend([x, y, z, x+s, y+s, z+s])
        
        # 2 vertices, 3 floats each = 6 floats
        v_count = 6
        
        indices.extend([int(vertex_offset / 3), int(vertex_offset / 3) + 1])
        i_count = 2
        
        neurons_meta.append({
            "bodyId": int(row['id']),
            "type": str(row['type'] or 'UNKNOWN'),
            "soma": [x, y, z],
            "vertexOffset": vertex_offset,
            "vertexCount": v_count,
            "indexOffset": index_offset,
            "indexCount": i_count
        })
        
        vertex_offset += v_count
        index_offset += i_count
        
    # Construct Header
    header = {
        "provenance": connector._provenance.__dict__,
        "chunk_id": "LOD0_MaleCNS",
        "neurons": neurons_meta
    }
    
    header_json = json.dumps(header).encode('utf-8')
    header_len = len(header_json)
    
    magic = b'NBF1'
    pre_padding = 8 + header_len
    padding = 0 if pre_padding % 4 == 0 else 4 - (pre_padding % 4)
    
    out_path = os.path.join(os.path.dirname(__file__), '../data/local_cache/LOD0_MaleCNS.nbf')
    with open(out_path, 'wb') as f:
        # 1. Magic
        f.write(magic)
        # 2. JSON Length
        f.write(struct.pack('<I', header_len))
        # 3. JSON
        f.write(header_json)
        # 4. Padding
        if padding > 0:
            f.write(b'\x00' * padding)
            
        # 5. Float32 Vertices
        f.write(struct.pack(f'<{len(vertices)}f', *vertices))
        
        # 6. Uint32 Indices
        f.write(struct.pack(f'<{len(indices)}I', *indices))
        
    print(f"Successfully wrote {out_path}")
    print(f"Total Neurons encoded: {len(neurons_meta)}")
    
    # Update manifest.json
    manifest_path = os.path.join(os.path.dirname(__file__), '../data/local_cache/manifest.json')
    manifest = {
        "dataset": "male-cns:v1.0",
        "source": "Janelia FlyEM / NeuPrint",
        "roi": "COMPLETE_CNS",
        "format": "nbf",
        "chunks": ["LOD0_MaleCNS", "roi_MBR"],
        "neuron_count": len(neurons_meta),
        "skeleton_count": 50,
        "metrics": {
            "brain_coverage": f"{(brain_neurons / len(neurons_meta))*100:.1f}%",
            "vnc_coverage": f"{(vnc_neurons / len(neurons_meta))*100:.1f}%"
        },
        "download_timestamp": __import__('datetime').datetime.now().isoformat()
    }
    
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)
        
    print(f"Updated manifest.json with full coverage.")

if __name__ == "__main__":
    build_full_cns_nbf()
