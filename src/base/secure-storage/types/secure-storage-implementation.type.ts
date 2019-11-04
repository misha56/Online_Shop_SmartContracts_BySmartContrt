export interface ISecureStorageImplementaion {
  ifExists(key: string): Promise<boolean>;
  get(key: string): Promise<any>;
  put(obj: any, key: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface ISidFileds {
  sid?: string;
}
