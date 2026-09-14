// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ObjectTranslationData } from '@objectstack/spec/system';

import { activityActions } from './_shared';

/**
 * Español (es-ES) — `objects` translations for the SERVICE family:
 * post-sale support — cases and the knowledge that deflects them.
 *
 * Roster: `crm_case`, `crm_knowledge_article`, `crm_article_feedback`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/translations/es-ES.ts`.
 */
export const service: Record<string, ObjectTranslationData> = {
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
      created_date: { label: 'Fecha de Creación' },
      closed_date: { label: 'Fecha de Cierre' },
      first_response_date: { label: 'Fecha de Primera Respuesta' },
      resolution_time_hours: { label: 'Tiempo de Resolución (Horas)' },
      sla_due_date: { label: 'Fecha Límite SLA' },
      is_sla_violated: { label: 'SLA Incumplido' },
      is_escalated: { label: 'Escalado' },
      escalated_date: { label: 'Fecha de Escalación' },
      escalation_reason: { label: 'Motivo de Escalación' },
      resolution: { label: 'Resolución' },
      resolved_by_article: { label: 'Resuelto por Artículo', help: 'Artículo de la base de conocimiento que resolvió este caso — la señal de desvío.' },
      internal_notes: { label: 'Notas Internas', help: 'Notas internas no visibles para el cliente' },
      is_closed: { label: 'Está Cerrado' },
    },
    _views: {
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
      // Nombres de sección de `record:details` en la página de detalle
      // (case_detail.page.ts).
      info: { label: 'Información del Caso' },
      status: { label: 'Estado y SLA' },
      description: { label: 'Descripción' },
      // Nombres de sección del formulario en case.view.ts (#1100).
      case: { label: 'Caso' },
      how_can_we_help: { label: '¿Cómo podemos ayudarte?' },
      // Claves de sección del objeto (case.object.ts) que usan los
      // formularios de registro. `basic` repite el inglés de `info`
      // («Case Information»), así que comparte traducción.
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
};
