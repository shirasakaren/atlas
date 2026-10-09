/**
 * Handler registry: importing this registers every route with the router.
 * One file per domain; each owns its URL space (see the comments there).
 */
import './app'; // me, users, dashboard, for-me, projects, tags, contributions, invites, bookmarks, notifications, search, flags, public-config, auth, media/uploads
import './pmo'; // task lists, statuses, tabs, tasks, comments, activity, gantt, overview, deps, team, files, notes, whiteboards, undo/redo
import './chat'; // channels, messages, reactions, pins, search, stickers, link previews, chat sockets
import './admin'; // godmode, admin users/roles/flags, voice (+ voice sockets), soundboard
