// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';
import { CONTRACT_DRAFT_NODE_IDS } from '../../flows/_contract-draft';

/**
 * Español (es-ES) — every translation namespace EXCEPT `objects`:
 * `apps`, `messages`, `dashboards`, `datasets`, `pages`, `flows`, `picklists`,
 * `reports`, `positions`, `permissions`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/sales/translations/es-ES.ts`.
 *
 * A namespace `TranslationData` gains later lands here too, and the room is
 * measured: this file is the smaller half of the bundle, and the schema bounds
 * how many namespaces can ever arrive.
 */
export const appSurface: Omit<TranslationData, 'objects'> = {
  // This package's name and description on Setup's package list (`packages.MANIFEST_ID`).
  packages: {
    'app.objectstack.hotcrm': {
      name: 'HotCRM',
      description: 'Clientes potenciales, pedidos, proyectos, cobros y gastos en un único sistema de gestión de código abierto. Seis aplicaciones: Ventas, Servicio, Marketing, Del pedido al cobro, Entrega de proyectos y Gastos. Del pedido al cobro sigue pedidos, facturas y cobros, y no es un libro contable. Cámbielo con IA cuando cambie su negocio. Deje que sus propios agentes de IA trabajen en él con los permisos de cada usuario.',
    },
  },
  apps: {
    crm_enterprise: {
      label: 'Ventas',
      description: 'Prospectos, cuentas, oportunidades y presupuestos para el equipo de ventas',
      // Indexado por el `id` del nodo de navegación (espacio de nombres plano,
      // sea cual sea la profundidad del nodo).
      navigation: {
        group_activity: { label: 'Actividad' },
        nav_event: { label: 'Eventos' },
        nav_activity_dashboard: { label: 'Actividad de Ventas' },
        nav_my_calendar: { label: 'Mi Calendario' },
        nav_home: { label: 'Inicio' },

        group_sales: { label: 'Ventas' },
        group_collection_plan: { label: 'Plan de cobro' },
        nav_lead: { label: 'Prospectos' },
        nav_account: { label: 'Cuentas' },
        nav_contact: { label: 'Contactos' },
        nav_opportunity: { label: 'Oportunidades' },
        nav_contract: { label: 'Contratos' },
        nav_sales_order: { label: 'Pedidos' },
        nav_sales_dashboard: { label: 'Rendimiento de Ventas' },

        group_work: { label: 'Mi Trabajo' },
        nav_my_tasks: { label: 'Mis Tareas' },
        nav_my_deals: { label: 'Mis Negocios' },
        nav_my_leads: { label: 'Mis Prospectos' },
        nav_approval_requests: { label: 'Bandeja de Entrada' },

        group_insights: { label: 'Análisis' },
        nav_crm_dashboard: { label: 'Resumen CRM' },
        nav_forecast: { label: 'Previsiones' },

        group_reports: { label: 'Informes' },
        nav_report_opportunities_by_stage: { label: 'Oportunidades por Etapa' },
        nav_report_won_by_owner: { label: 'Oportunidades Ganadas por Propietario' },
        nav_report_pipeline_coverage: { label: 'Cobertura del Pipeline por Trimestre' },
        nav_report_funnel_by_owner: { label: 'Embudo por Propietario' },
        nav_report_lead_inflow: { label: 'Interacción con Prospectos por Mes' },
        nav_report_accounts_by_industry: { label: 'Cuentas por Industria y Tipo' },
        nav_report_churn_signals: { label: 'Señales de Abandono' },

        group_help: { label: 'Ayuda' },
        nav_help_manual: { label: 'Manual de Usuario' },
        nav_help_admin: { label: 'Manual de Administración' },
      },
    },
    crm_service: {
      // The ids this package contributes into the Service app (#2417).
      navigation: {
        nav_account: { label: 'Cuentas' },
        nav_contact: { label: 'Contactos' },
        nav_my_tasks: { label: 'Mis Tareas' },
        nav_my_calendar: { label: 'Mi Calendario' },
        nav_report_churn_signals: { label: 'Señales de Abandono' },
      },
    },
    crm_marketing: {
      // The ids this package contributes into the Marketing app (#2417).
      navigation: {
        nav_lead: { label: 'Prospectos' },
        nav_contact: { label: 'Contactos' },
        nav_account: { label: 'Cuentas' },
        nav_my_tasks: { label: 'Mis Tareas' },
        nav_report_lead_inflow: { label: 'Interacción con Prospectos por Mes' },
      },
    },
    crm_o2c: {
      // The ids this package contributes into the Order to Cash app (#2465).
      navigation: {
        nav_contract: { label: 'Contratos' },
        nav_sales_order: { label: 'Pedidos' },
        nav_account: { label: 'Cuentas' },
        nav_my_tasks: { label: 'Mis Tareas' },
      },
    },
    crm_psa: {
      // The ids this package contributes into the Project Delivery app (#2316).
      navigation: {
        nav_account: { label: 'Cuentas' },
        nav_opportunity: { label: 'Oportunidades' },
        nav_contract: { label: 'Contratos' },
        nav_my_tasks: { label: 'Mis Tareas' },
      },
    },
  },
  messages: {
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.create': 'Crear',
    'common.search': 'Buscar',
    'common.filter': 'Filtrar',
    'common.export': 'Exportar',
    'common.back': 'Volver',
    'common.confirm': 'Confirmar',
    'nav.sales': 'Ventas',
    'nav.service': 'Servicio',
    'nav.marketing': 'Marketing',
    'nav.products': 'Productos',
    'nav.analytics': 'Analítica',
    'success.saved': 'Registro guardado exitosamente',
    'success.converted': 'Prospecto convertido exitosamente',
    'confirm.delete': '¿Está seguro de que desea eliminar este registro?',
    'confirm.convert_lead': '¿Convertir este prospecto en cuenta, contacto y oportunidad?',
    'error.required': 'Este campo es obligatorio',
    'error.load_failed': 'Error al cargar los datos',
  },
  dashboards: {
    sales_activity_dashboard: {
      label: 'Actividad de ventas',
      description: 'Quién habla con los clientes, con qué frecuencia y qué cuentas se han quedado en silencio',
      widgets: {
        interactions_held: { title: 'Interacciones registradas', description: 'Llamadas y reuniones que realmente ocurrieron' },
        meetings_booked: { title: 'Reuniones agendadas', description: 'Reuniones en el calendario que aún no ocurren' },
        customer_minutes: { title: 'Minutos con clientes', description: 'Tiempo total frente a clientes' },
        tasks_completed: { title: 'Tareas completadas', description: 'Seguimientos cerrados — la otra mitad de la actividad' },
        activity_by_rep: { title: 'Actividad por representante', description: 'Interacciones registradas por responsable' },
        activity_by_week: { title: 'Volumen de actividad por semana', description: 'Interacciones por semana' },
        activity_mix: { title: 'Composición de la actividad', description: 'Llamadas vs reuniones vs demostraciones' },
        activity_by_record_type: { title: 'Dónde cae la actividad', description: 'Qué parte del embudo recibe atención' },
        deal_activity: { title: 'Interacciones en oportunidades', description: 'Interacciones vinculadas a una oportunidad' },
        open_deals_for_activity: { title: 'Oportunidades abiertas', description: 'Oportunidades aún en juego' },
        quiet_accounts_30: { title: 'Silencio 30+ días', description: 'Cuentas activas sin interacción en un mes' },
        quiet_accounts_60: { title: 'Silencio 60+ días', description: 'Dos meses de silencio — el umbral de riesgo' },
        quiet_accounts_90: { title: 'Silencio 90+ días', description: 'Un trimestre sin contacto' },
      },
    },
    crm_overview_dashboard: {
      label: 'Resumen CRM',
      description: 'Métricas de ingresos, analítica de pipeline e información de oportunidades',
      widgets: {
        total_revenue: { title: 'Ingresos totales (período seleccionado)', description: 'Ingresos cerrados ganados en el período seleccionado' },
        active_deals: { title: 'Negocios abiertos (período seleccionado)', description: 'Oportunidades abiertas con cierre previsto en el período seleccionado' },
        won_deals: { title: 'Negocios ganados (período seleccionado)', description: 'Negocios cerrados ganados en el período seleccionado' },
        avg_deal_size: { title: 'Tamaño medio del negocio (período seleccionado)', description: 'Valor medio de los negocios cerrados ganados en el período seleccionado' },
        lead_source: { title: 'Origen del prospecto', description: 'Valor del pipeline por canal de adquisición' },
        pipeline_by_stage: { title: 'Pipeline por etapa', description: 'Valor de oportunidades abiertas en cada etapa de venta' },
        pipeline_by_owner: { title: 'Pipeline por responsable', description: 'Valor del pipeline abierto y número de negocios por comercial' },
      },
    },
    executive_dashboard: {
      label: 'Vista ejecutiva',
      description: 'KPI de alto nivel sobre ingresos, clientes y pipeline para la dirección',
      widgets: {
        total_revenue_ytd: { title: 'Ingresos totales (YTD)', description: 'Ingresos cerrados ganados en lo que va del año' },
        total_accounts: { title: 'Cuentas activas', description: 'Clientes con al menos una relación activa' },
        total_contacts: { title: 'Total de contactos', description: 'Personas en nuestra agenda' },
        open_leads: { title: 'Prospectos abiertos', description: 'Prospectos sin convertir en el embudo' },
        revenue_trend: { title: 'Tendencia de ingresos', description: 'Ingresos cerrados ganados de los últimos 12 meses' },
        revenue_by_industry: { title: 'Ingresos por industria', description: 'Ingresos YTD ganados separados por industria del cliente' },
        pipeline_by_stage: { title: 'Pipeline por etapa', description: 'Valor de oportunidades abiertas en cada etapa de venta' },
        new_accounts_by_month: { title: 'Cuentas nuevas', description: 'Ritmo de creación de cuentas en los últimos 6 meses' },
        accounts_by_industry: { title: 'Cuentas por sector', description: 'Ingreso anual total y número de cuentas por sector' },
      },
    },
    sales_dashboard: {
      label: 'Rendimiento de ventas',
      description: 'Analítica de pipeline, tendencias de tasa de éxito y rendimiento de los representantes',
      widgets: {
        total_pipeline_value: { title: 'Pipeline abierto (período seleccionado)', description: 'Valor de las oportunidades abiertas con cierre previsto en el período seleccionado' },
        closed_won_qtd: { title: 'Cerrado ganado (trimestre)', description: 'Ingresos cerrados este trimestre' },
        open_opportunities: { title: 'Negocios abiertos (período seleccionado)', description: 'Oportunidades abiertas con cierre previsto en el período seleccionado' },
        avg_deal_size: { title: 'Tamaño medio del negocio (trimestre)', description: 'Valor medio de los negocios cerrados ganados este trimestre' },
        pipeline_by_stage: { title: 'Pipeline por etapa', description: 'Valor de oportunidades abiertas en cada etapa de venta' },
        pipeline_by_forecast_category: { title: 'Pipeline por categoría de pronóstico', description: 'Pipeline abierto agrupado por categoría de pronóstico de ventas' },
        lead_source_breakdown: { title: 'Origen del prospecto', description: 'De dónde proviene nuestro pipeline' },
        open_pipeline_by_owner: { title: 'Pipeline abierto por responsable', description: 'Valor del pipeline en curso, número de negocios y probabilidad media de cierre por comercial' },
        quota_attainment_by_rep: { title: 'Cumplimiento de cuota por representante', description: 'Cuota del trimestre actual, ingresos cerrados y cumplimiento por representante. Se llena cuando la instantánea nocturna de pronóstico abre el trimestre y un gerente fija cada cuota' },
        pipeline_stage_by_source: { title: 'Pipeline por Etapa × Origen', description: 'Tabla cruzada del importe de oportunidades abiertas por etapa y origen' },
        win_rate_12m: { title: 'Tasa de éxito (12M)', description: 'Negocios ganados como porcentaje de todos los negocios resueltos en los últimos 12 meses' },
        won_deals_12m: { title: 'Negocios ganados (12M)', description: 'El numerador de la tasa de éxito' },
        lost_deals_12m: { title: 'Negocios perdidos (12M)', description: 'La otra mitad del denominador de la tasa de éxito' },
        win_rate_by_owner: { title: 'Ganados / perdidos por representante', description: 'Negocios ganados, negocios perdidos y tasa de éxito por representante — últimos 12 meses' },
        win_rate_by_lead_source: { title: 'Ganados / perdidos por origen del prospecto', description: 'Qué orígenes producen negocios que realmente se cierran — últimos 12 meses' },
        loss_reason_breakdown: { title: 'Por qué perdemos', description: 'Negocios perdidos por motivo — últimos 12 meses' },
      },
    },
  },
  // `title` / `subtitle` son las propiedades del componente `page:header`.
  // Los marcadores `{…}` se sustituyen sobre la cadena TRADUCIDA, así que el
  // token debe conservarse tal cual: traducido, no resuelve y se ve vacío.
  datasets: {
    account_metrics: {
      label: 'Métricas de cuentas',
      description: 'Capa semántica para el recuento de cuentas por sector y tipo',
      dimensions: {
        industry: {
          label: 'Sector',
          description: 'La industria registrada en la cuenta; las cuentas sin industria forman su propio grupo.',
        },
        type: {
          label: 'Tipo',
          description: 'El tipo de cuenta: prospecto, cliente, socio o cliente anterior.',
        },
        created_at: {
          label: 'Creado',
          description: 'El mes en que se creó el registro de la cuenta en el CRM, no la fecha en que la empresa se hizo cliente.',
        },
      },
      measures: {
        account_count: {
          label: 'Cuentas',
          description: 'Cuántos registros de cuenta hay, de todos los tipos: prospectos, clientes, socios y clientes anteriores; agrupe por Tipo para contar solo clientes.',
        },
        annual_revenue_sum: {
          label: 'Ingresos anuales',
          description: 'La suma de los Ingresos Anuales introducidos en las cuentas: el tamaño de las propias empresas clientes, no lo que nos han comprado.',
        },
      },
    },
    contact_metrics: {
      label: 'Métricas de contactos',
      description: 'Capa semántica para el recuento de contactos',
      measures: {
        contact_count: {
          label: 'Contactos',
          description: 'Cuántos registros de contacto hay, las personas de empresas clientes y socias; los prospectos se cuentan aparte y no se incluyen.',
        },
      },
    },
    event_metrics: {
      label: 'Métricas de actividad',
      description: 'Capa semántica para reuniones, llamadas y recencia de interacción',
      dimensions: {
        owner: {
          label: 'Propietario',
          description: 'La persona a la que está asignada la actividad.',
        },
        related_to_type: {
          label: 'Relacionado con',
          description: 'El tipo de registro al que se refiere la actividad: cuenta, contacto, oportunidad, prospecto o caso.',
        },
        start_datetime: {
          label: 'Semana de actividad',
          description: 'La semana en que empieza la actividad, según su hora de inicio; las planificadas aún por llegar caen en semanas futuras.',
        },
        status: {
          label: 'Estado',
          description: 'Si la actividad está Planificada, Realizada, Cancelada o No asistió; solo Realizada significa que el contacto ocurrió.',
        },
        type: {
          label: 'Tipo de actividad',
          description: 'El tipo de actividad: reunión, llamada, demostración, seminario web, visita presencial u otro.',
        },
      },
      measures: {
        avg_minutes: {
          label: 'Duración media',
          description: 'La Duración (minutos) media de una actividad, en todos los estados salvo filtro.',
        },
        event_count: {
          label: 'Actividades',
          description: 'Cuántas actividades hay, en todos los estados, planificadas, realizadas, canceladas y no asistidas; filtre por Realizada para contar el contacto real.',
        },
        total_minutes: {
          label: 'Minutos',
          description: 'La suma de Duración (minutos) de las actividades en vista, en todos los estados salvo filtro; es la duración programada, no el tiempo registrado.',
        },
      },
    },
    forecast_metrics: {
      label: 'Métricas de previsión',
      description: 'Capa semántica para cuota, cumplimiento y cobertura de pipeline por propietario',
      dimensions: {
        owner: {
          label: 'Propietario',
          description: 'El comercial al que pertenece una fila de pronóstico; cada propietario tiene una fila por periodo.',
        },
        period: {
          label: 'Tipo de periodo',
          description: 'Si una fila de pronóstico cubre un mes o un trimestre; elija uno, porque sumar un mes y un trimestre cuenta los mismos tratos dos veces.',
        },
        period_label: {
          label: 'Periodo',
          description: 'El periodo con nombre de una fila de pronóstico, como Q3 2026 o Aug 2026.',
        },
        period_start: {
          label: 'Inicio del periodo',
          description: 'El primer día del periodo del pronóstico, el primero de un mes o de un trimestre.',
        },
      },
      measures: {
        attainment: {
          label: 'Cumplimiento',
          description: 'Closed dividido entre Quota, sumando ambos antes de dividir, así que una cuota grande pesa más que una pequeña; sin cuota queda en blanco, no en cero.',
        },
        closed_sum: {
          label: 'Cerrado',
          description: 'El importe Cerrado Ganado registrado en las filas de pronóstico: lo que los propietarios ya han ganado en el periodo; no incluye pipeline abierto ni tratos perdidos.',
        },
        commit_sum: {
          label: 'Comprometido',
          description: 'El importe Compromiso registrado en las filas de pronóstico: tratos abiertos en la categoría Compromiso; no incluye los de Mejor Caso ni Pipeline.',
        },
        pipeline_sum: {
          label: 'Pipeline',
          description: 'El pipeline abierto registrado en las filas de pronóstico: el importe de los tratos abiertos, en cualquier etapa abierta, que se espera cerrar en el periodo; no incluye ganados ni perdidos.',
        },
        quota_sum: {
          label: 'Cuota',
          description: 'La suma de la Cuota fijada en las filas de pronóstico en vista: el objetivo de ventas. Las filas sin cuota no suman; fije un tipo de periodo o se suman meses y trimestres.',
        },
      },
    },
    lead_metrics: {
      label: 'Métricas de prospectos',
      description: 'Capa semántica para el recuento de prospectos',
      dimensions: {
        created_at: {
          label: 'Creado',
          description: 'La fecha en que se creó el registro del prospecto en el CRM.',
        },
        last_contacted_date: {
          label: 'Último contacto',
          description: 'El mes del último contacto con el prospecto; los nunca contactados forman su propio grupo.',
        },
        lead_source: {
          label: 'Origen',
          description: 'De dónde vino el prospecto, según consta en él; los prospectos sin origen forman su propio grupo.',
        },
        status: {
          label: 'Estado',
          description: 'En qué punto está el prospecto: Nuevo, Contactado, Calificado, No Calificado o Convertido.',
        },
      },
      measures: {
        lead_count: {
          label: 'Prospectos',
          description: 'Cuántos registros de prospecto hay, en todos los estados, incluidos los convertidos y no calificados; agrupe por Estado para contar solo los abiertos.',
        },
      },
    },
    opportunity_metrics: {
      label: 'Métricas de oportunidades',
      description: 'Capa semántica para el recuento y los importes del pipeline de ventas',
      dimensions: {
        account_industry: {
          label: 'Sector de la cuenta',
          description: 'La industria de la cuenta cliente a la que pertenece el trato, leída de la cuenta; los tratos cuya cuenta no tiene industria forman su propio grupo.',
        },
        close_date: {
          label: 'Fecha de cierre',
          description: 'La fecha de cierre por mes natural: la fecha prevista para un trato abierto y la fecha en que cerró para uno ganado o perdido; no es la fecha de creación.',
        },
        close_quarter: {
          label: 'Trimestre de cierre',
          description: 'La misma fecha de cierre agrupada por trimestre natural, para vistas trimestrales; no es un calendario fiscal.',
        },
        forecast_category: {
          label: 'Categoría de previsión',
          description: 'La categoría de pronóstico en la que cuenta el trato: Pipeline, Mejor Caso, Compromiso, Omitida o Cerrada.',
        },
        lead_source: {
          label: 'Origen del prospecto',
          description: 'De dónde vino el trato, según consta en la oportunidad; los tratos sin origen forman su propio grupo.',
        },
        loss_reason: {
          label: 'Motivo de pérdida',
          description: 'Por qué se perdió un trato perdido, registrado al cerrarlo como perdido; los tratos abiertos y ganados no tienen motivo de pérdida.',
        },
        owner: {
          label: 'Propietario',
          description: 'El comercial propietario del trato; los resultados muestran a la persona y cada trato cuenta una vez, solo bajo su propietario actual.',
        },
        stage: {
          label: 'Etapa',
          description: 'Dónde está el trato en el proceso de venta, desde Prospección hasta Cerrada Ganada o Cerrada Perdida; todas las etapas salvo las dos últimas son pipeline abierto.',
        },
        type: {
          label: 'Tipo de negocio',
          description: 'Si el trato es nuevo negocio o una mejora, renovación o expansión con un cliente existente.',
        },
        win_reason: {
          label: 'Motivo de ganancia',
          description: 'Por qué se ganó un trato ganado, registrado al cerrarlo como ganado; los tratos abiertos y perdidos no tienen motivo de ganancia.',
        },
      },
      measures: {
        avg_amount: {
          label: 'Tamaño medio del negocio',
          description: 'El Monto medio de un trato, en todas las etapas, abiertos, ganados y perdidos; los tratos sin monto no entran en la media.',
        },
        avg_probability: {
          label: 'Probabilidad media',
          description: 'La Probabilidad (%) media de los tratos en vista; la probabilidad sigue a la etapa, así que muestra lo avanzados que están, no un pipeline ponderado.',
        },
        decided_count: {
          label: 'Negocios resueltos',
          description: 'Cuántos tratos tienen resultado, Cerrada Ganada o Cerrada Perdida; no cuenta los abiertos. Es el denominador de Win Rate.',
        },
        lost_amount: {
          label: 'Ingresos perdidos',
          description: 'El Monto de los tratos en Cerrada Perdida; no incluye los abiertos ni los ganados.',
        },
        lost_count: {
          label: 'Negocios perdidos',
          description: 'Cuántos tratos están en Cerrada Perdida; no cuenta los abiertos ni los ganados.',
        },
        opp_count: {
          label: 'Oportunidades',
          description: 'Cuántas oportunidades hay, en todas las etapas: abiertas, ganadas y perdidas por igual; Won Deals cuenta solo las ganadas.',
        },
        total_amount: {
          label: 'Importe total',
          description: 'La suma del Monto de todos los tratos en todas las etapas, abiertos, ganados y perdidos, así que no es pipeline abierto ni ingreso ganado hasta filtrarlo por etapa.',
        },
        win_rate: {
          label: 'Tasa de ganancia',
          description: 'Won Deals dividido entre Settled Deals, contado en tratos y no en importe; los tratos abiertos quedan fuera, así que un pipeline lleno no lo baja.',
        },
        won_amount: {
          label: 'Ingresos ganados',
          description: 'El Monto de los tratos en Cerrada Ganada: ingreso de tratos ya firmados. Excluye los abiertos y perdidos, y no es el ingreso anual de una cuenta ni el previsto de un proyecto.',
        },
        won_count: {
          label: 'Negocios ganados',
          description: 'Cuántos tratos están en Cerrada Ganada; no cuenta los abiertos ni los perdidos.',
        },
      },
    },
    task_metrics: {
      label: 'Métricas de tareas',
      description: 'Capa semántica para la carga de trabajo y la finalización de tareas',
      dimensions: {
        due_date: {
          label: 'Fecha de vencimiento',
          description: 'La fecha límite de la tarea; las tareas sin fecha límite forman su propio grupo.',
        },
        is_completed: {
          label: 'Completada',
          description: 'Si la tarea está Completada; cualquier otro estado cuenta como no completada.',
        },
        is_overdue: {
          label: 'Vencida',
          description: 'Si la tarea había pasado su fecha límite sin completarse cuando se guardó por última vez.',
        },
        priority: {
          label: 'Prioridad',
          description: 'La prioridad fijada en la tarea: Baja, Normal, Alta o Urgente.',
        },
        priority_rank: {
          label: 'Urgencia',
          description: 'La prioridad como número para ordenar, de 1 para Baja a 4 para Urgente, y 0 para una tarea sin prioridad.',
        },
        status: {
          label: 'Estado',
          description: 'En qué punto está la tarea: No Iniciada, En Curso, En Espera, Completada o Aplazada.',
        },
        type: {
          label: 'Tipo',
          description: 'El tipo de tarea: llamada, correo, reunión, seguimiento, demostración u otro.',
        },
      },
      measures: {
        avg_progress: {
          label: 'Progreso medio',
          description: 'El Progreso (%) medio de las tareas en vista, incluidas las completadas; una tarea sin progreso fijado cuenta como 0 %.',
        },
        task_count: {
          label: 'Tareas',
          description: 'Cuántas tareas hay, en todos los estados, incluidas las completadas y aplazadas; agrupe por Completada para contar solo el trabajo pendiente.',
        },
      },
    },
  },
  pages: {
    // The contract's two record pages (#2317): its working page and its print page.
    contract_detail_page: {
      label: 'Detalle del Contrato',
      description: 'La página de registro del contrato: el diseño generado, sin ningún espacio reemplazado.',
    },
    contract_print_page: {
      label: 'Documento del Contrato',
      description: 'El contrato como documento imprimible: partes, plazo, valor, facturación, condiciones y firmas.',
    },
  },
  // Screen-flow copy (#1210, #1975). Keyed `flows.<flow>.label`,
  // `screens.<node>.title` and `screens.<node>.fields.<field>.{label,placeholder}`
  // — the keys `os lint`'s `i18n/missing-flow` names, read by the console's
  // flow runner since @objectstack 17.7.0 (the spec's `flows` liveness row is
  // `live` there). A screen with no authored `title` is headed by its node
  // `label` (the executor's `config.title ?? node.label`, measured on
  // 18.0.0-next.0), so each `screens.<node>.title` translates that node label,
  // never the flow label: the dialog shows the flow label as its eyebrow above
  // the title, and the two differ on `lead_conversion`, `quote_generation` and
  // `campaign_enrollment` (#2096). Since
  // 18.0.0-next.0 three more surfaces are keys the engine reads in the run's
  // locale, and `i18n/missing-flow` names each missing one: a select field's
  // `options.<value>` (worded as the object field's own option in this pack),
  // an authored screen `description`, and a refusing `end` node's
  // `refusals.<node>.message`. A translated description or message is a text
  // slot like the one it translates, so a hole in it is `{{ }}`.
  flows: {
    // Draft Contract on an order (#2558). The drafted contract's provenance
    // sentence is TEXT in the organization's language (#2535), one per
    // variant of the draft (`../../flows/_contract-draft.ts`).
    sales_order_draft_contract: {
      label: 'Redactar contrato desde el pedido',
      refusals: {
        refuse_missing: { message: 'Este pedido ya no existe o no puedes abrirlo. No se redactó ningún contrato.' },
        refuse_cancelled: { message: 'Este pedido está cancelado. No se redactó ningún contrato.' },
        refuse_has_contract: { message: 'Este pedido ya tiene su contrato. No se redactó ningún contrato.' },
        refuse_no_contact: { message: 'Un contrato indica su contacto principal: añade primero un contacto al pedido. No se redactó ningún contrato.' },
      },
      screens: {
        result: {
          title: 'Contrato redactado',
          description: 'Se creó un borrador de contrato a partir del pedido {{ orderRecord.order_number }} y quedó vinculado al pedido. Ábrelo para completar el plazo, las fechas y el tipo.',
          fields: { contractLink: { label: 'Contrato' } },
        },
      },
    },
    sales_order_draft_contract_write: {
      label: 'Redactar contrato desde el pedido (escritura)',
      records: Object.fromEntries(CONTRACT_DRAFT_NODE_IDS.map((node) => [node, {
        fields: { description: 'Redactado a partir del pedido {{ order }}' },
      }])),
    },
    // What the sweeps store in a record (#2522, #2535), at
    // `flows.<flow>.records.<node>.fields.<field>`, holes as the source spells them.
    contract_renewal: {
      records: {
        create_renewal_task: { fields: { subject: 'Renovación pendiente: contrato {{ currentContract.contract_number }}' } },
        create_renewal_opp: { fields: { name: 'Renovación — {{ currentContract.contract_number }}', next_step: 'Confirmar las condiciones de renovación con el cliente' } },
      },
    },
    opportunity_stagnation: {
      records: {
        create_followup_task: { fields: { subject: 'Avanzar oportunidad estancada: {{ currentOpp.name | truncate:200 }}' } },
        create_private_followup_task: { fields: { subject: 'Avanzar oportunidad estancada (oportunidad privada)' } },
      },
    },
    // Approval flows (#2060 item 13, C-15): the flow's own `label`, and each
    // `approval` node's step label under `approvals.<node>.label` (spec 18.1.0),
    // the step name the approval request shows the submitter and the approvers.
    account_approval: {
      label: 'Aprobación de Cuenta',
      approvals: {
        account_review: { label: 'Revisión de la Cuenta' },
      },
    },
    lead_conversion_approval: {
      label: 'Aprobación de Conversión del Prospecto',
      approvals: {
        conversion_review: { label: 'Revisión de la Conversión' },
      },
    },
    opportunity_approval: {
      label: 'Aprobación de Grandes Oportunidades',
      approvals: {
        manager_review: { label: 'Revisión del Gerente de Ventas' },
        director_signoff: { label: 'Visto Bueno del Director de Ventas' },
      },
    },
    opportunity_approval_on_create: {
      label: 'Aprobación de Grandes Oportunidades (al crear)',
      approvals: {
        manager_review: { label: 'Revisión del Gerente de Ventas' },
        director_signoff: { label: 'Visto Bueno del Director de Ventas' },
      },
    },
    opportunity_qualification_approval: {
      label: 'Aprobación de Calificación de la Oportunidad',
      approvals: {
        qualification_review: { label: 'Revisión de Calificación' },
      },
    },
    opportunity_status_change_approval: {
      label: 'Aprobación del Cambio de Estado de la Oportunidad',
      approvals: {
        status_review: { label: 'Revisión del Cambio de Estado' },
      },
    },
    lead_conversion: {
      label: 'Proceso de conversión de prospecto',
      screens: {
        screen_1: {
          title: 'Detalles de la Conversión',
          // Three notices, every word translated here: the duplicate note
          // (#2571; its hole holds a space on a clean lead, so `default:`
          // prints the note only on a suspected one), then the account and
          // the contact (#2073 item 8, #2572). In each two-hole pair exactly
          // one hole holds a name and each `default:` is the OTHER branch's
          // words. Keep every hole, in this order, with a `default:` each
          // (see `screen_1` in `lead-conversion.flow.ts`).
          description: '{{ duplicateWarning | default:"Posible duplicado: al registrarlo, el sistema detectó que este prospecto repite un registro existente con la misma dirección de correo. Compare el registro vinculado en la página del prospecto antes de continuar." }} {{ existingAccountName | default:"Ninguna cuenta que usted pueda ver coincide con la empresa de este prospecto, así que la conversión crea una cuenta nueva llamada " }}{{ newAccountName | default:" es la cuenta existente a la que se unirá este prospecto" }}. {{ existingContactName | default:"Ningún contacto que usted pueda ver tiene la dirección de correo de este prospecto, así que la conversión crea un contacto nuevo llamado " }}{{ newContactName | default:" es el contacto existente con la dirección de correo de este prospecto: la conversión une este prospecto a ese contacto y solo rellena su Teléfono, Móvil y Cargo vacíos" }}.',
          fields: {
            createOpportunity: { label: '¿Crear oportunidad?' },
            opportunityName: { label: 'Nombre de Oportunidad' },
            opportunityAmount: { label: 'Monto de la Oportunidad' },
            closeDate: { label: 'Fecha de Cierre' },
          },
        },
        // The result screen (#2297). Same two-hole shape as `screen_1`: exactly
        // one hole holds the account's name, and each `default:` is the OTHER
        // state's words. Keep both holes, in this order, with a `default:` each
        // (see `result` in `lead-conversion.flow.ts`).
        confirm_contact: {
          title: 'Confirmar el contacto',
          description: 'Este prospecto es {{ leadPersonName }}, pero el contacto con la misma dirección de correo es {{ existingContactName }}. La dirección de correo de un contacto es única, así que la conversión une este prospecto a ese contacto; solo rellena su Teléfono, Móvil y Cargo vacíos y no cambia nada más. Si son personas distintas, cancele y cambie primero la dirección de correo del prospecto.',
          fields: {
            matchedContactLink: { label: 'Contacto existente' },
            reuseContactConfirmed: { label: 'Convertir este prospecto en este contacto' },
          },
        },
        result: {
          title: 'Prospecto convertido',
          description: '{{ pendingApprovalAccountName | default:"El prospecto ya forma parte de la cuenta " }}{{ noApprovalAccountName | default:" está pendiente de la aprobación de cuenta de un gerente de ventas" }}.',
          fields: {
            accountLink: { label: 'Cuenta' },
            contactLink: { label: 'Contacto' },
            opportunityLink: { label: 'Oportunidad' },
          },
        },
      },
      refusals: {
        refuse_confirmed_duplicate: {
          message:
            'Conversión rechazada. El Estado del Duplicado de este prospecto es Confirmado: un revisor lo comparó con un registro existente y registró que lo repite. Convertirlo crearía una segunda cuenta, contacto y oportunidad para el mismo comprador. La sección Gestión de Duplicados de este prospecto indica el registro que se conserva; descalifique este prospecto como duplicado. Solo un revisor que cambie ese veredicto vuelve a habilitar la conversión.',
        },
        refuse_unapproved: {
          message:
            'Conversión rechazada. Este prospecto no ha sido aprobado para la conversión. Un aprobador debe darle el visto bueno antes de que pueda convertirse en una cuenta, un contacto y una oportunidad; el campo Aprobación de Conversión del prospecto muestra si la decisión sigue pendiente o fue rechazada. Mientras tanto, siga trabajando el prospecto: nada de él queda bloqueado.',
        },
        refuse_no_match_key: {
          message:
            'Conversión rechazada. La empresa de este prospecto no tiene clave de coincidencia, así que la conversión no puede saber a qué cuenta pertenece y no lo va a adivinar: una suposición podría archivar el contacto y la oportunidad bajo otro cliente. Guardar la Empresa del prospecto reconstruye la clave, así que guárdela de nuevo y luego conviértalo. No se ha creado nada.',
        },
        refuse_contact_not_confirmed: {
          message:
            'No convertido: no confirmó unir este prospecto al contacto existente con la misma dirección de correo. No se creó nada. Si son personas distintas, cambie la dirección de correo del prospecto y conviértalo de nuevo.',
        },
        refuse_nonpositive_amount: {
          message:
            'Conversión rechazada: el monto de una oportunidad debe ser mayor que cero. No se creó nada. Vuelva a convertir el prospecto con el monto que vale el negocio, o deje sin marcar ¿Crear oportunidad? para convertirlo sin una.',
        },
      },
    },
    schedule_followup: {
      label: 'Programar Seguimiento',
      screens: {
        screen_1: {
          title: 'Programar Seguimiento',
          fields: {
            subject: { label: '¿Cuál es el siguiente paso?' },
            dueDate: { label: 'Fecha Límite' },
            activityType: {
              label: 'Tipo de Actividad',
              options: { call: 'Llamada', email: 'Email', meeting: 'Reunión', follow_up: 'Seguimiento', demo: 'Demostración', other: 'Otro' },
            },
            priority: { label: 'Prioridad', options: { low: 'Baja', normal: 'Normal', high: 'Alta', urgent: 'Urgente' } },
            notes: { label: 'Notas' },
          },
        },
      },
    },
  },
  // Shared option lists (`src/<pkg>/picklists/*.picklist.ts`), translated ONCE:
  // every field that references a list (`Field.select({ picklist })`) inherits
  // these option labels, so a field-level `options` entry exists only for a
  // field with inline options of its own.
  picklists: {
    salutation: {
      label: 'Tratamiento',
      options: { mr: 'Sr.', ms: 'Srta.', mrs: 'Sra.', dr: 'Dr.', prof: 'Prof.' },
    },
    industry: {
      label: 'Industria',
      options: {
        technology: 'Tecnología', software: 'Software / SaaS', finance: 'Finanzas',
        healthcare: 'Salud', retail: 'Comercio', manufacturing: 'Manufactura',
        education: 'Educación', real_estate: 'Inmobiliaria', media: 'Medios y Entretenimiento',
        logistics: 'Logística', hospitality: 'Hostelería', energy: 'Energía y Servicios Públicos',
        government: 'Gobierno', nonprofit: 'Sin Ánimo de Lucro', other: 'Otro',
      },
    },
    lead_source: {
      label: 'Origen del Prospecto',
      options: {
        web: 'Web', referral: 'Referencia', event: 'Evento / Feria',
        webinar: 'Seminario Web', partner: 'Socio', advertisement: 'Publicidad',
        paid_search: 'Búsqueda de Pago', social: 'Redes Sociales', content: 'Contenido / Blog',
        cold_call: 'Llamada en Frío', email_campaign: 'Campaña de Email', other: 'Otro',
      },
    },
    payment_terms: {
      label: 'Términos de Pago',
      options: {
        net_15: 'Neto 15', net_30: 'Neto 30', net_60: 'Neto 60',
        net_90: 'Neto 90', due_on_receipt: 'Pago a la Recepción',
      },
    },
    related_to_type: {
      label: 'Tipo de Objeto Relacionado',
      options: {
        crm_account: 'Cuenta', crm_contact: 'Contacto', crm_opportunity: 'Oportunidad',
        crm_lead: 'Prospecto', crm_case: 'Caso',
      },
    },
  },
  // Report index and report page headings (`reports[].label` / `description`).
  reports: {
    accounts_by_industry_type: {
      label: 'Cuentas por Industria y Tipo',
      description: 'Informe matricial de cuentas por industria y tipo',
    },
    customer_churn_signals: {
      label: 'Señales de Abandono',
      description: 'Cuatro paneles apilados de alerta temprana para la retención proactiva: cuentas que un CSM marcó en riesgo o en abandono, cuentas activas sin actividad reciente, cuentas de alto valor silenciosas y oportunidades perdidas recientemente.',
      // Joined-report block headings (translatable since @objectstack/spec 18.3.0).
      blocks: {
        csm_flagged_accounts: {
          label: 'Cuentas marcadas por el CSM',
          description: 'Cuentas que un CSM ha marcado a mano como en riesgo o en abandono, agrupadas por tipo: juicio humano, independiente del reloj de actividad.',
        },
        at_risk_accounts: {
          label: 'Cuentas en riesgo',
          description: 'Cuentas activas sin actividad en 60 días o más, agrupadas por sector.',
        },
        silent_high_value: {
          label: 'Cuentas de alto valor en silencio',
          description: 'Cuentas de nivel Estratégico y Gran Empresa sin actividad desde hace 90 días o más, agrupadas por tipo.',
        },
        recently_closed_lost: {
          label: 'Oportunidades perdidas recientemente',
          description: 'Oportunidades cerradas como perdidas en los últimos 30 días: investígalas antes de que el cliente se vaya del todo.',
        },
      },
    },
    lead_inflow_by_month_source: {
      label: 'Interacción con Prospectos por Mes',
      description: 'Volumen mensual de prospectos contactados, desglosado por canal de adquisición',
    },
    opportunities_by_stage: {
      label: 'Oportunidades por Etapa',
      description: 'Resumen de oportunidades agrupadas por etapa',
    },
    opportunity_funnel_owner_stage: {
      label: 'Embudo por Propietario',
      description: 'Embudo del pipeline etapa por etapa para cada representante',
    },
    pipeline_coverage_by_quarter: {
      label: 'Cobertura del Pipeline por Trimestre',
      description: 'Importe del pipeline abierto por categoría de previsión, agrupado por trimestre de cierre',
    },
    won_opportunities_by_owner: {
      label: 'Oportunidades Ganadas por Propietario',
      description: 'Oportunidades ganadas agrupadas por propietario',
    },
  },
  // Setup → Position Holders (`src/sales/sharing/positions.ts`).
  positions: {
    crm_executive: {
      label: 'Ejecutivo',
      description: 'Dirección de la empresa: lee todo lo que lee un gerente de ventas, mientras los equipos conservan la propiedad, y solo crea y edita sus propias oportunidades.',
    },
    crm_sales_director: {
      label: 'Director de Ventas',
      description: 'Dirige la organización de ventas, da el visto bueno final a las mayores oportunidades, lee todo lo que lee un gerente de ventas y solo edita sus propias oportunidades.',
    },
    crm_sales_manager: {
      label: 'Gerente de Ventas',
      description: 'Dirige un equipo de ventas: aprueba cuentas nuevas, conversiones de prospectos y grandes oportunidades, y edita todas las cuentas de clientes activas.',
    },
    crm_sales_rep: {
      label: 'Representante de Ventas',
      description: 'Trabaja prospectos y oportunidades a diario y recibe prospectos nuevos de la cola de Recepción de Prospectos.',
    },
    crm_service_director: {
      label: 'Director de Servicio',
      description: 'Supervisa la atención al cliente y lee todos los casos críticos abiertos mientras un gerente de servicio los atiende.',
    },
    crm_service_manager: {
      label: 'Gerente de Servicio',
      description: 'Atiende la bolsa de escalados: los casos escalados se asignan a este puesto, que edita todos los casos críticos abiertos.',
    },
    crm_service_agent: {
      label: 'Agente de Servicio',
      description: 'Atiende casos de clientes, recibe casos nuevos de la cola de Recepción de Soporte y reclama los que siguen esperando en ella.',
    },
    crm_marketing_director: {
      label: 'Director de Marketing',
      description: 'Dirige marketing y edita todas las campañas activas, sea quien sea su propietario.',
    },
    crm_marketing_manager: {
      label: 'Gerente de Marketing',
      description: 'Gestiona las campañas de marketing y edita todas las campañas activas, sea quien sea su propietario.',
    },
    crm_marketing_user: {
      label: 'Usuario de Marketing',
      description: 'Planifica y gestiona a diario las campañas de marketing y sus miembros.',
    },
    crm_ar_accountant: {
      label: 'Cuentas por cobrar',
      description: 'Finanzas: registra e importa las facturas y los cobros que ventas ve en cada contrato.',
    },
    crm_project_director: {
      label: 'Director de proyectos',
      description: 'Dirige la entrega de proyectos: gestiona proyectos y consulta cada proyecto, parte de horas y gasto con su coste y margen.',
    },
    crm_pmo: {
      label: 'PMO',
      description: 'La oficina de gestión de proyectos: consulta el coste y margen de cada proyecto, mantiene las tarifas y gestiona proyectos.',
    },
    crm_project_manager: {
      label: 'Jefe de proyecto',
      description: 'Abre y gestiona proyectos, asigna personal según una tarifa y aprueba los partes de horas y gastos del equipo.',
    },
    crm_project_member: {
      label: 'Miembro del equipo de proyecto',
      description: 'Un consultor asignado a proyectos: registra horas y gastos en los proyectos en los que participa.',
    },
    crm_finance_controller: {
      label: 'Controller financiero',
      description: 'Finanzas: vigila el coste y margen de los proyectos, fija sus presupuestos y mantiene las tarifas.',
    },
    crm_na_sales_team: {
      label: 'Equipo de Ventas de Norteamérica',
      description: 'Equipo territorial de Norteamérica: edita todas las cuentas del territorio de Norteamérica.',
    },
    crm_eu_sales_team: {
      label: 'Equipo de Ventas de Europa',
      description: 'Equipo territorial de Europa: edita todas las cuentas del territorio de Europa (EMEA).',
    },
  },
  // Studio → All Metadata Types → Permission Set (`src/sales/profiles/*.profile.ts`).
  permissions: {
    finance_controller: {
      label: 'Controller financiero',
      description: 'Finanzas: consulta cada proyecto, su personal, horas y gastos, edita los presupuestos de proyecto y mantiene las tarifas.',
    },
    project_manager: {
      label: 'Jefe de proyecto',
      description: 'Entrega: abre y gestiona proyectos, asigna personal según una tarifa, registra horas y gastos, y consulta cada cuenta, oportunidad y contrato.',
    },
    project_member: {
      label: 'Miembro del proyecto',
      description: 'Entrega: consulta los proyectos en los que participa y registra sus propios partes de horas y gastos, sin ver las tarifas de coste.',
    },
    ar_accountant: {
      label: 'Cuentas por cobrar',
      description: 'Finanzas: registra e importa las facturas y los cobros de cada contrato, y lee los contratos, las cuentas y los planes de cobro que los respaldan.',
    },
    crm_user: {
      label: 'Usuario de CRM',
      description: 'El valor predeterminado de cada miembro: sus propios prospectos, cuentas, oportunidades y actividades, y catálogos de solo lectura, sin eliminar, exportar, Ver todo ni permisos de sistema.',
    },
    guest_portal: {
      label: 'Invitado (formularios públicos)',
      description: 'Visitantes anónimos de los formularios públicos web-a-prospecto y web-a-caso: envían un prospecto o caso nuevo y no pueden leer, editar ni eliminar nada.',
    },
    marketing_user: {
      label: 'Usuario de Marketing',
      description: 'Personal de marketing: gestiona campañas y sus miembros y lee todos los prospectos, contactos, cuentas y oportunidades para segmentar, pero no ve casos ni elimina ningún registro del CRM.',
    },
    sales_manager: {
      label: 'Gerente de Ventas',
      description: 'Gerentes de ventas: leen, editan, reasignan y eliminan los prospectos, cuentas, oportunidades, cotizaciones y actividades de todos los representantes, sin administración del sistema.',
    },
    sales_rep: {
      label: 'Representante de Ventas',
      description: 'Representantes de ventas: trabajan su propia cartera de prospectos, cuentas, oportunidades, cotizaciones y actividades y leen los catálogos, pero no eliminan ningún registro de cliente.',
    },
    service_agent: {
      label: 'Agente de Servicio',
      description: 'Agentes y gerentes de servicio: atienden sus propios casos, leen las cuentas, contactos y prospectos relacionados y redactan artículos de conocimiento, pero no ven oportunidades.',
    },
    sales_leadership: {
      label: 'Dirección Comercial',
      description: 'Ejecutivos y directores de ventas: leen lo que lee un gerente de ventas, no cambian nada que no sea suyo y crean y editan sus propias oportunidades con el importe.',
    },
    service_director: {
      label: 'Director de Servicio',
      description: 'Dirección de servicio, solo lectura: lee los casos escalados compartidos con el director de servicio, con las cuentas y los contactos que hay detrás.',
    },
    system_admin: {
      label: 'Administrador del Sistema',
      description: 'El operador de una instalación de una sola organización: control total de todos los registros de negocio, más la administración de usuarios, del modelo de seguridad y de la configuración.',
    },
  },
  // Doc book titles and group headings (translatable since @objectstack/spec 18.3.0).
  books: {
    crm_manual: {
      label: 'Manual de Usuario de HotCRM',
      description: 'Cómo funciona HotCRM en ventas: las reglas detrás de las pantallas.',
      groups: {
        start: { label: 'Primeros pasos' },
        sales: { label: 'Ventas' },
        analytics: { label: 'Análisis' },
      },
    },
    crm_admin_manual: {
      label: 'Manual de Administración de HotCRM',
      description: 'Puesta en marcha, accesos, cada umbral automatizado y la importación de datos, para administradores.',
      groups: {
        admin: { label: 'Administración' },
      },
    },
  },
  // An import mapping's label, as the import wizard offers it (a key
  // since 18.6.0; before it the wizard showed the English text in every locale).
  mappings: {
    crm_account_import: { label: 'Importación de cuentas (CSV)' },
    crm_contact_import: { label: 'Importación de contactos (CSV)' },
    crm_lead_import: { label: 'Importación de prospectos (CSV)' },
  },
};
