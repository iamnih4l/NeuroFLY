export interface NBFNeuron {
  bodyId: number;
  type: string;
  soma: [number, number, number] | null;
  vertexOffset: number; // in floats
  vertexCount: number;  // in floats
  indexOffset: number;  // in uint32s
  indexCount: number;   // in uint32s
}

export interface NBFHeader {
  provenance: any;
  chunk_id: string;
  neurons: NBFNeuron[];
}

export class NBFDecoder {
  /**
   * Decodes a .nbf ArrayBuffer directly into GPU-ready TypedArrays.
   * This achieves zero-copy parsing, bypassing JS object allocation for vertices.
   */
  static decode(buffer: ArrayBuffer) {
    const dataView = new DataView(buffer);
    
    // 1. Read Magic (4 bytes)
    const decoder = new TextDecoder('utf-8');
    const magicBytes = new Uint8Array(buffer, 0, 4);
    const magicStr = decoder.decode(magicBytes);
    if (magicStr !== 'NBF1') {
      throw new Error(`Invalid NBF magic number: ${magicStr}`);
    }
    
    // 2. Read JSON Length (4 bytes, little-endian)
    const jsonLen = dataView.getUint32(4, true); 
    
    // 3. Read JSON
    const jsonBytes = new Uint8Array(buffer, 8, jsonLen);
    const jsonStr = decoder.decode(jsonBytes);
    let header: NBFHeader;
    try {
      header = JSON.parse(jsonStr);
    } catch (e) {
      throw new Error("Failed to parse NBF JSON Header.");
    }
    
    // 4. Calculate Padding & Payload Start
    const prePaddingLen = 8 + jsonLen;
    let padding = 0;
    if (prePaddingLen % 4 !== 0) {
      padding = 4 - (prePaddingLen % 4);
    }
    
    const payloadStart = prePaddingLen + padding;
    
    // 5. Total counts
    let totalFloats = 0;
    let totalUint32s = 0;
    header.neurons.forEach(n => {
      totalFloats += n.vertexCount;
      totalUint32s += n.indexCount;
    });
    
    const vertexByteLength = totalFloats * 4;
    
    // 6. Bind to Typed Arrays
    // We bind directly to the underlying ArrayBuffer without copying
    const vertices = new Float32Array(buffer, payloadStart, totalFloats);
    const indices = new Uint32Array(buffer, payloadStart + vertexByteLength, totalUint32s);
    
    return {
      header,
      vertices,
      indices
    };
  }
}
