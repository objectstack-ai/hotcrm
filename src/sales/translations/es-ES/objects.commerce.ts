// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ObjectTranslationData } from '@objectstack/spec/system';

/**
 * Español (es-ES) — `objects` translations for the COMMERCE family:
 * what gets sold and on what paper — quotes, contracts, products.
 *
 * Roster: `crm_quote`, `crm_quote_line_item`, `crm_contract`, `crm_sales_order`,
 * `crm_sales_order_line`, `crm_product`,
 * `crm_price_book`, `crm_price_book_entry`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/sales/translations/es-ES.ts`.
 */
export const commerce: Record<string, ObjectTranslationData> = {
  crm_contract: {
    _validations: {
      end_after_start: {
        message: 'La fecha de fin debe ser posterior a la de inicio',
      },
      contract_status_progression: {
        message: 'Este cambio de estado no está permitido. Un contrato avanza Borrador → En Aprobación → Activado → Expirado; En Aprobación puede volver a Borrador, y Borrador, En Aprobación o Activado pueden pasar a Rescindido. Expirado y Rescindido son definitivos: una renovación es un contrato nuevo.',
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
      payment_terms: { label: 'Términos de Pago' },
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
      // The countersigned copy (#2317).
      signed_copy: {
        label: 'Copia firmada',
        help: 'El contrato tal como lo firmó el cliente. Obligatoria para activar el contrato; al subirla se rellena la Fecha de Firma si está vacía.',
      },
      document_url: { label: 'Documento de Contrato' },
      special_terms: { label: 'Términos Especiales' },
      description: { label: 'Descripción' },
      automation_key: { label: 'Clave de Automatización', help: 'La automatización que redactó este contrato. La escribe esa automatización; no la edite.' },
      billing_address: { label: 'Dirección de Facturación' },
    },
    // Print Contract (#2317).
    _actions: {
      print_contract: { label: 'Imprimir Contrato', successMessage: 'PDF del contrato adjuntado al contrato.' },
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
  // The order and its lines (REQ-0010, hotcrm#2555).
  crm_sales_order: {
    // Draft Contract (#2558).
    _actions: {
      draft_contract: { label: 'Redactar contrato' },
    },
    _validations: {
      shipped_after_order: { message: 'La Fecha de Envío no puede ser anterior a la Fecha del Pedido' },
      sales_order_status_progression: { message: 'Este cambio de estado no está permitido. Un pedido avanza Borrador → Confirmado → Completado; Confirmado puede volver a Borrador, y Borrador o Confirmado pueden pasar a Cancelado. Completado y Cancelado son definitivos.' },
      contract_same_account: { message: 'El contrato debe pertenecer a la Cuenta de este pedido.' },
      contract_same_account_check: { message: 'Este contrato pertenece a otra cuenta. Un pedido solo puede llevar un contrato de su propia Cuenta: elija uno de los contratos de esta cuenta, o deje Contrato vacío.' },
    },
    label: 'Pedido',
    pluralLabel: 'Pedidos',
    description: 'Lo que un cliente pidió, sus líneas y totales, y cuánto se ha enviado',
    fields: {
      owner_id: { label: 'Propietario del Pedido' },
      order_number: { label: 'Número de Pedido' },
      name: { label: 'Nombre del Pedido' },
      crm_account: { label: 'Cuenta' },
      crm_contact: { label: 'Contacto' },
      crm_opportunity: { label: 'Oportunidad' },
      order_date: { label: 'Fecha del Pedido' },
      crm_contract: { label: 'Contrato' },
      customer_po_number: { label: 'N.º de Orden de Compra del Cliente', help: 'El número de la orden de compra del propio cliente, tal como él la citará.' },
      description: { label: 'Descripción' },
      subtotal: { label: 'Subtotal' },
      discount: { label: 'Descuento %' },
      discount_amount: { label: 'Monto de Descuento' },
      tax: { label: 'Impuesto' },
      shipping_handling: { label: 'Envío y Manipulación' },
      total_price: { label: 'Precio Total' },
      payment_terms: { label: 'Términos de Pago' },
      shipped_date: { label: 'Fecha de Envío' },
      billing_address: { label: 'Dirección de Facturación' },
      shipping_address: { label: 'Dirección de Envío' },
      external_ref: { label: 'Referencia Externa', help: 'El número del pedido en otro sistema. Una importación con la misma referencia actualiza este pedido.' },
      status: { label: 'Estado', options: { draft: 'Borrador', confirmed: 'Confirmado', completed: 'Completado', cancelled: 'Cancelado' } },
      fulfillment_status: { label: 'Estado de Envío', options: { not_shipped: 'No Enviado', partially_shipped: 'Enviado Parcialmente', shipped: 'Enviado' } },
    },
    _views: {
      all_sales_orders: { label: 'Todos los Pedidos' },
      order_board: { label: 'Tablero de Pedidos' },
      orders_to_ship: { label: 'Por Enviar' },
    },
    _sections: {
      basic: { label: 'Información del Pedido' },
      pricing: { label: 'Precios' },
      delivery: { label: 'Envío' },
      address: { label: 'Direcciones' },
      system: { label: 'Sistema' },
    },
  },
  // The order and its lines (REQ-0010, hotcrm#2555).
  crm_sales_order_line: {
    _validations: {
      unit_price_positive: { message: 'El precio de venta no puede ser negativo' },
      product_or_title: { message: 'Elija un producto o escriba un Título del producto' },
    },
    label: 'Línea de Pedido',
    pluralLabel: 'Líneas de Pedido',
    description: 'Una línea de un pedido',
    fields: {
      crm_sales_order: { label: 'Pedido' },
      crm_product: { label: 'Producto' },
      product_title: { label: 'Título del producto', help: 'Lo que vende esta línea. Se rellena con el producto elegido; escríbalo si no hay producto.' },
      description: { label: 'Descripción' },
      quantity: { label: 'Cantidad' },
      list_price: { label: 'Precio de Lista', help: 'El precio de lista del producto cuando se puso en esta línea.' },
      unit_price: { label: 'Precio de Venta' },
      discount: { label: 'Descuento (%)' },
      subtotal: { label: 'Subtotal' },
      total_price: { label: 'Total' },
      line_number: { label: 'Nº de Línea' },
    },
    _sections: {
      basic: { label: 'Línea' },
      pricing: { label: 'Precios' },
    },
  },
};
