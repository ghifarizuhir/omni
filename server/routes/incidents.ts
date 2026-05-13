import { Router } from 'express';
import { incidentsRepo } from '../repositories/incidents';
import { asyncHandler, qBool, qString, required } from '../util';

export const incidentsRouter = Router();

incidentsRouter.get('/incidents', asyncHandler(async (req, res) => {
  const list = await incidentsRepo.list(req.tenantId, {
    active: qBool(req.query.active),
    major: qBool(req.query.major),
    ciId: qString(req.query.ciId),
    problemPublicId: qString(req.query.problemPublicId),
  });
  res.json(list);
}));

incidentsRouter.get('/incidents/:publicId', asyncHandler(async (req, res) => {
  res.json(required(await incidentsRepo.get(req.tenantId, req.params.publicId), 'Incident'));
}));

incidentsRouter.get('/incidents/:incidentId/comments', asyncHandler(async (req, res) => {
  res.json(await incidentsRepo.comments(req.tenantId, req.params.incidentId));
}));

incidentsRouter.get('/incidents/:incidentId/timeline', asyncHandler(async (req, res) => {
  res.json(await incidentsRepo.timeline(req.tenantId, req.params.incidentId));
}));
