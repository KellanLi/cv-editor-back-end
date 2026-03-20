import { Request as ExpressRequest } from 'express';
import { JwtPayload } from './auth.types';

export interface Request extends ExpressRequest {
  user: JwtPayload;
}
