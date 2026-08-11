// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * Español (es-ES) — CRM App Translations
 *
 * Per-locale file: one file per language, following the `per_locale` convention.
 */
/**
 * Familia de acciones de actividad (#592): `log_call`, `log_meeting` y
 * `schedule_meeting` se registran una vez POR OBJETO (prospecto, contacto,
 * cuenta, oportunidad, caso), porque una acción de script sin `objectName`
 * queda bajo una clave que el despachador nunca consulta (#509). Los textos son
 * idénticos en los cinco, así que se declaran una vez aquí.
 */
const activityActions = {
  log_call: {
    label: 'Registrar llamada',
    successMessage: '¡Llamada registrada exitosamente!',
    params: {
      subject: { label: 'Asunto de la llamada' },
      duration: { label: 'Duración (minutos)' },
      attendee_contacts: { label: 'Contactos participantes' },
      attendee_users: { label: 'Participantes internos' },
      notes: { label: 'Notas de la llamada' },
    },
  },
  log_meeting: {
    label: 'Registrar reunión',
    successMessage: '¡Reunión registrada exitosamente!',
    params: {
      subject: { label: 'Asunto de la reunión' },
      duration: { label: 'Duración (minutos)' },
      attendee_contacts: { label: 'Contactos participantes' },
      attendee_users: { label: 'Participantes internos' },
      notes: { label: 'Notas de la reunión' },
    },
  },
  schedule_meeting: {
    label: 'Programar reunión',
    successMessage: '¡Reunión programada!',
    params: {
      subject: { label: 'Asunto de la reunión' },
      start_date: { label: 'Fecha de inicio (UTC)' },
      start_time: { label: 'Hora de inicio (UTC)' },
      location: { label: 'Ubicación' },
      duration: { label: 'Duración (minutos)' },
      attendee_contacts: { label: 'Contactos participantes' },
      attendee_users: { label: 'Participantes internos' },
      notes: { label: 'Agenda' },
    },
  },
};

export const esES: TranslationData = {
  objects: {
    crm_account: {
      label: 'Cuenta',
      pluralLabel: 'Cuentas',
      description: 'Empresas y organizaciones con las que mantenemos relación comercial',
      fields: {
        account_number: { label: 'Número de Cuenta' },
        name: { label: 'Nombre de Cuenta', help: 'Nombre legal de la empresa u organización' },
        name_normalized: {
          label: 'Nombre de Cuenta (Normalizado)',
          help: 'Clave de coincidencia para la conversión de prospectos: el Nombre de Cuenta en minúsculas, sin espacios sobrantes y con los espacios internos reducidos a uno. Lo mantiene el hook account_protection — nunca lo edite directamente.',
        },
        display_title: { label: 'Título Mostrado' },
        type: {
          label: 'Tipo',
          // `former` is 'Former Customer' in account.object.ts; the `en` bundle
          // had truncated it to 'Former', and translating that truncation gave
          // a bare 'Anterior' — an adjective with no noun, next to three option
          // labels that are all nouns.
          options: { prospect: 'Prospecto', customer: 'Cliente', partner: 'Socio', former: 'Cliente Anterior' },
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
        annual_revenue: { label: 'Ingresos Anuales' },
        number_of_employees: { label: 'Número de Empleados' },
        phone: { label: 'Teléfono' },
        website: { label: 'Sitio Web' },
        billing_address: { label: 'Dirección de Facturación' },
        billing_country: {
          label: 'País de Facturación',
          help: 'Derivado de la Dirección de Facturación — el país tal como se introdujo, sin espacios y en mayúsculas.',
        },
        territory: {
          label: 'Territorio',
          help: 'Derivado de la Dirección de Facturación — el territorio de ventas que usan las reglas de compartición. Las cuentas fuera de los territorios con equipo asignado son Otro.',
          options: { na: 'Norteamérica', emea: 'EMEA', other: 'Otro' },
        },
        office_location: { label: 'Ubicación de Oficina' },
        owner_id: { label: 'Propietario de Cuenta' },
        parent_account: { label: 'Cuenta Matriz', help: 'Empresa matriz en la jerarquía' },
        description: { label: 'Descripción' },
        is_active: { label: 'Activo' },
        last_activity_date: { label: 'Fecha de Última Actividad' },
        brand_color: { label: 'Color de Marca' },
        logo: { label: 'Logo de la Empresa' },
        tier: {
          label: 'Nivel de Cliente',
          options: {
            strategic: 'Estratégico', enterprise: 'Gran Empresa',
            mid_market: 'Mediana Empresa', smb: 'PYME',
          },
        },
        segment: {
          label: 'Segmento',
          options: {
            net_new: 'Cliente Nuevo', growth: 'Crecimiento',
            at_risk: 'En Riesgo', stable: 'Estable',
          },
        },
        health_score: {
          label: 'Índice de Salud',
          help: 'Indicador de salud mantenido por el CSM',
          options: {
            healthy: 'Saludable', watching: 'En Observación',
            at_risk: 'En Riesgo', churning: 'En Fuga',
          },
        },
        renewal_owner: { label: 'Responsable de Renovación (CSM)' },
        next_renewal_date: { label: 'Próxima Fecha de Renovación' },
      },
      _views: {
        all_accounts: { label: 'Todas las Cuentas', description: 'Lista maestra de cuentas con ingresos e industria' },
        account_gallery: { label: 'Galería de Cuentas', description: 'Vista de tarjetas con colores de marca' },
        account_map: { label: 'Mapa de Cuentas', description: 'Distribución geográfica de cuentas' },
        enterprise_accounts: { label: 'Cuentas Empresariales', description: 'Cuentas con mayores ingresos anuales' },
        my_accounts: { label: 'Mis Cuentas', description: 'Cuentas asignadas al usuario actual' },
        renewals_due: { label: '🔄 Próximas Renovaciones' },
        at_risk_accounts: { label: '⚠️ Cuentas en Riesgo' },
      },
      _sections: {
        basic: { label: 'Información Básica' },
        financials: { label: 'Datos Financieros' },
        contact_info: { label: 'Información de Contacto' },
        ownership: { label: 'Propiedad y Estado' },
        branding: { label: 'Identidad de Marca' },
        system: { label: 'Sistema' },
      },
      _actions: { ...activityActions },
    },

    crm_contact: {
      label: 'Contacto',
      pluralLabel: 'Contactos',
      description: 'Personas asociadas a las cuentas',
      fields: {
        // Mismo juego de valores que `crm_lead.salutation` — tradúzcanse igual.
        salutation: {
          label: 'Título',
          options: { mr: 'Sr.', ms: 'Srta.', mrs: 'Sra.', dr: 'Dr.', prof: 'Prof.' },
        },
        first_name: { label: 'Nombre' },
        last_name: { label: 'Apellido' },
        full_name: { label: 'Nombre Completo' },
        crm_account: { label: 'Cuenta' },
        email: { label: 'Correo Electrónico' },
        phone: { label: 'Teléfono' },
        mobile: { label: 'Móvil' },
        title: { label: 'Cargo' },
        department: {
          label: 'Departamento',
          options: {
            executive: 'Ejecutivo', sales: 'Ventas', marketing: 'Marketing',
            engineering: 'Ingeniería', support: 'Soporte', finance: 'Finanzas',
            hr: 'Recursos Humanos', operations: 'Operaciones',
          },
        },
        owner_id: { label: 'Propietario de Contacto' },
        description: { label: 'Descripción' },
        is_primary: { label: 'Contacto Principal', help: '¿Es este el contacto principal de la cuenta?' },
        avatar: { label: 'Foto de Perfil' },
        reports_to: { label: 'Reporta A', help: 'Jefe o supervisor directo' },
        mailing_street: { label: 'Calle de Correo' },
        mailing_city: { label: 'Ciudad de Correo' },
        mailing_state: { label: 'Estado/Provincia de Correo' },
        mailing_postal_code: { label: 'Código Postal' },
        mailing_country: { label: 'País de Correo' },
        birthdate: { label: 'Fecha de Nacimiento' },
        // Juego compartido con `crm_lead.lead_source` y
        // `crm_opportunity.lead_source` — los tres deben coincidir literalmente.
        lead_source: {
          label: 'Origen del Prospecto',
          options: {
            web: 'Web', referral: 'Referencia', event: 'Evento / Feria',
            webinar: 'Seminario Web', partner: 'Socio', advertisement: 'Publicidad',
            paid_search: 'Búsqueda de Pago', social: 'Redes Sociales', content: 'Contenido / Blog',
            cold_call: 'Llamada en Frío', email_campaign: 'Campaña de Email', other: 'Otro',
          },
        },
        do_not_call: { label: 'No Llamar' },
        email_opt_out: { label: 'Excluir de Correos' },
        last_contacted_date: { label: 'Último contacto' },
      },
      _views: {
        all_contacts: { label: 'Todos los Contactos' },
        contact_directory: { label: 'Directorio de Contactos' },
        primary_contacts: { label: 'Contactos Principales' },
      },
      _sections: {
        identity: { label: 'Identidad' },
        account_info: { label: 'Cuenta y Cargo' },
        contact_info: { label: 'Información de Contacto' },
        // Los campos de esta sección se traducen «… de Correo»
        // (`mailing_street`, `mailing_city`…): el encabezado los acompaña.
        mailing_address: { label: 'Dirección de Correo' },
        additional: { label: 'Información Adicional' },
        preferences: { label: 'Preferencias de Comunicación' },
      },
      _actions: {
        ...activityActions,
        mark_primary: {
          label: 'Marcar como Principal',
          confirmText: '¿Establecer este contacto como contacto principal de la cuenta?',
          successMessage: '¡Establecido como contacto principal!',
        },
        send_email: {
          label: 'Enviar Correo',
          params: {
            subject: { label: 'Asunto' },
            body: { label: 'Cuerpo' },
          },
        },
      },
    },

    crm_knowledge_article: {
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
        view_count: { label: 'Vistas' },
        helpful_count: { label: 'Útil' },
        not_helpful_count: { label: 'No útil' },
      },
      _views: {
        all_articles: { label: 'Todos los artículos' },
        published_articles: { label: 'Publicados' },
        my_drafts: { label: 'Mis borradores' },
        stale_articles: { label: 'Cola de revisión · Más antiguos primero' },
      },
      _sections: {
        basic: { label: 'Información del Artículo' },
        content: { label: 'Contenido' },
        taxonomy: { label: 'Categorización' },
        metrics: { label: 'Interacción' },
      },
    },

    crm_forecast: {
      label: 'Previsión',
      pluralLabel: 'Previsiones',
      description: 'Instantánea periódica del pipeline por propietario para previsión de ingresos',
      fields: {
        owner_id: { label: 'Propietario' },
        period: { label: 'Periodo', options: { month: 'Mes', quarter: 'Trimestre' } },
        period_start: { label: 'Inicio del periodo' },
        period_end: { label: 'Fin del periodo' },
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
      },
    },

    crm_lead: {
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
          options: { crm_lead: 'Prospecto', crm_contact: 'Contacto' },
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
      },
      _actions: {
        ...activityActions,
        convert_lead: {
          label: 'Convertir Prospecto',
          confirmText: '¿Está seguro de querer convertir este prospecto?',
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
        competitors: {
          label: 'Competidores',
          options: { competitor_a: 'Competidor A', competitor_b: 'Competidor B', competitor_c: 'Competidor C' },
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
        competition: { label: 'Competencia y Campañas' },
        notes: { label: 'Notas y Próximos Pasos' },
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

    crm_case: {
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
        parent_case: { label: 'Caso Principal', help: 'Caso principal relacionado' },
        resolution: { label: 'Resolución' },
        customer_rating: { label: 'Satisfacción del Cliente', help: 'Valoración de satisfacción del cliente (1-5 estrellas)' },
        customer_feedback: { label: 'Comentarios del Cliente' },
        customer_signature: { label: 'Firma del Cliente', help: 'Firma digital que confirma la resolución del caso' },
        internal_notes: { label: 'Notas Internas', help: 'Notas internas no visibles para el cliente' },
        is_closed: { label: 'Está Cerrado' },
      },
      _views: {
        all_cases: { label: 'Todos los Casos' },
        case_workflow: { label: 'Flujo de Servicio' },
        sla_calendar: { label: 'Calendario SLA' },
        case_timeline: { label: 'Línea de Tiempo de Casos' },
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
      },
    },

    crm_contract: {
      label: 'Contrato',
      pluralLabel: 'Contratos',
      description: 'Contratos y acuerdos legales',
      fields: {
        contract_number: { label: 'Número de Contrato' },
        crm_account: { label: 'Cuenta' },
        crm_contact: { label: 'Contacto Principal' },
        crm_opportunity: { label: 'Oportunidad Relacionada' },
        owner_id: { label: 'Propietario del Contrato' },
        status: {
          label: 'Estado',
          options: {
            draft: 'Borrador', in_approval: 'En Aprobación', activated: 'Activado',
            expired: 'Expirado', terminated: 'Rescindido',
          },
        },
        contract_term_months: { label: 'Plazo del Contrato (Meses)' },
        start_date: { label: 'Fecha de Inicio' },
        end_date: { label: 'Fecha de Fin' },
        contract_value: { label: 'Valor del Contrato' },
        billing_frequency: {
          label: 'Frecuencia de Facturación',
          options: { monthly: 'Mensual', quarterly: 'Trimestral', annually: 'Anual', one_time: 'Pago Único' },
        },
        // Mismo juego de valores que `crm_quote.payment_terms` — tradúzcanse igual.
        payment_terms: {
          label: 'Términos de Pago',
          options: {
            net_15: 'Neto 15', net_30: 'Neto 30', net_60: 'Neto 60', net_90: 'Neto 90',
            due_on_receipt: 'Pago a la Recepción',
          },
        },
        auto_renewal: { label: 'Renovación Automática' },
        renewal_notice_days: { label: 'Aviso de Renovación (Días)' },
        contract_type: {
          label: 'Tipo de Contrato',
          options: {
            subscription: 'Suscripción', service: 'Acuerdo de Servicio', license: 'Licencia',
            partnership: 'Asociación', nda: 'Acuerdo de Confidencialidad (NDA)',
            msa: 'Acuerdo Marco de Servicios (MSA)',
          },
        },
        signed_date: { label: 'Fecha de Firma' },
        signed_by: { label: 'Firmado Por' },
        document_url: { label: 'Documento de Contrato' },
        special_terms: { label: 'Términos Especiales' },
        description: { label: 'Descripción' },
        billing_address: { label: 'Dirección de Facturación' },
      },
      _views: {
        all_contracts: { label: 'Todos los Contratos' },
        renewal_calendar: { label: 'Calendario de Renovación' },
        contract_gantt: { label: 'Plazos del Contrato' },
        contract_timeline: { label: 'Línea de Tiempo' },
      },
      _sections: {
        basic: { label: 'Información del Contrato' },
        parties: { label: 'Partes' },
        terms: { label: 'Términos y Fechas' },
        value: { label: 'Valor del Contrato' },
        status: { label: 'Estado y Aprobación' },
        renewal: { label: 'Renovación' },
      },
    },

    crm_product: {
      label: 'Producto',
      pluralLabel: 'Productos',
      description: 'Productos y servicios que ofrece la empresa',
      fields: {
        product_code: { label: 'Código de Producto' },
        display_title: { label: 'Título Mostrado' },
        name: { label: 'Nombre de Producto' },
        description: { label: 'Descripción' },
        category: {
          label: 'Categoría',
          options: {
            software: 'Software', hardware: 'Hardware', service: 'Servicio',
            subscription: 'Suscripción', support: 'Soporte',
          },
        },
        family: {
          label: 'Familia de Producto',
          options: {
            enterprise: 'Soluciones para Gran Empresa', smb: 'Soluciones para PYMEs',
            services: 'Servicios Profesionales', cloud: 'Servicios en la Nube',
          },
        },
        list_price: { label: 'Precio de Lista' },
        cost: { label: 'Costo' },
        sku: { label: 'SKU' },
        quantity_on_hand: { label: 'Cantidad Disponible' },
        reorder_point: { label: 'Punto de Reorden' },
        is_active: { label: 'Activo' },
        is_taxable: { label: 'Imponible' },
        tax_rate: { label: 'Tasa de Impuesto por Defecto %' },
        billing_type: {
          label: 'Tipo de Facturación',
          options: {
            one_time: 'Pago Único', monthly: 'Mensual', quarterly: 'Trimestral',
            annual: 'Anual', usage: 'Por Uso',
          },
        },
        unit_of_measure: {
          label: 'Unidad de Medida',
          options: {
            each: 'Unidad', license: 'Licencia', seat: 'Puesto',
            hour: 'Hora', day: 'Día', month: 'Mes',
          },
        },
        product_manager: { label: 'Gerente de Producto' },
        image: { label: 'Imagen de Producto' },
        datasheet: { label: 'Ficha Técnica' },
      },
      _views: {
        all_products: { label: 'Todos los Productos' },
        product_catalog: { label: 'Catálogo de Productos' },
        low_stock: { label: 'Stock Bajo' },
      },
      _sections: {
        basic: { label: 'Información del Producto' },
        pricing: { label: 'Precios y Facturación' },
        metadata: { label: 'Recursos' },
      },
    },

    crm_quote: {
      label: 'Cotización',
      pluralLabel: 'Cotizaciones',
      description: 'Cotizaciones de precios para clientes',
      fields: {
        quote_number: { label: 'Número de Cotización' },
        display_title: { label: 'Título Mostrado' },
        name: { label: 'Nombre de Cotización' },
        crm_account: { label: 'Cuenta' },
        crm_contact: {
          label: 'Contacto',
          help: 'Obligatorio en cuanto el presupuesto pasa a Presentado o Aceptado: el contrato generado toma de aquí su Contacto principal.',
        },
        crm_opportunity: { label: 'Oportunidad' },
        owner_id: { label: 'Propietario de Cotización' },
        status: {
          label: 'Estado',
          options: {
            draft: 'Borrador', in_review: 'En Revisión', presented: 'Presentada',
            accepted: 'Aceptada', rejected: 'Rechazada', expired: 'Expirada',
          },
        },
        quote_date: { label: 'Fecha de Cotización' },
        expiration_date: { label: 'Fecha de Expiración' },
        subtotal: { label: 'Subtotal' },
        discount: { label: 'Descuento %' },
        discount_amount: { label: 'Monto de Descuento' },
        tax: { label: 'Impuesto' },
        shipping_handling: { label: 'Envío y Manipulación' },
        total_price: { label: 'Precio Total' },
        // Mismo juego de valores que `crm_contract.payment_terms` — tradúzcanse igual.
        payment_terms: {
          label: 'Términos de Pago',
          options: {
            net_15: 'Neto 15', net_30: 'Neto 30', net_60: 'Neto 60', net_90: 'Neto 90',
            due_on_receipt: 'Pago a la Recepción',
          },
        },
        shipping_terms: { label: 'Términos de Envío' },
        billing_address: { label: 'Dirección de Facturación' },
        shipping_address: { label: 'Dirección de Envío' },
        description: { label: 'Descripción' },
        internal_notes: { label: 'Notas Internas' },
      },
      _views: {
        all_quotes: { label: 'Todas las Cotizaciones' },
        quote_pipeline: { label: 'Pipeline de Cotizaciones' },
        quote_calendar: { label: 'Calendario de Cotizaciones' },
      },
      _sections: {
        basic: { label: 'Información de la Cotización' },
        pricing: { label: 'Precios' },
        terms: { label: 'Términos y Vigencia' },
        address: { label: 'Direcciones' },
        system: { label: 'Sistema' },
      },
    },

    crm_task: {
      label: 'Tarea',
      pluralLabel: 'Tareas',
      description: 'Actividades y tareas pendientes',
      fields: {
        subject: { label: 'Asunto' },
        description: { label: 'Descripción' },
        status: {
          label: 'Estado',
          options: {
            not_started: 'No Iniciada', in_progress: 'En Curso', waiting: 'En Espera',
            completed: 'Completada', deferred: 'Aplazada',
          },
        },
        priority: {
          label: 'Prioridad',
          options: { low: 'Baja', normal: 'Normal', high: 'Alta', urgent: 'Urgente' },
        },
        priority_rank: { label: 'Rango de Prioridad' },
        type: {
          label: 'Tipo de Tarea',
          options: {
            call: 'Llamada', email: 'Email', meeting: 'Reunión',
            follow_up: 'Seguimiento', demo: 'Demostración', other: 'Otro',
          },
        },
        due_date: { label: 'Fecha Límite' },
        reminder_date: { label: 'Fecha/Hora de Recordatorio' },
        reminder_sent: { label: 'Recordatorio Enviado' },
        completed_date: { label: 'Fecha de Finalización' },
        owner_id: { label: 'Asignado A' },
        // Los valores son nombres de objeto: se reutilizan las etiquetas ya
        // traducidas de cada objeto en este mismo paquete (igual que
        // `crm_event.related_to_type`).
        related_to_type: {
          label: 'Tipo de Objeto Relacionado',
          options: {
            crm_account: 'Cuenta', crm_contact: 'Contacto', crm_opportunity: 'Oportunidad',
            crm_lead: 'Prospecto', crm_case: 'Caso',
          },
        },
        related_to_account: { label: 'Cuenta Relacionada' },
        related_to_contact: { label: 'Contacto Relacionado' },
        related_to_opportunity: { label: 'Oportunidad Relacionada' },
        related_to_lead: { label: 'Prospecto Relacionado' },
        related_to_case: { label: 'Caso Relacionado' },
        is_recurring: { label: 'Tarea Recurrente' },
        recurrence_type: {
          label: 'Tipo de Recurrencia',
          options: { daily: 'Diaria', weekly: 'Semanal', monthly: 'Mensual', yearly: 'Anual' },
        },
        recurrence_interval: { label: 'Intervalo de Recurrencia' },
        recurrence_end_date: { label: 'Fecha Fin de Recurrencia' },
        is_completed: { label: 'Está Completado' },
        is_overdue: { label: 'Está Vencido' },
        progress_percent: { label: 'Progreso (%)' },
        estimated_hours: { label: 'Horas Estimadas' },
        actual_hours: { label: 'Horas Reales' },
      },
      _views: {
        all_tasks: { label: 'Todas las Tareas' },
        task_board: { label: 'Tablero de Tareas' },
        task_calendar: { label: 'Calendario de Tareas' },
        task_gantt: { label: 'Plan de Ejecución' },
        task_timeline: { label: 'Línea de Tiempo' },
        my_open_tasks: { label: 'Mis Tareas Abiertas' },
        todays_tasks: { label: '📅 Mis Tareas Prioritarias' },
        overdue_tasks: { label: '⏰ Tareas Abiertas · Más Vencidas Primero' },
      },
      _sections: {
        basic: { label: 'Información de la Tarea' },
        scheduling: { label: 'Programación' },
        related: { label: 'Registros Relacionados' },
        recurrence: { label: 'Recurrencia' },
        effort: { label: 'Progreso y Esfuerzo' },
        system: { label: 'Sistema' },
      },
    },

    crm_campaign: {
      label: 'Campaña',
      pluralLabel: 'Campañas',
      description: 'Campañas e iniciativas de marketing',
      fields: {
        campaign_code: { label: 'Código de Campaña' },
        display_title: { label: 'Título Mostrado' },
        name: { label: 'Nombre de Campaña' },
        description: { label: 'Descripción' },
        type: {
          label: 'Tipo de Campaña',
          options: {
            email: 'Email', webinar: 'Seminario Web', trade_show: 'Feria Comercial',
            conference: 'Conferencia', direct_mail: 'Correo Postal', social_media: 'Redes Sociales',
            content: 'Marketing de Contenidos', partner: 'Marketing con Socios',
          },
        },
        channel: {
          label: 'Canal Principal',
          options: {
            digital: 'Digital', social: 'Redes Sociales', email: 'Email',
            events: 'Eventos', partner: 'Socios',
          },
        },
        status: {
          label: 'Estado',
          options: {
            planning: 'Planificación', in_progress: 'En Curso',
            completed: 'Completada', aborted: 'Cancelada',
          },
        },
        start_date: { label: 'Fecha de Inicio' },
        end_date: { label: 'Fecha de Fin' },
        budgeted_cost: { label: 'Costo Presupuestado' },
        actual_cost: { label: 'Costo Real' },
        expected_revenue: { label: 'Ingresos Previstos' },
        actual_revenue: { label: 'Ingresos Reales' },
        target_size: { label: 'Tamaño Objetivo', help: 'Número objetivo de prospectos/contactos' },
        num_sent: { label: 'Cantidad Enviada' },
        num_responses: { label: 'Número de Respuestas' },
        num_leads: { label: 'Número de Prospectos' },
        num_converted_leads: { label: 'Prospectos Convertidos' },
        num_opportunities: { label: 'Oportunidades Creadas' },
        num_won_opportunities: { label: 'Oportunidades Ganadas' },
        response_rate: { label: 'Tasa de Respuesta %' },
        roi: { label: 'ROI %' },
        parent_campaign: { label: 'Campaña Principal', help: 'Campaña principal en la jerarquía' },
        owner_id: { label: 'Propietario de Campaña' },
        landing_page_url: { label: 'Página de Aterrizaje' },
        is_active: { label: 'Activo' },
      },
      _views: {
        all_campaigns: { label: 'Todas las Campañas' },
        campaign_gantt: { label: 'Programación de Campañas' },
        campaign_calendar: { label: 'Calendario de Campañas' },
        campaign_timeline: { label: 'Línea de Tiempo de Marketing' },
      },
      _sections: {
        basic: { label: 'Información de Campaña' },
        schedule: { label: 'Programación' },
        budget: { label: 'Presupuesto y ROI' },
        metrics: { label: 'Rendimiento' },
        // El inglés de este grupo es «Ownership», no «Assignment»: agrupa al
        // propietario de la campaña, igual que `crm_account.ownership`.
        assignment: { label: 'Propiedad' },
        assets: { label: 'Recursos de Campaña' },
      },
      _actions: {
        enroll_leads: {
          label: 'Inscribir Prospectos',
          successMessage: 'Prospectos elegibles inscritos en la campaña.',
        },
      },
    },

    crm_event: {
      label: 'Evento',
      pluralLabel: 'Eventos',
      description: 'Reuniones, llamadas y otras interacciones programadas con clientes',
      fields: {
        subject: { label: 'Asunto' },
        description: { label: 'Descripción' },
        type: {
          label: 'Tipo de evento',
          options: {
            meeting: 'Reunión', call: 'Llamada', demo: 'Demostración',
            webinar: 'Seminario web', onsite_visit: 'Visita presencial', other: 'Otro',
          },
        },
        status: {
          label: 'Estado',
          options: {
            planned: 'Planificado', held: 'Realizado', cancelled: 'Cancelado', no_show: 'No asistió',
          },
        },
        owner_id: { label: 'Asignado a' },
        start_datetime: { label: 'Inicio' },
        end_datetime: { label: 'Fin' },
        all_day: { label: 'Evento de todo el día' },
        duration_minutes: { label: 'Duración (minutos)' },
        location: { label: 'Ubicación', help: 'Sala, dirección o enlace de la reunión' },
        related_to_type: {
          label: 'Tipo de registro relacionado',
          options: {
            crm_account: 'Cuenta', crm_contact: 'Contacto', crm_opportunity: 'Oportunidad',
            crm_lead: 'Prospecto', crm_case: 'Caso',
          },
        },
        related_to_account: { label: 'Cuenta relacionada' },
        related_to_contact: { label: 'Contacto relacionado' },
        related_to_opportunity: { label: 'Oportunidad relacionada' },
        related_to_lead: { label: 'Prospecto relacionado' },
        related_to_case: { label: 'Caso relacionado' },
        outcome_notes: { label: 'Notas de resultado', help: 'Qué se acordó y qué sigue' },
      },
      _views: {
        all_events: { label: 'Todos los eventos' },
        event_calendar: { label: 'Calendario de eventos' },
        event_timeline: { label: 'Agenda del equipo' },
        my_events: { label: 'Mi calendario' },
        upcoming_events: { label: '📅 Próximos · Más cercanos primero' },
        held_events: { label: '✅ Historial de interacciones' },
      },
      _sections: {
        basic: { label: 'Información del Evento' },
        schedule: { label: 'Programación' },
        related: { label: 'Registros Relacionados' },
        outcome: { label: 'Resultado' },
      },
    },

    crm_event_attendee: {
      label: 'Asistente al evento',
      pluralLabel: 'Asistentes al evento',
      description: 'Persona invitada o presente en un evento',
      fields: {
        attendee_number: { label: 'Número de asistente' },
        crm_event: { label: 'Evento' },
        attendee_type: {
          label: 'Tipo de asistente',
          options: { contact: 'Contacto', lead: 'Prospecto', user: 'Usuario', external: 'Externo' },
        },
        crm_contact: { label: 'Contacto', help: 'Se rellena cuando el asistente es un contacto de cliente ya existente' },
        crm_lead: { label: 'Prospecto', help: 'Se rellena cuando el asistente sigue siendo un prospecto sin convertir' },
        sys_user: { label: 'Usuario', help: 'Se rellena cuando el asistente es un compañero de la empresa' },
        external_name: { label: 'Asistente externo', help: 'Nombre de un asistente que no está en ningún objeto del CRM: se rellena cuando el tipo de asistente es Externo' },
        response: {
          label: 'Respuesta',
          options: {
            no_response: 'Sin respuesta', accepted: 'Aceptado',
            declined: 'Rechazado', tentative: 'Tentativo',
          },
        },
        is_organizer: { label: 'Organizador' },
        invited_date: { label: 'Invitado el' },
      },
      _views: {
        all_event_attendees: { label: 'Asistentes al evento' },
      },
      _sections: {
        // El inglés es «Attendee» / «Invitation», no el par
        // «Basic Information» / «Response Tracking» de crm_campaign_member.
        basic: { label: 'Asistente' },
        response: { label: 'Invitación' },
      },
    },

    crm_campaign_member: {
      label: 'Miembro de Campaña',
      pluralLabel: 'Miembros de Campaña',
      description: 'Prospectos y contactos alcanzados por una campaña, con su estado de respuesta',
      fields: {
        member_number: { label: 'Número de Miembro' },
        crm_campaign: { label: 'Campaña' },
        crm_lead: { label: 'Prospecto', help: 'Se rellena cuando el miembro era un Prospecto en el momento de la inscripción' },
        crm_contact: { label: 'Contacto', help: 'Se rellena cuando el miembro es un Contacto existente' },
        status: {
          label: 'Estado',
          options: {
            sent: 'Enviado', opened: 'Abierto', clicked: 'Clicado',
            responded: 'Respondido', converted: 'Convertido', bounced: 'Rebotado',
            unsubscribed: 'Dado de Baja',
          },
        },
        added_date: { label: 'Fecha de Alta' },
        first_opened_date: { label: 'Primera Apertura' },
        first_clicked_date: { label: 'Primer Clic' },
        response_date: { label: 'Fecha de Respuesta' },
        has_responded: { label: 'Ha Respondido' },
      },
      _sections: {
        basic: { label: 'Información Básica' },
        response: { label: 'Seguimiento de Respuesta' },
      },
    },

    crm_opportunity_line_item: {
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
    },

    crm_quote_line_item: {
      label: 'Línea de Presupuesto',
      pluralLabel: 'Líneas de Presupuesto',
      description: 'Líneas de precio por producto dentro de un presupuesto',
      fields: {
        crm_quote: { label: 'Presupuesto' },
        crm_product: { label: 'Producto' },
        description: { label: 'Descripción' },
        quantity: { label: 'Cantidad' },
        list_price: { label: 'Precio de Lista' },
        unit_price: { label: 'Precio de Venta' },
        discount: { label: 'Descuento (%)' },
        subtotal: { label: 'Subtotal' },
        tax_rate: { label: 'Tasa de Impuesto (%)' },
        total_price: { label: 'Total' },
        line_number: { label: 'Nº de Línea' },
      },
    },
  },

  apps: {
    crm_enterprise: {
      label: 'HotCRM',
      description: 'Gestión de relaciones con clientes para ventas, servicio y marketing',
      // Indexado por el `id` del nodo de navegación (espacio de nombres plano,
      // sea cual sea la profundidad del nodo).
      navigation: {
        group_activity: { label: 'Actividad' },
        nav_event: { label: 'Eventos' },
        nav_event_calendar: { label: 'Calendario' },
        nav_event_history: { label: 'Historial de Interacciones' },
        nav_activity_dashboard: { label: 'Actividad de Ventas' },
        nav_my_calendar: { label: 'Mi Calendario' },
        nav_home: { label: 'Inicio' },

        group_sales: { label: 'Ventas' },
        nav_lead: { label: 'Prospectos' },
        nav_account: { label: 'Cuentas' },
        nav_account_workbench: { label: 'Mesa de Trabajo de Cuentas' },
        nav_contact: { label: 'Contactos' },
        nav_opportunity: { label: 'Oportunidades' },
        nav_pipeline: { label: 'Pipeline' },
        nav_quote: { label: 'Cotizaciones' },
        nav_contract: { label: 'Contratos' },
        nav_sales_dashboard: { label: 'Rendimiento de Ventas' },

        group_work: { label: 'Mi Trabajo' },
        nav_my_tasks: { label: 'Mis Tareas' },
        nav_my_deals: { label: 'Mis Negocios' },
        nav_my_leads: { label: 'Mis Prospectos' },
        nav_my_cases: { label: 'Mis Casos' },
        nav_all_tasks: { label: 'Todas las Tareas' },

        group_service: { label: 'Servicio' },
        nav_case: { label: 'Casos' },
        nav_knowledge: { label: 'Conocimiento' },
        nav_service_dashboard: { label: 'Resumen de Servicio' },

        group_marketing: { label: 'Marketing' },
        nav_campaign: { label: 'Campañas' },
        nav_product: { label: 'Productos' },

        group_insights: { label: 'Análisis' },
        nav_crm_dashboard: { label: 'Resumen CRM' },
        nav_forecast: { label: 'Previsiones' },
        nav_report_pipeline_coverage: { label: 'Cobertura del Pipeline' },
        nav_report_lead_inflow: { label: 'Entrada de Prospectos' },
        nav_report_sla: { label: 'Cumplimiento de SLA' },

        group_approvals: { label: 'Aprobaciones' },
        nav_approval_requests: { label: 'Bandeja de Entrada' },
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
        pipeline_by_stage: { title: 'Pipeline por etapa', description: 'Valor de oportunidades abiertas por etapa de venta' },
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
        open_cases_by_priority: { title: 'Casos abiertos por prioridad', description: 'Casos abiertos y su tasa de incumplimiento de SLA, desglosados por prioridad' },
      },
    },
  },

  // `title` / `subtitle` son las propiedades del componente `page:header`.
  // Los marcadores `{…}` se sustituyen sobre la cadena TRADUCIDA, así que el
  // token debe conservarse tal cual: traducido, no resuelve y se ve vacío.
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
      subtitle: 'Bienvenido de nuevo, {current_user.first_name}',
      components: {
        quick_create: { title: 'Creación Rápida', label: 'Creación Rápida' },
        my_recent_items: { title: 'Elementos Recientes', label: 'Elementos Recientes' },
        key_metrics: { title: 'Indicadores Clave de Rendimiento', label: 'Métricas Clave' },
        home_tabs: { label: 'Pestañas de Inicio' },
        ai_briefing: {
          title: 'Pregúntale al Asistente de IA',
          description:
            'Abra el panel del asistente desde el borde derecho de la página y pregunte "¿en qué debería concentrarme hoy?" — ve su flujo de ventas, esquema y cuentas en tiempo real.',
          label: 'Hoy con el Asistente de IA',
        },
        upcoming_events: { title: 'Agenda de Hoy', label: 'Calendario' },
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
