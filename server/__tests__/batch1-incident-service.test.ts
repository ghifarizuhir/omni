import { incidentsService } from '../../src/services/incidentsService';
import { describe, it, expect } from 'vitest';
describe('incidentsService.create wiring', () => { it('has create', () => expect(typeof incidentsService.create).toBe('function')); });
