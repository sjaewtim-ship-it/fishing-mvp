export class EnergyManager {
  private static _instance: EnergyManager;

  public static get instance() {
    if (!this._instance) {
      this._instance = new EnergyManager();
    }
    return this._instance;
  }

  private energy: number = 5;
  private maxEnergy: number = 5;

  getEnergy() {
    return this.energy;
  }

  getMaxEnergy() {
    return this.maxEnergy;
  }

  hasEnergy() {
    return this.energy > 0;
  }

  costEnergy() {
    this.energy -= 1;
    console.log('energy left:', this.energy);
  }

  addEnergy(value: number) {
    this.energy = Math.min(this.maxEnergy, this.energy + value);
    console.log('energy add:', this.energy);
  }

  setEnergy(value: number) {
    this.energy = Math.max(0, Math.min(this.maxEnergy, value));
    console.log('energy set:', this.energy);
  }

  reset() {
    this.energy = this.maxEnergy;
    console.log('energy reset:', this.energy);
  }
}
