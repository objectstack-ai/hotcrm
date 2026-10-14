// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { SchemaRegistry } from '@objectstack/objectql';
import composedStack from './composed-stack';

type AnyRec = Record<string, any>;

/**
 * The app's shared option lists — `defineStack({ picklists })` (#2000).
 *
 * A select field authored `Field.select({ picklist: 'NAME' })` carries NO
 * options of its own: the platform resolves them from the list it names when it
 * serves or validates the object. Read off the composed view (see
 * `./composed-stack`), because the artifact itself carries each package's
 * collections only inside `packages[]`.
 *
 * This module holds no assertions and is not named `*.test.ts`, so vitest does
 * not collect it as a suite.
 */
export const stackPicklists: AnyRec[] = (composedStack as AnyRec).picklists ?? [];

/**
 * Register the app's picklists on an engine a suite built with
 * `ObjectQL.create({ objects })`.
 *
 * That factory registers datasources, objects and hooks and nothing else (on
 * 18.0.0-next.1 too), so handing it the app's objects without the lists builds
 * an engine on which every picklist-bound field refuses every value ("takes its
 * values from picklist "industry", which no loaded package declares") — not
 * the app. Boot registers `defineStack({ picklists })` through this same door
 * (`registry.registerItem('picklist', …)`), and the engine resolves a list
 * lazily, so calling this after `create()` is enough. A suite that boots the
 * app through `@objectstack/verify` needs none of this: the boot registers
 * them.
 */
export function registerStackPicklists(ql: AnyRec): void {
  if (stackPicklists.length === 0) {
    throw new Error('the app declares no picklists — registering them would register nothing');
  }
  for (const picklist of stackPicklists) ql.registry.registerItem('picklist', picklist);
}

/**
 * The platform's own resolver over the app's lists, in a bare registry — the
 * same `SchemaRegistry` the engine and the boot fold through, so a suite never
 * re-implements how a picklist (and any `picklistExtensions`) resolves.
 */
let resolver: SchemaRegistry | undefined;
const picklistResolver = (): SchemaRegistry => {
  if (!resolver) {
    resolver = new SchemaRegistry();
    for (const picklist of stackPicklists) resolver.registerItem('picklist', picklist as never);
  }
  return resolver;
};

/**
 * The options a select field OFFERS, read off the authored metadata: its own
 * inline `options`, or the options the platform resolves for the picklist its
 * `picklist` names.
 *
 * Not a fallback — the spec refuses a field that declares both, so exactly one
 * source exists and this reads it. A `picklist` naming no list the app
 * declares throws rather than reading as "no options", which would turn a
 * legality check into a silent pass.
 */
export function offeredOptions(field: AnyRec | undefined): AnyRec[] | undefined {
  if (!field) return undefined;
  if (typeof field.picklist === 'string') {
    const options = picklistResolver().resolvePicklistOptions(field.picklist);
    if (!options) throw new Error(`field names picklist "${field.picklist}", which the app does not declare`);
    return options as AnyRec[];
  }
  return field.options;
}
