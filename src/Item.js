/**
 * Item class represents an individual item in storage
 */
class Item {
  constructor(id, name, description = '') {
    this.id = id;
    this.name = name;
    this.description = description;
    this.boughtAmount = 0;
    this.boughtPrice = 0;
    this.soldAmount = 0;
    this.soldPrice = 0;
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Update item details
   */
  update(updates) {
    if (updates.name !== undefined) this.name = updates.name;
    if (updates.description !== undefined) this.description = updates.description;
    if (updates.boughtAmount !== undefined) this.boughtAmount = updates.boughtAmount;
    if (updates.boughtPrice !== undefined) this.boughtPrice = updates.boughtPrice;
    if (updates.soldAmount !== undefined) this.soldAmount = updates.soldAmount;
    if (updates.soldPrice !== undefined) this.soldPrice = updates.soldPrice;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Get average sold price per unit
   */
  getAverageSoldPrice() {
    if (this.soldAmount === 0) return 0;
    return this.soldPrice / this.soldAmount;
  }

  /**
   * Get total profit/loss
   */
  getProfitLoss() {
    const totalBought = this.boughtAmount * this.boughtPrice;
    const totalSold = this.soldPrice;
    return totalSold - totalBought;
  }

  /**
   * Convert to plain object
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      boughtAmount: this.boughtAmount,
      boughtPrice: this.boughtPrice,
      soldAmount: this.soldAmount,
      soldPrice: this.soldPrice,
      averageSoldPrice: this.getAverageSoldPrice(),
      profitLoss: this.getProfitLoss(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Create Item from plain object
   */
  static fromJSON(data) {
    const item = new Item(data.id, data.name, data.description);
    item.boughtAmount = data.boughtAmount || 0;
    item.boughtPrice = data.boughtPrice || 0;
    item.soldAmount = data.soldAmount || 0;
    item.soldPrice = data.soldPrice || 0;
    item.createdAt = data.createdAt || new Date().toISOString();
    item.updatedAt = data.updatedAt || new Date().toISOString();
    return item;
  }
}

module.exports = Item;
