// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * Español de España (es-ES) — the PSA module's own translations: every row
 * whose target this package registers. Why they live here and not in the app
 * package's pack: `./index.ts`.
 */
export const esES: TranslationData = {
  // This package's name and description on Setup's package list (`packages.MANIFEST_ID`).
  packages: {
    'app.objectstack.hotcrm.psa': {
      name: 'HotCRM Entrega de proyectos',
      description: 'Módulo de entrega de proyectos de HotCRM: proyectos, asignación de personal, tiempo, gastos y margen de entrega.',
    },
  },
  hooks: {
    timesheet_stamps: {
      refusals: {
        RECORD_LOCKED: {
          message: 'Este parte de horas no se puede cambiar ahora en este proyecto.',
          reasons: {
            project_locked: { message: '{{project}} está bloqueado para horas y gastos, así que este parte de horas no se puede enviar. Guárdelo como borrador o pida al jefe de proyecto que desmarque Bloquear horas y gastos en el proyecto.' },
            closed_takes_no_new: { message: '{{project}} está cerrado, así que no admite partes de horas nuevos. Registre las horas en un proyecto abierto.' },
            cancelled_takes_no_new: { message: '{{project}} está cancelado, así que no admite partes de horas nuevos. Registre las horas en un proyecto abierto.' },
            closed_no_submit: { message: '{{project}} está cerrado, así que este parte de horas no se puede enviar. Guárdelo como borrador o muévalo a un proyecto abierto.' },
            cancelled_no_submit: { message: '{{project}} está cancelado, así que este parte de horas no se puede enviar. Guárdelo como borrador o muévalo a un proyecto abierto.' },
          },
        },
        FORBIDDEN: { message: 'Un parte de horas lo aprueba o rechaza su aprobador, desde su bandeja de entrada, una vez enviado.' },
        DUPLICATE_VALUE: {
          message: 'Ya hay un parte de horas para este proyecto y periodo. Añada las horas a ese.',
          reasons: {
            named: { message: 'Ya hay un parte de horas para este proyecto y periodo: {{timesheet}}. Añada las horas a ese.' },
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
            budget_no_lines: { message: 'El presupuesto no está listo para aprobar: no tiene líneas. Complételo y envíe el proyecto a aprobar.' },
            budget_labor_no_rate_card: { message: 'El presupuesto no está listo para aprobar: la línea de mano de obra "{{line}}" no indica ninguna tarifa. Complételo y envíe el proyecto a aprobar.' },
            budget_labor_no_hours: { message: 'El presupuesto no está listo para aprobar: la línea de mano de obra "{{line}}" no tiene horas. Complételo y envíe el proyecto a aprobar.' },
            budget_line_no_quantity: { message: 'El presupuesto no está listo para aprobar: la línea "{{line}}" no tiene cantidad. Complételo y envíe el proyecto a aprobar.' },
            budget_total_zero: { message: 'El presupuesto no está listo para aprobar: su total es cero. Complételo y envíe el proyecto a aprobar.' },
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
            budget_no_lines: { message: 'El presupuesto no está listo para aprobar: no tiene líneas. Complételo y envíelo a aprobar.' },
            budget_labor_no_rate_card: { message: 'El presupuesto no está listo para aprobar: la línea de mano de obra "{{line}}" no indica ninguna tarifa. Complételo y envíelo a aprobar.' },
            budget_labor_no_hours: { message: 'El presupuesto no está listo para aprobar: la línea de mano de obra "{{line}}" no tiene horas. Complételo y envíelo a aprobar.' },
            budget_line_no_quantity: { message: 'El presupuesto no está listo para aprobar: la línea "{{line}}" no tiene cantidad. Complételo y envíelo a aprobar.' },
            budget_total_zero: { message: 'El presupuesto no está listo para aprobar: su total es cero. Complételo y envíelo a aprobar.' },
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
        RECORD_LOCKED: { message: 'Este parte de horas está enviado, así que sus horas no pueden cambiar. Devuélvalo a Borrador para corregirlas.' },
        VALIDATION_FAILED: {
          message: 'La fecha {{day}} está fuera del periodo de este parte de horas ({{from}} – {{to}}).',
          reasons: {
            task: { message: 'La tarea debe ser una de las tareas del proyecto de este parte de horas.' },
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
        crm_sales_order: {
          label: 'Pedido',
          help: 'El pedido de venta que entrega este proyecto.',
        },
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
          help: 'Mientras esté marcado, no se puede enviar ningún parte de horas ni gasto de este proyecto. Los borradores se pueden seguir escribiendo.',
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
        lines: { label: 'Líneas de presupuesto' },
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
        person_name: { label: 'Nombre de la persona', help: 'El nombre de la persona, sincronizado con el registro de usuario. Da nombre a esta asignación.' },
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
    // The Project field it contributes to the expense module's objects (hotcrm#2556, hotcrm#2581).
    crm_expense: {
      fields: {
        crm_project: { label: 'Proyecto' },
      },
    },
    crm_expense_report: {
      fields: {
        crm_project: { label: 'Proyecto' },
      },
    },
    crm_expense_request: {
      fields: {
        crm_project: { label: 'Proyecto' },
      },
    },
  },
  // Step names the approval request shows the submitter and the approvers (#2316 phase 1b).
  flows: {
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
      label: 'Aprobación de parte de horas',
      approvals: { approver_review: { label: 'Revisión del jefe de proyecto' } },
    },
    timesheet_approval_on_create: {
      label: 'Aprobación de parte de horas (al crear)',
      approvals: { approver_review: { label: 'Revisión del jefe de proyecto' } },
    },
    project_budget_alert: { label: 'Alerta de presupuesto del proyecto' },
    expense_report_project_approval: {
      label: 'Aprobación de informes de gastos de proyecto',
      approvals: {
        approver_review: { label: 'Revisión del jefe de proyecto' },
        finance_review: { label: 'Revisión del controller financiero' },
      },
    },
    expense_request_project_approval: {
      label: 'Aprobación de solicitud de viaje de proyecto',
      approvals: {
        approver_review: { label: 'Revisión del jefe de proyecto' },
      },
    },
    expense_request_project_approval_on_create: {
      label: 'Aprobación de solicitud de viaje de proyecto (al crear)',
      approvals: {
        approver_review: { label: 'Revisión del jefe de proyecto' },
      },
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
        project: { label: 'Proyecto', description: 'El proyecto, por su nombre.' },
        status: { label: 'Estado', description: 'En qué punto está el proyecto, desde Borrador y En aprobación, pasando por Activo y En pausa, hasta Completado, Cerrado, Rechazado o Cancelado.' },
        kind: { label: 'Tipo', description: 'Si el proyecto es preventa, entrega al cliente o trabajo interno.' },
        billing_type: { label: 'Tipo de facturación', description: 'Cómo paga el cliente el trabajo: precio fijo, tiempo y materiales, iguala o no facturable.' },
        budget_status: { label: 'Estado del presupuesto', description: 'Cuánto de su presupuesto aprobado ha gastado el proyecto: En curso por debajo del 80 %, Aviso desde el 80 %, Superado desde el 100 %.' },
        project_manager: { label: 'Jefe de proyecto', description: 'La persona asignada al proyecto como su jefe de proyecto.' },
        planned_start: { label: 'Inicio previsto', description: 'El mes en que está previsto que empiece el proyecto; los proyectos sin inicio previsto forman su propio grupo.' },
      },
      measures: {
        project_count: { label: 'Proyectos', description: 'Cuántos proyectos hay, en todos los estados, incluidos borradores, rechazados y cancelados.' },
        approved_budget_sum: { label: 'Presupuesto aprobado', description: 'La suma del presupuesto aprobado de cada proyecto, el total de su versión de presupuesto de referencia; un proyecto aún sin aprobar no suma.' },
        planned_revenue_sum: { label: 'Ingresos previstos', description: 'La suma de Ingresos previstos, lo que los clientes pagan por los proyectos; es un plan, no ingreso facturado ni de tratos ganados.' },
        labor_cost_sum: { label: 'Coste de mano de obra', description: 'El coste del tiempo de los partes de horas aprobados; no incluye tiempo en borrador, enviado ni rechazado.' },
        expense_cost_sum: { label: 'Coste de gastos', description: 'El importe de los gastos aprobados imputados a los proyectos; no incluye los gastos sin aprobar.' },
        actual_cost_sum: { label: 'Coste real', description: 'Labor Cost más Expense Cost: solo coste aprobado, tal como lo muestra el registro del proyecto.' },
        gross_margin_sum: { label: 'Margen bruto', description: 'Ingresos previstos menos Actual Cost, un margen de plan frente a real; no es beneficio facturado y no descuenta el coste sin aprobar.' },
        budget_used: { label: 'Presupuesto consumido', description: 'Actual Cost dividido entre Approved Budget, sumando antes de dividir, así que es la cifra de la cartera y no una media de porcentajes por proyecto.' },
        billable_labor_sum: { label: 'Mano de obra facturable', description: 'El importe facturable del tiempo de los partes de horas aprobados; no incluye tiempo en borrador, enviado ni rechazado.' },
        billable_expense_sum: { label: 'Gastos facturables', description: 'El importe de los gastos aprobados marcados como facturables al cliente; no incluye los no facturables ni los sin aprobar.' },
        approved_to_bill_sum: { label: 'Aprobado para facturar', description: 'Billable Labor más Billable Expenses: trabajo y gastos facturables aprobados; las facturas se emiten en Order to Cash.' },
      },
    },
    time_utilization: {
      label: 'Utilización del tiempo',
      description: 'Horas registradas por persona, proyecto y semana, y la parte facturable',
      dimensions: {
        period_week: { label: 'Semana', description: 'La semana en que se trabajaron las horas, por la fecha de cada registro de horas, no la semana en que empieza el parte de horas.' },
        period_month: { label: 'Mes', description: 'El mes en que se trabajaron las horas, por la fecha de cada registro de horas.' },
        person: { label: 'Persona', description: 'La persona que registró las horas, la propietaria del parte de horas.' },
        project: { label: 'Proyecto', description: 'El proyecto al que corresponde el parte de horas.' },
        status: { label: 'Estado del parte de horas', description: 'El estado de aprobación del parte de horas: Borrador, Enviado, Aprobado o Rechazado; solo las horas aprobadas cuentan como coste.' },
      },
      measures: {
        total_hours: { label: 'Horas', description: 'Las horas anotadas en registros de horas, en partes de todos los estados, incluidos borradores y rechazados; filtre por Aprobado para las que cuentan como coste.' },
        billable_hours: { label: 'Horas facturables', description: 'Las horas de registros de horas marcados como facturables, en partes de todos los estados; no incluye las horas no facturables.' },
        utilization: { label: 'Parte facturable', description: 'Billable Hours dividido entre Hours: la proporción del tiempo registrado que es facturable; no es una proporción del tiempo laborable disponible.' },
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
        hours_by_week: { title: 'Horas aprobadas por semana', description: 'Horas en partes de horas aprobados, y la parte facturable' },
        billable_share_by_person: { title: 'Parte facturable por persona', description: 'Horas aprobadas por persona y la parte facturada a clientes' },
      },
    },
  },
};
