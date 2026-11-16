import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const detail = exception instanceof HttpException ? exception.getResponse() : 'internal';
    const message = typeof detail === 'string' ? detail : (detail as any).message;
    const error = Array.isArray(message) ? message.join(', ') : message || 'internal';
    if (status === 500) console.error(exception);
    response.status(status).json({ error });
  }
}
