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
      name: { label: 'Nombre del Contrato' },
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
      // The contract's form, an order contract's amount and Change (#2804).
      contract_form: {
        label: 'Forma del Contrato',
        help: 'Contrato de Pedido: redactado desde un pedido, su valor es el importe del pedido. Contrato Marco: su valor se escribe a mano y puede cubrir varios pedidos. Otro: sin importe, como un NDA.',
        options: { order: 'Contrato de Pedido', framework: 'Contrato Marco', other: 'Otro' },
      },
      crm_sales_order: { label: 'Pedido de Origen', help: 'El pedido desde el que se redactó este contrato.' },
      order_amount: { label: 'Importe del Pedido', help: 'El total de los pedidos confirmados y completados de este contrato, impuestos incluidos. Los pedidos en borrador y cancelados no cuentan.' },
      linked_order_amount: { label: 'Importe de Pedidos Vinculados', help: 'El total de los pedidos no cancelados de este contrato, impuestos incluidos. Un contrato de pedido lo sigue mientras es un borrador.' },
      order_amount_shown: { label: 'Importe del Pedido', help: 'En un contrato de pedido, el importe de su pedido. En un contrato marco, el total de sus pedidos confirmados y completados; los pedidos en borrador y cancelados no cuentan. Impuestos incluidos.' },
      order_amount_differs: { label: 'Difiere del Importe del Pedido', help: 'El valor del contrato ya no es igual al importe del pedido. Cambiar, con Actualizar desde el Pedido, toma el importe del pedido.' },
      remaining_quota: { label: 'Cupo Restante', help: 'El valor del contrato menos el Importe del Pedido (pedidos confirmados y completados). Es negativo cuando los pedidos superan el valor del contrato.' },
      change_reason: { label: 'Motivo del Cambio', help: 'Por qué se cambió el contrato la última vez. Lo escribe Cambiar.' },
      change_amendment: { label: 'Enmienda Firmada', help: 'La enmienda que el cliente firmó para el último cambio. La escribe Cambiar.' },
      change_new_value: { label: 'Nuevo Valor del Contrato', help: 'Déjelo vacío para conservar el valor del contrato.' },
      change_new_end_date: { label: 'Nueva Fecha de Fin', help: 'Déjela vacía para conservar la fecha de fin.' },
      change_new_payment_terms: { label: 'Nuevas Condiciones de Pago', help: 'Déjelas vacías para conservar las condiciones de pago.' },
      change_from_order: { label: 'Actualizar desde el Pedido', help: 'Toma el importe actual del pedido como valor del contrato.' },
    },
    // Print Contract (#2317).
    _actions: {
      print_contract: { label: 'Imprimir Contrato', successMessage: 'PDF del contrato adjuntado al contrato.' },
      // Change (#2804): one action per kind of contract.
      change_contract: { label: 'Cambiar', description: 'Cambia el valor, la fecha de fin o las condiciones de pago de este contrato activado. Deje un campo vacío para conservarlo.', successMessage: 'Contrato {{ record.name }} cambiado.' },
      change_order_contract: { label: 'Cambiar', description: 'Cambia la fecha de fin o las condiciones de pago de este contrato de pedido activado, o toma el importe actual del pedido. Deje un campo vacío para conservarlo.', successMessage: 'Contrato {{ record.name }} cambiado.' },
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
      orders: { label: 'Totales de Pedidos' },
      status: { label: 'Estado y Aprobación' },
      renewal: { label: 'Renovación' },
      change: { label: 'Último Cambio' },
      // Nombres de sección del formulario en contract.view.ts (#1100)
      contract_terms: { label: 'Términos' },
      signing_and_documents: { label: 'Firma y Documentos' },
      notes: { label: 'Notas' },
    },
  },
  // The order and its lines (REQ-0010, hotcrm#2555).
  crm_sales_order: {
    // Draft Contract (#2558).
    _actions: {
      draft_contract: { label: 'Redactar contrato' },
      // Confirm / Complete / Cancel Order (#2716).
      confirm_sales_order: {
        label: 'Confirmar pedido',
        confirmText: '¿Confirmar este pedido? Sus líneas quedan bloqueadas: para cambiarlas, el pedido tiene que volver a Borrador.',
        successMessage: 'Pedido {{ record.name }} confirmado.',
      },
      complete_sales_order: {
        label: 'Completar pedido',
        confirmText: '¿Completar este pedido? Un pedido completado es definitivo: su estado y sus líneas ya no pueden cambiar.',
        successMessage: 'Pedido {{ record.name }} completado.',
      },
      cancel_sales_order: {
        label: 'Cancelar pedido',
        confirmText: '¿Cancelar este pedido? Un pedido cancelado es definitivo: no se puede reabrir y sus líneas ya no pueden cambiar.',
        successMessage: 'Pedido {{ record.name }} cancelado.',
      },
    },
    _validations: {
      shipped_after_order: { message: 'La Fecha de Envío no puede ser anterior a la Fecha del Pedido' },
      sales_order_status_progression: { message: 'Este cambio de estado no está permitido. Un pedido avanza Borrador → Confirmado → Completado; Confirmado puede volver a Borrador, y Borrador o Confirmado pueden pasar a Cancelado. Completado y Cancelado son definitivos.' },
      contract_same_account: { message: 'El contrato debe pertenecer a la Cuenta de este pedido.' },
      contract_same_account_check: { message: 'Este contrato pertenece a otra cuenta. Un pedido solo puede llevar un contrato de su propia Cuenta: elija uno de los contratos de esta cuenta, o deje Contrato vacío.' },
      framework_quota_exceeded: { message: 'Este pedido hace que el contrato marco supere el Valor del Contrato.' },
      framework_quota_exceeded_check: { message: 'Con este pedido, los pedidos del contrato marco suman más que su Valor del Contrato. El pedido se ha guardado; el Cupo Restante del contrato muestra cuánto lo supera.' },
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
      subtotal: { label: 'Subtotal', help: 'La suma de las líneas del pedido. Solo se escribe en un pedido sin líneas. Se bloquea cuando el pedido se confirma, igual que el descuento, el impuesto y el envío.' },
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
