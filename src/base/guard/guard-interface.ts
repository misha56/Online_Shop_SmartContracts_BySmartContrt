export interface IGuard {
  verify(ctx: any): Promise<any>;
}
