// Local-only instrumentation. Never deployed or bound in production.
import { Room as GameRoom } from '../promptroyale-do/dist/room.js';
export class Room extends GameRoom {
  imageParts() {
    return this.ctx.storage.sql.exec('SELECT COUNT(*) AS n FROM image_chunks').one().n;
  }
  rejectImageWrites(enabled) {
    if (enabled) this.ctx.storage.sql.exec("CREATE TRIGGER fail_image_write BEFORE INSERT ON image_chunks BEGIN SELECT RAISE(ABORT, 'SQLITE_FULL'); END");
    else this.ctx.storage.sql.exec('DROP TRIGGER IF EXISTS fail_image_write');
  }
  evict() { this.ctx.abort('Local test eviction'); }
}
export default { fetch() { return new Response('Not found', {status:404}); } };
