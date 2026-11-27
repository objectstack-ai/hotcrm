// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * Español (es-ES) — the Sales hooks' refusal sentences (#2496).
 *
 * Keyed `hooks.<hook>.refusals.<CODE>[.reasons.<REASON>].message`, one entry
 * per sentence the hook's `refusals` catalogue declares; the English sentence
 * is the declared message itself. `test/hook-refusal-catalogue.test.ts` holds
 * every declared sentence to a translation here, with only declared holes.
 */
export const hooks: NonNullable<TranslationData['hooks']> = {
  account_protection: {
    refusals: {
      VALIDATION_FAILED: {
        message: 'El Sitio Web debe empezar por http:// o https://',
        reasons: {
          annual_revenue: {
            message: 'Los Ingresos Anuales deben ser mayores o iguales a 0',
          },
          converted_from_lead: {
            message: 'Convertida desde Prospecto solo la establece Convertir Prospecto, cuando crea la cuenta. Déjelo vacío; la cuenta se envía a aprobación como cuenta nueva.',
          },
        },
      },
      DELETE_RESTRICTED: {
        message: 'No se puede eliminar la cuenta de cliente: 1 oportunidad, abierta o cerrada, todavía la referencia. Elimine primero la oportunidad o marque la cuenta como inactiva para retirarla en su lugar.',
        reasons: {
          opportunities: {
            message: 'No se puede eliminar la cuenta de cliente: {{count}} oportunidades, abiertas o cerradas, todavía la referencian. Elimine primero las oportunidades o marque la cuenta como inactiva para retirarla en su lugar.',
          },
          contract: {
            message: 'No se puede eliminar la cuenta de cliente: 1 contrato activado todavía la referencia. Rescíndalo o reasígnelo primero.',
          },
          contracts: {
            message: 'No se puede eliminar la cuenta de cliente: {{count}} contratos activados todavía la referencian. Rescíndalos o reasígnelos primero.',
          },
        },
      },
    },
  },
  contact_integrity: {
    refusals: {
      DUPLICATE_VALUE: {
        message: 'Ya existe otro contacto con el correo electrónico {{email}}.',
        reasons: {
          named: {
            message: 'Ya existe otro contacto ({{contact}}) con el correo electrónico {{email}}.',
          },
        },
      },
      DELETE_RESTRICTED: {
        message: 'El contacto {{contact}} sigue referenciado por oportunidades abiertas ({{opportunities}}), cotizaciones abiertas ({{quotes}}) y contratos activos ({{contracts}}), por lo que no se puede eliminar, ni tampoco su cuenta, porque eliminar una cuenta elimina sus contactos. Para liberar el contacto, cierre cada oportunidad abierta o asígnele otro contacto principal; asigne otro contacto a cada cotización abierta o recházela; y asigne otro contacto principal a cada contrato: un contrato conserva su contacto principal incluso después de terminar.',
        reasons: {
          opportunities: {
            message: 'El contacto {{contact}} sigue referenciado por oportunidades abiertas ({{opportunities}}), por lo que no se puede eliminar, ni tampoco su cuenta, porque eliminar una cuenta elimina sus contactos. Para liberar el contacto, cierre cada oportunidad abierta o asígnele otro contacto principal.',
          },
          quotes: {
            message: 'El contacto {{contact}} sigue referenciado por cotizaciones abiertas ({{quotes}}), por lo que no se puede eliminar, ni tampoco su cuenta, porque eliminar una cuenta elimina sus contactos. Para liberar el contacto, asigne otro contacto a cada cotización abierta o recházela.',
          },
          contracts: {
            message: 'El contacto {{contact}} sigue referenciado por contratos activos ({{contracts}}), por lo que no se puede eliminar, ni tampoco su cuenta, porque eliminar una cuenta elimina sus contactos. Para liberar el contacto, asigne otro contacto principal a cada contrato: un contrato conserva su contacto principal incluso después de terminar.',
          },
          opportunities_quotes: {
            message: 'El contacto {{contact}} sigue referenciado por oportunidades abiertas ({{opportunities}}) y cotizaciones abiertas ({{quotes}}), por lo que no se puede eliminar, ni tampoco su cuenta, porque eliminar una cuenta elimina sus contactos. Para liberar el contacto, cierre cada oportunidad abierta o asígnele otro contacto principal; y asigne otro contacto a cada cotización abierta o recházela.',
          },
          opportunities_contracts: {
            message: 'El contacto {{contact}} sigue referenciado por oportunidades abiertas ({{opportunities}}) y contratos activos ({{contracts}}), por lo que no se puede eliminar, ni tampoco su cuenta, porque eliminar una cuenta elimina sus contactos. Para liberar el contacto, cierre cada oportunidad abierta o asígnele otro contacto principal; y asigne otro contacto principal a cada contrato: un contrato conserva su contacto principal incluso después de terminar.',
          },
          quotes_contracts: {
            message: 'El contacto {{contact}} sigue referenciado por cotizaciones abiertas ({{quotes}}) y contratos activos ({{contracts}}), por lo que no se puede eliminar, ni tampoco su cuenta, porque eliminar una cuenta elimina sus contactos. Para liberar el contacto, asigne otro contacto a cada cotización abierta o recházela; y asigne otro contacto principal a cada contrato: un contrato conserva su contacto principal incluso después de terminar.',
          },
          all: {
            message: 'El contacto {{contact}} sigue referenciado por oportunidades abiertas ({{opportunities}}), cotizaciones abiertas ({{quotes}}) y contratos activos ({{contracts}}), por lo que no se puede eliminar, ni tampoco su cuenta, porque eliminar una cuenta elimina sus contactos. Para liberar el contacto, cierre cada oportunidad abierta o asígnele otro contacto principal; asigne otro contacto a cada cotización abierta o recházela; y asigne otro contacto principal a cada contrato: un contrato conserva su contacto principal incluso después de terminar.',
          },
        },
      },
    },
  },
  // The contract's form, an order contract's value and Change (#2804).
  contract_form_and_change: {
    refusals: {
      FORBIDDEN: {
        message: 'Un contrato de pedido se redacta desde su pedido con Redactar contrato. Elija Contrato Marco u Otro.',
      },
      RECORD_LOCKED: {
        message: 'El valor de un contrato de pedido es el importe de su pedido: cambie el pedido, y un contrato en borrador lo sigue.',
        reasons: {
          form: { message: 'La forma de un contrato se elige mientras es un borrador, y un contrato de pedido sigue siéndolo.' },
          contract_value: { message: 'El Valor del Contrato de un contrato activado solo cambia con Cambiar, con un motivo y la enmienda firmada.' },
          end_date: { message: 'La Fecha de Fin de un contrato activado solo cambia con Cambiar, con un motivo y la enmienda firmada.' },
          payment_terms: { message: 'Las Condiciones de Pago de un contrato activado solo cambian con Cambiar, con un motivo y la enmienda firmada.' },
        },
      },
      VALIDATION_FAILED: {
        message: 'Un cambio necesita un motivo y la enmienda recién firmada.',
        reasons: {
          not_activated: { message: 'Cambiar se aplica a un contrato activado. Un contrato en borrador se edita directamente.' },
          order_value: { message: 'En un cambio no se escribe el valor de un contrato de pedido: elija Actualizar desde el Pedido para tomar el importe del pedido.' },
        },
      },
    },
  },
  contract_validation: {
    refusals: {
      VALIDATION_FAILED: {
        message: 'La duración del contrato ({{term}} meses) no coincide con el rango de fechas ({{calc}} meses del {{start}} al {{end}}).',
      },
    },
  },
  event_do_not_call_guard: {
    refusals: {
      FORBIDDEN: {
        message: 'Este prospecto está marcado como No Llamar, por lo que no se le puede programar una llamada. Registre la llamada como realizada si ya ocurrió, reserve una reunión en su lugar o quite No Llamar del registro primero.',
        reasons: {
          contact: {
            message: 'Este contacto está marcado como No Llamar, por lo que no se le puede programar una llamada. Registre la llamada como realizada si ya ocurrió, reserve una reunión en su lugar o quite No Llamar del registro primero.',
          },
        },
      },
    },
  },
  task_completion: {
    refusals: {
      VALIDATION_FAILED: {
        message: 'El recordatorio ({{reminder}}) es posterior a la fecha límite ({{due}}); los recordatorios deben dispararse antes del plazo.',
      },
    },
  },
  task_do_not_call_guard: {
    refusals: {
      FORBIDDEN: {
        message: 'Este prospecto está marcado como No Llamar, por lo que no se le puede programar una tarea de Llamada. Registre una llamada completada si ya ocurrió, elija un tipo de actividad que no sea telefónica o quite No Llamar del registro primero.',
        reasons: {
          contact: {
            message: 'Este contacto está marcado como No Llamar, por lo que no se le puede programar una tarea de Llamada. Registre una llamada completada si ya ocurrió, elija un tipo de actividad que no sea telefónica o quite No Llamar del registro primero.',
          },
        },
      },
    },
  },
  opportunity_lifecycle: {
    refusals: {
      RECORD_LOCKED: {
        message: 'El cambio de estado de esta oportunidad requiere aprobación: establezca Estado Solicitado (y el motivo de ganada o perdida) en su lugar. La etapa se aplica cuando se aprueba la solicitud.',
        reasons: {
          qualification_stage: {
            message: 'Esta oportunidad necesita primero la aprobación de calificación: marque Solicitar Aprobación de Calificación. La Etapa podrá cambiar una vez aprobada.',
          },
          qualification_requested_status: {
            message: 'Esta oportunidad necesita primero la aprobación de calificación: marque Solicitar Aprobación de Calificación. El Estado Solicitado podrá cambiar una vez aprobada.',
          },
          qualification_both: {
            message: 'Esta oportunidad necesita primero la aprobación de calificación: marque Solicitar Aprobación de Calificación. La Etapa y el Estado Solicitado podrán cambiar una vez aprobada.',
          },
          large_create: {
            message: 'Una oportunidad de {{amount}} o más necesita la Aprobación de Grandes Oportunidades antes de poder marcarse como Cerrada Ganada. Créela en una etapa abierta para enviarla a aprobación; podrá marcarse como Cerrada Ganada una vez aprobada. Solo un administrador puede crearla ya ganada.',
          },
          large_pending: {
            message: 'Una oportunidad de {{amount}} o más necesita la Aprobación de Grandes Oportunidades antes de poder marcarse como Cerrada Ganada, y su Estado de Aprobación es Pendiente. Podrá marcarse como Cerrada Ganada una vez aprobada la solicitud.',
          },
          large_rejected: {
            message: 'Una oportunidad de {{amount}} o más necesita la Aprobación de Grandes Oportunidades antes de poder marcarse como Cerrada Ganada, y su Estado de Aprobación es Rechazada. Revise la oportunidad y guárdela para enviarla de nuevo a aprobación; podrá marcarse como Cerrada Ganada una vez aprobada.',
          },
          large_unsent: {
            message: 'Una oportunidad de {{amount}} o más necesita la Aprobación de Grandes Oportunidades antes de poder marcarse como Cerrada Ganada, y su Estado de Aprobación es No Requerida. Guarde la oportunidad sin cerrarla para enviarla a aprobación; podrá marcarse como Cerrada Ganada una vez aprobada.',
          },
          closed_won: {
            message: 'La oportunidad {{name}} está cerrada (Cerrada Ganada); solo se pueden editar su Descripción y su Próximo Paso.',
          },
          closed_lost: {
            message: 'La oportunidad {{name}} está cerrada (Cerrada Perdida); solo se pueden editar su Descripción y su Próximo Paso.',
          },
        },
      },
    },
  },
  opportunity_account_capability: {
    refusals: {
      VALIDATION_FAILED: {
        message: 'No se puede abrir una oportunidad para esta cuenta: su Capacidad Comercial es Solo Liquidación, por lo que está disponible para facturación y pagos, pero no se puede registrar negocio nuevo con ella. Elija otra cuenta o haga que reclasifiquen la cuenta como Completa primero.',
      },
    },
  },
  // The closed-won activation task's title (#2522); the private title names no deal.
  opportunity_promote_account: {
    texts: {
      activation_named: { message: 'Activar nuevo cliente de la oportunidad {{ opportunity }}' },
      activation_private: { message: 'Activar nuevo cliente (oportunidad privada)' },
      activation_untitled: { message: 'Activar nuevo cliente' },
    },
  },
  lead_automation: {
    texts: {
      follow_up_named: { message: 'Dar seguimiento al prospecto calificado: {{ lead }}' },
      follow_up_untitled: { message: 'Dar seguimiento al prospecto calificado' },
    },
    refusals: {
      RECORD_LOCKED: {
        message: 'Del prospecto convertido {{lead}} solo se pueden editar la Descripción y las Notas. Haga los cambios en los registros convertidos.',
        reasons: {
          convert_pending: {
            message: 'No se puede convertir el prospecto {{lead}}: su conversión aún espera aprobación. La conversión se habilita cuando un aprobador la autoriza; el campo Aprobación de Conversión del prospecto muestra en qué punto está.',
          },
          convert_rejected: {
            message: 'No se puede convertir el prospecto {{lead}}: su conversión fue rechazada. La conversión se habilita cuando un aprobador la autoriza; el campo Aprobación de Conversión del prospecto muestra en qué punto está.',
          },
        },
      },
    },
  },
  // The order's line lock, header amount lock (#2826) and line fill (REQ-0010, hotcrm#2555).
  sales_order_workflow: {
    refusals: {
      RECORD_LOCKED: {
        message: 'El pedido {{order}} está Confirmado, así que ya no se pueden añadir, cambiar ni quitar sus líneas. Devuélvalo a Borrador para cambiarlas.',
        reasons: {
          completed: {
            message: 'El pedido {{order}} está Completado, así que ya no se pueden añadir, cambiar ni quitar sus líneas.',
          },
          cancelled: {
            message: 'El pedido {{order}} está Cancelado, así que ya no se pueden añadir, cambiar ni quitar sus líneas.',
          },
          amount_confirmed: {
            message: 'El pedido {{order}} está Confirmado, así que su importe ya no se puede cambiar. Devuélvalo antes a Borrador.',
          },
          amount_completed: {
            message: 'El pedido {{order}} está Completado, así que su importe ya no se puede cambiar.',
          },
          amount_cancelled: {
            message: 'El pedido {{order}} está Cancelado, así que su importe ya no se puede cambiar.',
          },
        },
      },
      VALIDATION_FAILED: {
        message: 'El pedido {{order}} tiene líneas, así que su Subtotal es la suma de sus líneas y no se puede escribir. Cambie las líneas en su lugar.',
      },
    },
  },
  sales_order_line_fill: {
    refusals: {
      VALIDATION_FAILED: {
        message: 'Escriba un Precio de Venta para esta línea, o elija un producto para tomar su precio de lista.',
      },
    },
  },
  sales_order_total_rollup: {
    refusals: {
      RECORD_LOCKED: {
        message: 'El pedido {{order}} está Confirmado, así que ya no se pueden añadir, cambiar ni quitar sus líneas. Devuélvalo a Borrador para cambiarlas.',
        reasons: {
          completed: {
            message: 'El pedido {{order}} está Completado, así que ya no se pueden añadir, cambiar ni quitar sus líneas.',
          },
          cancelled: {
            message: 'El pedido {{order}} está Cancelado, así que ya no se pueden añadir, cambiar ni quitar sus líneas.',
          },
        },
      },
    },
  },
};
