// Dev harness: boots the demo engine in Node and prints dataset stats / runs requests.
import '../src/lib/demo/engine';
import { dbReady, tableNames, tbl } from '../src/lib/demo/db';
import { dispatch, listRoutes } from '../src/lib/demo/engine';

(async () => {
  const t0 = Date.now();
  await dbReady();
  console.log(`seeded in ${Date.now() - t0}ms`);
  for (const n of tableNames().sort()) console.log(n.padEnd(22), tbl(n).size);
  console.log('routes:', listRoutes().length);
  const [, , method, path] = process.argv;
  if (method && path) {
    const r = await dispatch(method, path, undefined, new Headers());
    console.log(r.status, JSON.stringify(r.body, null, 2).slice(0, 4000));
  }
})();
