// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The platform identity objects a reduced test stack has to register for itself
 * (ObjectStack 17.7.0).
 *
 * ### What this exists for
 *
 * Several files in this suite boot ObjectQL over `objectstack.config.ts` and
 * insert `sys_user` fixtures (a real user id is what their hooks and sharing
 * rules key on). None mounts `plugin-auth`, because nothing they measure needs
 * sign-in — and `plugin-auth` is the plugin that registers `sys_user`,
 * `sys_organization`, `sys_member` and their siblings at boot (its manifest's
 * `objects`).
 *
 * Through 17.6.0 the omission was invisible: the engine handed a name its
 * registry did not hold to the driver as a table, and the memory driver created
 * one on the first write. From 17.7.0 the engine's verbs refuse an unregistered
 * object name with `404 OBJECT_NOT_FOUND` before any hook or driver runs
 * (objectstack#21545), so the first `insert('sys_user', …)` failed the whole
 * file. The release notes' prescription is "register the object first".
 *
 * This registers the platform's own definitions, imported rather than
 * hand-mirrored, through the `manifest` service under the package id
 * `plugin-auth` uses — the call `plugin-auth`'s own `init()` makes.
 */
export function identityObjects(...objects: unknown[]) {
  return {
    name: 'test-identity-objects',
    version: '1.0.0',
    dependencies: ['com.objectstack.engine.objectql'],
    init(ctx: { getService: (name: string) => { register: (manifest: unknown) => void } }): void {
      ctx.getService('manifest').register({
        id: 'com.objectstack.plugin-auth',
        namespace: 'sys',
        version: '1.0.0',
        type: 'plugin',
        scope: 'system',
        name: 'Identity objects (test stand-in for plugin-auth)',
        objects,
      });
    },
  };
}
