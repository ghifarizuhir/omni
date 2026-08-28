import { changesService } from '../../src/services/itsmServices';
import { describe, it, expect } from 'vitest';
describe('changesService.castVote', () => { it('has castVote', () => expect(typeof (changesService as any).castVote).toBe('function')); });
