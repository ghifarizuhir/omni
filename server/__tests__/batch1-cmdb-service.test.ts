import { cmdbService } from '../../src/services/cmdbService';
import { describe, it, expect } from 'vitest';
describe('cmdbService.create wiring', () => { it('has create', () => expect(typeof cmdbService.create).toBe('function')); });
