import { ROUTE_PLACEHOLDER } from './config';

/** `generateStaticParams` value for a dynamic segment: a single placeholder page. */
export function demoStaticParams(name: string): Record<string, string>[] {
  return [{ [name]: ROUTE_PLACEHOLDER }];
}
