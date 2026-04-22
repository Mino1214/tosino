import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

/**
 * 스코어 크롤러 등 M2M 호출용 가드.
 *
 * 인증 방식:
 *  - 헤더 `x-integration-key: <key>`
 *  - 또는 `Authorization: Integration <key>`
 *  - 서버 env 의 ODDS_API_INTEGRATION_KEYS (콤마 구분) 중 하나와 일치해야 통과.
 *  - env 가 비어있으면 안전하게 기본 거부.
 */
@Injectable()
export class OddsApiIntegrationKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const fromHeader = (req.headers['x-integration-key'] || '') as string;
    const authHeader = (req.headers['authorization'] || '') as string;
    let fromAuth = '';
    if (/^integration\s+/i.test(authHeader)) {
      fromAuth = authHeader.replace(/^integration\s+/i, '').trim();
    }
    const provided = (fromHeader || fromAuth).trim();
    if (!provided) {
      throw new UnauthorizedException('integration key missing');
    }
    const allowed = (process.env.ODDS_API_INTEGRATION_KEYS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (allowed.length === 0) {
      throw new UnauthorizedException('integration key not configured');
    }
    if (!allowed.includes(provided)) {
      throw new UnauthorizedException('integration key invalid');
    }
    return true;
  }
}
