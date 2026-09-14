import { NBFDecoder } from './NBFDecoder';

export class ChunkManager {
  private cache = new Map<string, any>();
  private pending = new Map<string, Promise<any>>();

  async fetchChunk(chunkId: string) {
    if (this.cache.has(chunkId)) {
      return this.cache.get(chunkId);
    }
    if (this.pending.has(chunkId)) {
      return this.pending.get(chunkId);
    }

    const promise = fetch(`http://localhost:3001/api/local/chunks/${chunkId}`)
      .then(res => {
        if (!res.ok) throw new Error(`Chunk ${chunkId} not found.`);
        return res.arrayBuffer();
      })
      .then(buffer => {
        const decoded = NBFDecoder.decode(buffer);
        this.cache.set(chunkId, decoded);
        this.pending.delete(chunkId);
        return decoded;
      })
      .catch(err => {
        this.pending.delete(chunkId);
        console.error(err);
        return null;
      });

    this.pending.set(chunkId, promise);
    return promise;
  }
}
