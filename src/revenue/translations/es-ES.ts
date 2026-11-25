// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';
import { CONTRACT_DRAFT_NODE_IDS } from '../../sales/flows/_contract-draft';

// The discount ceiling is interpolated, never retyped: the number lives in
// `_thresholds.ts` alone (#1711).
import { QUOTE_DISCOUNT_CEILING } from '../../sales/objects/_thresholds';

/**
 * Español (es-ES) — the revenue module's own translations: every row whose
 * target this package registers. Why they live here and not in the app
 * package's pack: `./index.ts`.
 */
export const esES: TranslationData = {
  hooks: {
    quote_total_rollup: {
      refusals: {
        RECORD_LOCKED: {
          message: 'La cotización {{quote}} está Aceptada, por lo que ya no se pueden añadir, cambiar ni eliminar sus líneas.',
          reasons: {
            rejected: {
              message: 'La cotización {{quote}} está Rechazada, por lo que ya no se pueden añadir, cambiar ni eliminar sus líneas. Vuelva a ponerla en Borrador para cambiarlas.',
            },
            expired: {
              message: 'La cotización {{quote}} está Expirada, por lo que ya no se pueden añadir, cambiar ni eliminar sus líneas.',
            },
          },
        },
      },
    },
    quote_workflow: {
      refusals: {
        RECORD_LOCKED: {
          message: 'La cotización {{quote}} no se puede aceptar mientras una aprobación retiene su oportunidad: aceptarla cerraría esa oportunidad como ganada. Acéptela cuando se conceda la aprobación.',
          reasons: {
            held_unsent: {
              message: 'La cotización {{quote}} no se puede aceptar mientras una aprobación retiene su oportunidad: aceptarla cerraría esa oportunidad como ganada. Guarde la oportunidad para enviarla a aprobación y acepte la cotización una vez aprobada.',
            },
            line_accepted: {
              message: 'La cotización {{quote}} está Aceptada, por lo que ya no se pueden añadir, cambiar ni eliminar sus líneas.',
            },
            line_rejected: {
              message: 'La cotización {{quote}} está Rechazada, por lo que ya no se pueden añadir, cambiar ni eliminar sus líneas. Vuelva a ponerla en Borrador para cambiarlas.',
            },
            line_expired: {
              message: 'La cotización {{quote}} está Expirada, por lo que ya no se pueden añadir, cambiar ni eliminar sus líneas.',
            },
            frozen_accepted: {
              message: 'La cotización {{quote}} está Aceptada; solo se pueden editar sus Notas Internas.',
            },
            frozen_rejected: {
              message: 'La cotización {{quote}} está Rechazada; vuelva a ponerla en Borrador para cambiarla. Hasta entonces solo se pueden editar sus Notas Internas.',
            },
            frozen_expired: {
              message: 'La cotización {{quote}} está Expirada; solo se pueden editar sus Notas Internas.',
            },
          },
        },
        VALIDATION_FAILED: {
          message: 'La cotización {{quote}} no se puede crear como Aceptada. Una cotización empieza como Borrador, En Revisión o Presentada, y desde ahí se acepta, se rechaza o expira.',
          reasons: {
            created_rejected: {
              message: 'La cotización {{quote}} no se puede crear como Rechazada. Una cotización empieza como Borrador, En Revisión o Presentada, y desde ahí se acepta, se rechaza o expira.',
            },
            created_expired: {
              message: 'La cotización {{quote}} no se puede crear como Expirada. Una cotización empieza como Borrador, En Revisión o Presentada, y desde ahí se acepta, se rechaza o expira.',
            },
          },
        },
      },
    },
    quote_price_book: {
      refusals: {
        VALIDATION_FAILED: {
          message: 'La lista de precios {{book}} no está activa, y una cotización solo toma precios de una lista activa. Elija otra lista de precios para la cotización {{quote}}.',
          reasons: {
            line: {
              message: 'La cotización {{quote}} ya tiene 1 línea con precio de su lista de precios, por lo que su lista de precios no puede cambiar. Elimine primero las líneas y luego elija la lista de precios y vuelva a añadirlas.',
            },
            line_from: {
              message: 'La cotización {{quote}} ya tiene 1 línea con precio de {{from}}, por lo que su lista de precios no puede cambiar. Elimine primero las líneas y luego elija la lista de precios y vuelva a añadirlas.',
            },
            lines: {
              message: 'La cotización {{quote}} ya tiene {{count}} líneas con precio de su lista de precios, por lo que su lista de precios no puede cambiar. Elimine primero las líneas y luego elija la lista de precios y vuelva a añadirlas.',
            },
            lines_from: {
              message: 'La cotización {{quote}} ya tiene {{count}} líneas con precio de {{from}}, por lo que su lista de precios no puede cambiar. Elimine primero las líneas y luego elija la lista de precios y vuelva a añadirlas.',
            },
          },
        },
      },
    },
    price_book_standard: {
      refusals: {
        RECORD_LOCKED: {
          message: 'No se puede eliminar {{book}}: es la lista de precios estándar. Para dejar de cotizar con ella, desactive Activa.',
          reasons: {
            standard_off: {
              message: '{{book}} es la lista de precios estándar, y siempre hay una: Estándar no se puede desactivar. Edite sus precios en su lugar.',
            },
          },
        },
        DELETE_RESTRICTED: {
          message: 'No se puede eliminar {{book}}: 1 cotización toma precios de ella. Para dejar de cotizar con ella, desactive Activa.',
          reasons: {
            quotes: {
              message: 'No se puede eliminar {{book}}: {{count}} cotizaciones toman precios de ella. Para dejar de cotizar con ella, desactive Activa.',
            },
          },
        },
        DUPLICATE_VALUE: {
          message: '{{book}} ya es la lista de precios estándar, y solo hay una. Guarde esta lista sin Estándar.',
        },
      },
    },
    price_book_entry_unique: {
      refusals: {
        DUPLICATE_VALUE: {
          message: '{{book}} ya tiene un precio para {{product}}. Una lista de precios tiene una entrada por producto: edite esa entrada.',
        },
      },
    },
    product_catalog: {
      refusals: {
        VALIDATION_FAILED: {
          message: 'El Precio de Lista ({{list_price}}) debe ser mayor o igual que el Costo ({{cost}}).',
        },
        DELETE_RESTRICTED: {
          message: 'No se puede eliminar el producto: está en líneas de oportunidad ({{opportunity_lines}}). Para retirarlo, desactive Activo.',
          reasons: {
            quote: {
              message: 'No se puede eliminar el producto: está en líneas de cotización ({{quote_lines}}). Para retirarlo, desactive Activo.',
            },
            both: {
              message: 'No se puede eliminar el producto: está en líneas de oportunidad ({{opportunity_lines}}) y líneas de cotización ({{quote_lines}}). Para retirarlo, desactive Activo.',
            },
          },
        },
      },
    },
    opportunity_line_item_freeze: {
      refusals: {
        RECORD_LOCKED: {
          message: 'La oportunidad {{name}} está bloqueada mientras hay una aprobación en curso, por lo que no se pueden añadir, cambiar ni eliminar sus líneas hasta que termine.',
          reasons: {
            closed_won: {
              message: 'La oportunidad {{name}} está cerrada (Cerrada Ganada), por lo que ya no se pueden añadir, cambiar ni eliminar sus líneas.',
            },
            closed_lost: {
              message: 'La oportunidad {{name}} está cerrada (Cerrada Perdida), por lo que ya no se pueden añadir, cambiar ni eliminar sus líneas.',
            },
          },
        },
      },
    },
    quote_line_item_price_fill: {
      refusals: {
        VALIDATION_FAILED: {
          message: 'La lista de precios {{book}} no tiene un precio activo para {{product}}. Añada el producto a {{book}} o elija otra lista de precios en la cotización.',
        },
      },
    },
    opportunity_line_item_price_fill: {
      refusals: {
        VALIDATION_FAILED: {
          message: 'La lista de precios {{book}} no tiene un precio activo para {{product}}. Añada el producto a {{book}} o elija otra lista de precios en la cotización.',
        },
      },
    },
  },
  objects: {
    // The order's Source Quote, added by this package through
    // `objectExtensions` (hotcrm#2558).
    crm_sales_order: {
      fields: {
        crm_quote: { label: 'Cotización de origen' },
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
      _views: {
        all_price_books: { label: 'Todas las Listas de Precios' },
      },
      _actions: {
        add_price_book_products: { label: 'Añadir Productos' },
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
          message: 'Este cambio de estado se sale del recorrido habitual de la cotización: Borrador → En Revisión → Presentada → Aceptada. En Revisión también puede volver a Borrador o pasar a Rechazada, una Presentada puede pasar a Rechazada y una Rechazada vuelve a Borrador. Borrador, En Revisión o Presentada pueden pasar a Expirada. Aceptada y Expirada son definitivos.',
        },
      },
      label: 'Cotización',
      pluralLabel: 'Cotizaciones',
      description: 'Cotizaciones de precios para clientes',
      fields: {
        quote_number: { label: 'Número de Cotización' },
        name: { label: 'Nombre de Cotización' },
        crm_account: { label: 'Cuenta' },
        crm_contact: {
          label: 'Contacto',
          help: 'Obligatorio en cuanto la cotización pasa a Presentada o Aceptada: el pedido toma de aquí su contacto, y el contrato redactado desde el pedido, su Contacto principal.',
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
        // The countersigned copy (#2317).
        signed_copy: {
          label: 'Copia firmada',
          help: 'La cotización tal como la firmó el cliente. Obligatoria para aceptar la cotización.',
        },
        quote_date: { label: 'Fecha de Cotización' },
        expiration_date: { label: 'Fecha de Expiración' },
        crm_price_book: { label: 'Lista de Precios', help: 'Las líneas de esta cotización toman su Precio de Lista de esta lista de precios. Si se deja vacía en una cotización nueva, es la lista de precios estándar.' },
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
        line_items: { label: 'Líneas de Cotización' },
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
      _actions: {
        submit_quote_for_review: { label: 'Enviar a Revisión', successMessage: 'Cotización {{ record.name }} enviada a revisión.' },
        mark_quote_presented: { label: 'Marcar como Presentada', successMessage: 'Cotización {{ record.name }} marcada como presentada.' },
        accept_quote: {
          label: 'Aceptar',
          confirmText:
            '¿Aceptar esta cotización? Queda congelada, su oportunidad se cierra como ganada y se crea un pedido; si la venta necesita un contrato, redáctelo desde el pedido. Si un administrador activó la redacción automática de contratos, también se redacta un contrato.',
          successMessage: 'Cotización {{ record.name }} aceptada. Se ha creado su pedido: lo encontrará en Pedidos de esta cotización.',
        },
        reject_quote: { label: 'Rechazar', successMessage: 'Cotización {{ record.name }} rechazada. Revísela para hacer una nueva oferta.' },
        revise_quote: { label: 'Revisar', successMessage: 'La cotización {{ record.name }} vuelve a Borrador.' },
        // Print Quote (#2312).
        print_quote: { label: 'Imprimir Cotización', successMessage: 'PDF de la cotización adjuntado a la cotización.' },
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
        list_price: { label: 'Precio de Lista', help: 'El precio de este producto en la lista de precios de la cotización.' },
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
        nav_product_catalog_dashboard: { label: 'Catálogo de Productos' },
        nav_help_revenue: { label: 'Manual de Ingresos' },
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
          description: 'La categoría del producto: software, hardware, servicio, suscripción o soporte.',
        },
      },
      measures: {
        list_price_sum: {
          label: 'Precio de lista total',
          description: 'La suma del Precio de Lista de los productos en vista, una cifra de catálogo; no son ventas y no entra ningún descuento ni cantidad.',
        },
        product_count: {
          label: 'Productos',
          description: 'Cuántos productos hay en el catálogo, activos e inactivos; no cuenta unidades vendidas.',
        },
      },
    },
  },
  flows: {
    // An accepted quote's two automations (hotcrm#2558). The drafted
    // contract's provenance sentence is TEXT in the organization's language
    // (#2535), one per variant of the draft, at
    // `flows.quote_accepted_contract_draft.records.<node>.fields.description`.
    quote_accepted_contract_draft: {
      label: 'La cotización aceptada redacta un contrato',
      records: Object.fromEntries(CONTRACT_DRAFT_NODE_IDS.map((node) => [node, {
        fields: { description: 'Redactado automáticamente a partir de la cotización aceptada {{ quote }}' },
      }])),
    },
    quote_accepted_order: {
      label: 'La cotización aceptada crea un pedido',
    },
    price_book_add_products: {
      label: 'Añadir Productos a la Lista de Precios',
      successMessage: 'Productos añadidos a la lista de precios.',
      refusals: {
        refuse_no_book: { message: 'Esta lista de precios ya no existe, o no puede abrirla. No se añadió ningún producto.' },
        end_refused: { message: 'No se pudieron añadir {{refusedCount}} productos a la lista de precios: {{addedCount}} añadidos, {{alreadyCount}} ya tenían precio, {{refusedCount}} rechazados. Solo el propietario de una lista de precios, o un administrador, puede añadir sus precios; el registro de ejecución del flujo indica el motivo de cada producto.' },
      },
      screens: {
        screen_1: {
          title: 'Poner Precio a los Productos',
          description: 'Cada producto activo que {{ bookRecord.name }} aún no tiene recibe una entrada a este porcentaje de su Precio de Lista. Los productos que ya tienen precio lo conservan.',
          fields: {
            percentOfList: { label: 'Precio como % del Precio de Lista', placeholder: '1-1000' },
          },
        },
        result: {
          title: 'Productos Añadidos',
          description: '{{addedCount}} productos añadidos a {{ bookRecord.name }}, {{alreadyCount}} ya tenían precio.',
          fields: {
            bookLink: { label: 'Lista de Precios' },
          },
        },
      },
    },
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
        result: {
          title: 'Cotización creada',
          description: 'La cotización «{{ quoteName }}» se creó como borrador. Ábrala para revisar el precio y continuar.',
          fields: {
            quoteLink: { label: 'Cotización' },
          },
        },
        result_partial: {
          title: 'Cotización creada, faltan líneas',
          description: `La cotización «{{ quoteName }}» se creó como borrador, pero {{ skippedCount }} de las líneas de producto de la oportunidad no se pudieron copiar en ella ({{ copiedCount }} copiadas). Una línea se rechaza cuando la lista de precios de la cotización no tiene un precio activo para su producto, o cuando su descuento supera el ${QUOTE_DISCOUNT_CEILING} %; el registro de ejecución del flujo indica el motivo. Abra la cotización y añada allí esas líneas.`,
          fields: {
            quoteLink: { label: 'Cotización' },
          },
        },
      },
    },
  },
  books: {
    crm_revenue_manual: {
      label: 'Manual de Ingresos de HotCRM',
      description: 'Cotizaciones, productos y listas de precios, y el traspaso a facturación de una oportunidad ganada.',
      groups: {
        revenue: { label: 'Ingresos' },
      },
    },
  },
  // The quote's two record pages (#2312): its working page and its print page.
  dashboards: {
    product_catalog_dashboard: {
      label: 'Catálogo de Productos',
      description: 'Precios de lista del catálogo por categoría de producto',
      widgets: {
        top_products: { title: 'Precio de lista por categoría', description: 'Suma de los precios de lista del catálogo por categoría de producto, no ventas' },
      },
    },
  },
  pages: {
    quote_detail_page: {
      label: 'Detalle de Cotización',
      description: 'La página de registro de la cotización: el diseño generado, sin reemplazar ninguna ranura.',
    },
    quote_print_page: {
      label: 'Documento de Cotización',
      description: 'La cotización como documento imprimible: encabezado, cliente, líneas, precios y términos.',
      components: {
        quote_print_lines: { title: 'Líneas de Cotización' },
      },
    },
  },
};
