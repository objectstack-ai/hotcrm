// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ObjectTranslationData } from '@objectstack/spec/system';

/**
 * Español (es-ES) — `objects` translations for the COMMERCE family:
 * what gets sold and on what paper — quotes, contracts, products.
 *
 * Roster: `crm_quote`, `crm_quote_line_item`, `crm_contract`, `crm_product`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/translations/es-ES.ts`.
 */
export const commerce: Record<string, ObjectTranslationData> = {
  crm_quote: {
    _validations: {
      discount_within_ceiling: {
        message: 'El descuento no puede superar el 60 %',
      },
      expiration_after_quote: {
        message: 'La fecha de vencimiento debe ser posterior a la de la cotización',
      },
      quote_status_progression: {
        message: 'Transición de estado de cotización no válida',
      },
    },
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
      // Nombres de sección del formulario en quote.view.ts (#1100)
      quote: { label: 'Cotización' },
      totals: { label: 'Totales' },
      quote_terms: { label: 'Términos' },
      addresses_and_notes: { label: 'Direcciones y Notas' },
    },
  },
  crm_quote_line_item: {
    _validations: {
      discount_within_ceiling: {
        message: 'El descuento de línea no puede superar el 60 %',
      },
      unit_price_positive: {
        message: 'El precio de venta no puede ser negativo',
      },
    },
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
    _sections: {
      basic: { label: 'Línea' },
      pricing: { label: 'Precios' },
    },
  },
  crm_contract: {
    _validations: {
      end_after_start: {
        message: 'La fecha de fin debe ser posterior a la de inicio',
      },
      contract_status_progression: {
        message: 'Transición de estado de contrato no válida',
      },
    },
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
      // Nombres de sección del formulario en contract.view.ts (#1100)
      contract_terms: { label: 'Términos' },
      signing_and_documents: { label: 'Firma y Documentos' },
      notes: { label: 'Notas' },
    },
  },
  crm_product: {
    _validations: {
      cost_less_than_price: {
        message: 'El coste debería ser inferior al precio de lista',
      },
      price_positive: {
        message: 'El precio de lista debe ser positivo',
      },
    },
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
      is_active: { label: 'Activo' },
      product_manager: { label: 'Gerente de Producto' },
      image: { label: 'Imagen de Producto' },
      datasheet: { label: 'Ficha Técnica' },
    },
    _views: {
      all_products: { label: 'Todos los Productos' },
      product_catalog: { label: 'Catálogo de Productos' },
    },
    _sections: {
      basic: { label: 'Información del Producto' },
      pricing: { label: 'Precios' },
      metadata: { label: 'Recursos' },
      // Nombres de sección del formulario en product.view.ts (#1100)
      product_info: { label: 'Información del Producto' },
      pricing_info: { label: 'Precios' },
      media: { label: 'Multimedia' },
    },
  },
};
