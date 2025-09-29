// Item Capture System for Dave's Moving Consultation
// Captures and stores images of items that need special moving attention

class ItemCaptureSystem {
  constructor() {
    this.capturedItems = [];
    this.captureDirectory = './captured_items';
    this.ensureDirectoryExists();
  }

  ensureDirectoryExists() {
    const fs = require('fs');
    if (!fs.existsSync(this.captureDirectory)) {
      fs.mkdirSync(this.captureDirectory, { recursive: true });
    }
  }

  async captureItemImage(imageData, itemDescription, category, priority) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${category}_${timestamp}.jpg`;
      const filepath = `${this.captureDirectory}/${filename}`;
      
      // Save image to file
      const fs = require('fs');
      const buffer = Buffer.from(imageData, 'base64');
      fs.writeFileSync(filepath, buffer);
      
      // Create item record
      const item = {
        id: `item_${Date.now()}`,
        filename: filename,
        filepath: filepath,
        description: itemDescription,
        category: category,
        priority: priority,
        timestamp: new Date().toISOString(),
        status: 'pending_review'
      };
      
      this.capturedItems.push(item);
      
      console.log(`📸 Item captured: ${itemDescription} (${category})`);
      return item;
      
    } catch (error) {
      console.error('Failed to capture item image:', error);
      throw error;
    }
  }

  getCapturedItems() {
    return this.capturedItems;
  }

  getItemsByCategory(category) {
    return this.capturedItems.filter(item => item.category === category);
  }

  getItemsByPriority(priority) {
    return this.capturedItems.filter(item => item.priority === priority);
  }

  updateItemStatus(itemId, status) {
    const item = this.capturedItems.find(i => i.id === itemId);
    if (item) {
      item.status = status;
      item.updatedAt = new Date().toISOString();
      return item;
    }
    return null;
  }

  generateAdminReport() {
    const report = {
      totalItems: this.capturedItems.length,
      byCategory: {},
      byPriority: {},
      byStatus: {},
      items: this.capturedItems
    };

    // Categorize items
    this.capturedItems.forEach(item => {
      report.byCategory[item.category] = (report.byCategory[item.category] || 0) + 1;
      report.byPriority[item.priority] = (report.byPriority[item.priority] || 0) + 1;
      report.byStatus[item.status] = (report.byStatus[item.status] || 0) + 1;
    });

    return report;
  }
}

// Export for use in the main application
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ItemCaptureSystem;
} else {
  window.ItemCaptureSystem = ItemCaptureSystem;
}
