import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { UsersModule } from '../users/users.module';
import { AgentInquiriesModule } from '../agent-inquiries/agent-inquiries.module';

@Module({
  imports: [UsersModule, AgentInquiriesModule],
  controllers: [AgentController],
  providers: [AgentService],
})
export class AgentModule {}
