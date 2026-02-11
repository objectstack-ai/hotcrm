import type { HookContext } from '@objectstack/spec/data';
import { vi } from 'vitest';
import {
  NoteValidationTrigger,
  NoteEditTrackingTrigger
} from '../../../src/hooks/note.hook';

const mockQlFind = vi.fn();
const mockQlDocGet = vi.fn();
const mockQlDocCreate = vi.fn();
const mockQlDocUpdate = vi.fn();

const createMockContext = (
  event: string,
  doc: any,
  previous?: any,
  result?: any
): HookContext => {
  const baseContext: any = {
    event,
    ql: {
      find: mockQlFind,
      doc: {
        get: mockQlDocGet,
        create: mockQlDocCreate,
        update: mockQlDocUpdate
      }
    },
    session: { userId: 'user_123', tenantId: 'tenant_123' }
  };

  if (event.startsWith('before')) {
    baseContext.input = { doc };
    baseContext.previous = previous;
  } else {
    baseContext.result = result || doc;
    baseContext.previous = previous;
    baseContext.input = { doc };
  }
  return baseContext;
};

describe('Note Hook - NoteValidationTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw error when both title and body are empty', async () => {
    const doc = { title: '', body: '' };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(NoteValidationTrigger.handler(ctx)).rejects.toThrow('Note must have at least a title or body');
  });

  it('should calculate word_count from body', async () => {
    const doc = { title: 'Meeting Notes', body: 'This is a sample note with seven words' };
    const ctx = createMockContext('beforeInsert', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await NoteValidationTrigger.handler(ctx);

    expect(doc.word_count).toBe(8);
    consoleSpy.mockRestore();
  });

  it('should generate searchable_text from title and body', async () => {
    const doc = { title: 'Meeting Notes', body: 'Important discussion' };
    const ctx = createMockContext('beforeUpdate', doc, {});
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await NoteValidationTrigger.handler(ctx);

    expect(doc.searchable_text).toBe('meeting notes important discussion');
    consoleSpy.mockRestore();
  });

  it('should set word_count to 0 when body is empty but title exists', async () => {
    const doc = { title: 'Quick Note', body: '' };
    const ctx = createMockContext('beforeInsert', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await NoteValidationTrigger.handler(ctx);

    expect(doc.word_count).toBe(0);
    consoleSpy.mockRestore();
  });
});

describe('Note Hook - NoteEditTrackingTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set last_edited_date and last_edited_by_id on update', async () => {
    const doc = { title: 'Edited Note', body: 'Updated content' };
    const ctx = createMockContext('beforeUpdate', doc, {});
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await NoteEditTrackingTrigger.handler(ctx);

    expect(doc.last_edited_date).toBeDefined();
    expect(doc.last_edited_by_id).toBe('user_123');
    consoleSpy.mockRestore();
  });
});
