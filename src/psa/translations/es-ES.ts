// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * Español de España (es-ES) — the PSA module's own translations: every row
 * whose target this package registers. Why they live here and not in the app
 * package's pack: `./index.ts`.
 */
export const esES: TranslationData = {
  apps: {
    // This package's own app (#2316).
    crm_psa: {
      label: 'Entrega de proyectos',
      description: 'Proyectos, las personas asignadas, su tiempo y sus gastos, y el margen resultante',
      navigation: {
        group_customers: { label: 'Cuentas y contratos' },
        group_work: { label: 'Mi Trabajo' },
        nav_approval_requests: { label: 'Bandeja de Entrada' },
      },
    },
  },
};
