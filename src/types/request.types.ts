import { Request as ExpressRequest } from 'express';
import { IJwtPayload } from './auth.types';

export interface Request extends ExpressRequest {
  jwtPayload: IJwtPayload;
}
