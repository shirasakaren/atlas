/**
 * PMO handler entry (URL space: /projects/:slug/task-lists*, /tasks*,
 * /task-comments*, /pmo/*, /files*, /notes*, /whiteboards*, /pmo/undo|redo).
 * Also installs `contracts.pmo`.
 */
import './pmo-lists'; // task lists, tabs, statuses
import './pmo-tasks'; // tasks, gantt, overview, dependencies, mention search, team, undo/redo
import './pmo-comments'; // task comments
import './pmo-files'; // project files
import './pmo-boards'; // notes + whiteboards (snapshot/PATCH path, no Yjs)
import './pmo-contract'; // contracts.pmo
