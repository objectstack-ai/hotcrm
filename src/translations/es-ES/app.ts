// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * Español (es-ES) — every translation namespace EXCEPT `objects`:
 * `apps`, `messages`, `dashboards`, `datasets`, `pages`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/translations/es-ES.ts`.
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

        group_sales: { label: 'Ventas' },
        nav_lead: { label: 'Prospectos' },
        nav_account: { label: 'Cuentas' },
        nav_account_workbench: { label: 'Mesa de Trabajo de Cuentas' },
        nav_contact: { label: 'Contactos' },
        nav_opportunity: { label: 'Oportunidades' },
        nav_quote: { label: 'Cotizaciones' },
        nav_contract: { label: 'Contratos' },
        nav_product: { label: 'Productos' },
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
        nav_report_pipeline_coverage: { label: 'Cobertura del Pipeline' },
        nav_report_lead_inflow: { label: 'Entrada de Prospectos' },
        nav_report_sla: { label: 'Cumplimiento de SLA' },
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
        total_revenue: { title: 'Ingresos totales', description: 'Ingresos cerrados ganados en este período' },
        active_deals: { title: 'Negocios activos', description: 'Oportunidades abiertas en el pipeline' },
        won_deals: { title: 'Negocios ganados', description: 'Negocios cerrados ganados en este período' },
        avg_deal_size: { title: 'Tamaño medio del negocio', description: 'Valor medio de los negocios cerrados ganados' },
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
        total_pipeline_value: { title: 'Pipeline total', description: 'Suma del valor de las oportunidades abiertas' },
        closed_won_qtd: { title: 'Cerrado ganado (trimestre)', description: 'Ingresos cerrados este trimestre' },
        open_opportunities: { title: 'Oportunidades abiertas', description: 'Negocios activos en curso' },
        avg_deal_size: { title: 'Tamaño medio del negocio', description: 'Valor medio de los negocios cerrados ganados este trimestre' },
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
        open_cases_by_priority: { title: 'Casos abiertos por prioridad', description: 'Casos abiertos y su tasa de incumplimiento de SLA, desglosados por prioridad' },
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
        created_date: {
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
    },
    account_workbench: {
      label: 'Mesa de Trabajo de Cuentas',
      description: 'Lista de cuentas curada para el equipo comercial: solo filtros rápidos, sin gestión de vistas.',
    },
    app_launcher_page: {
      label: 'Lanzador de Aplicaciones',
      description: 'Punto de acceso central a todas las aplicaciones',
      subtitle: 'Seleccione una aplicación para empezar',
      components: {
        app_search: { label: 'Buscar Aplicaciones' },
        app_grid: { label: 'Cuadrícula de Aplicaciones' },
      },
    },
    case_detail_page: {
      label: 'Detalle de Caso',
      description: 'Página de caso para el agente de servicio: datos destacados, progreso del SLA, detalles y cronología de actividad.',
      title: '{case_number} · {subject}',
      subtitle: '{crm_account}',
      components: {
        case_highlights: { label: 'Información Clave' },
        case_status_path: { label: 'Progreso del Estado del Caso' },
      },
    },
    lead_detail_page: {
      label: 'Detalle de Prospecto',
      description: 'Página completa de detalle del prospecto, con datos destacados, detalles e información relacionada',
      title: '{first_name} {last_name}',
      subtitle: '{company}',
      components: {
        lead_duplicate_alert: { label: 'Aviso de duplicado' },
        lead_highlights: { label: 'Información Clave' },
        lead_path: { label: 'Progreso del Estado del Prospecto' },
        main_tabs: { label: 'Pestañas de Información del Prospecto' },
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
      },
    },
    sales_home_page: {
      label: 'Inicio de Ventas',
      description: 'Página de inicio del equipo comercial con métricas clave y acciones rápidas',
      title: 'Panel de Ventas',
      subtitle: 'Bienvenido de nuevo',
      components: {
        kpi_revenue_won: {
          label: 'Ingresos (ganados)',
        },
        kpi_deals_won: {
          label: 'Negocios ganados',
        },
        kpi_pipeline_value: {
          label: 'Valor del pipeline',
        },
        kpi_open_leads: {
          label: 'Prospectos abiertos',
        },
        home_upcoming_events: {
          label: '📅 Próximos · Más cercanos primero',
        },
        quick_create: { title: 'Creación Rápida', label: 'Creación Rápida' },
        key_metrics: { title: 'Indicadores Clave de Rendimiento', label: 'Métricas Clave' },
        home_tabs: { label: 'Pestañas de Inicio' },
        ai_briefing: {
          title: 'Pregúntale al Asistente de IA',
          description:
            'Abra el panel del asistente desde el borde derecho de la página y pregunte "¿en qué debería concentrarme hoy?" — ve su flujo de ventas, esquema y cuentas en tiempo real.',
          label: 'Hoy con el Asistente de IA',
        },
        upcoming_events: { title: 'Próximos Eventos', label: 'Próximos Eventos' },
      },
    },
    utility_bar_page: {
      label: 'Barra de Utilidades',
      description: 'Barra de acceso rápido con herramientas flotantes',
      components: {
        notifications_panel: { label: 'Notificaciones' },
        quick_notes: { title: 'Notas Rápidas', label: 'Notas Rápidas' },
        quick_search: { label: 'Búsqueda Rápida' },
      },
    },
  },
};
