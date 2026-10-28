// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

import { activityActions } from '../../sales/translations/es-ES/_shared';

/**
 * Español (es-ES) — the support module's own translations: every row whose
 * target this package registers. Why they live here and not in the app
 * package's pack: `./index.ts`.
 */
export const esES: TranslationData = {
  objects: {
    crm_knowledge_article: {
      _validations: {
        published_requires_body: {
          message: 'No se pueden publicar artículos sin cuerpo.',
        },
        published_requires_summary: {
          message: 'Los artículos publicados deben tener un resumen para los resultados de búsqueda y las citas de IA.',
        },
      },
      label: 'Artículo de Conocimiento',
      pluralLabel: 'Base de Conocimiento',
      description: 'Respuestas y guías reutilizables para clientes y agentes',
      fields: {
        article_number: { label: 'N.º Artículo' },
        display_title: { label: 'Título Mostrado' },
        title: { label: 'Título' },
        summary: { label: 'Resumen', help: 'Resumen de un párrafo que se muestra en los resultados de búsqueda y en las citas de la IA.' },
        body: { label: 'Contenido', help: 'Contenido completo del artículo (Markdown).' },
        category: {
          label: 'Categoría',
          options: {
            getting_started: 'Primeros pasos', how_to: 'Cómo hacerlo',
            troubleshooting: 'Resolución de problemas', billing: 'Facturación', api: 'API e Integraciones',
            release_notes: 'Notas de versión', policy: 'Políticas',
          },
        },
        tags: {
          label: 'Etiquetas',
          options: {
            auth: 'Autenticación', sso: 'SSO', mobile: 'Móvil', email: 'Correo',
            reports: 'Informes', performance: 'Rendimiento',
            data_import: 'Importación de datos', webhooks: 'Webhooks',
          },
        },
        status: {
          label: 'Estado',
          options: { draft: 'Borrador', in_review: 'En revisión', published: 'Publicado', archived: 'Archivado' },
        },
        audience: {
          label: 'Audiencia',
          help: 'Los artículos públicos son visibles en el portal de clientes; los internos solo los ven los agentes.',
          options: { public: 'Público', internal: 'Interno' },
        },
        language: {
          label: 'Idioma',
          options: { en: 'Inglés', zh_cn: 'Chino simplificado', es_es: 'Español', ja_jp: 'Japonés' },
        },
        owner_id: { label: 'Propietario' },
        related_to_case: { label: 'Caso de origen', help: 'Caso a partir del cual se redactó este artículo (opcional).' },
        published_at: { label: 'Publicado el' },
        last_reviewed_at: { label: 'Última revisión' },
        helpful_count: { label: 'Útil', help: 'Recontado desde crm_article_feedback — nunca se escribe a mano.' },
        not_helpful_count: { label: 'No útil', help: 'Recontado desde crm_article_feedback — nunca se escribe a mano.' },
      },
      _views: {
        all_articles: { label: 'Todos los artículos' },
        published_articles: { label: 'Publicados' },
        my_drafts: { label: 'Mis borradores' },
      },
      _sections: {
        basic: { label: 'Información del Artículo' },
        content: { label: 'Contenido' },
        taxonomy: { label: 'Categorización' },
        metrics: { label: 'Interacción' },
        engagement: { label: 'Interacción' },
        // Nombre de sección del formulario en knowledge_article.view.ts (#1100)
        article: { label: 'Artículo' },
      },
      _actions: {
        mark_article_helpful: {
          label: 'Útil',
          successMessage: 'Gracias — registrado como útil.',
        },
        mark_article_not_helpful: {
          label: 'No útil',
          successMessage: 'Gracias — registrado como no útil.',
        },
      },
    },
    crm_case: {
      _validations: {
        resolution_required_for_closed: {
          message: 'La resolución es obligatoria al cerrar un caso',
        },
        escalation_reason_required: {
          message: 'El motivo de escalado es obligatorio al escalar un caso',
        },
        case_status_progression: {
          message: 'Transición de estado no válida',
        },
      },
      label: 'Caso',
      pluralLabel: 'Casos',
      description: 'Casos de soporte y solicitudes de servicio de clientes',
      fields: {
        case_number: { label: 'Número de Caso' },
        display_title: { label: 'Título Mostrado' },
        subject: { label: 'Asunto' },
        description: { label: 'Descripción' },
        crm_account: { label: 'Cuenta' },
        crm_contact: { label: 'Contacto' },
        supplied_name: { label: 'Nombre Facilitado', help: 'El nombre que dio quien abrió el caso, tal como lo escribió. Sin verificar y sin vincular a ningún contacto.' },
        supplied_email: { label: 'Correo Electrónico Facilitado', help: 'La dirección de respuesta que dio quien abrió el caso, tal como la escribió. Sin verificar y sin vincular a ningún contacto.' },
        status: {
          label: 'Estado',
          options: {
            new: 'Nuevo', in_progress: 'En Curso',
            waiting_customer: 'Esperando al Cliente', waiting_support: 'Esperando a Soporte',
            escalated: 'Escalado', resolved: 'Resuelto', closed: 'Cerrado',
          },
        },
        priority: {
          label: 'Prioridad',
          options: { low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica' },
        },
        priority_rank: { label: 'Rango de Prioridad' },
        type: {
          label: 'Tipo de Caso',
          options: {
            question: 'Consulta', problem: 'Problema',
            feature_request: 'Solicitud de Funcionalidad', bug: 'Error',
          },
        },
        // `email` y `chat` se dejan como préstamos: son el término habitual en
        // español de negocios y concuerdan con `crm_campaign.channel`.
        origin: {
          label: 'Origen del Caso',
          options: { email: 'Email', phone: 'Teléfono', web: 'Web', chat: 'Chat', social_media: 'Redes Sociales' },
        },
        owner_id: { label: 'Propietario del Caso' },
        closed_date: { label: 'Fecha de Cierre' },
        first_response_date: { label: 'Fecha de Primera Respuesta' },
        resolution_time_hours: { label: 'Tiempo de Resolución (Horas)' },
        sla_due_date: { label: 'Fecha Límite SLA', help: 'Se fija según la prioridad del caso y el Nivel de Cliente de la cuenta, en horas naturales: las noches, los fines de semana y los festivos cuentan.' },
        is_sla_violated: { label: 'SLA Incumplido' },
        is_escalated: { label: 'Escalado' },
        escalated_date: { label: 'Fecha de Escalación' },
        escalated_from: { label: 'Escalado desde' },
        escalation_reason: { label: 'Motivo de Escalación' },
        resolution: { label: 'Resolución' },
        resolved_by_article: { label: 'Resuelto por Artículo', help: 'Artículo de la base de conocimiento que resolvió este caso — la señal de desvío.' },
        internal_notes: { label: 'Notas Internas', help: 'Notas internas no visibles para el cliente' },
        is_closed: { label: 'Está Cerrado' },
      },
      _views: {
        // The public Web-to-Case form's heading (#2284), as `web_to_lead`.
        web_to_case: { title: 'Contactar con Soporte' },
        all_cases: { label: 'Todos los Casos' },
        case_workflow: { label: 'Flujo de Servicio' },
        sla_calendar: { label: 'Calendario SLA' },
        case_timeline: { label: 'Línea de Tiempo de Casos' },
        unassigned_triage: {
          label: 'Sin asignar — triaje',
          emptyState: {
            title: 'Nada pendiente de triaje',
            message: 'Todos los casos tienen propietario. Los casos aparecen aquí cuando llegan sin propietario — normalmente un envío web-a-caso recibido mientras nadie ocupaba el puesto de Agente de Servicio.',
          },
        },
        escalated_cases: { label: 'Casos Escalados' },
        my_open_cases: { label: 'Mis Casos Abiertos' },
        sla_at_risk: { label: '⏰ SLA en Riesgo' },
      },
      _sections: {
        // Nombres de sección del formulario en case.view.ts (#1100).
        case: { label: 'Caso' },
        how_can_we_help: {
          label: '¿Cómo podemos ayudarte?',
          fields: {
            subject: { placeholder: 'Resumen breve del problema' },
            description: { placeholder: 'Pasos para reproducirlo, mensajes de error, capturas de pantalla...' },
            type: { helpText: 'Elige la opción que mejor describa tu problema.' },
            priority: { helpText: 'Los problemas críticos también deben comunicarse por teléfono.' },
          },
        },
        // Claves de sección del objeto (case.object.ts) que usan los
        // formularios de registro y la página de detalle, cuyas secciones
        // hacen referencia a estos grupos (#970).
        basic: { label: 'Información del Caso' },
        origin: { label: 'Origen y Asignación' },
        sla: { label: 'SLA y Prioridad' },
        resolution: { label: 'Resolución' },
        escalation: { label: 'Escalación' },
        system: { label: 'Sistema' },
      },
      _actions: {
        ...activityActions,
        escalate_case: {
          label: 'Escalar Caso',
          confirmText: 'Esto enviará el caso al equipo de escalación. ¿Continuar?',
          successMessage: '¡Caso escalado con éxito!',
        },
        close_case: {
          label: 'Cerrar Caso',
          confirmText: '¿Está seguro de querer cerrar este caso?',
          successMessage: '¡Caso cerrado con éxito!',
        },
        claim_case: {
          label: 'Tomar Caso',
          successMessage: 'Caso tomado: ahora es suyo.',
        },
      },
    },
    crm_article_feedback: {
      label: 'Opinión sobre el Artículo',
      pluralLabel: 'Opiniones sobre Artículos',
      description: 'El veredicto útil / no útil de un lector sobre un artículo de la base de conocimiento',
      fields: {
        feedback_number: { label: 'N.º de Opinión' },
        owner_id: { label: 'Lector' },
        crm_knowledge_article: { label: 'Artículo', help: 'Artículo de la base de conocimiento al que se refiere esta opinión.' },
        verdict: {
          label: 'Veredicto',
          options: { helpful: 'Útil', not_helpful: 'No útil' },
        },
        comment: { label: 'Comentario', help: 'Nota opcional que explica el veredicto — la lee el autor del artículo.' },
      },
      _sections: {
        basic: { label: 'Opinión' },
      },
    },
  },
  apps: {
    crm_enterprise: {
      navigation: {
        nav_service_dashboard: { label: 'Resumen de Servicio' },
        nav_case: { label: 'Casos' },
        nav_knowledge: { label: 'Conocimiento' },
        nav_my_cases: { label: 'Mis Casos' },
        nav_report_cases_by_status: { label: 'Casos por Estado y Prioridad' },
        nav_report_sla: { label: 'Cumplimiento de SLA' },
        nav_report_cases_opened_by_day: { label: 'Casos Abiertos por Día' },
      },
    },
  },
  dashboards: {
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
  datasets: {
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
  },
  pages: {
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
  },
  flows: {
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
  },
  reports: {
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
};
