import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtPayload } from '../../auth/auth.service';

/**
 * Ensures route :platformId matches JWT platform (non-super admins).
 */
@Injectable()
export class PlatformScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;
    if (!user) throw new ForbiddenException();
    if (user.role === UserRole.SUPER_ADMIN) return true;
    const paramPid = request.params?.platformId as string | undefined;
    if (!paramPid) return true;
    if (!user.platformId || user.platformId !== paramPid) {
      throw new ForbiddenException('Wrong platform scope');
    }
    return true;
  }
}
