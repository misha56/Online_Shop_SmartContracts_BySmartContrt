import { RelationEnum } from '../relations.enum';
import { DocTypes } from '../types.enum';
import { BaseRepository } from '../base-repository';

interface IBaseRelationFieldType {
  type: RelationEnum;
  key: string;
  repository: new () => BaseRepository<any>;
  docType: DocTypes;
}

export interface IBaseRelationField {
  [s: string]: IBaseRelationFieldType;
}

export interface IBaseRelation {
  relations: IBaseRelationField;
  excludeFieldsForResponse: string[];
}

export interface IBaseIncludeObject {
  name: string;
  include?: IBaseIncludeObject[];
}

export interface IInstanceRepositoryFields {
  docType?: DocTypes;
  key?: string;
}
