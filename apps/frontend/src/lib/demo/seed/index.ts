/**
 * Seed registry: importing this file registers every domain seeder with the
 * DB boot sequence (`registerSeeder`). Order is set by each seeder's `order`.
 */
import './people'; // 10: users, tags, collaboration roles
import './projects'; // 12: projects, members, media, bookmarks, contributions, invites
import './domains'; // domain seeders (pmo 30, chat 40, notifications 60, admin/godmode/voice 80+)
