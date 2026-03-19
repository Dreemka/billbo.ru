import { Module } from '@nestjs/common'
import { AdSurfacesController } from './ad-surfaces.controller'
import { AdSurfacesService } from './ad-surfaces.service'
import { BookingsController } from './bookings.controller'

@Module({
  controllers: [AdSurfacesController, BookingsController],
  providers: [AdSurfacesService],
  exports: [AdSurfacesService],
})
export class AdSurfacesModule {}
