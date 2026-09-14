// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ObjectTranslationData } from '@objectstack/spec/system';

import { activityActions } from './_shared';

/**
 * Español (es-ES) — `objects` translations for the CUSTOMER family:
 * the customer record itself — accounts and the people at them.
 *
 * Roster: `crm_account`, `crm_contact`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/translations/es-ES.ts`.
 */
export const customer: Record<string, ObjectTranslationData> = {
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
      child_account_revenue: { label: 'Ingresos de Cuentas Hijas', help: 'Suma de los ingresos anuales de las cuentas hijas directas.' },
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
    },
    _views: {
      all_accounts: {
        label: 'Todas las Cuentas', description: 'Lista maestra de cuentas con ingresos e industria',
        bulkActions: {
          delete: {
            label: 'Eliminar',
            confirmLabel: 'Eliminar',
            confirmText: '¿Eliminar permanentemente {{count}} cuenta(s)? Esta acción no se puede deshacer.',
          },
          transfer_owner: {
            label: 'Transferir propietario',
            confirmText: '¿Transferir la propiedad de {{count}} cuenta(s)?',
            params: {
              owner_id: {
                label: 'Nuevo propietario',
              },
            },
          },
          update_tier: {
            label: 'Actualizar nivel',
            confirmText: '¿Actualizar el nivel de {{count}} cuenta(s) a {{tier}}?',
            params: {
              tier: {
                label: 'Nivel de cliente',
              },
            },
          },
        },
      },
      account_gallery: { label: 'Galería de Cuentas', description: 'Vista de tarjetas con colores de marca' },
      account_map: { label: 'Mapa de Cuentas', description: 'Distribución geográfica de cuentas' },
      enterprise_accounts: { label: 'Cuentas Empresariales', description: 'Cuentas con mayores ingresos anuales' },
      my_accounts: { label: 'Mis Cuentas', description: 'Cuentas asignadas al usuario actual' },
      at_risk_accounts: { label: '⚠️ Cuentas en Riesgo' },
    },
    _sections: {
      basic: { label: 'Información Básica' },
      financials: { label: 'Datos Financieros' },
      contact_info: { label: 'Información de Contacto' },
      ownership: { label: 'Propiedad y Estado' },
      branding: { label: 'Identidad de Marca' },
      system: { label: 'Sistema' },
      // Nombres de sección del formulario en account.view.ts (#1100)
      profile: { label: 'Perfil' },
      customer_success: { label: 'Éxito del Cliente' },
      locations: { label: 'Ubicaciones' },
      description: { label: 'Descripción' },
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
      mailing_street: { label: 'Calle de Correo' },
      mailing_city: { label: 'Ciudad de Correo' },
      mailing_state: { label: 'Estado/Provincia de Correo' },
      mailing_postal_code: { label: 'Código Postal' },
      mailing_country: { label: 'País de Correo' },
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
      // Nombres de sección del formulario en contact.view.ts (#1100)
      contact_details: { label: 'Información de Contacto' },
      comm_preferences: { label: 'Preferencias' },
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
      add_contact_to_campaign: {
        label: 'Añadir a Campaña',
        successMessage: '¡Contactos añadidos a la campaña!',
        params: {
          crm_campaign: { label: 'Campaña' },
        },
      },
    },
  },
};
