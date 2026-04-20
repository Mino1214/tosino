import { Module } from '@nestjs/common';
import { SemiVirtualBundlesController } from './semi-virtual-bundles.controller';
import { SemiVirtualBundlesService } from './semi-virtual-bundles.service';

@Module({
  controllers: [SemiVirtualBundlesController],
  providers: [SemiVirtualBundlesService],
  exports: [SemiVirtualBundlesService],
})
export class SemiVirtualModule {}
