/**
 * Interface Builder — Studio Configuration
 *
 * Configures the Studio Interface Builder experience including
 * blank page support, canvas settings, and the element palette.
 */
import { InterfaceBuilderConfigSchema, PageBuilderConfigSchema, CanvasSnapSettingsSchema, ElementPaletteItemSchema } from '@objectstack/spec/studio';

/* ── Interface Builder Config ─────────────────────────── */

export const InterfaceBuilder = {
  enabled: true,
  allowBlankPages: true
};

InterfaceBuilderConfigSchema.parse(InterfaceBuilder);

/* ── Page Builder Config ──────────────────────────────── */

export const PageBuilder = {
  enabled: true
};

PageBuilderConfigSchema.parse(PageBuilder);

/* ── Canvas Snap Settings ─────────────────────────────── */

export const CanvasSnap = {
  enabled: true,
  gridSize: 8
};

CanvasSnapSettingsSchema.parse(CanvasSnap);

/* ── Element Palette ──────────────────────────────────── */

const paletteItems = [
  {
    type: 'button',
    label: 'Button',
    icon: 'cursor-click',
    category: 'interactive'
  },
  {
    type: 'filter',
    label: 'Filter',
    icon: 'funnel',
    category: 'interactive'
  },
  {
    type: 'form',
    label: 'Form',
    icon: 'document-text',
    category: 'interactive'
  },
  {
    type: 'image',
    label: 'Image',
    icon: 'photo',
    category: 'content'
  },
  {
    type: 'number',
    label: 'Number',
    icon: 'hashtag',
    category: 'data'
  },
  {
    type: 'text',
    label: 'Text',
    icon: 'document',
    category: 'data'
  },
  {
    type: 'record_picker',
    label: 'Record Picker',
    icon: 'magnifying-glass',
    category: 'interactive'
  }
];

paletteItems.forEach(item => ElementPaletteItemSchema.parse(item));

export const ElementPalette = paletteItems;

export default {
  InterfaceBuilder,
  PageBuilder,
  CanvasSnap,
  ElementPalette
};
