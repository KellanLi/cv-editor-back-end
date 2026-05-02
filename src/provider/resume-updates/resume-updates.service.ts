import { Injectable } from '@nestjs/common';
import type { Response } from 'express';
import { EventEmitter } from 'node:events';

type ResumeUpdateTrigger =
  | 'resume.update-title'
  | 'resume.update-profile'
  | 'resume.update-list-cover'
  | 'section.create'
  | 'section.delete'
  | 'section.update'
  | 'section.reorder'
  | 'section.update-content';

export interface ResumeUpdateEventPayload {
  resumeId: number;
  trigger: ResumeUpdateTrigger;
  sectionId?: number;
}

@Injectable()
export class ResumeUpdatesService {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(0);
  }

  private key(userId: number, resumeId: number): string {
    return `${userId}:${resumeId}`;
  }

  private writeSse(res: Response, event: string, data: unknown) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  async streamResumeUpdates(params: {
    userId: number;
    resumeId: number;
    res: Response;
  }): Promise<void> {
    const { userId, resumeId, res } = params;
    const channel = this.key(userId, resumeId);

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const onResumeUpdated = (payload: ResumeUpdateEventPayload) => {
      this.writeSse(res, 'resume.updated', {
        phase: 'resume.updated',
        resumeId: payload.resumeId,
        payload: {
          trigger: payload.trigger,
          sectionId: payload.sectionId ?? null,
          updatedAt: new Date().toISOString(),
        },
      });
    };

    this.emitter.on(channel, onResumeUpdated);
    this.writeSse(res, 'meta', {
      phase: 'meta',
      resumeId,
      payload: { subscribed: true },
    });

    const heartbeat = setInterval(() => {
      res.write(': ping\n\n');
    }, 15000);

    await new Promise<void>((resolve) => {
      res.on('close', () => {
        clearInterval(heartbeat);
        this.emitter.off(channel, onResumeUpdated);
        resolve();
      });
    });
  }

  publishToResume(
    userId: number,
    payload: ResumeUpdateEventPayload,
  ): void {
    this.emitter.emit(this.key(userId, payload.resumeId), payload);
  }
}
