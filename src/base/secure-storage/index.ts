import { ISecureStorageImplementaion, ISidFileds } from './types/secure-storage-implementation.type';
import { Vault } from './lib/vault/hashicorp-vault';
import uuid = require('uuid/v4');
import 'reflect-metadata';
import { checkIfPropertyInSecureStorage } from './annotations';
import { CheckPerfomance } from '../helpers/check-perfomance';

export class SecureStorage<T extends ISidFileds> {
  private secureStorageImplementation: ISecureStorageImplementaion;
  constructor(collection: string) {
    this.secureStorageImplementation = new Vault(collection, 'dev');
  }

  @CheckPerfomance()
  public filterPropertiesToPutToSecureStorage<T>(obj: T): {
    secureProperties: {
      [s: string]: any,
    },
    notSecureProperties: {
      [s: string]: any,
    },
  }  {
    const properties = Object.getOwnPropertyNames(obj);

    const secureProperties = {};
    const notSecureProperties = {};
    for (const property of properties) {
      const ifPropertyInSecureStorageStatus = checkIfPropertyInSecureStorage(obj, property);
      if (ifPropertyInSecureStorageStatus) {
        secureProperties[property] = obj[property];

      } else {
        notSecureProperties[property] = obj[property];
      }
    }
    return {
      secureProperties,
      notSecureProperties,
    };
  }

  public async create(obj: T): Promise<{
    filteredObject: {
      secureProperties: {
        [s: string]: any,
      },
      notSecureProperties: {
        [s: string]: any,
      },
    },
    key: string,
  }> {
    const filteredObject = this.filterPropertiesToPutToSecureStorage(obj);
    const keys = Object.keys(filteredObject.secureProperties).length;
    if (keys === 0) {
      throw new Error(`Object doesn't have properties to include to secure storage`);
    }

    const newKey = uuid() as string;
    await this.secureStorageImplementation.put(filteredObject.secureProperties, newKey);
    return {
      filteredObject,
      key: newKey,
    };
  }

  @CheckPerfomance()
  public async get(key: string): Promise<T> {
    const exists = await this.secureStorageImplementation.ifExists(key);
    if (!exists) {
      throw new Error(`Object with key ${key} doesn't exist`);
    }
    return await this.secureStorageImplementation.get(key);
  }

  @CheckPerfomance()
  public async update(key: string, obj: T): Promise<{
    secureProperties: {
      [s: string]: any,
    },
    notSecureProperties: {
      [s: string]: any,
    },
  }> {
    const exists = await this.secureStorageImplementation.ifExists(key);
    if (!exists) {
      throw new Error(`Object with key ${key} doesn't exist`);
    }
    const existingItem = await this.secureStorageImplementation.get(key);
    const filteredObject = this.filterPropertiesToPutToSecureStorage(obj);

    if (Object.keys(filteredObject.secureProperties).length === 0) {
      throw new Error(`Object doesn't have properties to include to secure storage`);
    }

    Object.assign(existingItem, filteredObject.secureProperties);
    await this.secureStorageImplementation.put(existingItem, key);
    return filteredObject;
  }

  @CheckPerfomance()
  public async delete(key: string): Promise<void> {
    const exist = await this.secureStorageImplementation.ifExists(key);
    if (!exist) {
      throw new Error(`Object with key ${key} doesn't exist`);
    }
    return await this.secureStorageImplementation.delete(key);
  }
}
