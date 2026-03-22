export class CoinManager {
  private static _instance: CoinManager;

  public static get instance() {
    if (!this._instance) {
      this._instance = new CoinManager();
    }
    return this._instance;
  }

  private coins: number = 0;

  getCoins() {
    return this.coins;
  }

  addCoins(value: number) {
    this.coins += value;
    console.log('coins add:', value, 'total:', this.coins);
  }

  setCoins(value: number) {
    this.coins = value;
    console.log('coins set:', this.coins);
  }

  reset() {
    this.coins = 0;
    console.log('coins reset:', this.coins);
  }
}
