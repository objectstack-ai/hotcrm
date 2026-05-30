import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';
import { createTokenizer } from '@orama/tokenizers/mandarin';

// The source loader carries the i18n config, so `createFromSource` builds a
// per-locale index automatically. English uses Orama's default tokenizer;
// Simplified/Traditional Chinese use the mandarin tokenizer for proper word
// segmentation.
const mandarin = {
  components: { tokenizer: createTokenizer() },
  search: { threshold: 0, tolerance: 0 },
};

export const { GET } = createFromSource(source, {
  localeMap: {
    'zh-Hans': mandarin,
    'zh-Hant': mandarin,
  },
});
