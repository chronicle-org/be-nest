import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

interface CustomResponse<T> {
  data?: T;
  message?: string;
}

type SuccessResponse<T> = {
  content: T | null;
  message: string;
  errors: string[];
  statusCode: number;
};

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<CustomResponse<T> | T, SuccessResponse<T>>
{
  intercept(
    _: ExecutionContext,
    next: CallHandler<CustomResponse<T> | T>,
  ): Observable<SuccessResponse<T>> {
    return next.handle().pipe(
      map((data): SuccessResponse<T> => {
        if (data && typeof data === "object" && "data" in data) {
          const custom = data;
          return {
            content: custom.data ?? null,
            message: custom.message ?? "Success",
            errors: [],
            statusCode: 200,
          };
        }
        return {
          content: (data ?? null) as T | null,
          message: "Success",
          errors: [],
          statusCode: 200,
        };
      }),
    );
  }
}
