import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  bootstrapHostCandidates,
  resolvePlatformFromRequestHost,
} from './platform-resolve.util';

@Injectable()
export class PublicPlatformResolveService {
  constructor(private prisma: PrismaService) {}

  /**
   * ?port= 미리보기(솔루션 전용 포트) 또는 일반 host 기준 플랫폼
   */
  async resolveForQuery(
    host: string | undefined,
    portStr: string | undefined,
    previewSecret: string | undefined,
  ) {
    const port = portStr?.trim() ? Number(portStr) : NaN;
    if (!Number.isNaN(port) && port > 0) {
      const secret = process.env.PREVIEW_BOOTSTRAP_SECRET;
      if (secret && previewSecret !== secret) {
        throw new ForbiddenException('미리보기 비밀값이 올바르지 않습니다');
      }
      const p = await this.prisma.platform.findFirst({
        where: { previewPort: port },
      });
      if (!p) {
        throw new NotFoundException(
          `미리보기 포트 ${port}에 연결된 플랫폼이 없습니다`,
        );
      }
      return p;
    }
    const p = await resolvePlatformFromRequestHost(this.prisma, host);
    if (!p) {
      const tried = bootstrapHostCandidates(host).join(', ');
      throw new NotFoundException(
        `Bootstrap 404: DB에 이 Host용 플랫폼 도메인이 없습니다 (시도: ${tried}). ` +
          `총관 콘솔에서 플랫폼 도메인을 추가하거나, 저장소 루트에서 ` +
          `SEED_PLATFORM_HOSTS=i-on.bet,www.i-on.bet,user.i-on.bet,mod.i-on.bet,agent.i-on.bet pnpm db:seed`,
      );
    }
    return p;
  }
}
