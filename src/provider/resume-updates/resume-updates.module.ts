import { Global, Module } from '@nestjs/common';
import { ResumeUpdatesService } from './resume-updates.service';

@Global()
@Module({
  providers: [ResumeUpdatesService],
  exports: [ResumeUpdatesService],
})
export class ResumeUpdatesModule {}
