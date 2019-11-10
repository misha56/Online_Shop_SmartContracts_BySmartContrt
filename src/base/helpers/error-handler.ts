import { ErrorsTypes } from '../../shared/errors.enum';

export function ErrorHandler() {
  return (target: object, propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;
      descriptor.value = async function(...args: any[]) {
        try {
          const data = await originalMethod.apply(this, [...args]);
          return data;
        } catch (error) {
          if (Object.values(ErrorsTypes).includes(error)) {
            throw new Error(`[[[${JSON.stringify({error_code: error})}]]]`);
          }
          throw error;
        }
      };
  };
}
