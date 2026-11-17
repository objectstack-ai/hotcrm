// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * Español (es-ES) — the expense module's own translations (hotcrm#2556, hotcrm#2559): every
 * row whose target this package registers. The object's rows moved here from
 * Project Delivery with the object; the Project field's label stays in that
 * module's pack, which contributes the field. Why per package: `./index.ts`.
 */
export const esES: TranslationData = {
  hooks: {
    expense_line_lock: {
      refusals: {
        RECORD_LOCKED: {
          message: 'Este gasto está en un informe ya enviado, así que no se puede cambiar.',
          reasons: {
            in_review: { message: 'El gasto {{name}} está en el informe {{report}}, que espera aprobación. Recupera el informe para cambiarlo.' },
            rejected: { message: 'El gasto {{name}} está en el informe {{report}}, que fue rechazado. Devuelve el informe a Borrador para corregirlo.' },
            decided: { message: 'El gasto {{name}} está en el informe {{report}}, que ya fue aprobado, así que no se puede cambiar.' },
          },
        },
      },
    },
    expense_report_rules: {
      refusals: {
        FORBIDDEN: {
          message: 'Un informe de gastos lo aprueban o rechazan sus aprobadores, desde su bandeja de entrada, una vez enviado.',
          reasons: {
            decide: { message: 'Un informe de gastos lo aprueban o rechazan sus aprobadores, desde su bandeja de entrada, una vez enviado.' },
            pay: { message: 'Finanzas marca un informe de gastos como pagado, con Marcar como pagado, una vez aprobado.' },
          },
        },
        VALIDATION_FAILED: {
          message: 'Añade un gasto a este informe antes de enviarlo.',
          reasons: {
            no_expenses: { message: 'Añade un gasto a {{name}} antes de enviarlo.' },
          },
        },
        RECORD_LOCKED: {
          message: 'Este informe de gastos ya no se puede cambiar.',
          reasons: {
            approved: { message: 'El informe de gastos {{name}} está aprobado, así que ya no se puede cambiar. Finanzas lo marca como pagado.' },
            paid: { message: 'El informe de gastos {{name}} está pagado, así que ya no se puede cambiar.' },
            delete: { message: 'Solo se puede eliminar un informe de gastos en Borrador. El informe {{name}} ya se envió.' },
          },
        },
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
        crm_expense_report: { label: 'Informe de gastos' },
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
        my_expenses: {
          label: 'Mis gastos',
          bulkActions: {
            delete: { label: 'Eliminar', confirmLabel: 'Eliminar', confirmText: '¿Eliminar definitivamente {{count}} gasto(s)? No se puede deshacer.' },
          },
        },
      },
      _sections: {
        basic: { label: 'Gasto' },
      },
      _validations: {
        expense_status_progression: { message: 'Este cambio de estado no está permitido. Un gasto sigue a su informe: Borrador → Enviado → Aprobado o Rechazado, y vuelve a Borrador cuando el informe se recupera o se corrige.' },
      },
      _actions: {
        submit_for_reimbursement: { label: 'Enviar para reembolso', successMessage: 'Enviado para reembolso. Síguelo en Mis informes.' },
      },
    },
    crm_expense_report: {
      label: 'Informe de gastos',
      pluralLabel: 'Informes de gastos',
      description: 'Gastos enviados juntos para su aprobación y reembolso',
      fields: {
        owner_id: { label: 'Enviado por' },
        report_number: { label: 'Número de informe' },
        name: { label: 'Título' },
        crm_account: { label: 'Cuenta', help: 'El cliente para el que fue el gasto, si lo hay.' },
        total_amount: { label: 'Total' },
        reimbursable_amount: { label: 'A reembolsar', help: 'Los gastos que pagó el propio empleado.' },
        status: {
          label: 'Estado',
          options: {
            draft: 'Borrador',
            submitted: 'Enviado',
            approved: 'Aprobado',
            paid: 'Pagado',
            rejected: 'Rechazado',
          },
        },
        approver: { label: 'Aprobador' },
        submitted_date: { label: 'Enviado el' },
        approved_date: { label: 'Aprobado el' },
        description: { label: 'Observaciones' },
        review_notes: { label: 'Notas de revisión', help: 'Lo que encontró una comprobación, para que lo lea el aprobador.' },
        payment_date: { label: 'Pagado el' },
        payment_reference: { label: 'Referencia del pago' },
      },
      _views: {
        all_expense_reports: { label: 'Todos los informes de gastos' },
        my_expense_reports: { label: 'Mis informes' },
        expense_reports_to_approve: { label: 'Informes por aprobar' },
        expense_reports_to_pay: { label: 'Informes por pagar' },
      },
      _sections: {
        basic: { label: 'Informe de gastos' },
        payment: { label: 'Pago' },
      },
      _validations: {
        expense_report_status_progression: { message: 'Este cambio de estado no está permitido. Un informe pasa de Borrador → Enviado → Aprobado → Pagado; un informe enviado se puede recuperar a Borrador, y uno rechazado vuelve a Borrador para corregirlo.' },
      },
      _actions: {
        submit_expense_report: { label: 'Enviar', successMessage: 'Informe de gastos {{ record.name }} enviado para aprobación.' },
        reopen_expense_report: { label: 'Volver a Borrador', successMessage: 'El informe de gastos {{ record.name }} ha vuelto a Borrador.' },
        mark_expense_report_paid: {
          label: 'Marcar como pagado',
          successMessage: 'Informe de gastos {{ record.name }} marcado como pagado.',
          params: {
            payment_date: { label: 'Pagado el' },
            payment_reference: { label: 'Referencia del pago' },
          },
        },
      },
    },
  },
  // Step names the approval request shows the submitter and the approvers.
  flows: {
    expense_report_approval: {
      label: 'Aprobación de informes de gastos',
      approvals: {
        approver_review: { label: 'Revisión del responsable' },
        finance_review: { label: 'Revisión del controller financiero' },
      },
    },
    expense_report_project_approval: {
      label: 'Aprobación de informes de gastos de proyecto',
      approvals: {
        approver_review: { label: 'Revisión del jefe de proyecto' },
        finance_review: { label: 'Revisión del controller financiero' },
      },
    },
  },
  apps: {
    crm_expenses: {
      label: 'Gastos',
      description: 'Lo que gastaste para la empresa, los informes que te lo reembolsan y los informes que esperan tu aprobación',
      navigation: {
        group_expenses: { label: 'Gastos' },
        nav_my_expenses: { label: 'Mis gastos' },
        nav_my_expense_reports: { label: 'Mis informes' },
        nav_expense_reports_to_approve: { label: 'Informes por aprobar' },
        nav_expense_reports_to_pay: { label: 'Informes por pagar' },
        nav_all_expenses: { label: 'Todos los gastos' },
        group_work: { label: 'Mi trabajo' },
        nav_approval_requests: { label: 'Bandeja de entrada' },
        group_help: { label: 'Ayuda' },
        nav_help_expense: { label: 'Manual de gastos' },
      },
    },
    // My Expenses and Reports to Approve, contributed into the Project Delivery app.
    crm_psa: {
      navigation: {
        nav_my_expenses: { label: 'Mis gastos' },
        nav_expense_reports_to_approve: { label: 'Informes por aprobar' },
      },
    },
  },
  books: {
    crm_expense_manual: {
      label: 'Manual de gastos de HotCRM',
      description: 'Registrar un gasto con su recibo, enviarlo en un informe, quién lo aprueba, su reembolso y lo que llega a un proyecto.',
      groups: { expense: { label: 'Gastos' } },
    },
  },
};
