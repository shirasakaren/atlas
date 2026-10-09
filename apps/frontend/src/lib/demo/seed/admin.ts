/**
 * Admin domain seeder (order 80): RBAC catalog + feature flags. Godmode
 * settings/SSO/etc. and voice have their own seeders next door.
 */
import { registerSeeder } from '../db';
import { agoIso, DAY, HOUR } from '../clock';
import { users } from '../store';
import { CAST } from './people';
import { PERMISSIONS, ROLE_TEMPLATES } from './admin-rbac-data';
import { permissionsTbl, rolesTbl } from '../handlers/admin-rbac';
import { flagsTbl, type FlagRec } from '../handlers/admin-flags';
import './admin-godmode';
import './admin-voice';

interface FlagDef {
  key: string;
  enabled: boolean;
  description: string;
  daysAgo: number;
  by: keyof typeof CAST;
}

const FLAGS: FlagDef[] = [
  { key: 'ui.maintenance_banner', enabled: false, description: 'Show a site-wide maintenance banner in the frontend.', daysAgo: 41, by: 'daniel' },
  { key: 'ui.dashboard_v2', enabled: true, description: 'Redesigned dashboard: pinned programs, deadline radar and the new activity feed.', daysAgo: 19, by: 'nadia' },
  { key: 'ui.command_palette', enabled: true, description: 'Cmd/Ctrl+K command palette for jumping between projects, tasks and people.', daysAgo: 63, by: 'daniel' },
  { key: 'ui.dense_tables', enabled: false, description: 'Compact row density option for task and user tables (design review pending).', daysAgo: 8, by: 'hannah' },
  { key: 'search.semantic_ranking', enabled: false, description: 'Blend vector similarity into global search ranking. Enabled for the search team only in staging.', daysAgo: 12, by: 'priya' },
  { key: 'projects.contribution_requests', enabled: true, description: 'Let members ask to join a project from its page; managers approve from the queue.', daysAgo: 112, by: 'maya' },
  { key: 'projects.private_by_default', enabled: false, description: 'New projects start as Private instead of Public. Waiting on the legal review of the default.', daysAgo: 27, by: 'james' },
  { key: 'pmo.gantt_dependencies', enabled: true, description: 'Draw task dependency arrows on the timeline and warn on schedule conflicts.', daysAgo: 77, by: 'maya' },
  { key: 'pmo.bulk_edit', enabled: true, description: 'Multi-select tasks in list view to change status, assignee or due date in one go.', daysAgo: 54, by: 'maya' },
  { key: 'pmo.ai_task_summaries', enabled: false, description: 'Experimental: summarise long task threads for the weekly digest. Off while we evaluate data handling.', daysAgo: 6, by: 'tomas' },
  { key: 'pmo.whiteboard_export', enabled: true, description: 'Export whiteboards to the .mgm interchange format.', daysAgo: 93, by: 'hannah' },
  { key: 'chat.link_previews', enabled: true, description: 'Unfurl links pasted into chat with title, description and thumbnail.', daysAgo: 131, by: 'daniel' },
  { key: 'chat.message_forwarding', enabled: true, description: 'Forward a message into another channel with an attribution card.', daysAgo: 88, by: 'daniel' },
  { key: 'chat.threads_beta', enabled: false, description: 'Threaded replies in channels. Dogfooding inside Engineering only.', daysAgo: 15, by: 'kenji' },
  { key: 'voice.stage_channels', enabled: true, description: 'Stage channels with speakers, audience and a hand-raise queue (town halls).', daysAgo: 36, by: 'elena' },
  { key: 'voice.recording', enabled: true, description: 'Allow moderators to record calls to object storage. 30-day retention.', daysAgo: 33, by: 'tomas' },
  { key: 'voice.noise_suppression_v2', enabled: false, description: 'Next-generation noise suppression. Hold until CPU use on older laptops is measured.', daysAgo: 4, by: 'kenji' },
  { key: 'notifications.digest_emails', enabled: true, description: 'Daily digest email for overdue tasks and unread mentions.', daysAgo: 70, by: 'amara' },
  { key: 'notifications.web_push', enabled: true, description: 'Browser push notifications (requires VAPID keys in godmode).', daysAgo: 58, by: 'daniel' },
  { key: 'auth.passkey_login', enabled: false, description: 'Passwordless sign-in with passkeys. Pilot with Security, then everyone.', daysAgo: 10, by: 'tomas' },
  { key: 'admin.audit_log_export', enabled: false, description: 'CSV export of the admin audit trail for the SOC 2 evidence collection.', daysAgo: 3, by: 'tomas' },
];

registerSeeder({
  name: 'admin',
  order: 80,
  run() {
    const base = agoIso(400 * DAY);
    permissionsTbl().insertMany(
      PERMISSIONS.map((p, i) => ({
        id: `perm_${String(i + 1).padStart(3, '0')}`,
        code: p.code,
        name: p.name,
        description: p.description,
        category: p.category,
      })),
    );
    rolesTbl().insertMany(
      ROLE_TEMPLATES.map((r, i) => ({
        id: `role_${r.code}`,
        code: r.code,
        name: r.name,
        description: r.description,
        permissions: r.permissions.slice(),
        isSystem: true,
        createdAt: new Date(new Date(base).getTime() + i * 1000).toISOString(),
        updatedAt: base,
      })),
    );

    const flags: FlagRec[] = FLAGS.map((f) => {
      const who = users().get(CAST[f.by].id)?.email ?? null;
      const created = agoIso((f.daysAgo + 20) * DAY);
      return {
        id: f.key,
        key: f.key,
        enabled: f.enabled,
        description: f.description,
        updatedBy: who,
        createdAt: created,
        updatedAt: agoIso(f.daysAgo * DAY + (f.key.length % 7) * HOUR),
      };
    });
    flagsTbl().insertMany(flags);
  },
});
