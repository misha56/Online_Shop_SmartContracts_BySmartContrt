import { Property } from 'fabric-contract-api';
import { DocTypes } from 'src/base/types.enum';

export class CartItem {
  public docType?: DocTypes = DocTypes.Cart;

  @Property()
  public key?: string;

  @Property()
  public balance?: Balance | string;

  @Property()
  public user?: string | User;

  @Property()
  public authorizationControls?: IAuthorizationControls;

  @Property()
  public brand?: CardBrands;

  @Property()
  public created?: Date;

  @Property()
  public currency?: СurrencyTypes;

  @InSecureStorage public expMonth?: number;

  @InSecureStorage public expYear?: number;

  @Property()
  public last4?: string;

  @InSecureStorage public cardNumber?: string;

  @Property()
  public name?: string;

  @InSecureStorage public pin?: string;

  @Property()
  public status?: CardStatuses;

  @Property()
  public type?: CardTypes;

  @Property()
  public sourceAccount?: string;

  constructor(obj: Card) {
    Object.assign(this, obj);
  }
}
