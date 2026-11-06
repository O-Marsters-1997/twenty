import { Global, Module } from '@nestjs/common';

import { ExceptionHandlerConsoleDriver } from 'src/engine/core-modules/exception-handler/drivers/console.driver';
import { EXCEPTION_HANDLER_DRIVER } from 'src/engine/core-modules/exception-handler/exception-handler.constants';
import { ExceptionHandlerService } from 'src/engine/core-modules/exception-handler/exception-handler.service';
import { HttpExceptionHandlerService } from 'src/engine/core-modules/exception-handler/http-exception-handler.service';

@Global()
@Module({
  providers: [
    {
      provide: EXCEPTION_HANDLER_DRIVER,
      useClass: ExceptionHandlerConsoleDriver,
    },
    ExceptionHandlerService,
    HttpExceptionHandlerService,
  ],
  exports: [ExceptionHandlerService, HttpExceptionHandlerService],
})
export class ExceptionHandlerModule {}
