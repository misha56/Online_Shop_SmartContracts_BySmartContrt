export function InSecureStorage(target, propertyKey) {
  Reflect.defineMetadata('InSecureStorage', true, target, propertyKey);
}

export function checkIfPropertyInSecureStorage<T>(instance: T, propertyKey: string) {
  return !!Reflect.getMetadata('InSecureStorage', instance, propertyKey);
}
