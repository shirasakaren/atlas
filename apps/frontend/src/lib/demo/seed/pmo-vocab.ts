import type { ProjectKind } from '../schema';
import type { KindVocab } from './pmo-content-common';
import { DATA, INFRASTRUCTURE, MOBILE, SECURITY, SOFTWARE } from './pmo-vocab-1';
import { DESIGN, FINANCE, MARKETING, OPERATIONS, PEOPLE } from './pmo-vocab-2';
import { CUSTOMER, LEGAL, RESEARCH, SALES, SUPPLY_CHAIN } from './pmo-vocab-3';

const BY_KIND: Record<ProjectKind, KindVocab> = {
  software: SOFTWARE,
  mobile: MOBILE,
  data: DATA,
  security: SECURITY,
  infrastructure: INFRASTRUCTURE,
  finance: FINANCE,
  people: PEOPLE,
  marketing: MARKETING,
  design: DESIGN,
  operations: OPERATIONS,
  legal: LEGAL,
  research: RESEARCH,
  'supply-chain': SUPPLY_CHAIN,
  customer: CUSTOMER,
  sales: SALES,
};

export const vocabFor = (kind: ProjectKind): KindVocab => BY_KIND[kind] ?? SOFTWARE;
