// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * Español (es-ES) — the expense module's own translations (hotcrm#2556): every
 * row whose target this package registers. The object's rows moved here from
 * Project Delivery with the object; the Project field's label stays in that
 * module's pack, which contributes the field. Why per package: `./index.ts`.
 */
export const esES: TranslationData = {
  hooks: {
    expense_decision_guard: {
      refusals: {
        FORBIDDEN: { message: 'Un gasto lo aprueban o rechazan sus aprobadores, desde su bandeja de entrada, una vez enviado.' },
      },
    },
  },
  objects: {
    crm_expense: {
      label: 'Gasto',
      pluralLabel: 'Gastos',
      description: 'Un gasto que una persona pagó para la empresa, con su recibo',
      fields: {
        owner_id: { label: 'Gastado por' },
        name: { label: 'Descripción' },
        expense_date: { label: 'Fecha' },
        category: {
          label: 'Categoría',
          options: {
            travel: 'Viajes',
            lodging: 'Alojamiento',
            meals: 'Comidas',
            equipment: 'Equipos',
            other: 'Otros',
          },
        },
        amount: { label: 'Importe' },
        paid_by: {
          label: 'Pagado por',
          help: 'El empleado, a quien se le reembolsa, o la empresa.',
          options: {
            employee: 'Empleado',
            company: 'Empresa',
          },
        },
        merchant: { label: 'Comercio' },
        receipt_number: { label: 'Número de recibo' },
        source: {
          label: 'Origen',
          help: 'Escrito por una persona, por un agente o importado.',
          options: {
            manual: 'Manual',
            agent: 'Agente',
            import: 'Importación',
          },
        },
        is_billable: {
          label: 'Facturable',
          help: 'Si este gasto se repercute al cliente.',
        },
        status: {
          label: 'Estado',
          options: {
            draft: 'Borrador',
            submitted: 'Enviado',
            approved: 'Aprobado',
            rejected: 'Rechazado',
          },
        },
        approver: { label: 'Aprobador' },
        notes: { label: 'Notas' },
      },
      _views: {
        all_expenses: { label: 'Todos los gastos' },
        my_expenses: { label: 'Mis gastos' },
        expenses_to_approve: { label: 'Gastos por aprobar' },
      },
      _sections: {
        basic: { label: 'Gasto' },
      },
      _validations: {
        expense_status_progression: { message: 'Este cambio de estado no está permitido. Un gasto avanza Borrador → Enviado → Aprobado o Rechazado; un gasto rechazado vuelve a Borrador para corregirlo.' },
      },
    },
  },
  // Step names the approval request shows the submitter and the approvers.
  flows: {
    expense_approval: {
      label: 'Aprobación de gastos',
      approvals: {
        approver_review: { label: 'Revisión del responsable' },
        finance_review: { label: 'Revisión del controller financiero' },
      },
    },
    expense_approval_on_create: {
      label: 'Aprobación de gastos (al crear)',
      approvals: {
        approver_review: { label: 'Revisión del responsable' },
        finance_review: { label: 'Revisión del controller financiero' },
      },
    },
  },
  apps: {
    crm_expenses: {
      label: 'Gastos',
      description: 'Lo que pagaste para la empresa, con sus recibos, y los gastos que esperan tu aprobación',
      navigation: {
        group_expenses: { label: 'Gastos' },
        nav_my_expenses: { label: 'Mis gastos' },
        nav_expenses_to_approve: { label: 'Gastos por aprobar' },
        nav_all_expenses: { label: 'Todos los gastos' },
        group_work: { label: 'Mi trabajo' },
        nav_approval_requests: { label: 'Bandeja de entrada' },
        group_help: { label: 'Ayuda' },
        nav_help_expense: { label: 'Manual de gastos' },
      },
    },
    // My Expenses and Expenses to Approve, contributed into the Project Delivery app.
    crm_psa: {
      navigation: {
        nav_my_expenses: { label: 'Mis gastos' },
        nav_expenses_to_approve: { label: 'Gastos por aprobar' },
      },
    },
  },
  books: {
    crm_expense_manual: {
      label: 'Manual de gastos de HotCRM',
      description: 'Registrar un gasto con su recibo, quién lo aprueba y qué llega a un proyecto.',
      groups: { expense: { label: 'Gastos' } },
    },
  },
};
