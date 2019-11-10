import { IGuard } from './guard-interface';
import { Context } from 'fabric-contract-api';

export function UseGuard(guard: IGuard) {
  return (target: object, propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;
      descriptor.value = async function(ctx: Context, ...args: any[]) {
        this.payload = await guard.verify(ctx);
        return originalMethod.apply(this, [ctx, ...args]);
      };
  };
}
