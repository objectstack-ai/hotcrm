// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * Español (es-ES) — the expense module's own translations (hotcrm#2556, hotcrm#2559): every
 * row whose target this package registers. The object's rows moved here from
 * Project Delivery with the object; the Project field's label stays in that
 * module's pack, which contributes the field. Why per package: `./index.ts`.
 */
export const esES: TranslationData = {
  // This package's name and description on Setup's package list (`packages.MANIFEST_ID`).
  packages: {
    'app.objectstack.hotcrm.expense': {
      name: 'HotCRM Gastos',
      description: 'Módulo de gastos de HotCRM: gastos con sus recibos, solicitudes de viaje, los informes que envían los gastos a aprobar, su reembolso y las normas de gastos de la empresa.',
    },
  },
  hooks: {
    expense_line_lock: {
      refusals: {
        RECORD_LOCKED: {
          message: 'Este gasto está en un informe ya enviado, así que no se puede cambiar.',
          reasons: {
            in_review: { message: 'El gasto {{name}} está en el informe {{report}}, que espera aprobación. Recupera el informe para cambiarlo.' },
            rejected: { message: 'El gasto {{name}} está en el informe {{report}}, que fue rechazado. Devuelve el informe a Borrador para corregirlo.' },
            decided: { message: 'El gasto {{name}} está en el informe {{report}}, que ya fue aprobado, así que no se puede cambiar.' },
            project: { message: 'El gasto {{name}} está en el informe {{report}}, que va al aprobador de su proyecto. Para cambiar el proyecto, elimina el informe en borrador, que libera sus gastos, y vuelve a enviarlos.' },
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
            delete_approved: { message: 'El informe de gastos {{name}} está aprobado, así que no se puede eliminar: un informe aprobado o pagado se conserva en el registro.' },
            delete_paid: { message: 'El informe de gastos {{name}} está pagado, así que no se puede eliminar: un informe aprobado o pagado se conserva en el registro.' },
          },
        },
      },
    },
    expense_request_decision_guard: {
      refusals: {
        FORBIDDEN: { message: 'Una solicitud de viaje la aprueba o rechaza su aprobador, desde su bandeja de entrada, una vez enviada.' },
      },
    },
    expense_request_delete_guard: {
      refusals: {
        RECORD_LOCKED: {
          message: 'Solo se puede eliminar una solicitud de viaje en borrador. Para anular un viaje aprobado, usa Cancelar viaje.',
          reasons: {
            submitted: { message: 'Solo se puede eliminar una solicitud de viaje en borrador. La solicitud de viaje {{name}} espera aprobación; una vez aprobada, Cancelar viaje la anula.' },
            approved: { message: 'Solo se puede eliminar una solicitud de viaje en borrador. La solicitud de viaje {{name}} está aprobada; para anular el viaje, usa Cancelar viaje.' },
            rejected: { message: 'Solo se puede eliminar una solicitud de viaje en borrador. La solicitud de viaje {{name}} fue rechazada; devuélvela a Borrador para corregirla o eliminarla.' },
            cancelled: { message: 'Solo se puede eliminar una solicitud de viaje en borrador. La solicitud de viaje {{name}} está cancelada y queda registrada.' },
            closed: { message: 'Solo se puede eliminar una solicitud de viaje en borrador. La solicitud de viaje {{name}} está cerrada y queda registrada con sus informes.' },
          },
        },
      },
    },
    expense_request_line_lock: {
      refusals: {
        RECORD_LOCKED: {
          message: 'La solicitud de viaje {{request}} está enviada, así que sus tramos están retenidos: solo se puede escribir la referencia de reserva. Recupérela a Borrador para cambiarlos.',
          reasons: {
            approved: { message: 'La solicitud de viaje {{request}} está aprobada, así que sus tramos son definitivos: solo se puede escribir la referencia de reserva. Para cambiar el plan, cancélela y presente una nueva.' },
            cancelled: { message: 'La solicitud de viaje {{request}} está cancelada, así que sus tramos son definitivos: solo se puede escribir la referencia de reserva.' },
            closed: { message: 'La solicitud de viaje {{request}} está cerrada, así que sus tramos son definitivos: solo se puede escribir la referencia de reserva.' },
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
        review_notes: { label: 'Notas de revisión', help: 'Lo que encontró una comprobación, para que lo lea el aprobador.' },
      },
      _views: {
        all_expenses: { label: 'Todos los gastos' },
        my_expenses: {
          label: 'Mis gastos',
          bulkActions: {
            delete: { label: 'Eliminar', confirmLabel: 'Eliminar', confirmText: '¿Eliminar {{count}} gasto(s)? Irán a la papelera, donde un administrador puede restaurarlos.' },
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
        submit_trip_for_reimbursement: {
          label: 'Enviar para un viaje',
          description: 'Rinde estos gastos contra una de tus solicitudes de viaje aprobadas.',
          submitText: 'Enviar',
          successMessage: 'Enviado para reembolso con la solicitud de viaje. Síguelo en Mis informes.',
          params: {
            crm_expense_request: { label: 'Solicitud de viaje', helpText: 'Tu solicitud de viaje aprobada a la que corresponden estos gastos.' },
          },
        },
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
        crm_expense_request: { label: 'Solicitud de viaje', help: 'La solicitud de viaje aprobada a la que corresponden estos gastos.' },
        request_estimated_amount: { label: 'Estimación del viaje', help: 'El importe estimado de la solicitud de viaje.' },
        request_reported_amount: { label: 'Rendido del viaje', help: 'Los totales de los informes enviados, aprobados y pagados de la solicitud de viaje.' },
        request_over_estimate: { label: 'Supera la estimación del viaje' },
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
        trip: { label: 'Solicitud de viaje' },
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
          refusals: {
            FORBIDDEN: { message: 'Solo finanzas marca un informe de gastos como pagado, una vez aprobado.' },
            VALIDATION_FAILED: { message: 'Abre el informe de gastos para marcarlo como pagado.' },
            RECORD_NOT_FOUND: { message: 'Este informe de gastos ya no existe.' },
            CONFLICT: { message: 'Solo un informe de gastos aprobado se marca como pagado. El informe de gastos {{name}} no está aprobado.' },
          },
        },
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
        reported_amount: { label: 'Importe rendido', help: 'Los totales de los informes de gastos enviados, aprobados y pagados de esta solicitud.' },
        estimate_difference: { label: 'Diferencia con la estimación', help: 'Lo rendido menos lo estimado. Por encima de cero supera la estimación.' },
        over_estimate: { label: 'Supera la estimación' },
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
        spend: { label: 'Gasto' },
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
    crm_expense_request_line: {
      label: 'Línea de itinerario',
      pluralLabel: 'Líneas de itinerario',
      description: 'Un tramo del viaje: qué reservar, desde dónde hasta dónde y cuándo',
      fields: {
        crm_expense_request: { label: 'Solicitud de viaje' },
        line_number: { label: 'N.º de línea' },
        kind: {
          label: 'Tipo',
          options: {
            flight: 'Vuelo',
            train: 'Tren',
            car: 'Coche',
            hotel: 'Hotel',
            other: 'Otro',
          },
        },
        origin: { label: 'Desde' },
        destination: { label: 'Hasta', help: 'Adónde va este tramo, o dónde está el hotel.' },
        start_date: { label: 'Fecha de inicio' },
        end_date: { label: 'Fecha de fin', help: 'Para un hotel, el día de salida. Déjela vacía para un tramo de un día.' },
        details: { label: 'Detalles', help: 'Asiento, hotel u otras preferencias.' },
        booking_reference: { label: 'Referencia de reserva', help: 'La confirmación, que escribe tras reservar el viajero, un asistente o quien reserve.' },
      },
      _views: {
        all_itinerary_lines: { label: 'Todas las líneas de itinerario' },
      },
      _sections: {
        leg: { label: 'Tramo' },
        booking: { label: 'Reserva' },
      },
      _validations: {
        expense_request_line_dates: { message: 'La fecha de fin debe ser igual o posterior a la de inicio.' },
      },
    },
    crm_expense_standard: {
      label: 'Norma de gastos',
      pluralLabel: 'Normas de gastos',
      description: 'Una regla de la empresa sobre lo que se puede gastar, que leen las personas y los asistentes; nada en el producto la aplica',
      fields: {
        owner_id: { label: 'Propietario' },
        name: { label: 'Nombre', help: 'Por ejemplo «Hotel, ciudades de primer nivel».' },
        category: {
          label: 'Categoría',
          help: 'La categoría de gasto a la que se refiere esta norma. Vacía significa cualquier categoría.',
          options: {
            travel: 'Viajes',
            lodging: 'Alojamiento',
            meals: 'Comidas',
            equipment: 'Equipos',
            other: 'Otros',
          },
        },
        limit_amount: { label: 'Límite', help: 'Lo máximo que se puede gastar, en la moneda de la organización. Déjelo vacío para una regla solo en palabras.' },
        limit_per: {
          label: 'Por',
          help: 'Sobre qué se cuenta el límite.',
          options: {
            night: 'Noche',
            day: 'Día',
            item: 'Gasto',
            trip: 'Viaje',
          },
        },
        applies_to: { label: 'Se aplica a', help: 'Quién y dónde, en palabras: por ejemplo «Gerentes y superiores» o «Ciudades de primer nivel».' },
        details: { label: 'Detalles', help: 'Lo que un número no puede decir: excepciones, qué se incluye, a quién preguntar.' },
        is_active: { label: 'Activa', help: 'Desmárquela para retirar una norma sin eliminarla.' },
      },
      _views: {
        all_expense_standards: { label: 'Normas de gastos' },
      },
      _sections: {
        basic: { label: 'Norma de gastos' },
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
      description: 'Lo que gastó para la empresa, con sus recibos, los viajes que solicita de antemano, los informes que se lo reembolsan y lo que espera su aprobación',
      navigation: {
        group_expenses: { label: 'Gastos' },
        nav_my_expenses: { label: 'Mis gastos' },
        nav_my_expense_reports: { label: 'Mis informes' },
        nav_expense_reports_to_approve: { label: 'Informes por aprobar' },
        nav_expense_reports_to_pay: { label: 'Informes por pagar' },
        nav_all_expenses: { label: 'Todos los gastos' },
        nav_expense_standards: { label: 'Normas de gastos' },
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
    // My Expenses, Reports to Approve and My Travel Requests, contributed into the Project Delivery app.
    crm_psa: {
      navigation: {
        nav_my_expenses: { label: 'Mis gastos' },
        nav_expense_reports_to_approve: { label: 'Informes por aprobar' },
        nav_my_travel_requests: { label: 'Mis solicitudes de viaje' },
      },
    },
  },
  books: {
    crm_expense_manual: {
      label: 'Manual de gastos de HotCRM',
      description: 'Registrar un gasto con su recibo, pedir antes de un viaje, enviar los gastos en un informe, quién los aprueba, su reembolso, qué llega a un proyecto y qué hace por ti un asistente.',
      groups: { expense: { label: 'Gastos' } },
    },
  },
};
