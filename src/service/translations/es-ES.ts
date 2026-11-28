// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

import { activityActions } from '../../sales/translations/es-ES/_shared';

/**
 * Español (es-ES) — the support module's own translations: every row whose
 * target this package registers. Why they live here and not in the app
 * package's pack: `./index.ts`.
 */
export const esES: TranslationData = {
  // This package's name and description on Setup's package list (`packages.MANIFEST_ID`).
  packages: {
    'app.objectstack.hotcrm.service': {
      name: 'HotCRM Servicio',
      description: 'Módulo de servicio de HotCRM: casos, artículos de conocimiento y el SLA.',
    },
  },
  // The escalation follow-up task's title (#2494, #2522), at
  // `hooks.<hook>.texts.<key>.message`.
  hooks: {
    case_status_side_effects: {
      texts: {
        escalated_named: { message: 'Escalado: {{ label }}' },
        escalated_untitled: { message: 'Caso escalado que requiere atención' },
      },
    },
  },
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
          help: 'Público marca un artículo como apto para clientes; ningún portal de clientes lo publica. Los internos son solo para agentes.',
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
        helpful_count: { label: 'Útil', help: 'Contado a partir de los comentarios de artículo de los lectores, un voto por lector. No editable.' },
        not_helpful_count: { label: 'No útil', help: 'Contado a partir de los comentarios de artículo de los lectores, un voto por lector. No editable.' },
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
          outcomeMessages: {
            recorded: 'Gracias — registrado como útil. Útil: {{ result.helpful }} · No útil: {{ result.notHelpful }}.',
            changed: 'Tu voto ahora es Útil. Útil: {{ result.helpful }} · No útil: {{ result.notHelpful }}.',
            already: 'Ya marcaste este artículo como útil. Útil: {{ result.helpful }} · No útil: {{ result.notHelpful }}.',
          },
        },
        mark_article_not_helpful: {
          label: 'No útil',
          successMessage: 'Gracias — registrado como no útil.',
          outcomeMessages: {
            recorded: 'Gracias — registrado como no útil. Útil: {{ result.helpful }} · No útil: {{ result.notHelpful }}.',
            changed: 'Tu voto ahora es No útil. Útil: {{ result.helpful }} · No útil: {{ result.notHelpful }}.',
            already: 'Ya marcaste este artículo como no útil. Útil: {{ result.helpful }} · No útil: {{ result.notHelpful }}.',
          },
        },
      },
    },
    crm_case: {
      // The timeline row the status milestones write (`activityMilestones` on the object).
      _milestones: {
        status: {
          escalated: { summary: 'Caso escalado — {subject}' },
          resolved: { summary: 'Caso resuelto — {subject}' },
          closed: { summary: 'Caso cerrado — {subject}' },
        },
      },
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
            message: 'Todos los casos tienen propietario. Un caso espera aquí, en la cola de Recepción de Soporte, cuando llega mientras nadie ocupa el puesto de Agente de Servicio. Ábralo y pulse Reclamar para quedárselo.',
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
          description: 'Para una caída urgente, llama a la línea de soporte.',
          fields: {
            subject: { placeholder: 'Resumen breve del problema' },
            description: { placeholder: 'Pasos para reproducirlo, mensajes de error, capturas de pantalla...' },
            type: { helpText: 'Elige la opción que mejor describa tu problema.' },
            // Etiquetas para el visitante (#2368); las del objeto son para el agente.
            supplied_name: { label: 'Tu nombre' },
            supplied_email: { label: 'Tu correo electrónico' },
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
          successMessage: '¡Caso escalado con éxito!',
        },
        close_case: {
          label: 'Cerrar Caso',
          successMessage: '¡Caso cerrado con éxito!',
        },
        reopen_case: {
          label: 'Reabrir Caso',
          successMessage: 'Caso {{ record.display_title }} reabierto.',
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
        nav_knowledge_published: { label: 'Conocimiento' },
      },
    },
    crm_service: {
      label: 'Servicio',
      description: 'Casos, la base de conocimiento y los clientes a los que pertenecen',
      navigation: {
        group_service: { label: 'Servicio' },
        group_customers: { label: 'Clientes' },
        group_work: { label: 'Mi Trabajo' },
        group_reports: { label: 'Informes' },
        group_help: { label: 'Ayuda' },
        nav_approval_requests: { label: 'Bandeja de Entrada' },
        nav_service_dashboard: { label: 'Resumen de Servicio' },
        nav_case: { label: 'Casos' },
        nav_knowledge: { label: 'Conocimiento' },
        nav_my_cases: { label: 'Mis Casos' },
        nav_report_cases_by_status: { label: 'Casos por Estado y Prioridad' },
        nav_report_sla: { label: 'SLA de Casos Cerrados' },
        nav_report_cases_opened_by_day: { label: 'Casos Abiertos por Día' },
        nav_help_service: { label: 'Manual de Servicio' },
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
        sla_violations: { title: 'Casos abiertos fuera de SLA', description: 'Casos abiertos cuyo plazo de SLA ya venció' },
        cases_by_status: { title: 'Casos por estado', description: 'Distribución de la carga a lo largo del pipeline' },
        cases_by_priority: { title: 'Casos por prioridad', description: 'Mezcla de casos abiertos por urgencia' },
        cases_by_origin: { title: 'Casos por origen', description: 'De dónde provienen nuestros casos' },
        daily_case_volume: { title: 'Volumen diario de casos', description: 'Casos nuevos creados en los últimos 30 días' },
        sla_compliance_gauge: { title: 'SLA cumplido (casos cerrados)', description: 'Proporción de casos cerrados que cumplieron su SLA' },
        kb_deflection_rate: { title: 'Tasa de Desvío por KB', description: 'Proporción de casos cerrados resueltos con un artículo de la base de conocimiento' },
        kb_resolved_cases: { title: 'Resueltos por KB', description: 'Casos cerrados que señalan el artículo que los resolvió' },
        closed_cases_total: { title: 'Casos Cerrados', description: 'El denominador de la tasa de desvío' },
        top_resolving_articles: { title: 'Artículos que Más Resuelven', description: 'Artículos de la base de conocimiento ordenados por los casos cerrados que resolvieron' },
        my_open_cases_by_priority: { title: 'Mis casos abiertos por prioridad', description: 'Tus casos abiertos, cuántos están fuera de SLA y qué parte representan, por prioridad' },
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
          description: 'El día en que se abrió el caso.',
        },
        origin: {
          label: 'Origen',
          description: 'El canal por el que llegó el caso: email, teléfono, web, chat o redes sociales.',
        },
        priority: {
          label: 'Prioridad',
          description: 'La prioridad del caso, Baja, Media, Alta o Crítica, que junto con el nivel de la cuenta fija su fecha límite SLA.',
        },
        resolved_article: {
          label: 'Artículo de resolución',
          description: 'El artículo de conocimiento registrado como el que resolvió el caso; los casos resueltos sin artículo forman su propio grupo.',
        },
        status: {
          label: 'Estado',
          description: 'En qué punto está el caso, desde Nuevo, En Curso, Esperando y Escalado hasta Resuelto y Cerrado.',
        },
        type: {
          label: 'Tipo',
          description: 'Qué tipo de petición es el caso: una consulta, un problema, una solicitud de funcionalidad o un error.',
        },
      },
      measures: {
        avg_resolution: {
          label: 'Resolución media (h)',
          description: 'El Tiempo de Resolución (Horas) medio de los casos cerrados, de apertura a cierre en horas naturales; quedan fuera los aún no cerrados, incluidos los Resueltos.',
        },
        past_sla_count: {
          label: 'Fuera de SLA',
          description: 'Cuántos casos están fuera de su SLA ahora mismo: marcados como incumplidos, o aún abiertos con la fecha límite SLA ya pasada; no cuenta los abiertos aún dentro de su SLA.',
        },
        past_sla_rate: {
          label: 'Tasa fuera de SLA',
          description: 'Past SLA dividido entre Cases, sobre todos los casos en vista, abiertos y cerrados.',
        },
        avg_sla_violated: {
          label: 'Tasa de incumplimiento del SLA',
          description: 'La proporción de casos en vista con la marca SLA Incumplido, abiertos y cerrados; un caso abierto solo se marca por el barrido horario de SLA, así que Past SLA Rate es la cifra en tiempo de lectura.',
        },
        case_count: {
          label: 'Casos',
          description: 'Cuántos casos hay, en todos los estados, abiertos y cerrados; ninguna medida cuenta solo los abiertos, así que agrupe por Estado para ello.',
        },
        closed_count: {
          label: 'Casos cerrados',
          description: 'Cuántos casos están Cerrados; no cuenta los Resueltos aún sin cerrar ni ningún caso abierto.',
        },
        kb_deflection_rate: {
          label: 'Tasa de desvío por base de conocimiento',
          description: 'Resolved by KB dividido entre Closed Cases: la proporción de casos cerrados resueltos con un artículo; los abiertos quedan fuera.',
        },
        kb_resolved_count: {
          label: 'Resueltos por base de conocimiento',
          description: 'Cuántos casos cerrados registran un artículo de conocimiento que los resolvió; no cuenta los cerrados sin artículo ni los abiertos.',
        },
        sla_compliance_rate: {
          label: 'Tasa de cumplimiento del SLA',
          description: 'Cases Within SLA dividido entre Closed Cases: la proporción de casos cerrados que cumplieron su SLA; los abiertos quedan fuera, y es el complemento de la tasa de incumplimiento de los cerrados.',
        },
        sla_met_count: {
          label: 'Casos dentro del SLA',
          description: 'Cuántos casos cerrados se cerraron dentro de su SLA, sin incumplimiento registrado; no cuenta los abiertos.',
        },
      },
    },
  },
  flows: {
    // The escalation reason the automatic escalations store (#2494), at
    // `flows.<flow>.records.<node>.fields.<field>`.
    case_escalation: { records: { assign_senior_agent: { fields: { escalation_reason: 'Escalado automáticamente: prioridad crítica' } } } },
    case_escalation_on_create: { records: { assign_senior_agent: { fields: { escalation_reason: 'Escalado automáticamente: prioridad crítica' } } } },
    case_sla_monitor: { records: { flag_breach: { fields: { escalation_reason: 'Escalado automáticamente: fecha límite SLA incumplida' } } } },
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
  },
  reports: {
    cases_by_status_priority: {
      label: 'Casos por Estado y Prioridad',
      description: 'Resumen de casos por estado y prioridad',
    },
    sla_performance: {
      label: 'SLA de Casos Cerrados',
      description: 'Tasa de incumplimiento de SLA y tiempo medio de resolución de los casos cerrados, por prioridad',
    },
    cases_opened_by_day_priority: {
      label: 'Casos Abiertos por Día',
      description: 'Entrada diaria de casos desglosada por prioridad',
    },
  },
  books: {
    crm_service_manual: {
      label: 'Manual de Servicio de HotCRM',
      description: 'Casos y SLA, la base de conocimiento y cómo se clasifican los casos entrantes.',
      groups: {
        service: { label: 'Servicio' },
      },
    },
  },
};
