// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * Español de España (es-ES) — the PSA module's own translations: every row
 * whose target this package registers. Why they live here and not in the app
 * package's pack: `./index.ts`.
 */
export const esES: TranslationData = {
  hooks: {
    timesheet_stamps: {
      refusals: {
        RECORD_LOCKED: {
          message: 'Esta hoja de horas no se puede cambiar ahora en este proyecto.',
          reasons: {
            project_locked: { message: '{{project}} está bloqueado para horas y gastos, así que esta hoja de horas no se puede enviar. Guárdela como borrador o pida al jefe de proyecto que desmarque Bloquear horas y gastos en el proyecto.' },
            closed_takes_no_new: { message: '{{project}} está cerrado, así que no admite hojas de horas nuevas. Registre las horas en un proyecto abierto.' },
            cancelled_takes_no_new: { message: '{{project}} está cancelado, así que no admite hojas de horas nuevas. Registre las horas en un proyecto abierto.' },
            closed_no_submit: { message: '{{project}} está cerrado, así que esta hoja de horas no se puede enviar. Guárdela como borrador o muévala a un proyecto abierto.' },
            cancelled_no_submit: { message: '{{project}} está cancelado, así que esta hoja de horas no se puede enviar. Guárdela como borrador o muévala a un proyecto abierto.' },
          },
        },
        FORBIDDEN: { message: 'Una hoja de horas la aprueba o rechaza su aprobador, desde su bandeja de entrada, una vez enviada.' },
        DUPLICATE_VALUE: {
          message: 'Ya hay una hoja de horas para este proyecto y periodo. Añada las horas a esa.',
          reasons: {
            named: { message: 'Ya hay una hoja de horas para este proyecto y periodo: {{timesheet}}. Añada las horas a esa.' },
          },
        },
      },
    },
    project_status_guard: {
      refusals: {
        VALIDATION_FAILED: {
          message: 'Este cambio del proyecto no está permitido.',
          reasons: {
            starts_as_draft: { message: 'Un proyecto nuevo empieza como Borrador. Guárdelo y luego ponga En aprobación para enviarlo a aprobar.' },
            budget_required: { message: 'Añada el presupuesto del proyecto (versión 1, con sus líneas) antes de enviarlo a aprobar: lo que se aprueba es ese presupuesto.' },
            budget_incomplete: { message: 'El presupuesto no está listo para aprobar: {{problem}} Complételo y envíe el proyecto a aprobar.' },
          },
        },
        FORBIDDEN: {
          message: 'No puede hacer este cambio en el proyecto.',
          reasons: {
            decided_by_approver: { message: 'Un proyecto lo aprueba o rechaza su aprobador, desde su bandeja de entrada. Ponga En aprobación para enviarlo a aprobar.' },
          },
        },
      },
    },
    project_member_unique: {
      refusals: {
        DUPLICATE_VALUE: { message: 'Esta persona ya está asignada a este proyecto. Cambie su fila de asignación existente en lugar de añadir otra.' },
      },
    },
    project_task_rules: {
      refusals: {
        VALIDATION_FAILED: {
          message: 'La tarea principal debe ser otra tarea del mismo proyecto.',
          reasons: {
            loop: { message: 'Esta tarea principal es una de las subtareas de esta tarea. Elija una tarea que no esté debajo de esta.' },
            predecessor: { message: 'Una predecesora debe ser otra tarea del mismo proyecto.' },
          },
        },
      },
    },
    project_budget_rules: {
      refusals: {
        VALIDATION_FAILED: {
          message: 'Este cambio en el presupuesto no está permitido.',
          reasons: {
            open_version: { message: '{{project}} ya tiene una versión de presupuesto abierta (versión {{version}}). Envíela o elimínela antes de empezar otra.' },
            starts_as_draft: { message: 'Una nueva versión del presupuesto empieza como Borrador. Guárdela, añada sus líneas y envíela a aprobar.' },
            with_project: { message: 'La versión 1 se aprueba con el proyecto: envíe el proyecto a aprobar y su presupuesto va con él.' },
            reason_required: { message: 'Indique en Motivo por qué se necesita esta ampliación antes de enviarla a aprobar.' },
            not_ready: { message: 'El presupuesto no está listo para aprobar: {{problem}} Complételo y envíelo a aprobar.' },
          },
        },
        FORBIDDEN: { message: 'Una versión del presupuesto, una vez enviada, la aprueba o rechaza su aprobador desde su Bandeja de entrada.' },
        RECORD_LOCKED: { message: 'Solo se puede eliminar una versión abierta (Borrador o Rechazado). Una aprobada es el historial del proyecto.' },
      },
    },
    project_budget_line_amount: {
      refusals: {
        RECORD_LOCKED: { message: 'Esta versión del presupuesto se ha enviado a aprobación, así que sus líneas no pueden cambiar. Cree una nueva versión para planificar un cambio.' },
      },
    },
    time_entry_timesheet: {
      refusals: {
        VALIDATION_FAILED: { message: 'Elija el proyecto al que corresponden las horas.' },
        FORBIDDEN: {
          message: 'Solo pueden registrar horas las personas asignadas al proyecto. Pida a su jefe de proyecto que le añada.',
          reasons: {
            named: { message: 'Solo pueden registrar horas las personas asignadas al proyecto "{{project}}". Pida a su jefe de proyecto que le añada.' },
          },
        },
      },
    },
    time_entry_costing: {
      refusals: {
        RECORD_LOCKED: { message: 'Esta hoja de horas está enviada, así que sus horas no pueden cambiar. Devuélvala a Borrador para corregirlas.' },
        VALIDATION_FAILED: {
          message: 'La fecha {{day}} está fuera del periodo de esta hoja de horas ({{from}} – {{to}}).',
          reasons: {
            task: { message: 'La tarea debe ser una de las tareas del proyecto de esta hoja de horas.' },
            project: { message: 'El proyecto debe ser el del parte de horas.' },
          },
        },
        FORBIDDEN: {
          message: 'Solo pueden registrar horas las personas asignadas al proyecto. Pida a su jefe de proyecto que le añada.',
          reasons: {
            named: { message: 'Solo pueden registrar horas las personas asignadas al proyecto "{{project}}". Pida a su jefe de proyecto que le añada.' },
          },
        },
      },
    },
  },
  objects: {
    crm_project: {
      label: 'Proyecto',
      pluralLabel: 'Proyectos',
      description: 'Un proyecto que el equipo de entrega realiza para un cliente, con su personal, horas, gastos, coste y margen',
      fields: {
        owner_id: { label: 'Propietario del proyecto' },
        project_number: { label: 'Número de proyecto' },
        name: { label: 'Nombre del proyecto' },
        kind: {
          label: 'Tipo',
          options: {
            presales: 'Preventa',
            delivery: 'Entrega',
            internal: 'Interno',
          },
        },
        billing_type: {
          label: 'Tipo de facturación',
          help: 'Cómo paga el cliente el trabajo. La facturación se hace en Pedido a cobro.',
          options: {
            fixed_fee: 'Precio fijo',
            time_and_materials: 'Tiempo y materiales',
            retainer: 'Iguala',
            non_billable: 'No facturable',
          },
        },
        status: {
          label: 'Estado',
          options: {
            draft: 'Borrador',
            in_approval: 'En aprobación',
            approved: 'Aprobado',
            rejected: 'Rechazado',
            active: 'Activo',
            on_hold: 'En pausa',
            completed: 'Completado',
            closed: 'Cerrado',
            cancelled: 'Cancelado',
          },
        },
        description: { label: 'Descripción' },
        crm_account: { label: 'Cuenta' },
        crm_opportunity: { label: 'Oportunidad' },
        crm_contract: { label: 'Contrato' },
        source_project: {
          label: 'Ganado desde',
          help: 'Para un proyecto de entrega: el proyecto de preventa del que se ganó.',
        },
        planned_start: { label: 'Inicio previsto' },
        planned_end: { label: 'Fin previsto' },
        actual_start: { label: 'Inicio real' },
        actual_end: { label: 'Fin real' },
        percent_complete: {
          label: 'Porcentaje completado',
          help: 'Se calcula a partir de las tareas del proyecto, ponderadas por sus horas planificadas. Una tarea con subtareas cuenta a través de ellas.',
        },
        planned_revenue: {
          label: 'Ingresos previstos',
          help: 'Lo que paga el cliente por este proyecto. El margen bruto se mide contra esta cifra.',
        },
        approved_budget: {
          label: 'Presupuesto aprobado',
          help: 'El total de la versión de presupuesto que es línea base: lo que este proyecto puede gastar. Cambia cuando se aprueba una nueva versión, nunca escribiéndolo.',
        },
        actual_labor_cost: { label: 'Coste de mano de obra' },
        actual_expense_cost: { label: 'Coste de gastos' },
        billable_labor_amount: { label: 'Mano de obra facturable' },
        billable_expense_amount: { label: 'Gastos facturables' },
        billable_amount: {
          label: 'Aprobado para facturar',
          help: 'Horas facturables aprobadas a su tarifa de venta, más gastos facturables aprobados. Pedido a cobro lo factura.',
        },
        actual_cost: { label: 'Coste real' },
        cost_variance: { label: 'Presupuesto restante' },
        budget_consumed_percent: { label: 'Presupuesto consumido' },
        budget_status: {
          label: 'Estado del presupuesto',
          help: 'En curso por debajo del 80 % del presupuesto aprobado, Aviso desde el 80 %, Superado desde el 100 %.',
          options: {
            on_track: 'En curso',
            warning: 'Aviso',
            exceeded: 'Superado',
          },
        },
        time_entry_locked: {
          label: 'Bloquear horas y gastos',
          help: 'Mientras esté marcado, no se puede enviar ninguna hoja de horas ni gasto de este proyecto. Los borradores se pueden seguir escribiendo.',
        },
        gross_margin: { label: 'Margen bruto' },
        gross_margin_percent: { label: 'Margen bruto %' },
        project_manager: {
          label: 'Jefe de proyecto',
          help: 'La persona asignada a este proyecto como jefe de proyecto.',
        },
        team_members: { label: 'Equipo' },
      },
      _views: {
        all_projects: { label: 'Todos los proyectos' },
        my_projects: { label: 'Mis proyectos' },
        active_projects: { label: 'Proyectos activos' },
      },
      _sections: {
        identity: { label: 'Proyecto' },
        provenance: { label: 'Cliente' },
        plan: { label: 'Plan' },
        financials: { label: 'Finanzas' },
        team: { label: 'Equipo' },
      },
      _validations: {
        project_planned_dates: { message: 'El fin previsto debe ser igual o posterior al inicio previsto.' },
        project_status_progression: { message: 'Este cambio de estado no está permitido. Un proyecto avanza Borrador → En aprobación → Aprobado → Activo → Completado → Cerrado; Activo y En pausa se alternan, un proyecto rechazado vuelve a Borrador y un proyecto abierto puede cancelarse.' },
      },
    },
    crm_project_task: {
      label: 'Tarea de proyecto',
      pluralLabel: 'Tareas de proyecto',
      description: 'Una parte del plan de un proyecto, con sus fechas, horas planificadas, responsable y avance',
      fields: {
        crm_project: { label: 'Proyecto' },
        name: { label: 'Nombre de la tarea' },
        parent_task: {
          label: 'Tarea principal',
          help: 'La tarea de la que forma parte esta. Una tarea con subtareas es un resumen: su avance sale de ellas.',
        },
        task_owner: {
          label: 'Responsable de la tarea',
          help: 'La persona que hace la tarea o responde por ella.',
        },
        status: {
          label: 'Estado',
          options: {
            not_started: 'No iniciada',
            in_progress: 'En curso',
            on_hold: 'En espera',
            completed: 'Completada',
            cancelled: 'Cancelada',
          },
        },
        is_milestone: {
          label: 'Hito',
          help: 'Un punto de control, no trabajo: se dibuja como un rombo en el Gantt, normalmente sin horas planificadas.',
        },
        description: { label: 'Descripción' },
        planned_start: { label: 'Inicio previsto' },
        planned_end: { label: 'Fin previsto' },
        predecessors: {
          label: 'Predecesoras',
          help: 'Las tareas que deben terminar antes de que empiece esta.',
        },
        schedule_type: { label: 'Tipo de planificación' },
        planned_hours: {
          label: 'Horas planificadas',
          help: 'El esfuerzo planificado de la tarea. El porcentaje completado del proyecto pondera cada tarea por él.',
        },
        percent_complete: {
          label: 'Porcentaje completado',
          help: 'Cuánto lleva hecho la tarea. Se pone en 100 cuando la tarea está Completada.',
        },
        actual_hours: { label: 'Horas reales' },
      },
      _views: {
        all_project_tasks: { label: 'Todas las tareas de proyecto' },
        project_plan: { label: 'Plan del proyecto' },
        project_task_tree: { label: 'Árbol de tareas' },
        my_project_tasks: { label: 'Mis tareas de proyecto' },
      },
      _sections: {
        basic: { label: 'Tarea' },
        schedule: { label: 'Planificación' },
        effort: { label: 'Esfuerzo' },
      },
      _validations: {
        project_task_planned_dates: { message: 'El fin previsto debe ser igual o posterior al inicio previsto.' },
      },
    },
    // Budget versions and their lines (hotcrm#2547).
    crm_project_budget: {
      label: 'Presupuesto del proyecto',
      pluralLabel: 'Presupuestos del proyecto',
      description: 'Una versión del presupuesto de un proyecto: sus líneas, su total y su aprobación. La aprobada es la línea base.',
      fields: {
        crm_project: { label: 'Proyecto' },
        name: { label: 'Presupuesto' },
        version: { label: 'Versión', help: 'Numeradas 1, 2, 3… en el orden en que se crearon.' },
        status: {
          label: 'Estado',
          options: {
            draft: 'Borrador',
            in_approval: 'En aprobación',
            approved: 'Aprobado',
            rejected: 'Rechazado',
            superseded: 'Sustituido',
          },
        },
        is_baseline: { label: 'Línea base', help: 'La versión aprobada de la que sale el Presupuesto aprobado del proyecto. Una por proyecto; la siguiente versión aprobada la sustituye.' },
        with_initiation: { label: 'Aprobado con el proyecto', help: 'Enviado a aprobación con el propio proyecto, como su primer presupuesto, y no como ampliación.' },
        reason: { label: 'Motivo', help: 'Por qué se necesita esta versión. Obligatorio para enviar a aprobación una ampliación (versión 2 o posterior).' },
        total_cost: { label: 'Coste total' },
        labor_cost: { label: 'Coste de mano de obra' },
        labor_hours: { label: 'Horas de mano de obra' },
        notes: { label: 'Notas' },
      },
      _views: {
        all_project_budgets: { label: 'Todas las versiones de presupuesto' },
        baseline_budgets: { label: 'Líneas base' },
        open_budgets: { label: 'Versiones abiertas' },
      },
      _sections: {
        basic: { label: 'Versión del presupuesto' },
        totals: { label: 'Totales' },
      },
      _validations: {
        project_budget_status_progression: { message: 'Este cambio de estado no está permitido. Una versión del presupuesto pasa de Borrador → En aprobación → Aprobado o Rechazado; una rechazada vuelve a Borrador, y una aprobada queda Sustituida cuando se aprueba una versión posterior.' },
      },
    },
    crm_project_budget_line: {
      label: 'Línea de presupuesto',
      pluralLabel: 'Líneas de presupuesto',
      description: 'Un coste planificado de una versión del presupuesto: categoría, mes, cantidad y coste unitario',
      fields: {
        crm_project_budget: { label: 'Presupuesto' },
        category: {
          label: 'Categoría',
          options: {
            labor: 'Mano de obra',
            subcontract_service: 'Servicios subcontratados',
            third_party_goods: 'Bienes de terceros',
            expense: 'Gastos',
            other: 'Otros',
          },
        },
        description: { label: 'Descripción' },
        period: { label: 'Mes', help: 'El mes al que corresponde el coste. Se guarda como el primer día de ese mes.' },
        rate_card: { label: 'Tarifa', help: 'En una línea de mano de obra: el nivel al que se planifican las horas. Su tarifa de coste es el coste unitario si no escribe uno.' },
        hours: { label: 'Horas', help: 'En una línea de mano de obra: las horas planificadas.' },
        quantity: { label: 'Cantidad', help: 'En cualquier otra línea: cuántas unidades.' },
        unit_cost: { label: 'Coste unitario', help: 'Por hora en mano de obra, por unidad en lo demás.' },
        amount: { label: 'Importe', help: 'Horas × coste unitario en mano de obra, cantidad × coste unitario en lo demás.' },
      },
      _views: {
        all_project_budget_lines: { label: 'Todas las líneas de presupuesto' },
      },
      _sections: {
        basic: { label: 'Línea de presupuesto' },
      },
    },
    crm_project_member: {
      label: 'Miembro del proyecto',
      pluralLabel: 'Miembros del proyecto',
      description: 'Una persona asignada a un proyecto, con una responsabilidad y una tarifa',
      fields: {
        crm_project: { label: 'Proyecto' },
        person: { label: 'Persona' },
        responsibility: {
          label: 'Responsabilidad',
          options: {
            project_manager: 'Jefe de proyecto',
            project_director: 'Director de proyecto',
            account_manager: 'Gestor de cuenta',
            architect: 'Arquitecto',
            consultant: 'Consultor',
            quality_assurance: 'Control de calidad',
            finance_partner: 'Socio financiero',
            subcontractor: 'Subcontratista',
          },
        },
        rate_card: {
          label: 'Tarifa',
          help: 'La tarifa de coste y de venta a la que se cuentan las horas de esta persona en este proyecto.',
        },
        allocation_percent: { label: 'Dedicación' },
        start_date: { label: 'Fecha de inicio' },
        end_date: { label: 'Fecha de fin' },
        is_billable: {
          label: 'Facturable',
          help: 'Si las horas de esta persona en este proyecto se facturan al cliente.',
        },
      },
      _views: {
        all_project_members: { label: 'Todos los miembros de proyecto' },
      },
      _sections: {
        basic: { label: 'Asignación' },
      },
      _validations: {
        project_member_dates: { message: 'La fecha de fin debe ser igual o posterior a la de inicio.' },
      },
    },
    crm_rate_card: {
      label: 'Tarifa',
      pluralLabel: 'Tarifas',
      description: 'La tarifa de coste y de venta de un nivel de seniority',
      fields: {
        owner_id: { label: 'Propietario' },
        name: {
          label: 'Nombre',
          help: 'Por ejemplo, "Consultor sénior".',
        },
        seniority: {
          label: 'Seniority',
          options: {
            junior: 'Júnior',
            intermediate: 'Intermedio',
            senior: 'Sénior',
            lead: 'Líder',
            principal: 'Principal',
          },
        },
        unit: {
          label: 'Unidad',
          help: 'Una tarifa diaria se cuenta como ocho horas.',
          options: {
            hour: 'Por hora',
            day: 'Por día',
          },
        },
        cost_rate: {
          label: 'Tarifa de coste',
          help: 'Lo que una unidad de este perfil cuesta a la empresa.',
        },
        bill_rate: {
          label: 'Tarifa de venta',
          help: 'Lo que se factura al cliente por una unidad de este perfil.',
        },
        is_internal: {
          label: 'Interno',
          help: 'Una tarifa interna puede facturar por debajo del coste o no facturar.',
        },
        effective_from: { label: 'Vigente desde' },
        effective_to: { label: 'Vigente hasta' },
      },
      _views: {
        all_rate_cards: { label: 'Todas las tarifas' },
      },
      _sections: {
        basic: { label: 'Tarifa' },
        rates: { label: 'Tarifas' },
      },
      _validations: {
        rate_card_bill_not_below_cost: { message: 'La tarifa de venta no puede ser inferior a la de coste salvo que la tarifa sea interna.' },
        rate_card_dates: { message: 'Vigente hasta debe ser igual o posterior a Vigente desde.' },
      },
    },
    crm_timesheet: {
      label: 'Parte de horas',
      pluralLabel: 'Partes de horas',
      description: 'Las horas de una persona en un proyecto durante un periodo, aprobadas en bloque',
      fields: {
        owner_id: { label: 'Persona' },
        name: { label: 'Parte de horas' },
        crm_project: { label: 'Proyecto' },
        period_start: { label: 'Inicio del periodo' },
        period_end: { label: 'Fin del periodo' },
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
        total_hours: { label: 'Horas totales' },
        billable_hours: { label: 'Horas facturables' },
        total_cost: { label: 'Coste total' },
        total_bill_amount: { label: 'Importe facturable' },
        notes: { label: 'Notas' },
      },
      _views: {
        all_timesheets: { label: 'Todos los partes de horas' },
        my_timesheets: { label: 'Mis partes de horas' },
        my_week_timesheets: {
          label: 'Partes de horas de esta semana',
          bulkActions: {
            submit_week: { label: 'Enviar', confirmText: '¿Enviar {{count}} parte(s) de horas a aprobación? Cada uno va a su jefe de proyecto.' },
          },
        },
        timesheets_to_approve: { label: 'Partes de horas por aprobar' },
      },
      _sections: {
        basic: { label: 'Parte de horas' },
        totals: { label: 'Totales' },
      },
      _validations: {
        timesheet_period: { message: 'El fin del periodo debe ser igual o posterior al inicio, y un parte cubre como máximo 31 días.' },
        timesheet_status_progression: { message: 'Este cambio de estado no está permitido. Un parte avanza Borrador → Enviado → Aprobado o Rechazado; un parte rechazado vuelve a Borrador para corregirlo.' },
      },
      _actions: {
        submit_timesheet: { label: 'Enviar', successMessage: 'Parte de horas {{ record.name }} enviado a aprobación.' },
      },
    },
    crm_time_entry: {
      label: 'Registro de horas',
      pluralLabel: 'Registros de horas',
      description: 'Las horas de un día en un parte, y el coste que representan',
      fields: {
        crm_project: {
          label: 'Proyecto',
          help: 'El proyecto al que corresponden las horas. En una línea nueva, el parte de horas de este proyecto y semana se busca o se crea por usted.',
        },
        crm_timesheet: {
          label: 'Parte de horas',
          help: 'Se rellena a partir del proyecto y la fecha. Elija uno solo para registrar en un parte de horas de otro periodo.',
        },
        entry_date: {
          label: 'Fecha',
          help: 'El día en que se trabajaron las horas.',
        },
        hours: { label: 'Horas' },
        is_billable: { label: 'Facturable' },
        crm_project_task: {
          label: 'Tarea',
          help: 'La tarea de este proyecto en la que se emplearon las horas.',
        },
        notes: { label: 'Notas' },
        cost_rate: { label: 'Tarifa de coste (por hora)' },
        cost_amount: { label: 'Coste' },
        bill_rate: { label: 'Tarifa de venta (por hora)' },
        bill_amount: { label: 'Importe facturable' },
      },
      _views: {
        all_time_entries: { label: 'Todos los registros de horas' },
        my_week_time: { label: 'Mi semana' },
        my_time_entries: { label: 'Mis horas' },
      },
      _sections: {
        basic: { label: 'Registro de horas' },
        rates: { label: 'Coste y facturación' },
      },
    },
    // The Project field it contributes to the expense module's object (hotcrm#2556).
    crm_expense: {
      fields: {
        crm_project: { label: 'Proyecto' },
      },
    },
  },
  // Step names the approval request shows the submitter and the approvers (#2316 phase 1b).
  flows: {
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
    project_initiation_approval: {
      label: 'Aprobación de inicio de proyecto',
      approvals: {
        leadership_review: { label: 'Revisión del director de proyectos' },
        finance_review: { label: 'Revisión del controller financiero' },
      },
    },
    project_budget_approval: {
      label: 'Aprobación de ampliación de presupuesto',
      approvals: {
        leadership_review: { label: 'Revisión del director de proyectos' },
        finance_review: { label: 'Revisión del controller financiero' },
      },
    },
    timesheet_approval: {
      label: 'Aprobación de hoja de horas',
      approvals: { approver_review: { label: 'Revisión del jefe de proyecto' } },
    },
    timesheet_approval_on_create: {
      label: 'Aprobación de hoja de horas (al crear)',
      approvals: { approver_review: { label: 'Revisión del jefe de proyecto' } },
    },
    project_budget_alert: { label: 'Alerta de presupuesto del proyecto' },
  },
  pages: {
    // The project's record page (#2545).
    project_detail_page: {
      label: 'Detalle del Proyecto',
      description: 'La página de registro del proyecto: el diseño generado, con el plan de tareas del proyecto en un Gantt en la pestaña Resumen.',
    },
  },
  apps: {
    // This package's own app (#2316).
    crm_psa: {
      label: 'Entrega de proyectos',
      description: 'Proyectos, las personas asignadas, su tiempo y sus gastos, y el margen resultante',
      navigation: {
        group_projects: { label: 'Proyectos' },
        nav_projects: { label: 'Todos los proyectos' },
        nav_my_projects: { label: 'Mis proyectos' },
        nav_project_members: { label: 'Asignación' },
        nav_project_budgets: { label: 'Presupuestos' },
        nav_project_plan: { label: 'Plan del proyecto' },
        nav_my_project_tasks: { label: 'Mis tareas de proyecto' },
        group_time_expenses: { label: 'Horas y gastos' },
        nav_my_week: { label: 'Mi semana' },
        nav_my_week_timesheets: { label: 'Enviar esta semana' },
        nav_my_timesheets: { label: 'Mis partes de horas' },
        nav_timesheets_to_approve: { label: 'Partes de horas por aprobar' },
        group_rates: { label: 'Tarifas' },
        nav_rate_cards: { label: 'Tarifas' },
        group_customers: { label: 'Cuentas y contratos' },
        group_work: { label: 'Mi Trabajo' },
        nav_approval_requests: { label: 'Bandeja de Entrada' },
        nav_projects_overview: { label: 'Resumen de proyectos' },
        group_help: { label: 'Ayuda' },
        nav_help_psa: { label: 'Manual de Entrega de Proyectos' },
      },
    },
  },
  // Phase 1c: the module's datasets, its manual and its dashboard.
  datasets: {
    project_financials: {
      label: 'Finanzas de proyectos',
      description: 'Presupuesto aprobado, ingresos previstos, coste y margen por proyecto',
      dimensions: {
        project: { label: 'Proyecto' },
        status: { label: 'Estado' },
        kind: { label: 'Tipo' },
        billing_type: { label: 'Tipo de facturación' },
        budget_status: { label: 'Estado del presupuesto' },
        project_manager: { label: 'Jefe de proyecto' },
        planned_start: { label: 'Inicio previsto' },
      },
      measures: {
        project_count: { label: 'Proyectos' },
        approved_budget_sum: { label: 'Presupuesto aprobado' },
        planned_revenue_sum: { label: 'Ingresos previstos' },
        labor_cost_sum: { label: 'Coste de mano de obra' },
        expense_cost_sum: { label: 'Coste de gastos' },
        actual_cost_sum: { label: 'Coste real' },
        gross_margin_sum: { label: 'Margen bruto' },
        budget_used: { label: 'Presupuesto consumido' },
        billable_labor_sum: { label: 'Mano de obra facturable' },
        billable_expense_sum: { label: 'Gastos facturables' },
        approved_to_bill_sum: { label: 'Aprobado para facturar' },
      },
    },
    time_utilization: {
      label: 'Utilización del tiempo',
      description: 'Horas registradas por persona, proyecto y semana, y la parte facturable',
      dimensions: {
        period_week: { label: 'Semana' },
        period_month: { label: 'Mes' },
        person: { label: 'Persona' },
        project: { label: 'Proyecto' },
        status: { label: 'Estado de la hoja de horas' },
      },
      measures: {
        total_hours: { label: 'Horas' },
        billable_hours: { label: 'Horas facturables' },
        utilization: { label: 'Parte facturable' },
      },
    },
  },
  books: {
    crm_psa_manual: {
      label: 'Manual de Entrega de Proyectos de HotCRM',
      description: 'Proyectos, asignaciones, coste, aprobaciones y el bloqueo del presupuesto: qué cuenta cada cifra y quién decide.',
      groups: {
        psa: { label: 'Entrega de Proyectos' },
      },
    },
  },
  dashboards: {
    projects_overview: {
      label: 'Resumen de proyectos',
      description: 'Presupuesto, coste, margen y horas aprobadas de la cartera de entrega',
      widgets: {
        delivering_projects: { title: 'Proyectos en entrega', description: 'Proyectos activos, en pausa y completados' },
        delivering_budget: { title: 'Presupuesto aprobado', description: 'Presupuestos aprobados de los proyectos en entrega' },
        delivering_cost: { title: 'Coste real', description: 'Mano de obra y gastos aprobados de los proyectos en entrega' },
        delivering_budget_used: { title: 'Presupuesto consumido', description: 'Coste real sobre presupuesto aprobado, en los proyectos en entrega' },
        budget_vs_cost: { title: 'Presupuesto y coste por proyecto', description: 'Presupuesto aprobado junto al coste real, por proyecto en entrega' },
        budget_status_mix: { title: 'Proyectos por estado del presupuesto', description: 'En curso, Aviso (desde el 80 %) y Superado (desde el 100 %), proyectos con presupuesto' },
        project_margin: { title: 'Margen por proyecto', description: 'Ingresos previstos, coste real, margen bruto y presupuesto consumido, por proyecto en entrega' },
        projects_by_status: { title: 'Proyectos por estado', description: 'Todos los proyectos, de Borrador a Cerrado' },
        hours_by_week: { title: 'Horas aprobadas por semana', description: 'Horas en hojas aprobadas, y la parte facturable' },
        billable_share_by_person: { title: 'Parte facturable por persona', description: 'Horas aprobadas por persona y la parte facturada a clientes' },
      },
    },
  },
};
