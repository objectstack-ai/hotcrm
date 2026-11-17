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
    expense_request_decision_guard: {
      refusals: {
        FORBIDDEN: { message: 'Una solicitud de viaje la aprueba o rechaza su aprobador, desde su bandeja de entrada, una vez enviada.' },
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
    // The travel request (hotcrm#2578).
    crm_expense_request: {
      label: 'Solicitud de viaje',
      pluralLabel: 'Solicitudes de viaje',
      description: 'Pedir antes de un viaje: adónde, cuándo, para qué y cuánto costará aproximadamente',
      fields: {
        owner_id: { label: 'Viajero' },
        request_number: { label: 'Número de solicitud' },
        name: { label: 'Motivo' },
        destination: { label: 'Destino' },
        start_date: { label: 'Fecha de inicio' },
        end_date: { label: 'Fecha de fin' },
        days: { label: 'Días' },
        crm_account: { label: 'Cuenta' },
        estimated_amount: { label: 'Importe estimado', help: 'Un total para todo el viaje, pague quien pague.' },
        itinerary: { label: 'Itinerario' },
        notes: { label: 'Notas' },
        source: {
          label: 'Origen',
          help: 'Escrito por una persona, por un agente o importado.',
          options: {
            manual: 'Manual',
            agent: 'Agente',
            import: 'Importación',
          },
        },
        status: {
          label: 'Estado',
          options: {
            draft: 'Borrador',
            submitted: 'Enviada',
            approved: 'Aprobada',
            rejected: 'Rechazada',
            cancelled: 'Cancelada',
            closed: 'Cerrada',
          },
        },
        approver: { label: 'Aprobador' },
        review_notes: { label: 'Notas de revisión', help: 'Lo que un asistente o una regla encontró, para que lo lea el aprobador.' },
      },
      _views: {
        all_travel_requests: { label: 'Todas las solicitudes de viaje' },
        my_travel_requests: { label: 'Mis solicitudes de viaje' },
        travel_requests_to_approve: { label: 'Solicitudes por aprobar' },
      },
      _sections: {
        trip: { label: 'Viaje' },
        review: { label: 'Aprobación' },
      },
      _validations: {
        expense_request_dates: { message: 'La fecha de fin debe ser igual o posterior a la fecha de inicio.' },
        expense_request_status_progression: { message: 'Este cambio de estado no está permitido. Una solicitud de viaje pasa de Borrador → Enviada → Aprobada o Rechazada; una rechazada vuelve a Borrador para corregirla; una aprobada se cancela antes del viaje o se cierra después.' },
      },
      _actions: {
        submit_expense_request: { label: 'Enviar', successMessage: 'Solicitud de viaje {{ record.name }} enviada para aprobación.' },
        cancel_expense_request: { label: 'Cancelar viaje', confirmText: '¿Cancelar este viaje? Una solicitud cancelada no se puede reabrir; presente una nueva para un nuevo plan.', successMessage: 'Solicitud de viaje {{ record.name }} cancelada.' },
        close_expense_request: { label: 'Cerrar', successMessage: 'Solicitud de viaje {{ record.name }} cerrada.' },
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
    expense_project_approval: {
      label: 'Aprobación de gastos de proyecto',
      approvals: {
        approver_review: { label: 'Revisión del jefe de proyecto' },
        finance_review: { label: 'Revisión del controller financiero' },
      },
    },
    expense_project_approval_on_create: {
      label: 'Aprobación de gastos de proyecto (al crear)',
      approvals: {
        approver_review: { label: 'Revisión del jefe de proyecto' },
        finance_review: { label: 'Revisión del controller financiero' },
      },
    },
    expense_request_approval: {
      label: 'Aprobación de solicitud de viaje',
      approvals: {
        approver_review: { label: 'Revisión del responsable' },
      },
    },
    expense_request_approval_on_create: {
      label: 'Aprobación de solicitud de viaje (al crear)',
      approvals: {
        approver_review: { label: 'Revisión del responsable' },
      },
    },
  },
  apps: {
    crm_expenses: {
      label: 'Gastos',
      description: 'Lo que gastó para la empresa, con sus recibos, los viajes que solicita de antemano y lo que espera su aprobación',
      navigation: {
        group_expenses: { label: 'Gastos' },
        nav_my_expenses: { label: 'Mis gastos' },
        nav_expenses_to_approve: { label: 'Gastos por aprobar' },
        nav_all_expenses: { label: 'Todos los gastos' },
        group_travel_requests: { label: 'Solicitudes de viaje' },
        nav_my_travel_requests: { label: 'Mis solicitudes de viaje' },
        nav_travel_requests_to_approve: { label: 'Solicitudes por aprobar' },
        nav_all_travel_requests: { label: 'Todas las solicitudes de viaje' },
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
      description: 'Registrar un gasto con su recibo, pedir antes de un viaje, quién los aprueba y qué llega a un proyecto.',
      groups: { expense: { label: 'Gastos' } },
    },
  },
};
