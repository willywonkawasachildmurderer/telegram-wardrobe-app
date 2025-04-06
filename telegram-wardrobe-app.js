// Telegram Mini App - Pocket Wardrobe
// This file contains the main application code for the Pocket Wardrobe mini app

// Initialize Telegram WebApp
const telegram = window.Telegram.WebApp;
telegram.expand();

// Main application class
class WardrobeApp {
  constructor() {
    this.clothingItems = [];
    this.outfits = [];
    this.currentView = 'wardrobe'; // 'wardrobe', 'outfits', 'virtualTryOn'
    
    // Initialize UI
    this.initUI();
    
    // Load user data
    this.loadUserData();
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  initUI() {
    // Create main container
    this.container = document.getElementById('app');
    
    // Create navigation
    this.nav = document.createElement('div');
    this.nav.className = 'navigation';
    this.nav.innerHTML = `
      <button id="wardrobe-btn" class="nav-btn active">Wardrobe</button>
      <button id="outfits-btn" class="nav-btn">Outfits</button>
      <button id="try-on-btn" class="nav-btn">Virtual Try-On</button>
    `;
    
    // Create content area
    this.contentArea = document.createElement('div');
    this.contentArea.className = 'content-area';
    
    // Add elements to DOM
    this.container.appendChild(this.nav);
    this.container.appendChild(this.contentArea);
    
    // Initialize with wardrobe view
    this.renderWardrobeView();
  }
  
  setupEventListeners() {
    // Navigation buttons
    document.getElementById('wardrobe-btn').addEventListener('click', () => {
      this.setActiveView('wardrobe');
      this.renderWardrobeView();
    });
    
    document.getElementById('outfits-btn').addEventListener('click', () => {
      this.setActiveView('outfits');
      this.renderOutfitsView();
    });
    
    document.getElementById('try-on-btn').addEventListener('click', () => {
      this.setActiveView('virtualTryOn');
      this.renderVirtualTryOnView();
    });
    
    // Listen for messages from the Telegram bot (for new clothing uploads)
    telegram.onEvent('viewportChanged', this.handleViewportChange.bind(this));
    
    // Setup Telegram main button for context-aware actions
    telegram.MainButton.setParams({
      text: 'Upload New Item',
      color: '#31a2db',
    });
    
    telegram.MainButton.onClick(() => {
      if (this.currentView === 'wardrobe') {
        this.requestNewClothingUpload();
      } else if (this.currentView === 'outfits') {
        this.generateNewOutfits();
      } else if (this.currentView === 'virtualTryOn') {
        this.startVirtualTryOn();
      }
    });
  }
  
  setActiveView(view) {
    this.currentView = view;
    // Update navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.getElementById(`${view}-btn`).classList.add('active');
    
    // Update main button text based on context
    if (view === 'wardrobe') {
      telegram.MainButton.setText('Upload New Item');
      telegram.MainButton.show();
    } else if (view === 'outfits') {
      telegram.MainButton.setText('Generate Outfits');
      telegram.MainButton.show();
    } else if (view === 'virtualTryOn') {
      telegram.MainButton.setText('Start Virtual Try-On');
      telegram.MainButton.show();
    }
  }
  
  // WARDROBE VIEW METHODS
  renderWardrobeView() {
    this.contentArea.innerHTML = '';
    
    // Categories list
    const categories = this.getClothingCategories();
    const categoryContainer = document.createElement('div');
    categoryContainer.className = 'categories';
    
    categories.forEach(category => {
      const categorySection = this.createCategorySection(category);
      categoryContainer.appendChild(categorySection);
    });
    
    this.contentArea.appendChild(categoryContainer);
    
    if (this.clothingItems.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      emptyState.innerHTML = `
        <p>Your wardrobe is empty! Tap the button below to add your first clothing item.</p>
      `;
      this.contentArea.appendChild(emptyState);
    }
  }
  
  createCategorySection(category) {
    const section = document.createElement('div');
    section.className = 'category-section';
    
    const header = document.createElement('h2');
    header.textContent = category.name;
    section.appendChild(header);
    
    const itemsGrid = document.createElement('div');
    itemsGrid.className = 'items-grid';
    
    const categoryItems = this.clothingItems.filter(item => item.category === category.id);
    categoryItems.forEach(item => {
      const itemElement = this.createClothingItemElement(item);
      itemsGrid.appendChild(itemElement);
    });
    
    section.appendChild(itemsGrid);
    return section;
  }
  
  createClothingItemElement(item) {
    const element = document.createElement('div');
    element.className = 'clothing-item';
    element.dataset.id = item.id;
    
    element.innerHTML = `
      <div class="item-image">
        <img src="${item.imageUrl}" alt="${item.name || 'Clothing item'}">
      </div>
      <div class="item-info">
        <p>${item.name || 'Unnamed item'}</p>
      </div>
    `;
    
    // Add click event to select item
    element.addEventListener('click', () => {
      this.showClothingItemDetails(item);
    });
    
    return element;
  }
  
  showClothingItemDetails(item) {
    // Show a popup with item details and options
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close-btn">&times;</span>
        <div class="item-detail">
          <img src="${item.imageUrl}" alt="${item.name || 'Clothing item'}">
          <h3>${item.name || 'Unnamed item'}</h3>
          <p>Category: ${this.getCategoryName(item.category)}</p>
          <div class="actions">
            <button class="edit-btn">Edit</button>
            <button class="delete-btn">Remove</button>
            <button class="try-on-btn">Try On</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    modal.querySelector('.close-btn').addEventListener('click', () => {
      modal.remove();
    });
    
    modal.querySelector('.edit-btn').addEventListener('click', () => {
      this.editClothingItem(item);
      modal.remove();
    });
    
    modal.querySelector('.delete-btn').addEventListener('click', () => {
      this.deleteClothingItem(item.id);
      modal.remove();
      this.renderWardrobeView();
    });
    
    modal.querySelector('.try-on-btn').addEventListener('click', () => {
      this.startVirtualTryOnWithItem(item);
      modal.remove();
    });
  }
  
  // OUTFITS VIEW METHODS
  renderOutfitsView() {
    this.contentArea.innerHTML = '';
    
    const outfitContainer = document.createElement('div');
    outfitContainer.className = 'outfits-container';
    
    if (this.outfits.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      emptyState.innerHTML = `
        <p>No outfits generated yet! Tap the button below to create your first outfit.</p>
      `;
      this.contentArea.appendChild(emptyState);
    } else {
      this.outfits.forEach(outfit => {
        const outfitElement = this.createOutfitElement(outfit);
        outfitContainer.appendChild(outfitElement);
      });
      
      this.contentArea.appendChild(outfitContainer);
    }
  }
  
  createOutfitElement(outfit) {
    const element = document.createElement('div');
    element.className = 'outfit-card';
    element.dataset.id = outfit.id;
    
    // Create the outfit collage
    const collage = document.createElement('div');
    collage.className = 'outfit-collage';
    
    // Add each clothing item to the collage
    outfit.items.forEach(itemId => {
      const item = this.clothingItems.find(i => i.id === itemId);
      if (item) {
        const itemImg = document.createElement('div');
        itemImg.className = 'collage-item';
        itemImg.style.backgroundImage = `url(${item.imageUrl})`;
        collage.appendChild(itemImg);
      }
    });
    
    // Outfit info
    const info = document.createElement('div');
    info.className = 'outfit-info';
    info.innerHTML = `
      <h3>${outfit.name || 'Outfit ' + outfit.id}</h3>
      <p>${outfit.description || 'No description'}</p>
      <div class="outfit-actions">
        <button class="save-outfit">Save</button>
        <button class="try-outfit">Try On</button>
      </div>
    `;
    
    element.appendChild(collage);
    element.appendChild(info);
    
    // Add event listeners
    element.querySelector('.save-outfit').addEventListener('click', () => {
      this.saveOutfit(outfit.id);
    });
    
    element.querySelector('.try-outfit').addEventListener('click', () => {
      this.tryOnOutfit(outfit.id);
    });
    
    return element;
  }
  
  // VIRTUAL TRY-ON VIEW METHODS
  renderVirtualTryOnView() {
    this.contentArea.innerHTML = '';
    
    const tryOnContainer = document.createElement('div');
    tryOnContainer.className = 'try-on-container';
    
    tryOnContainer.innerHTML = `
      <div class="try-on-instructions">
        <h2>Virtual Try-On</h2>
        <p>Upload a photo of yourself or choose one from your gallery</p>
        <button id="upload-photo" class="action-btn">Upload Photo</button>
      </div>
      
      <div class="try-on-preview" style="display: none;">
        <div class="preview-image">
          <!-- Preview will appear here -->
        </div>
        <div class="clothing-selection">
          <h3>Select clothing to try on</h3>
          <div class="selection-items">
            <!-- Clothing items will be displayed here -->
          </div>
        </div>
      </div>
    `;
    
    this.contentArea.appendChild(tryOnContainer);
    
    // Add event listeners
    document.getElementById('upload-photo').addEventListener('click', () => {
      this.uploadTryOnPhoto();
    });
  }
  
  // DATA MANAGEMENT METHODS
  loadUserData() {
    // This would typically fetch data from the backend
    // For demonstration, we'll use some sample data
    this.clothingItems = this.getSampleClothingItems();
    this.outfits = this.getSampleOutfits();
  }
  
  getClothingCategories() {
    return [
      { id: 'tops', name: 'Tops' },
      { id: 'bottoms', name: 'Bottoms' },
      { id: 'outerwear', name: 'Outerwear' },
      { id: 'shoes', name: 'Shoes' },
      { id: 'accessories', name: 'Accessories' }
    ];
  }
  
  getCategoryName(categoryId) {
    const category = this.getClothingCategories().find(c => c.id === categoryId);
    return category ? category.name : 'Unknown';
  }
  
  // API INTERACTION METHODS
  requestNewClothingUpload() {
    // Send a message to the Telegram bot to request photo upload
    telegram.sendData(JSON.stringify({
      action: 'requestUpload',
      type: 'clothing'
    }));
  }
  
  generateNewOutfits() {
    // In a real app, this would call the AI outfit generation service
    // For demo purposes, we'll just add a dummy outfit
    const newOutfit = {
      id: `outfit-${Date.now()}`,
      name: 'New Generated Outfit',
      description: 'AI-generated outfit based on your style preferences',
      items: this.getRandomClothingItems(),
      created: new Date().toISOString()
    };
    
    this.outfits.unshift(newOutfit);
    this.renderOutfitsView();
  }
  
  getRandomClothingItems() {
    // Select random items for different categories
    const items = [];
    const categories = ['tops', 'bottoms', 'outerwear', 'shoes'];
    
    categories.forEach(category => {
      const categoryItems = this.clothingItems.filter(item => item.category === category);
      if (categoryItems.length > 0) {
        const randomItem = categoryItems[Math.floor(Math.random() * categoryItems.length)];
        items.push(randomItem.id);
      }
    });
    
    return items;
  }
  
  uploadTryOnPhoto() {
    // In the real app, this would trigger a file upload
    // For demonstration purposes, we'll simulate a photo being uploaded
    telegram.sendData(JSON.stringify({
      action: 'requestUpload',
      type: 'selfie'
    }));
    
    // Simulate successful upload
    setTimeout(() => {
      this.showTryOnPreview();
    }, 1000);
  }
  
  showTryOnPreview() {
    const tryOnContainer = document.querySelector('.try-on-container');
    const instructions = tryOnContainer.querySelector('.try-on-instructions');
    const preview = tryOnContainer.querySelector('.try-on-preview');
    
    // Hide instructions and show preview
    instructions.style.display = 'none';
    preview.style.display = 'block';
    
    // Set preview image (placeholder for demo)
    const previewImage = preview.querySelector('.preview-image');
    previewImage.innerHTML = `
      <img src="https://via.placeholder.com/300x400" alt="User photo" class="selfie-image">
      <div class="try-on-overlay"></div>
    `;
    
    // Display clothing options
    const selectionItems = preview.querySelector('.selection-items');
    selectionItems.innerHTML = '';
    
    // Show one item from each category
    this.getClothingCategories().forEach(category => {
      const categoryItems = this.clothingItems.filter(item => item.category === category.id);
      if (categoryItems.length > 0) {
        const randomItem = categoryItems[Math.floor(Math.random() * categoryItems.length)];
        
        const itemElement = document.createElement('div');
        itemElement.className = 'selection-item';
        itemElement.innerHTML = `
          <img src="${randomItem.imageUrl}" alt="${randomItem.name || 'Clothing item'}">
          <p>${category.name}</p>
        `;
        
        itemElement.addEventListener('click', () => {
          this.applyClothingToPreview(randomItem);
        });
        
        selectionItems.appendChild(itemElement);
      }
    });
  }
  
  applyClothingToPreview(item) {
    // In a real app, this would use AI to apply the clothing to the user's photo
    // For demonstration, we'll just show a simple overlay
    const overlay = document.querySelector('.try-on-overlay');
    overlay.style.backgroundImage = `url(${item.imageUrl})`;
    overlay.style.opacity = '0.7';
  }
  
  // Utility methods
  handleViewportChange() {
    // Adjust UI based on viewport changes
    this.renderCurrentView();
  }
  
  renderCurrentView() {
    if (this.currentView === 'wardrobe') {
      this.renderWardrobeView();
    } else if (this.currentView === 'outfits') {
      this.renderOutfitsView();
    } else if (this.currentView === 'virtualTryOn') {
      this.renderVirtualTryOnView();
    }
  }
  
  // Sample data for demonstration
  getSampleClothingItems() {
    return [
      {
        id: 'item-1',
        name: 'Blue T-Shirt',
        category: 'tops',
        imageUrl: 'https://via.placeholder.com/150x150?text=Blue+Tshirt'
      },
      {
        id: 'item-2',
        name: 'Black Jeans',
        category: 'bottoms',
        imageUrl: 'https://via.placeholder.com/150x150?text=Black+Jeans'
      },
      {
        id: 'item-3',
        name: 'Leather Jacket',
        category: 'outerwear',
        imageUrl: 'https://via.placeholder.com/150x150?text=Leather+Jacket'
      },
      {
        id: 'item-4',
        name: 'Sneakers',
        category: 'shoes',
        imageUrl: 'https://via.placeholder.com/150x150?text=Sneakers'
      },
      {
        id: 'item-5',
        name: 'Sunglasses',
        category: 'accessories',
        imageUrl: 'https://via.placeholder.com/150x150?text=Sunglasses'
      }
    ];
  }
  
  getSampleOutfits() {
    return [
      {
        id: 'outfit-1',
        name: 'Casual Day Out',
        description: 'Perfect for a relaxed day around town',
        items: ['item-1', 'item-2', 'item-4'],
        created: '2025-04-01T12:00:00Z'
      }
    ];
  }
}

// Initialize the app when the document is ready
document.addEventListener('DOMContentLoaded', () => {
  // Add CSS
  const style = document.createElement('style');
  style.textContent = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif;
    }
    
    #app {
      width: 100%;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    
    .navigation {
      display: flex;
      justify-content: space-around;
      padding: 10px 0;
      background-color: #f5f5f5;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .nav-btn {
      background: none;
      border: none;
      padding: 8px 16px;
      font-size: 14px;
      cursor: pointer;
      border-radius: 16px;
    }
    
    .nav-btn.active {
      background-color: #31a2db;
      color: white;
    }
    
    .content-area {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }
    
    .categories {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    .category-section h2 {
      margin-bottom: 10px;
      font-size: 18px;
    }
    
    .items-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 12px;
    }
    
    .clothing-item {
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      cursor: pointer;
    }
    
    .item-image {
      width: 100%;
      height: 100px;
      background-color: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .item-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .item-info {
      padding: 8px;
      font-size: 12px;
    }
    
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      text-align: center;
      color: #888;
    }
    
    .modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    
    .modal-content {
      background-color: white;
      border-radius: 12px;
      padding: 20px;
      width: 80%;
      max-width: 400px;
    }
    
    .close-btn {
      float: right;
      font-size: 24px;
      cursor: pointer;
    }
    
    .item-detail {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    
    .item-detail img {
      width: 200px;
      height: 200px;
      object-fit: cover;
      border-radius: 8px;
      margin-bottom: 16px;
    }
    
    .actions {
      display: flex;
      gap: 10px;
      margin-top: 16px;
    }
    
    .actions button {
      padding: 8px 16px;
      border: none;
      border-radius: 16px;
      cursor: pointer;
    }
    
    .edit-btn {
      background-color: #f5f5f5;
      color: #333;
    }
    
    .delete-btn {
      background-color: #ff6b6b;
      color: white;
    }
    
    .try-on-btn {
      background-color: #31a2db;
      color: white;
    }
    
    .outfits-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .outfit-card {
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .outfit-collage {
      height: 200px;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      grid-template-rows: repeat(2, 1fr);
      gap: 4px;
      background-color: #f5f5f5;
    }
    
    .collage-item {
      background-size: cover;
      background-position: center;
    }
    
    .outfit-info {
      padding: 16px;
    }
    
    .outfit-info h3 {
      margin-bottom: 8px;
    }
    
    .outfit-actions {
      display: flex;
      gap: 10px;
      margin-top: 12px;
    }
    
    .outfit-actions button {
      padding: 6px 12px;
      border: none;
      border-radius: 16px;
      cursor: pointer;
    }
    
    .save-outfit {
      background-color: #f5f5f5;
      color: #333;
    }
    
    .try-outfit {
      background-color: #31a2db;
      color: white;
    }
    
    .try-on-container {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    .try-on-instructions {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 32px 16px;
      gap: 16px;
    }
    
    .action-btn {
      padding: 8px 16px;
      background-color: #31a2db;
      color: white;
      border: none;
      border-radius: 16px;
      cursor: pointer;
    }
    
    .try-on-preview {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .preview-image {
      flex: 1;
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    
    .selfie-image {
      max-height: 400px;
      max-width: 100%;
      border-radius: 8px;
    }
    
    .try-on-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s;
    }
    
    .clothing-selection {
      padding: 16px;
    }
    
    .clothing-selection h3 {
      margin-bottom: 12px;
    }
    
    .selection-items {
      display: flex;
      overflow-x: auto;
      gap: 12px;
      padding-bottom: 8px;
    }
    
    .selection-item {
      min-width: 80px;
      text-align: center;
      cursor: pointer;
    }
    
    .selection-item img {
      width: 80px;
      height: 80px;
      object-fit: cover;
      border-radius: 8px;
    }
    
    .selection-item p {
      margin-top: 4px;
      font-size: 12px;
    }
  `;
  
  document.head.appendChild(style);
  
  // Create app container
  const appContainer = document.createElement('div');
  appContainer.id = 'app';
  document.body.appendChild(appContainer);
  
  // Initialize app
  const app = new WardrobeApp();
});
