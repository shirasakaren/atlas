/**
 * PMO seeder (order 30): task lists / statuses / tabs / tasks / deps /
 * comments / activity (pmo-gen) + files / notes / whiteboards (pmo-gen-extra).
 */
import { registerSeeder } from '../db';
import { projects } from '../store';
import { generatePmo } from './pmo-gen';
import { generateExtras } from './pmo-gen-extra';
import {
  pmoActivity,
  pmoComments,
  pmoDeps,
  pmoFiles,
  pmoLists,
  pmoNoteRevs,
  pmoNotes,
  pmoStatuses,
  pmoTabs,
  pmoTasks,
  pmoWbRevs,
  pmoWbs,
} from './pmo-store';

registerSeeder({
  name: 'pmo',
  order: 30,
  run({ now }) {
    const g = generatePmo(now);
    pmoLists().insertMany(g.lists);
    pmoStatuses().insertMany(g.statuses);
    pmoTabs().insertMany(g.tabs);
    pmoTasks().insertMany(g.tasks);
    pmoDeps().insertMany(g.deps);
    pmoComments().insertMany(g.comments);
    pmoActivity().insertMany(g.activity);
    const x = generateExtras(projects().all(), now);
    pmoFiles().insertMany(x.files);
    pmoNotes().insertMany(x.notes);
    pmoNoteRevs().insertMany(x.noteRevs);
    pmoWbs().insertMany(x.wbs);
    pmoWbRevs().insertMany(x.wbRevs);
  },
});
