// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { cel } from '@objectstack/spec';
import type { TranslationBundle } from '@objectstack/spec/system';

/**
 * A notify node's `templateData` entry that names a select field's value by
 * its OPTION LABEL, in the language of the template that renders it (#2391).
 *
 * ## Why the flow computes it
 *
 * A notice that passes `stage: currentOpp.stage` hands the template the stored
 * value, and every pack printed it: "has sat in needs_analysis", 「已在
 * “needs_analysis”阶段停留」. Measured on 18.3.0, none of the platform's own
 * routes gives a label in the RECIPIENT's language here:
 *
 * - the mail renderer has no label formatter: `{{stage | label}}` is refused
 *   (`known-formatter`), and the refusal itself says to "format the value in
 *   the caller that supplies the data and pass the finished text";
 * - CEL `label()` takes `record.FIELD` only, and the flow engine passes no
 *   option labels, so `label(record.stage)` refuses with "this evaluation
 *   context carries no option labels" and `label(currentOpp.stage)` is refused
 *   at parse;
 * - a `label(record.stage)` formula field resolves, but in the READER's
 *   locale, and a schedule run reads as the system: the zh-CN notice read
 *   「已在“Needs Analysis”阶段停留」.
 *
 * `templateData` is evaluated ONCE per run, before the recipients fan out and
 * each is handed the template of their own locale. So the entry carries the
 * label in every language the package's translations ship, keyed by locale
 * (`en`, `zh_CN`, `es_ES`, `ja_JP`: a template hole path takes no hyphen), and
 * each locale's template names its own key — `{{stage_label.zh_CN}}`.
 *
 * ## Where the labels come from
 *
 * The package's own translation bundle, read when the flow is built — the
 * text the console shows for that option, with no second copy typed here. A
 * locale that ships no options for the field throws at build time, so a
 * missing label is a red `pnpm validate`, never a blank in a mail. A stored
 * value outside the authored options (one added later in Studio) is named as
 * stored, which is what the platform's own `label()` does with it.
 */
export const optionLabelsByLocale = (
  bundle: TranslationBundle,
  object: string,
  field: string,
  value: string,
): ReturnType<typeof cel> => {
  const entries = Object.entries(bundle).map(([locale, data]) => {
    const options = data.objects?.[object]?.fields?.[field]?.options;
    if (!options || Object.keys(options).length === 0) {
      throw new Error(`optionLabelsByLocale: the ${locale} translations carry no options for ${object}.${field}`);
    }
    const labels = `{${Object.entries(options).map(([v, l]) => `${JSON.stringify(v)}: ${JSON.stringify(l)}`).join(', ')}}`;
    return `${JSON.stringify(locale.replace(/-/g, '_'))}: (${value} in ${labels} ? ${labels}[${value}] : ${value})`;
  });
  // The envelope is written out: the `cel` tag quotes an interpolated string
  // as a CEL string literal, and this source is an expression.
  return { dialect: 'cel', source: `{${entries.join(', ')}}` };
};
