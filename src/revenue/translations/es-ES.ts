// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

// The discount ceiling is interpolated, never retyped: the number lives in
// `_thresholds.ts` alone (#1711).
import { QUOTE_DISCOUNT_CEILING } from '../../sales/objects/_thresholds';

/**
 * Español (es-ES) — the revenue module's own translations: every row whose
 * target this package registers. Why they live here and not in the app
 * package's pack: `./index.ts`.
 */
export const esES: TranslationData = {
  objects: {
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
    crm_price_book: {
      _validations: {
        valid_to_after_valid_from: {
          message: 'Válido hasta debe ser igual o posterior a Válido desde',
        },
      },
      label: 'Lista de Precios',
      pluralLabel: 'Listas de Precios',
      description: 'Una lista de precios de productos con nombre: la lista estándar, un nivel de socio o regional, o una promoción',
      fields: {
        owner_id: { label: 'Propietario de Lista de Precios' },
        name: { label: 'Nombre de la Lista de Precios' },
        description: { label: 'Descripción' },
        is_active: { label: 'Activa' },
        is_standard: { label: 'Estándar' },
        valid_from: { label: 'Válido desde' },
        valid_to: { label: 'Válido hasta' },
      },
      _sections: {
        basic: { label: 'Información de la Lista de Precios' },
        validity: { label: 'Vigencia' },
      },
    },
    crm_price_book_entry: {
      _validations: {
        price_not_negative: {
          message: 'El Precio de Lista no puede ser negativo',
        },
      },
      label: 'Entrada de Lista de Precios',
      pluralLabel: 'Entradas de Lista de Precios',
      description: 'El precio de un producto en una lista de precios',
      fields: {
        entry_number: { label: 'Nº de Entrada' },
        crm_price_book: { label: 'Lista de Precios' },
        crm_product: { label: 'Producto' },
        list_price: { label: 'Precio de Lista' },
        is_active: { label: 'Activa' },
      },
      _sections: {
        basic: { label: 'Información de la Entrada' },
      },
    },
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
          help: 'Obligatorio en cuanto la cotización pasa a Presentada o Aceptada: el contrato generado toma de aquí su Contacto principal.',
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
        payment_terms: { label: 'Términos de Pago' },
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
        product_title: { label: 'Título del producto', help: 'El título del producto, sincronizado con el producto. Da nombre a esta línea.' },
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
    crm_quote_line_item: {
      _validations: {
        discount_within_ceiling: {
          message: 'El descuento de línea no puede superar el 60 %',
        },
        unit_price_positive: {
          message: 'El precio de venta no puede ser negativo',
        },
      },
      label: 'Línea de Cotización',
      pluralLabel: 'Líneas de Cotización',
      description: 'Líneas de precio por producto dentro de una cotización',
      fields: {
        crm_quote: { label: 'Cotización' },
        crm_product: { label: 'Producto' },
        description: { label: 'Descripción' },
        product_title: { label: 'Título del producto', help: 'El título del producto, sincronizado con el producto. Da nombre a esta línea.' },
        quantity: { label: 'Cantidad' },
        list_price: { label: 'Precio de Lista' },
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
  },
  apps: {
    crm_enterprise: {
      navigation: {
        nav_quote: { label: 'Cotizaciones' },
        nav_product: { label: 'Productos' },
        nav_price_book: { label: 'Listas de Precios' },
      },
    },
  },
  datasets: {
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
  },
  flows: {
    quote_generation: {
      label: 'Generar cotización desde la oportunidad',
      refusals: { refuse_held: { message: 'Primero va la aprobación de calificación: marque Solicitar Aprobación de Calificación. No se creó nada.' } },
      screens: {
        screen_1: {
          title: 'Detalles de la Cotización',
          fields: {
            quoteName: { label: 'Nombre de Cotización' },
            expirationDays: { label: 'Válida por (días)' },
            discount: { label: `Descuento % (≤ ${QUOTE_DISCOUNT_CEILING})`, placeholder: `0-${QUOTE_DISCOUNT_CEILING}` },
          },
        },
      },
    },
  },
};
