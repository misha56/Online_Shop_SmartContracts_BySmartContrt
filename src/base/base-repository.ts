import { ChaincodeStub, Iterators } from 'fabric-shim';
import uniqid = require('uniqid');
import { DocTypes } from './types.enum';
import { IBaseRelation, IBaseRelationField, IBaseIncludeObject, IInstanceRepositoryFields } from './types/relation.type';
import { RelationEnum } from './relations.enum';
import { ISidFileds } from './secure-storage/types/secure-storage-implementation.type';
import { SecureStorage } from './secure-storage';

export abstract class BaseRepository<T extends IInstanceRepositoryFields & ISidFileds> implements IBaseRelation {

  public abstract relations: IBaseRelationField;
  public excludeFieldsForResponse: string[] = ['docType', 'key', 'sid'];

  public secureStorage: SecureStorage<T>;
  public docType: DocTypes;
  // EXAMPLE
  /**
   * 'CARD', 'BALANCE', 'CATEGORY'
   */

  constructor(docType: DocTypes) {
    this.docType = docType;
    this.secureStorage = new SecureStorage<T>(this.docType);
  }

  // =============================
  // BUFFER
  public toBuffer(obj: any): Buffer {
    return Buffer.from(JSON.stringify(obj));
  }

  public fromBuffer(buffer: Buffer): T {
    return JSON.parse(buffer.toString()) as T;
  }

  // END BUFFER
  // =============================

  public async getObjectWithFieldsExcluded(obj: T | T[], {
    recursive = true,
    additionalFieldsToExclude = [],
   }: {
    recursive?: boolean,

    additionalFieldsToExclude?: string[],
  }): Promise<T | T[]> {
    if (Array.isArray(obj)) {
      const repositoryElements: T[] = obj;
      obj = await Promise.all(repositoryElements.map(async (repositoryElement: T) => {
        return await this.getObjectWithFieldsExcluded(repositoryElement, { recursive, additionalFieldsToExclude });
      } )) as T[];
    } else {

      const propertiesToExclude: string[] = [...this.excludeFieldsForResponse, ...additionalFieldsToExclude];

      for (const property of propertiesToExclude) {
        delete obj[property];
      }

      if (recursive) {

        // EXAMPLE this.relations
        // this.relations = {
        //   cards: {
        //     type: RelationEnum.hasMany,
        //     key: 'user',
        //     repository: CardRepository,
        //     docType: DocTypes.Card,
        //   },
        //   bankAccounts: {
        //     type: RelationEnum.hasMany,
        //     key: 'user',
        //     repository: BankAccountRepository,
        //     docType: DocTypes.BankAccount,
        //   },
        // } as IBaseRelationField;

        for ( const relationKeyName of Object.keys(this.relations) ) {
          if ( obj[relationKeyName] ) {
            if ( typeof obj[relationKeyName] === 'string' ) { // doesn’t have included object
              delete obj[relationKeyName];
            } else {
              const repository = new this.relations[relationKeyName].repository();
              obj[relationKeyName] = await repository.getObjectWithFieldsExcluded(obj[relationKeyName], { recursive, additionalFieldsToExclude });
            }
          }
        }

      }
    }
    return obj;
  }

  // =============================
  // READ
  public async ifExists(stub: ChaincodeStub, key: string) {
    if ( !key.startsWith(this.docType) ) {
      key = `${this.docType}-${key}`;
    }

    const buffer = await stub.getState(key);
    return (!!buffer && buffer.length > 0);
  }

  public async getByKey(stub: ChaincodeStub, key: string, include?: IBaseIncludeObject[]): Promise<T> {
    // include EXAMPLE
    // [ { name: 'products' }, include:? [] ]

    if (!key.startsWith(this.docType)) {
      key = `${this.docType}-${key}`;
    }

    const exists = await this.ifExists(stub, key);
    if (!exists) {
      throw new Error(`The ${this.docType} with key ${key} does not exist`);
    }
    const buffer = await stub.getState(key);
    let obj = this.fromBuffer(buffer);

    if (include && include.length) {
      obj = await this.handleInclude(stub, include, key, obj);
    }

    await this.handleIncludeToSecureStorage(obj);
    return obj;
  }

  public async find(stub: ChaincodeStub, selector: any, include?: IBaseIncludeObject[]): Promise<T[]> {
    // include EXAMPLE
    // [ { name: 'products' }, include:? [] ]

    const baseSelector = {
      docType: this.docType,
    };
    Object.assign(baseSelector, selector);

    // queryString
    // {
    //   selector: {
    //     docType: 'CATEGORY',
    //     owner: 'dcdcdc',
    //   },
    // }

    const iterator = await stub.getQueryResult(JSON.stringify({ selector: baseSelector }));
    return await this.getListOfDataByIterator(stub, iterator, include);
  }

  public async findOne(stub: ChaincodeStub, selector: Partial<T>, include?: IBaseIncludeObject[]): Promise<T> {
    // include EXAMPLE
    // [ { name: 'products' }, include:? [] ]

    const baseSelector = {
      docType: this.docType,
    };
    Object.assign(baseSelector, selector);
    try {
      const iterator = await stub.getQueryResult(JSON.stringify({ selector: baseSelector}));
      const data = (await this.getDataByIterator(stub, iterator, include)).data;
      await iterator.close();
      return data;
    } catch (error) {
      // skip
    }
  }
  // END READ
  // =============================

  // =============================
  // WRITE

  public async create(stub: ChaincodeStub, obj: T, key?: string): Promise<T> {

    if (key && key.length) {
      if (!key.startsWith(this.docType)) {
        key = `${this.docType}-${key}`;
      }

    } else {
      key = `${this.docType}-${uniqid()}`;
    }

    obj.docType = this.docType;
    obj.key = key;

    const objectExists = await this.ifExists(stub, key);

    if (objectExists) {
      throw new Error(`The ${this.docType} with key ${key} already exists`);
    }

    try {
      // HANDLE SECURE STORAGE
      const response = await this.secureStorage.create(obj);
      obj.sid = response.key;
      response.filteredObject.notSecureProperties.sid = obj.sid;
      // END HANDLE SECURE STORAGE

      await stub.putState(key, this.toBuffer(response.filteredObject.notSecureProperties));
    } catch (error) {
      await stub.putState(key, this.toBuffer(obj));
    }
    return obj;
  }

  public async delete(stub: ChaincodeStub, key: string): Promise<void> {

    const exists = await this.ifExists(stub, key);
    if (!exists) {
      throw new Error(`The ${this.docType} with key ${key} does not exist`);
    }
    const obj = await this.getByKey(stub, key);

    if (obj.sid) {
      await this.secureStorage.delete(obj.sid);
    }

    await stub.deleteState(key);
  }

  public async update(stub: ChaincodeStub, key: string, dataToUpdate: T): Promise<T> {
    if ( dataToUpdate.key ) {
      delete dataToUpdate.key;
      // throw new Error(`You can't update property 'key'`);
    }
    const obj = await this.getByKey(stub, key);

    for (const property of Object.keys(obj)) {
      if (dataToUpdate[property] === undefined) {
        dataToUpdate[property] = obj[property];
      }
    }
    const keys = Object.keys(obj);

    try {
      const response = await this.secureStorage.update(obj.sid, dataToUpdate);
      response.notSecureProperties.sid = dataToUpdate.sid;
      await stub.putState(key, this.toBuffer(response.notSecureProperties));
    } catch (error) {
      await stub.putState(key, this.toBuffer(dataToUpdate));
    }
    return dataToUpdate;
  }

  // END WRITE
  // =============================

  // =============================
  // HELPER

  private async getListOfDataByIterator(stub: ChaincodeStub, iterator: Iterators.StateQueryIterator, include?: IBaseIncludeObject[]): Promise<T[]> {
    const allResults: T[] = [];
    while (true) {
      try {
        const value = await this.getDataByIterator(stub, iterator, include);
        allResults.push(value.data);
        if (value.isDone) {
          await iterator.close();
          return allResults;
        }
      } catch (error) {
        return allResults;
      }
    }
  }

  private async getDataByIterator(stub: ChaincodeStub, iterator: Iterators.StateQueryIterator, include?: IBaseIncludeObject[]): Promise<{
    data: T,
    isDone: boolean,
  }> {
    const res = await iterator.next();
    let isDone = false;
    if (res.value && res.value.value.toString()) {
      let value = JSON.parse(res.value.value.toString('utf8')) as T;
      await this.handleIncludeToSecureStorage(value);
      if (include && include.length) {
        value = await this.handleInclude(stub, include, res.value.key, value);
      }
      if (res.done) {
        await iterator.close();
        isDone = true;
      }
      return {
        data: value,
        isDone,
      };
    } else {
      throw Error('Object not found');
    }

  }

  // END HELPER
  // =============================

  // INCLUDE
  // =============================
  private async handleInclude(stub: ChaincodeStub, include: IBaseIncludeObject[], key: string, obj: T): Promise<T> {
    for (const includeItem of include) {
      if (this.relations[includeItem.name]) {
        const repository = new this.relations[includeItem.name].repository();
        if (this.relations[includeItem.name].type === RelationEnum.hasMany) {
          obj = await this.includeHandleHasMany(stub, repository, includeItem, key, obj);
        } else if (this.relations[includeItem.name].type === RelationEnum.hasOne) {
          obj = await this.includeHandleHasOne(stub, repository, includeItem, obj);
        } else if (this.relations[includeItem.name].type === RelationEnum.belongsTo) {
          obj = await this.includeHandleBelongsTo(stub, repository, includeItem, obj);
        }
      }
    }
    return obj;
  }

  // INCLUDE HANDLERS
  // ============
  private async includeHandleHasMany(stub: ChaincodeStub, repository: BaseRepository<any>, includeItem: IBaseIncludeObject, key: string, obj: T): Promise<T> {
    const selector = {
      docType: this.relations[includeItem.name].docType,
    };
    selector[this.relations[includeItem.name].key] = key;
    const arrayOfItems = await repository.find(stub, selector, includeItem.include);
    obj[includeItem.name] = arrayOfItems;
    return obj;
  }
  private async includeHandleBelongsTo(stub: ChaincodeStub, repository: BaseRepository<any>, includeItem: IBaseIncludeObject, obj: T): Promise<T> {
    obj[includeItem.name] = await repository.getByKey(stub, obj[this.relations[includeItem.name].key], includeItem.include);
    return obj;
  }
  private async includeHandleHasOne(stub: ChaincodeStub, repository: BaseRepository<any>, includeItem: IBaseIncludeObject, obj: T): Promise<T> {
    const selector = {};
    selector[this.relations[includeItem.name].key] = obj.key;
    obj[includeItem.name] = await repository.findOne(stub, selector, includeItem.include);
    return obj;
  }

  // END INCLUDE HANDLERS
  // ============

  // =============================
  // END INCLUDE

  // SECURE STORAGE HELPER
  private async handleIncludeToSecureStorage(obj: T): Promise<void> {
    if (obj.sid) {
      const response = await this.secureStorage.get(obj.sid);
      Object.assign(obj, response);
    }
  }

  // END SECURE STORAGE HELPER
}
