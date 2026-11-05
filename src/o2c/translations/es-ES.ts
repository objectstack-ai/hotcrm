// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * Español (es-ES) — the Order to Cash module's own translations: every row whose
 * target this package registers. Why they live here and not in the app
 * package's pack: `./index.ts`.
 */
export const esES: TranslationData = {
  objects: {
    crm_billing_milestone: {
      label: 'Hito de facturación',
      pluralLabel: 'Hitos de facturación',
      description: 'Un paso del plan de cobro de un contrato: qué se debe, cuándo, y cuánto está facturado y cobrado',
      fields: {
        name: {
          label: 'Hito',
          help: 'El paso tal como lo nombra el contrato: «Anticipo 30 %», «Puesta en marcha», «Año 2».',
        },
        crm_contract: {
          label: 'Contrato',
        },
        crm_account: {
          label: 'Cuenta',
        },
        planned_amount: {
          label: 'Importe previsto',
        },
        planned_date: {
          label: 'Fecha prevista',
        },
        accepted_date: {
          label: 'Fecha de aceptación',
          help: 'Para un paso que se cobra a la aceptación: el día en que el cliente lo dio por aceptado.',
        },
        invoiced_amount: {
          label: 'Facturado',
        },
        received_amount: {
          label: 'Cobrado',
        },
        open_amount: {
          label: 'Pendiente',
        },
        description: {
          label: 'Notas',
        },
      },
      _views: {
        all_billing_milestones: {
          label: 'Todos los hitos de facturación',
        },
        planned_this_month: {
          label: 'Previsto este mes',
        },
      },
      _sections: {
        basic: {
          label: 'Hito',
        },
        plan: {
          label: 'Plan',
        },
        figures: {
          label: 'Cobro',
        },
      },
    },
    crm_invoice: {
      label: 'Factura',
      pluralLabel: 'Facturas',
      description: 'Una factura que finanzas emitió contra un contrato, y cuánto de ella está pagado',
      fields: {
        invoice_number: {
          label: 'Número de factura',
          help: 'El número de la factura, tal como la emitió finanzas.',
        },
        crm_contract: {
          label: 'Contrato',
        },
        crm_billing_milestone: {
          label: 'Hito de facturación',
        },
        crm_account: {
          label: 'Cuenta',
        },
        issue_date: {
          label: 'Fecha de emisión',
        },
        due_date: {
          label: 'Fecha de vencimiento',
          help: 'Si se deja vacía, es la fecha de emisión más las condiciones de pago del contrato.',
        },
        status: {
          label: 'Estado',
          options: {
            issued: 'Emitida',
            cancelled: 'Anulada',
          },
        },
        amount: {
          label: 'Importe',
          help: 'Tal como se emitió, impuestos incluidos.',
        },
        paid_amount: {
          label: 'Pagado',
        },
        open_amount: {
          label: 'Pendiente',
        },
        invoice_file: {
          label: 'Archivo de factura',
        },
        source: {
          label: 'Origen',
          help: 'La importación cubre una hoja de cálculo, la exportación de un programa contable y un ERP que escribe con la misma clave.',
          options: {
            manual: 'Entrada manual',
            import: 'Importación',
          },
        },
        erp_ref: {
          label: 'Referencia ERP',
          help: 'La clave de la factura en el sistema de finanzas. Importar una fila con la misma referencia actualiza esta factura.',
        },
        synced_at: {
          label: 'Sincronizado el',
        },
      },
      _views: {
        all_invoices: {
          label: 'Todas las facturas',
        },
        overdue_invoices: {
          label: 'Facturas vencidas',
        },
      },
      _sections: {
        basic: {
          label: 'Factura',
        },
        amounts: {
          label: 'Importes',
        },
        source: {
          label: 'Origen',
        },
      },
    },
    crm_payment: {
      label: 'Cobro',
      pluralLabel: 'Cobros',
      description: 'Dinero recibido contra un contrato, una factura o un hito',
      fields: {
        payment_number: {
          label: 'Número de cobro',
        },
        crm_contract: {
          label: 'Contrato',
        },
        crm_invoice: {
          label: 'Factura',
        },
        crm_billing_milestone: {
          label: 'Hito de facturación',
        },
        crm_account: {
          label: 'Cuenta',
        },
        payment_date: {
          label: 'Fecha de cobro',
        },
        amount: {
          label: 'Importe',
        },
        method: {
          label: 'Método',
          options: {
            bank_transfer: 'Transferencia bancaria',
            bill: 'Efecto',
            other: 'Otro',
          },
        },
        bill_maturity_date: {
          label: 'Vencimiento del efecto',
          help: 'Cuándo el efecto se convierte en efectivo. Obligatorio para un efecto.',
        },
        source: {
          label: 'Origen',
          options: {
            manual: 'Entrada manual',
            import: 'Importación',
          },
        },
        erp_ref: {
          label: 'Referencia ERP',
          help: 'La clave del cobro en el sistema de finanzas. Importar una fila con la misma referencia actualiza este cobro.',
        },
        synced_at: {
          label: 'Sincronizado el',
        },
      },
      _views: {
        all_payments: {
          label: 'Todos los cobros',
        },
      },
      _sections: {
        basic: {
          label: 'Cobro',
        },
        bill: {
          label: 'Efecto',
        },
        source: {
          label: 'Origen',
        },
      },
    },
  },
  apps: {
    crm_enterprise: {
      navigation: {
        nav_billing_milestones: {
          label: 'Hitos de facturación',
        },
        nav_invoices: {
          label: 'Facturas',
        },
        nav_payments: {
          label: 'Cobros',
        },
        nav_help_o2c: {
          label: 'Manual Del pedido al cobro',
        },
      },
    },
  },
  books: {
    crm_o2c_manual: {
      label: 'Manual de HotCRM Del pedido al cobro',
      description: 'El plan de cobro, las facturas y los cobros: qué cuenta cada cifra y quién la escribe.',
      groups: {
        o2c: {
          label: 'Del pedido al cobro',
        },
      },
    },
  },
};
