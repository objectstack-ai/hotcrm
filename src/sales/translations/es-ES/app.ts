// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

import { QUOTE_DISCOUNT_CEILING } from '../../objects/_thresholds';

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
  apps: {
    crm_enterprise: {
      label: 'HotCRM',
      description: 'Gestión de relaciones con clientes para ventas, servicio y marketing',
      // Indexado por el `id` del nodo de navegación (espacio de nombres plano,
      // sea cual sea la profundidad del nodo).
      navigation: {
        group_activity: { label: 'Actividad' },
        nav_event: { label: 'Eventos' },
        nav_activity_dashboard: { label: 'Actividad de Ventas' },
        nav_my_calendar: { label: 'Mi Calendario' },
        nav_home: { label: 'Inicio' },
        nav_sales_home: { label: 'Inicio de Ventas' },

        group_sales: { label: 'Ventas' },
        nav_lead: { label: 'Prospectos' },
        nav_account: { label: 'Cuentas' },
        nav_contact: { label: 'Contactos' },
        nav_opportunity: { label: 'Oportunidades' },
        nav_quote: { label: 'Cotizaciones' },
        nav_contract: { label: 'Contratos' },
        nav_product: { label: 'Productos' },
        nav_price_book: { label: 'Listas de Precios' },
        nav_sales_dashboard: { label: 'Rendimiento de Ventas' },

        group_work: { label: 'Mi Trabajo' },
        nav_my_tasks: { label: 'Mis Tareas' },
        nav_my_deals: { label: 'Mis Negocios' },
        nav_my_leads: { label: 'Mis Prospectos' },
        nav_my_cases: { label: 'Mis Casos' },
        nav_approval_requests: { label: 'Bandeja de Entrada' },

        group_service: { label: 'Servicio' },
        nav_case: { label: 'Casos' },
        nav_knowledge: { label: 'Conocimiento' },
        nav_service_dashboard: { label: 'Resumen de Servicio' },

        group_marketing: { label: 'Marketing' },
        nav_campaign: { label: 'Campañas' },

        group_insights: { label: 'Análisis' },
        nav_crm_dashboard: { label: 'Resumen CRM' },
        nav_forecast: { label: 'Previsiones' },

        group_reports: { label: 'Informes' },
        nav_report_opportunities_by_stage: { label: 'Oportunidades por Etapa' },
        nav_report_won_by_owner: { label: 'Ganadas por Propietario' },
        nav_report_pipeline_coverage: { label: 'Cobertura del Pipeline' },
        nav_report_funnel_by_owner: { label: 'Embudo por Propietario' },
        nav_report_lead_inflow: { label: 'Interacción con Prospectos' },
        nav_report_accounts_by_industry: { label: 'Cuentas por Industria y Tipo' },
        nav_report_churn_signals: { label: 'Señales de Abandono' },
        nav_report_cases_by_status: { label: 'Casos por Estado y Prioridad' },
        nav_report_sla: { label: 'Cumplimiento de SLA' },
        nav_report_cases_opened_by_day: { label: 'Casos Abiertos por Día' },

        group_help: { label: 'Ayuda' },
        nav_help_manual: { label: 'Manual de Usuario' },
        nav_help_admin: { label: 'Manual de Administración' },
        nav_help_revenue: { label: 'Manual de Ingresos' },
        nav_help_marketing: { label: 'Manual de Marketing' },
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
        revenue_trends: { title: 'Tendencia de ingresos', description: 'Ingresos cerrados ganados de los últimos 12 meses' },
        lead_source: { title: 'Origen del prospecto', description: 'Valor del pipeline por canal de adquisición' },
        pipeline_by_stage: { title: 'Pipeline por etapa', description: 'Valor de oportunidades abiertas en cada etapa de venta' },
        top_products: { title: 'Productos principales', description: 'Ingresos a precio de lista por categoría de producto' },
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
        monthly_revenue_trend: { title: 'Tendencia mensual de ingresos', description: 'Ingresos cerrados ganados de los últimos 12 meses' },
        pipeline_by_forecast_category: { title: 'Pipeline por categoría de pronóstico', description: 'Pipeline abierto agrupado por categoría de pronóstico de ventas' },
        lead_source_breakdown: { title: 'Origen del prospecto', description: 'De dónde proviene nuestro pipeline' },
        open_pipeline_by_owner: { title: 'Pipeline abierto por responsable', description: 'Valor del pipeline en curso, número de negocios y probabilidad media de cierre por comercial' },
        quota_attainment_by_rep: { title: 'Cumplimiento de cuota por representante', description: 'Cuota del trimestre actual, ingresos cerrados y cumplimiento por representante, según instantáneas de pronóstico' },
        pipeline_stage_by_source: { title: 'Pipeline por Etapa × Origen', description: 'Tabla cruzada del importe de oportunidades abiertas por etapa y origen' },
        win_rate_12m: { title: 'Tasa de éxito (12M)', description: 'Negocios ganados como porcentaje de todos los negocios resueltos en los últimos 12 meses' },
        won_deals_12m: { title: 'Negocios ganados (12M)', description: 'El numerador de la tasa de éxito' },
        lost_deals_12m: { title: 'Negocios perdidos (12M)', description: 'La otra mitad del denominador de la tasa de éxito' },
        win_rate_by_owner: { title: 'Ganados / perdidos por representante', description: 'Negocios ganados, negocios perdidos y tasa de éxito por representante — últimos 12 meses' },
        win_rate_by_lead_source: { title: 'Ganados / perdidos por origen del prospecto', description: 'Qué orígenes producen negocios que realmente se cierran — últimos 12 meses' },
        loss_reason_breakdown: { title: 'Por qué perdemos', description: 'Negocios perdidos por motivo — últimos 12 meses' },
      },
    },
    service_dashboard: {
      label: 'Servicio al cliente',
      description: 'Carga de casos, salud del SLA y rendimiento de resolución',
      widgets: {
        open_cases: { title: 'Casos abiertos', description: 'Casos que aún no se han cerrado' },
        critical_cases: { title: 'Casos críticos', description: 'Casos abiertos marcados como prioridad crítica' },
        avg_resolution_time: { title: 'Tiempo medio de resolución', description: 'Tiempo medio hasta el cierre, en horas' },
        sla_violations: { title: 'Incumplimientos de SLA', description: 'Casos que incumplieron su SLA' },
        cases_by_status: { title: 'Casos por estado', description: 'Distribución de la carga a lo largo del pipeline' },
        cases_by_priority: { title: 'Casos por prioridad', description: 'Mezcla de casos abiertos por urgencia' },
        cases_by_origin: { title: 'Casos por origen', description: 'De dónde provienen nuestros casos' },
        daily_case_volume: { title: 'Volumen diario de casos', description: 'Casos nuevos creados en los últimos 30 días' },
        sla_compliance_gauge: { title: 'Cumplimiento de SLA', description: 'Porcentaje de casos resueltos dentro del SLA en este período' },
        kb_deflection_rate: { title: 'Tasa de Desvío por KB', description: 'Proporción de casos cerrados resueltos con un artículo de la base de conocimiento' },
        kb_resolved_cases: { title: 'Resueltos por KB', description: 'Casos cerrados que señalan el artículo que los resolvió' },
        closed_cases_total: { title: 'Casos Cerrados', description: 'El denominador de la tasa de desvío' },
        top_resolving_articles: { title: 'Artículos que Más Resuelven', description: 'Artículos de la base de conocimiento ordenados por los casos cerrados que resolvieron' },
        my_open_cases_by_priority: { title: 'Mis casos abiertos por prioridad', description: 'Tus casos abiertos y su tasa de incumplimiento de SLA, desglosados por prioridad' },
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
        },
        type: {
          label: 'Tipo',
        },
        created_at: {
          label: 'Creado',
        },
      },
      measures: {
        account_count: {
          label: 'Cuentas',
        },
        annual_revenue_sum: {
          label: 'Ingresos anuales',
        },
      },
    },
    case_metrics: {
      label: 'Métricas de casos',
      description: 'Capa semántica para el recuento de casos, el tiempo de resolución y el SLA',
      dimensions: {
        created_at: {
          label: 'Creado',
        },
        origin: {
          label: 'Origen',
        },
        priority: {
          label: 'Prioridad',
        },
        resolved_article: {
          label: 'Artículo de resolución',
        },
        status: {
          label: 'Estado',
        },
        type: {
          label: 'Tipo',
        },
      },
      measures: {
        avg_resolution: {
          label: 'Resolución media (h)',
        },
        avg_sla_violated: {
          label: 'Tasa de incumplimiento del SLA',
        },
        case_count: {
          label: 'Casos',
        },
        closed_count: {
          label: 'Casos cerrados',
        },
        kb_deflection_rate: {
          label: 'Tasa de desvío por base de conocimiento',
        },
        kb_resolved_count: {
          label: 'Resueltos por base de conocimiento',
        },
        sla_compliance_rate: {
          label: 'Tasa de cumplimiento del SLA',
        },
        sla_met_count: {
          label: 'Casos dentro del SLA',
        },
      },
    },
    contact_metrics: {
      label: 'Métricas de contactos',
      description: 'Capa semántica para el recuento de contactos',
      measures: {
        contact_count: {
          label: 'Contactos',
        },
      },
    },
    event_metrics: {
      label: 'Métricas de actividad',
      description: 'Capa semántica para reuniones, llamadas y recencia de interacción',
      dimensions: {
        owner: {
          label: 'Propietario',
        },
        related_to_type: {
          label: 'Relacionado con',
        },
        start_datetime: {
          label: 'Semana de actividad',
        },
        status: {
          label: 'Estado',
        },
        type: {
          label: 'Tipo de actividad',
        },
      },
      measures: {
        avg_minutes: {
          label: 'Duración media',
        },
        event_count: {
          label: 'Actividades',
        },
        total_minutes: {
          label: 'Minutos',
        },
      },
    },
    forecast_metrics: {
      label: 'Métricas de previsión',
      description: 'Capa semántica para cuota, cumplimiento y cobertura de pipeline por propietario',
      dimensions: {
        owner: {
          label: 'Propietario',
        },
        period: {
          label: 'Tipo de periodo',
        },
        period_label: {
          label: 'Periodo',
        },
        period_start: {
          label: 'Inicio del periodo',
        },
      },
      measures: {
        attainment: {
          label: 'Cumplimiento',
        },
        closed_sum: {
          label: 'Cerrado',
        },
        commit_sum: {
          label: 'Comprometido',
        },
        pipeline_sum: {
          label: 'Pipeline',
        },
        quota_sum: {
          label: 'Cuota',
        },
      },
    },
    lead_metrics: {
      label: 'Métricas de prospectos',
      description: 'Capa semántica para el recuento de prospectos',
      dimensions: {
        created_at: {
          label: 'Creado',
        },
        last_contacted_date: {
          label: 'Último contacto',
        },
        lead_source: {
          label: 'Origen',
        },
        status: {
          label: 'Estado',
        },
      },
      measures: {
        lead_count: {
          label: 'Prospectos',
        },
      },
    },
    opportunity_metrics: {
      label: 'Métricas de oportunidades',
      description: 'Capa semántica para el recuento y los importes del pipeline de ventas',
      dimensions: {
        account_industry: {
          label: 'Sector de la cuenta',
        },
        close_date: {
          label: 'Fecha de cierre',
        },
        close_quarter: {
          label: 'Trimestre de cierre',
        },
        forecast_category: {
          label: 'Categoría de previsión',
        },
        lead_source: {
          label: 'Origen del prospecto',
        },
        loss_reason: {
          label: 'Motivo de pérdida',
        },
        owner: {
          label: 'Propietario',
        },
        stage: {
          label: 'Etapa',
        },
        type: {
          label: 'Tipo de negocio',
        },
        win_reason: {
          label: 'Motivo de ganancia',
        },
      },
      measures: {
        avg_amount: {
          label: 'Tamaño medio del negocio',
        },
        avg_probability: {
          label: 'Probabilidad media',
        },
        decided_count: {
          label: 'Negocios resueltos',
        },
        lost_amount: {
          label: 'Ingresos perdidos',
        },
        lost_count: {
          label: 'Negocios perdidos',
        },
        opp_count: {
          label: 'Oportunidades',
        },
        total_amount: {
          label: 'Importe total',
        },
        win_rate: {
          label: 'Tasa de ganancia',
        },
        won_amount: {
          label: 'Ingresos ganados',
        },
        won_count: {
          label: 'Negocios ganados',
        },
      },
    },
    product_metrics: {
      label: 'Métricas de productos',
      description: 'Capa semántica para el recuento del catálogo y el precio de lista',
      dimensions: {
        category: {
          label: 'Categoría',
        },
      },
      measures: {
        list_price_sum: {
          label: 'Precio de lista total',
        },
        product_count: {
          label: 'Productos',
        },
      },
    },
    task_metrics: {
      label: 'Métricas de tareas',
      description: 'Capa semántica para la carga de trabajo y la finalización de tareas',
      dimensions: {
        due_date: {
          label: 'Fecha de vencimiento',
        },
        is_completed: {
          label: 'Completada',
        },
        is_overdue: {
          label: 'Vencida',
        },
        priority: {
          label: 'Prioridad',
        },
        priority_rank: {
          label: 'Urgencia',
        },
        status: {
          label: 'Estado',
        },
        type: {
          label: 'Tipo',
        },
      },
      measures: {
        avg_progress: {
          label: 'Progreso medio',
        },
        task_count: {
          label: 'Tareas',
        },
      },
    },
  },
  pages: {
    account_detail_page: {
      label: 'Detalle de Cuenta',
      description: 'Página de registro de cuenta por slots: cabecera personalizada + feed de discusión permanente.',
      title: '{name}',
      subtitle: '{industry} · {type}',
      components: {
        account_chatter: { label: 'Discusión' },
      },
    },
    account_workbench: {
      label: 'Mesa de Trabajo de Cuentas',
      description: 'Lista de cuentas curada para el equipo comercial: solo filtros rápidos, sin gestión de vistas.',
    },
    case_detail_page: {
      label: 'Detalle de Caso',
      description: 'Página de caso para el agente de servicio: datos destacados, progreso del SLA, detalles y cronología de actividad.',
      title: '{case_number} · {subject}',
      subtitle: '{crm_account}',
      components: {
        case_highlights: { label: 'Información Clave' },
        case_status_path: { label: 'Progreso del Estado del Caso' },
        case_details: { label: 'Detalles del Caso' },
        // `page:tabs` item labels, keyed by each item's `value` (spec 18.1.0,
        // `pages.PAGE.components.TABS.items.VALUE.label`).
        case_main_tabs: { items: { details: { label: 'Detalles' }, related: { label: 'Relacionado' }, activity: { label: 'Actividad' } } },
      },
    },
    lead_detail_page: {
      label: 'Detalle de Prospecto',
      description: 'Página completa de detalle del prospecto, con datos destacados, detalles e información relacionada',
      title: '{first_name} {last_name}',
      subtitle: '{company}',
      components: {
        lead_duplicate_alert_confirmed: { label: 'Aviso de duplicado confirmado' },
        lead_duplicate_alert_suspected: { label: 'Aviso de duplicado sospechoso' },
        lead_highlights: { label: 'Información Clave' },
        lead_path: { label: 'Progreso del Estado del Prospecto' },
        main_tabs: { label: 'Pestañas de Información del Prospecto' },
        lead_details: { label: 'Detalles del Prospecto' },
        related_accordion: { label: 'Registros Relacionados' },
        related_tasks: { title: 'Tareas Abiertas', label: 'Tareas' },
        lead_activity: { label: 'Cronología de Actividad' },
        lead_history: { label: 'Historial de Campos' },
      },
    },
    opportunity_detail_page: {
      label: 'Detalle de Oportunidad',
      description: 'Página completa de detalle de la oportunidad, con recorrido de etapas, datos destacados, detalles y listas relacionadas',
      title: '{name}',
      subtitle: '{crm_account}',
      components: {
        opp_highlights: { label: 'Información Clave' },
        opp_stage_path: { label: 'Progreso de Etapa de la Oportunidad' },
        opp_approval_pending_manager: { label: 'Pendiente de aprobación del Gerente de Ventas' },
        opp_approval_pending_director: { label: 'Pendiente de aprobación del Gerente y del Director de Ventas' },
        opp_details: { label: 'Detalles de la Oportunidad' },
        // `page:tabs` item labels, keyed by each item's `value` (spec 18.1.0,
        // `pages.PAGE.components.TABS.items.VALUE.label`).
        opp_main_tabs: { items: { details: { label: 'Detalles' }, related: { label: 'Relacionado' }, activity: { label: 'Actividad' } } },
      },
    },
    sales_home_page: {
      label: 'Inicio de Ventas',
      description: 'Página de inicio del equipo comercial con métricas clave, mi trabajo pendiente y próximos eventos',
      components: {
        kpi_revenue_won: {
          label: 'Ingresos totales (todas las fechas)',
        },
        kpi_deals_won: {
          label: 'Negocios ganados (todas las fechas)',
        },
        kpi_pipeline_value: {
          label: 'Pipeline abierto (todas las fechas)',
        },
        kpi_open_leads: {
          label: 'Prospectos abiertos',
        },
        home_upcoming_events: {
          label: '📅 Próximos · Más cercanos primero',
        },
        key_metrics: { title: 'Indicadores Clave de Rendimiento', label: 'Métricas Clave' },
        // `page:tabs` item labels, keyed by each item's `value` (#2284, spec 18.1.0,
        // `pages.PAGE.components.TABS.items.VALUE.label`).
        home_tabs: {
          label: 'Pestañas de Inicio',
          items: {
            my_leads: { label: 'Mis Prospectos' },
            my_open_deals: { label: 'Mis Negocios Abiertos' },
            my_open_tasks: { label: 'Mis Tareas Abiertas' },
          },
        },
        home_my_leads: { label: 'Mis Prospectos' },
        home_my_deals: { label: 'Mis Negocios Abiertos' },
        home_my_tasks: { label: 'Mis Tareas Abiertas' },
        upcoming_events: { title: 'Próximos Eventos', label: 'Próximos Eventos' },
      },
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
  // The discount ceiling is interpolated from `QUOTE_DISCOUNT_CEILING`, never
  // retyped: the number lives in `_thresholds.ts` alone (#1711).
  flows: {
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
    campaign_lead_member_enroll: {
      refusals: {
        refuse_campaign_not_open: {
          message:
            '{{ campaignRecord.display_title | default: "La campaña elegida" }} no está abierta a inscripciones o ya no existe: solo una campaña en Planificación o En Curso admite miembros. No se inscribió a nadie.',
        },
        refuse_lead_opted_out: {
          message: '{{ leadRecord.first_name }} {{ leadRecord.last_name }} se dio de baja del correo electrónico, así que el prospecto no se añadió a la campaña.',
        },
      },
    },
    campaign_contact_member_enroll: {
      refusals: {
        refuse_campaign_not_open: {
          message:
            '{{ campaignRecord.display_title | default: "La campaña elegida" }} no está abierta a inscripciones o ya no existe: solo una campaña en Planificación o En Curso admite miembros. No se inscribió a nadie.',
        },
        refuse_contact_opted_out: {
          message: '{{ contactRecord.full_name | default: "Este contacto" }} se dio de baja del correo electrónico, así que el contacto no se añadió a la campaña.',
        },
      },
    },
    campaign_enrollment: {
      label: 'Inscribir miembros en la campaña',
      successMessage: 'Inscripción en la campaña terminada.',
      refusals: {
        end_refused: {
          message:
            'Inscripción rechazada para {{refusedCount}} de las personas seleccionadas: {{enrolledCount}} agregadas, {{alreadyCount}} ya eran miembros, {{skippedCount}} omitidas porque se dieron de baja del correo o no tienen dirección de correo, {{refusedCount}} rechazadas. Una persona rechazada no se añadió a la campaña; el registro de la ejecución del flujo indica el motivo de cada una.',
        },
        refuse_not_open: {
          message:
            'Esta campaña no está abierta a inscripciones o ya no existe: solo una campaña en Planificación o En Curso admite miembros. No se inscribió a nadie.',
        },
      },
      screens: {
        screen_1: {
          title: 'Criterios de Inscripción',
          fields: {
            memberSource: { label: 'Tipo de miembro a inscribir', options: { leads: 'Prospectos', contacts: 'Contactos' } },
            leadStatus: { label: 'Inscribir prospectos con estado', options: { new: 'Nuevo', contacted: 'Contactado', qualified: 'Calificado' } },
            contactDepartment: {
              label: 'Inscribir contactos del departamento',
              options: { executive: 'Ejecutivo', sales: 'Ventas', marketing: 'Marketing', engineering: 'Ingeniería', support: 'Soporte', finance: 'Finanzas', hr: 'Recursos Humanos', operations: 'Operaciones' },
            },
          },
        },
        result: {
          title: 'Resultado de la inscripción',
          description: '{{enrolledCount}} agregadas a la campaña, {{alreadyCount}} ya eran miembros, {{skippedCount}} omitidas porque se dieron de baja del correo o no tienen dirección de correo.',
          fields: { campaignLink: { label: 'Campaña' } },
        },
      },
    },
    escalate_case: {
      label: 'Escalar Caso',
      screens: { screen_1: { title: 'Escalar Caso', fields: { reason: { label: 'Motivo de Escalación' } } } },
    },
    close_case: {
      label: 'Cerrar Caso',
      screens: {
        screen_1: {
          title: 'Cerrar Caso',
          fields: {
            resolution: { label: 'Resolución' },
            resolved_by_article: { label: 'Resuelto con artículo (opcional)' },
          },
        },
      },
    },
    claim_case: {
      label: 'Tomar Caso',
      screens: {
        screen_1: {
          title: 'Tomar Caso',
          fields: {
            claimStatus: {
              label: 'Estado de trabajo',
              options: { in_progress: 'En Curso', waiting_customer: 'Esperando al Cliente', waiting_support: 'Esperando a Soporte' },
            },
          },
        },
      },
    },
    lead_conversion: {
      label: 'Proceso de conversión de prospecto',
      screens: {
        screen_1: {
          title: 'Detalles de la Conversión',
          // The duplicate warning's text is a variable the flow assigns; this
          // key can only carry the hole that shows it. The account notice
          // after it is translated here (#2073 item 8): exactly one of the two
          // holes holds a name, and each hole's `default:` is the OTHER
          // branch's words, so the sentence stays name-first. Keep both holes,
          // in this order, with a `default:` each (see `screen_1` in
          // `lead-conversion.flow.ts`).
          description: '{{duplicateWarning}} {{ existingAccountName | default:"Ninguna cuenta que usted pueda ver coincide con la empresa de este prospecto, así que la conversión crea una cuenta nueva llamada " }}{{ newAccountName | default:" es la cuenta existente a la que se unirá este prospecto" }}.',
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
        result: {
          title: 'Prospecto convertido',
          description: '{{ pendingApprovalAccountName | default:"No hay ninguna aprobación de cuenta pendiente para " }}{{ noApprovalAccountName | default:" está pendiente de la aprobación de cuenta de un gerente de ventas" }}.',
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
    quote_generation: {
      label: 'Generar cotización desde la oportunidad',
      refusals: { refuse_held: { message: 'Primero va la aprobación de calificación: marque Solicitar Aprobación de Calificación. No se creó nada.' } },
      screens: {
        screen_1: {
          title: 'Detalles de la Cotización',
          fields: {
            quoteName: { label: 'Nombre de Cotización' },
            expirationDays: { label: 'Válida por (días)' },
            discount: { label: `Descuento % (≤ ${QUOTE_DISCOUNT_CEILING})`, placeholder: `0-${QUOTE_DISCOUNT_CEILING}` },
          },
        },
        result: {
          title: 'Cotización creada',
          description: 'La cotización «{{ quoteName }}» se creó como borrador. Ábrala para revisar el precio y continuar.',
          fields: {
            quoteLink: { label: 'Cotización' },
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
    },
    lead_inflow_by_month_source: {
      label: 'Interacción con Prospectos por Mes × Origen',
      description: 'Volumen mensual de prospectos contactados, desglosado por canal de adquisición',
    },
    opportunities_by_stage: {
      label: 'Oportunidades por Etapa',
      description: 'Resumen de oportunidades agrupadas por etapa',
    },
    opportunity_funnel_owner_stage: {
      label: 'Embudo de Oportunidades por Propietario → Etapa',
      description: 'Embudo del pipeline etapa por etapa para cada representante',
    },
    pipeline_coverage_by_quarter: {
      label: 'Cobertura del Pipeline por Previsión × Trimestre',
      description: 'Importe del pipeline abierto por categoría de previsión, agrupado por trimestre de cierre',
    },
    won_opportunities_by_owner: {
      label: 'Oportunidades Ganadas por Propietario',
      description: 'Oportunidades ganadas agrupadas por propietario',
    },
    cases_by_status_priority: {
      label: 'Casos por Estado y Prioridad',
      description: 'Resumen de casos por estado y prioridad',
    },
    sla_performance: {
      label: 'Informe de Cumplimiento de SLA',
      description: 'Análisis del cumplimiento de los SLA',
    },
    cases_opened_by_day_priority: {
      label: 'Casos Abiertos por Prioridad × Día',
      description: 'Entrada diaria de casos desglosada por prioridad',
    },
  },
  // Setup → Positions (`src/sales/sharing/positions.ts`).
  positions: {
    executive: {
      label: 'Ejecutivo',
      description: 'Dirección de la empresa: lee todas las grandes oportunidades abiertas de todo el pipeline, mientras el equipo de la oportunidad conserva la propiedad.',
    },
    sales_director: {
      label: 'Director de Ventas',
      description: 'Dirige la organización de ventas, da el visto bueno final a las mayores oportunidades y lee todas las grandes oportunidades abiertas.',
    },
    sales_manager: {
      label: 'Gerente de Ventas',
      description: 'Dirige un equipo de ventas: aprueba cuentas nuevas, conversiones de prospectos y grandes oportunidades, y edita todas las cuentas de clientes activas.',
    },
    sales_rep: {
      label: 'Representante de Ventas',
      description: 'Trabaja prospectos y oportunidades a diario y recibe prospectos nuevos por asignación rotativa.',
    },
    service_director: {
      label: 'Director de Servicio',
      description: 'Supervisa la atención al cliente y lee todos los casos críticos abiertos mientras un gerente de servicio los atiende.',
    },
    service_manager: {
      label: 'Gerente de Servicio',
      description: 'Atiende la bolsa de escalados: los casos escalados se asignan a este puesto, que edita todos los casos críticos abiertos.',
    },
    service_agent: {
      label: 'Agente de Servicio',
      description: 'Atiende casos de clientes, recibe casos nuevos por asignación rotativa y toma casos sin asignar de la cola de clasificación.',
    },
    marketing_director: {
      label: 'Director de Marketing',
      description: 'Dirige marketing y edita todas las campañas activas, sea quien sea su propietario.',
    },
    marketing_manager: {
      label: 'Gerente de Marketing',
      description: 'Gestiona las campañas de marketing y edita todas las campañas activas, sea quien sea su propietario.',
    },
    marketing_user: {
      label: 'Usuario de Marketing',
      description: 'Planifica y gestiona a diario las campañas de marketing y sus miembros.',
    },
    na_sales_team: {
      label: 'Equipo de Ventas de Norteamérica',
      description: 'Equipo territorial de Norteamérica: edita todas las cuentas del territorio de Norteamérica.',
    },
    eu_sales_team: {
      label: 'Equipo de Ventas de Europa',
      description: 'Equipo territorial de Europa: edita todas las cuentas del territorio de Europa (EMEA).',
    },
  },
  // Setup → Permission Sets (`src/sales/profiles/*.profile.ts`).
  permissions: {
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
    system_admin: {
      label: 'Administrador del Sistema',
      description: 'El operador de una instalación de una sola organización: control total de todos los registros de negocio, más la administración de usuarios, del modelo de seguridad y de la configuración.',
    },
  },
};
