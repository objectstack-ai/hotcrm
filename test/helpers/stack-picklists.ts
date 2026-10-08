// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import stack from '../../objectstack.config';

type AnyRec = Record<string, any>;

/**
 * The stack's shared option lists — `defineStack({ picklists })` (#2000).
 *
 * A select field authored `Field.select({ picklist: '<name>' })` carries NO
 * options of its own: the platform resolves them from the list it names when it
 * serves or validates the object. Two consequences for suites, one helper each.
 *
 * This module holds no assertions and is not named `*.test.ts`, so vitest does
 * not collect it as a suite.
 */
export const stackPicklists: AnyRec[] = (stack as any).picklists ?? [];

/**
 * Register the stack's picklists on an engine a suite built with
 * `ObjectQL.create({ objects })`.
 *
 * That factory registers datasources, objects and hooks and nothing else, so
 * handing it the stack's objects without the lists builds an engine on which
 * every picklist-bound field refuses every value ("takes its values from
 * picklist "industry", which no loaded package declares") — not the app. Boot
 * registers `defineStack({ picklists })` through this same door
 * (`registry.registerItem('picklist', …)`), and the engine resolves a list
 * lazily, so calling this after `create()` is enough.
 */
export function registerStackPicklists(ql: AnyRec): void {
  if (stackPicklists.length === 0) {
    throw new Error('the stack declares no picklists — registering them would register nothing');
  }
  for (const picklist of stackPicklists) ql.registry.registerItem('picklist', picklist);
}

/**
 * The options a select field OFFERS, read off the authored metadata: its own
 * inline `options`, or the options of the picklist its `picklist` names.
 *
 * Not a fallback — the spec refuses a field that declares both, so exactly one
 * source exists and this reads it. A `picklist` naming no list the stack
 * declares throws rather than reading as "no options", which would turn a
 * legality check into a silent pass.
 */
export function offeredOptions(field: AnyRec | undefined): AnyRec[] | undefined {
  if (!field) return undefined;
  if (typeof field.picklist === 'string') {
    const list = stackPicklists.find((p) => p.name === field.picklist);
    if (!list) throw new Error(`field names picklist "${field.picklist}", which the stack does not declare`);
    return list.options;
  }
  return field.options;
}
