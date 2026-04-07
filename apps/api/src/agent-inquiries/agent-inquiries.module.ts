import { Module } from '@nestjs/common';
import { AgentInquiriesService } from './agent-inquiries.service';
import { PlatformAgentInquiriesController } from './platform-agent-inquiries.controller';

@Module({
  controllers: [PlatformAgentInquiriesController],
  providers: [AgentInquiriesService],
  exports: [AgentInquiriesService],
})
export class AgentInquiriesModule {}
