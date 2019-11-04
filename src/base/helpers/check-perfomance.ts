/* eslint-disable @typescript-eslint/no-explicit-any */

export function CheckPerfomance() {
  return (target: object, propertyKey: string, descriptor: PropertyDescriptor) => {

    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const className = this.__proto__.constructor.name;
      const start = (new Date()).getTime();
      const returnData = await originalMethod.apply(this, args);
      const endData = (new Date()).getTime();
      const totalTime = (new Date()).getMilliseconds();
      console.log(`${className}.${propertyKey} Time  => ${(endData - start) / 1000}  sec, total ${ totalTime / 1000 } `);
      return returnData;
    };
  };
}
