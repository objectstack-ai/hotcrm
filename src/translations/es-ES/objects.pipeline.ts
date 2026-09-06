// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ObjectTranslationData } from '@objectstack/spec/system';

import { activityActions } from './_shared';

/**
 * Español (es-ES) — `objects` translations for the PIPELINE family:
 * demand and the deals it becomes, plus the roll-up that forecasts them.
 *
 * Roster: `crm_lead`, `crm_opportunity`, `crm_opportunity_line_item`, `crm_forecast`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/translations/es-ES.ts`.
 */
export const pipeline: Record<string, ObjectTranslationData> = {
  crm_lead: {
    _validations: {
      disqualification_reason_required: {
        message: 'El motivo de descalificación es obligatorio cuando un prospecto no está cualificado',
      },
      duplicate_disqualification_requires_survivor: {
        message: 'Descalificar un prospecto como duplicado exige nombrar el registro superviviente y marcar el estado de duplicado como Confirmado',
      },
      email_required: {
        message: 'El correo electrónico es obligatorio',
      },
      lead_status_progression: {
        message: 'Transición de estado de prospecto no válida',
      },
    },
    label: 'Prospecto',
    pluralLabel: 'Prospectos',
    description: 'Clientes potenciales todavía sin calificar',
    fields: {
      first_name: { label: 'Nombre' },
      last_name: { label: 'Apellido' },
      company: { label: 'Empresa' },
      company_normalized: {
        label: 'Empresa (Normalizado)',
        help: 'Clave de coincidencia para la conversión de prospectos: la Empresa en minúsculas, sin espacios sobrantes y con los espacios internos reducidos a uno. Lo mantiene el hook lead_duplicate_check — nunca lo edite directamente.',
      },
      display_title: { label: 'Título Mostrado' },
      title: { label: 'Cargo' },
      email: { label: 'Correo Electrónico' },
      phone: { label: 'Teléfono' },
      status: {
        label: 'Estado',
        options: {
          new: 'Nuevo', contacted: 'Contactado', qualified: 'Calificado',
          unqualified: 'No Calificado', converted: 'Convertido',
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
      owner_id: { label: 'Propietario' },
      is_converted: { label: 'Convertido' },
      description: { label: 'Descripción' },
      // Mismo juego de valores que `crm_contact.salutation` — tradúzcanse igual.
      salutation: {
        label: 'Tratamiento',
        options: { mr: 'Sr.', ms: 'Srta.', mrs: 'Sra.', dr: 'Dr.', prof: 'Prof.' },
      },
      full_name: { label: 'Nombre Completo' },
      // Los 15 valores son los mismos que en `crm_account.industry` — deben
      // coincidir literalmente entre ambas pantallas.
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
      mobile: { label: 'Móvil' },
      website: { label: 'Sitio Web' },
      rating: { label: 'Puntuación de Prospecto', help: 'Puntuación de calidad del prospecto (1-5 estrellas)' },
      next_followup_date: { label: 'Próxima Fecha de Seguimiento' },
      last_contacted_date: { label: 'Último Contacto' },
      converted_account: { label: 'Cuenta Convertida' },
      converted_contact: { label: 'Contacto Convertido' },
      converted_opportunity: { label: 'Oportunidad Convertida' },
      converted_date: { label: 'Fecha de Conversión' },
      address: { label: 'Dirección' },
      annual_revenue: { label: 'Ingresos Anuales' },
      number_of_employees: { label: 'Número de Empleados' },
      notes: { label: 'Notas', help: 'Notas de trabajo sobre este cliente potencial: admite formato.' },
      do_not_call: { label: 'No Llamar' },
      email_opt_out: { label: 'Excluir de Correos' },
      disqualification_reason: {
        label: 'Motivo de No Calificación',
        help: 'Obligatorio cuando el estado es No Calificado',
        options: {
          not_a_fit: 'No Encaja', no_budget: 'Sin Presupuesto', wrong_persona: 'Perfil Incorrecto',
          unreachable: 'Ilocalizable', duplicate: 'Duplicado', competitor: 'Competidor',
          other: 'Otro',
        },
      },
      duplicate_of_type: {
        label: 'Duplicado De',
        help: 'Qué objeto contiene el registro superviviente que este prospecto repite.',
        // `erased` es una lápida, no una opción: el formulario no la ofrece
        // (ver `src/views/lead.view.ts`), pero un prospecto cuyo superviviente
        // fue eliminado la lleva, así que necesita etiqueta allí donde el
        // registro se LEE; sin traducir se mostraría el valor crudo `erased`.
        options: { crm_lead: 'Prospecto', crm_contact: 'Contacto', erased: 'Registro Eliminado' },
      },
      duplicate_of_lead: { label: 'Prospecto Duplicado' },
      duplicate_of_contact: { label: 'Contacto Duplicado' },
      duplicate_status: {
        label: 'Estado del Duplicado',
        help: 'Sospechoso = marcado automáticamente en la captura. Confirmado = una persona verificó la coincidencia.',
        options: { suspected: 'Sospechoso', confirmed: 'Confirmado' },
      },
    },
    _views: {
      all_leads: {
        label: 'Todos los Prospectos',
        emptyState: { title: 'Todavía no hay prospectos', message: 'Empiece creando su primer prospecto' },
      },
      kanban_by_status: { label: 'Pipeline de Prospectos' },
      calendar_by_created: { label: 'Calendario de Prospectos' },
      gallery_view: { label: 'Galería de Prospectos' },
      my_leads: { label: 'Mis Prospectos' },
      high_priority: { label: 'Alta Prioridad' },
      hot_leads: { label: '🔥 Prospectos Calientes' },
      suspected_duplicates: {
        label: 'Duplicados Sospechosos',
        emptyState: {
          title: 'Sin duplicados sospechosos',
          message: 'Nada que revisar: se han comprobado todos los correos recapturados.',
        },
      },
    },
    _sections: {
      // Nombres de sección de `record:details` en la página de detalle
      // (lead_detail.page.ts).
      info: { label: 'Información del Prospecto' },
      crm_contact: { label: 'Contacto' },
      detail: { label: 'Detalle del Prospecto' },
      address: { label: 'Dirección' },
      description: { label: 'Descripción' },
      // Claves de sección del objeto (lead.object.ts) que usan los
      // formularios de registro.
      identity: { label: 'Identidad' },
      company_info: { label: 'Información de la Empresa' },
      contact_info: { label: 'Información de Contacto' },
      qualification: { label: 'Calificación' },
      assignment: { label: 'Asignación' },
      conversion: { label: 'Conversión' },
      additional: { label: 'Información Adicional' },
      preferences: { label: 'Preferencias de Comunicación' },
      duplicates: { label: 'Gestión de Duplicados' },
      // Nombres de sección del formulario en lead.view.ts (#1100) — el
      // formulario por defecto y sus seis formViews con nombre.
      contact_information: { label: 'Información de Contacto' },
      lead_classification: { label: 'Clasificación del Lead' },
      company_information: { label: 'Información de la Empresa' },
      additional_information: { label: 'Información Adicional' },
      privacy: { label: 'Privacidad' },
      lead_details: { label: 'Detalles del Lead' },
      general: { label: 'General' },
      details: { label: 'Detalles' },
      step_1_contact_details: { label: 'Paso 1: Datos de Contacto' },
      step_2_company_information: { label: 'Paso 2: Información de la Empresa' },
      step_3_qualification: { label: 'Paso 3: Calificación' },
      step_4_review_and_convert: { label: 'Paso 4: Revisar y Convertir' },
      primary_information: { label: 'Información Principal' },
      extended_details: { label: 'Detalles Ampliados' },
      quick_edit: { label: 'Edición Rápida' },
      update_lead_status: { label: 'Actualizar Estado del Lead' },
      tell_us_about_yourself: { label: 'Cuéntanos sobre ti' },
      about_your_company: { label: 'Sobre tu empresa' },
      how_can_we_help: { label: '¿Cómo podemos ayudarte?' },
      lead_information: { label: 'Información del Lead' },
      address_information: { label: 'Información de Dirección' },
      privacy_preferences: { label: 'Preferencias de Privacidad' },
    },
    _actions: {
      ...activityActions,
      convert_lead: {
        label: 'Convertir Prospecto',
        successMessage: '¡Prospecto convertido con éxito!',
      },
      create_campaign: {
        label: 'Agregar a Campaña',
        successMessage: '¡Prospecto agregado a la campaña!',
        params: {
          crm_campaign: { label: 'Campaña' },
        },
      },
      schedule_followup: {
        label: 'Programar Seguimiento',
        successMessage: 'Seguimiento programado.',
      },
    },
  },
  crm_opportunity: {
    _validations: {
      amount_positive: {
        message: 'El importe debe ser mayor que cero',
      },
      close_date_future: {
        message: 'La fecha de cierre no debería estar en el pasado salvo que la oportunidad esté cerrada',
      },
      opportunity_stage_progression: {
        message: 'Transición de etapa de oportunidad no válida',
      },
    },
    label: 'Oportunidad',
    pluralLabel: 'Oportunidades',
    description: 'Oportunidades de venta y negocios en el pipeline',
    fields: {
      name: { label: 'Nombre de Oportunidad' },
      crm_account: { label: 'Cuenta' },
      primary_contact: { label: 'Contacto Principal' },
      owner_id: { label: 'Propietario de Oportunidad' },
      amount: { label: 'Monto' },
      expected_revenue: { label: 'Ingreso Esperado' },
      stage: {
        label: 'Etapa',
        options: {
          prospecting: 'Prospección', qualification: 'Calificación',
          needs_analysis: 'Análisis de Necesidades', proposal: 'Propuesta',
          negotiation: 'Negociación', closed_won: 'Cerrada Ganada', closed_lost: 'Cerrada Perdida',
        },
      },
      probability: { label: 'Probabilidad (%)' },
      close_date: { label: 'Fecha de Cierre' },
      type: {
        label: 'Tipo',
        options: {
          new_business: 'Nuevo Negocio',
          existing_upgrade: 'Cliente Existente - Mejora',
          existing_renewal: 'Cliente Existente - Renovación',
          existing_expansion: 'Cliente Existente - Expansión',
        },
      },
      forecast_category: {
        label: 'Categoría de Pronóstico',
        options: {
          pipeline: 'Pipeline', best_case: 'Mejor Caso',
          commit: 'Compromiso', omitted: 'Omitida', closed: 'Cerrada',
        },
      },
      description: { label: 'Descripción' },
      next_step: { label: 'Próximo Paso' },
      lead_source: {
        label: 'Origen del Prospecto',
        options: {
          web: 'Web', referral: 'Referencia', event: 'Evento / Feria',
          webinar: 'Seminario Web', partner: 'Socio', advertisement: 'Publicidad',
          paid_search: 'Búsqueda de Pago', social: 'Redes Sociales', content: 'Contenido / Blog',
          cold_call: 'Llamada en Frío', email_campaign: 'Campaña de Email', other: 'Otro',
        },
      },
      crm_campaign: { label: 'Campaña', help: 'Campaña de marketing que generó esta oportunidad' },
      days_in_stage: { label: 'Días en Etapa Actual' },
      stage_entry_date: { label: 'Fecha de Entrada a la Etapa', help: 'Fecha en la que esta oportunidad entró en su etapa actual.' },
      is_private: { label: 'Privado' },
      approval_status: {
        label: 'Estado de Aprobación',
        options: {
          not_required: 'No Requerida', pending: 'Pendiente',
          approved: 'Aprobada', rejected: 'Rechazada',
        },
      },
      approved_date: { label: 'Fecha de Aprobación' },
      // #593 — obligatorias al cerrar la oportunidad, y el desglose de
      // motivos de pérdida las muestra en el panel de ventas, así que el
      // valor almacenado nunca debe llegar crudo al selector.
      win_reason: {
        label: 'Motivo de Ganancia',
        help: 'Por qué se ganó este negocio. Obligatorio para cerrar una oportunidad como Ganada.',
        options: {
          better_product: 'Mejor Producto', better_price: 'Mejor Precio',
          relationship: 'Relación Existente', better_support: 'Mejor Soporte',
          best_fit: 'Mejor Ajuste / Funcionalidades',
          quote_accepted: 'Presupuesto Aceptado', other: 'Otro',
        },
      },
      loss_reason: {
        label: 'Motivo de Pérdida',
        help: 'Por qué se perdió este negocio. Obligatorio para cerrar una oportunidad como Perdida.',
        options: {
          price: 'Precio Demasiado Alto', competitor: 'Perdida ante Competidor',
          no_budget: 'Sin Presupuesto', no_decision: 'Sin Decisión',
          timing: 'Momento Inadecuado', features: 'Funcionalidades Faltantes', other: 'Otro',
        },
      },
      loss_details: {
        label: 'Detalles de Ganancia/Pérdida',
        help: 'Contexto en texto libre detrás del motivo de ganancia o pérdida.',
      },
    },
    _views: {
      open_opportunities: { label: 'Oportunidades Abiertas' },
      all_opportunities: { label: 'Todas las Oportunidades' },
      pipeline_kanban: { label: 'Pipeline de Ventas' },
      close_date_calendar: { label: 'Calendario de Pronóstico' },
      deal_timeline: { label: 'Línea de Tiempo' },
      deal_gallery: { label: 'Galería de Negocios' },
      my_open_deals: { label: 'Mis Negocios Abiertos' },
      closing_this_quarter: {
        label: 'Cierres de Este Trimestre',
        emptyState: {
          title: 'No hay negocios que cierren este trimestre',
          message: 'Esta pestaña muestra los negocios abiertos en categoría Compromiso o Mejor Caso cuya fecha de cierre cae dentro del trimestre actual. Ahora mismo no hay ninguno; los negocios que cierran más adelante están en la pestaña Negocios Abiertos.',
        },
      },
      stale_opportunities: { label: '⚠️ Oportunidades Estancadas · Más Tiempo en Etapa Primero' },
    },
    _sections: {
      // Nombres de sección de `record:details` en la página de detalle
      // (opportunity_detail.page.ts).
      info: { label: 'Información de la Oportunidad' },
      // La clave `crm_forecast` la comparten la sección de la página de
      // detalle («Stage & Forecast») y el grupo de campos del objeto
      // («Forecast & Metrics»). Ambas cubren etapa, probabilidad y
      // categoría de pronóstico, así que se traduce una sola vez.
      crm_forecast: { label: 'Etapa y Previsión' },
      description: { label: 'Descripción' },
      // Claves de sección del objeto (opportunity.object.ts) que usan los
      // formularios de registro.
      basic: { label: 'Información Básica' },
      financials: { label: 'Datos Financieros' },
      sales_process: { label: 'Proceso de Venta' },
      classification: { label: 'Clasificación' },
      campaign: { label: 'Campañas' },
      notes: { label: 'Notas y Próximos Pasos' },
      // Nombres de sección del formulario en opportunity.view.ts (#1100)
      overview: { label: 'Resumen' },
      forecast: { label: 'Previsión' },
      sales_strategy: { label: 'Estrategia de Ventas' },
      win_loss: { label: 'Ganada / Perdida' },
    },
    _actions: {
      ...activityActions,
      clone_opportunity: {
        label: 'Clonar Oportunidad',
        successMessage: '¡Oportunidad clonada con éxito!',
      },
      mass_update_stage: {
        label: 'Actualizar Etapa',
        successMessage: '¡Etapa de oportunidad actualizada!',
        params: {
          // Mismos valores que `fields.stage` — deben coincidir literalmente.
          stage: {
            label: 'Nueva Etapa',
            options: {
              prospecting: 'Prospección', qualification: 'Calificación',
              needs_analysis: 'Análisis de Necesidades', proposal: 'Propuesta',
              negotiation: 'Negociación', closed_won: 'Cerrada Ganada', closed_lost: 'Cerrada Perdida',
            },
          },
        },
      },
      generate_quote: {
        label: 'Generar Presupuesto',
        successMessage: '¡Presupuesto creado desde la oportunidad!',
      },
    },
  },
  crm_opportunity_line_item: {
    _validations: {
      unit_price_positive: {
        message: 'El precio de venta no puede ser negativo',
      },
    },
    label: 'Línea de Oportunidad',
    pluralLabel: 'Líneas de Oportunidad',
    description: 'Líneas de precio por producto dentro de una oportunidad',
    fields: {
      crm_opportunity: { label: 'Oportunidad' },
      crm_product: { label: 'Producto' },
      description: { label: 'Descripción' },
      quantity: { label: 'Cantidad' },
      list_price: { label: 'Precio de Lista', help: 'Se rellena automáticamente desde el Precio de Lista del producto.' },
      unit_price: { label: 'Precio de Venta', help: 'Precio unitario negociado (puede diferir del precio de lista)' },
      discount: { label: 'Descuento (%)' },
      total_price: { label: 'Total' },
      line_number: { label: 'Nº de Línea' },
    },
    _sections: {
      basic: { label: 'Línea' },
      pricing: { label: 'Precios' },
    },
  },
  crm_forecast: {
    _validations: {
      period_end_after_start: {
        message: 'El fin del periodo debe ser posterior a su inicio.',
      },
      period_end_matches_calendar_period: {
        message: 'El fin del periodo debe ser el último día del periodo: p. ej. 2026-09-30 para un trimestre que empieza el 2026-07-01, o 2026-08-31 para agosto de 2026.',
      },
      period_start_first_of_period: {
        message: 'El inicio del periodo debe ser el primer día del periodo: p. ej. 2026-08-01 para agosto de 2026.',
      },
      quarter_starts_on_quarter_boundary: {
        message: 'Una previsión trimestral debe comenzar en un límite de trimestre: 1 de enero, 1 de abril, 1 de julio o 1 de octubre.',
      },
      snapshot_amounts_non_negative: {
        message: 'Los importes de la instantánea no pueden ser negativos.',
      },
    },
    label: 'Previsión',
    pluralLabel: 'Previsiones',
    description: 'Instantánea periódica del pipeline por propietario para previsión de ingresos',
    fields: {
      owner_id: { label: 'Propietario' },
      period: { label: 'Periodo', options: { month: 'Mes', quarter: 'Trimestre' } },
      period_start: {
        label: 'Inicio del periodo',
        help: 'Debe ser el primer día del periodo — p. ej. 2026-08-01 para agosto de 2026. Además, una previsión trimestral debe comenzar en un límite de trimestre: 1 de enero, 1 de abril, 1 de julio o 1 de octubre.',
      },
      period_end: {
        label: 'Fin del periodo',
        help: 'Normalmente se calcula automáticamente a partir de Periodo e Inicio del periodo. Si se introduce a mano, debe ser el último día de ese periodo — p. ej. 2026-09-30 para un trimestre que empieza el 2026-07-01, o 2026-08-31 para agosto de 2026.',
      },
      period_label: { label: 'Periodo', help: 'Etiqueta legible, p. ej. «T3 2026» o «Ago 2026».' },
      display_title: { label: 'Título Mostrado' },
      snapshot_date: { label: 'Fecha de instantánea', help: 'El día en que se capturó esta instantánea.' },
      source: {
        label: 'Origen',
        options: { scheduled: 'Instantánea programada', ai: 'Skill de IA', manual: 'Entrada manual' },
      },
      quota: { label: 'Cuota' },
      pipeline_amount: { label: 'Pipeline', help: 'Suma de todas las oportunidades abiertas que cierran en este periodo (en cualquier etapa).' },
      best_case_amount: { label: 'Mejor caso', help: 'Oportunidades abiertas en la categoría de pronóstico Mejor caso o Compromiso.' },
      commit_amount: { label: 'Compromiso', help: 'Oportunidades abiertas en la categoría de pronóstico Compromiso (comprometidas por el propietario).' },
      closed_amount: { label: 'Cerrado', help: 'Importe ya cerrado ganado en este periodo.' },
      expected_amount: { label: 'Esperado', help: 'Cerrado + Compromiso: lo que el propietario espera razonablemente cerrar.' },
      attainment_pct: { label: 'Cumplimiento %', help: 'Cerrado ÷ Cuota × 100. Muestra 0 % hasta que se fija una cuota positiva.' },
      coverage_ratio: { label: 'Cobertura', help: 'Pipeline ÷ (Cuota − Cerrado): si queda pipeline suficiente para cubrir la diferencia. Muestra 0 cuando ya se ha alcanzado la cuota.' },
      notes: { label: 'Notas' },
      seed_key: {
        label: 'Clave de semilla',
        help: 'Identidad del juego de datos de demostración. Solo la escribe el cargador de semillas; está vacía en cualquier instantánea real.',
      },
    },
    _views: {
      all_forecasts: { label: 'Todas las previsiones' },
      this_quarter_forecasts: {
        label: 'Este trimestre',
        emptyState: {
          title: 'Aún no hay instantáneas de este trimestre',
          message: 'Las instantáneas trimestrales las escribe el barrido nocturno de previsiones. Hasta que se ejecute una vez para el trimestre actual, esta vista está vacía; los trimestres cerrados están en la pestaña Todas.',
        },
      },
      my_forecast: { label: 'Mi previsión' },
    },
    _sections: {
      basic: { label: 'Instantánea' },
      amounts: { label: 'Importes' },
      meta: { label: 'Origen' },
      // Nombres de sección del formulario en forecast.view.ts (#1100)
      snapshot: { label: 'Instantánea' },
      notes: { label: 'Notas' },
    },
  },
};
