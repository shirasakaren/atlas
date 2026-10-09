/**
 * Extra hand-authored libraries (kinds and global channels) added after the
 * first content pass. Authoring contract: ./chat-dsl.ts
 */
import type { GlobalChannelDef, KindLib } from './chat-dsl';
import type { ProjectKind } from '../schema';
import { KINDS_E1 } from './chat-lib-extra-k1';
import { KINDS_E2 } from './chat-lib-extra-k2';
import { KINDS_E3, RESEARCH_EXTRA } from './chat-lib-extra-k3';
import { GLOBAL_E1 } from './chat-lib-extra-g1';
import { GLOBAL_E2 } from './chat-lib-extra-g2';

export const KINDS_D: Partial<Record<ProjectKind, KindLib>> = {
  ...KINDS_E1,
  ...KINDS_E2,
  ...KINDS_E3,
  research: { lex: {}, pools: RESEARCH_EXTRA },
};

export const GLOBAL_D: GlobalChannelDef[] = [...GLOBAL_E1, ...GLOBAL_E2];
