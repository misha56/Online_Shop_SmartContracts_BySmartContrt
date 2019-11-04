import { ISecureStorageImplementaion } from '../../types/secure-storage-implementation.type';
import { Client } from 'node-vault';
import { VaultConfig } from './config';

export class Vault implements ISecureStorageImplementaion {
  private client: Client;
  private config;
  private collection: string;
  constructor(collection: string, env: string) {
    this.collection = collection;

    this.config = VaultConfig[env];
    this.client = require('node-vault')(this.config.connectionOptions);
    this.client.token = this.config.token;
  }

  public async ifExists(key: string): Promise<boolean> {
    try {
      await this.client.read(`${this.config.url}/${this.collection}/${key}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  public async get(key: string) {
    const result = await this.client.read(`${this.config.url}/${this.collection}/${key}`);
    return result.data.data;
  }

  public async put(obj: any, key: string ): Promise<void> {
    await this.client.write(`${this.config.url}/${this.collection}/${key}`, {data: obj});
  }

  public async delete(key: string ): Promise<void> {
    await this.client.delete(`${this.config.url}/${this.collection}/${key}`);
  }

}
