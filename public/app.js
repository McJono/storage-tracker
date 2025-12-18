// API Configuration
const API_BASE = window.location.origin;
let authToken = localStorage.getItem('authToken');
let currentUser = null;
let currentBoxId = null; // Track selected box in folder tree

// Utility Functions
function getHeaders() {
    const headers = {
        'Content-Type': 'application/json'
    };
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    return headers;
}

async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: getHeaders()
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Something went wrong');
        }
        
        return data;
    } catch (error) {
        throw error;
    }
}

// Authentication Functions
async function login(username, password) {
    const data = await apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    });
    
    authToken = data.token;
    localStorage.setItem('authToken', authToken);
    currentUser = data.user;
    
    return data;
}

async function register(username, email, password) {
    const data = await apiCall('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password })
    });
    
    authToken = data.token;
    localStorage.setItem('authToken', authToken);
    currentUser = data.user;
    
    return data;
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    showAuthScreen();
}

// Screen Management
function showAuthScreen() {
    document.getElementById('auth-screen').classList.add('active');
    document.getElementById('app-screen').classList.remove('active');
}

function showAppScreen() {
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('app-screen').classList.add('active');
    document.getElementById('user-display').textContent = `Hello, ${currentUser.username}!`;
    loadData();
}

// Data Loading
async function loadData() {
    try {
        const data = await apiCall('/api/boxes');
        renderFolderTree(data.rootBoxes);
        renderHierarchy(data.rootBoxes);
        await loadStats();
    } catch (error) {
        console.error('Error loading data:', error);
        if (error.message.includes('token')) {
            logout();
        }
    }
}

async function loadStats() {
    try {
        const stats = await apiCall('/api/stats');
        document.getElementById('stat-boxes').textContent = stats.totalBoxes;
        document.getElementById('stat-items').textContent = stats.totalItems;
        document.getElementById('stat-root').textContent = stats.rootBoxes;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Rendering Functions
function renderFolderTree(boxes) {
    const container = document.getElementById('folder-tree');
    
    if (!boxes || boxes.length === 0) {
        container.innerHTML = '<div class="empty-tree">No boxes yet</div>';
        return;
    }
    
    container.innerHTML = boxes.map(box => renderTreeNode(box)).join('');
    
    // Attach event listeners
    attachTreeEventListeners();
}

function renderTreeNode(box) {
    const hasChildren = box.boxes && box.boxes.length > 0;
    const itemCount = box.items ? box.items.length : 0;
    const isSelected = currentBoxId === box.id;
    
    return `
        <div class="tree-item" data-box-id="${box.id}">
            <div class="tree-node ${isSelected ? 'selected' : ''}" data-box-id="${box.id}">
                <span class="tree-toggle ${hasChildren ? '' : 'empty'}">▶</span>
                <span class="tree-icon">📦</span>
                <span class="tree-label">${escapeHtml(box.name)}</span>
                <span class="tree-count">${itemCount}</span>
            </div>
            ${hasChildren ? `
                <div class="tree-children">
                    ${box.boxes.map(childBox => renderTreeNode(childBox)).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

function attachTreeEventListeners() {
    // Toggle expand/collapse
    document.querySelectorAll('.tree-toggle:not(.empty)').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const treeItem = e.target.closest('.tree-item');
            treeItem.classList.toggle('expanded');
            
            // Update toggle icon
            if (treeItem.classList.contains('expanded')) {
                e.target.textContent = '▼';
            } else {
                e.target.textContent = '▶';
            }
        });
    });
    
    // Select box
    document.querySelectorAll('.tree-node').forEach(node => {
        node.addEventListener('click', async (e) => {
            const boxId = e.currentTarget.dataset.boxId;
            
            // Update selected state
            document.querySelectorAll('.tree-node').forEach(n => n.classList.remove('selected'));
            e.currentTarget.classList.add('selected');
            currentBoxId = boxId;
            
            // Load and display the selected box
            await displayBox(boxId);
            
            // Close mobile menu
            closeMobileMenu();
        });
    });
}

async function displayBox(boxId) {
    try {
        const box = await apiCall(`/api/boxes/${boxId}`);
        const container = document.getElementById('hierarchy-view');
        container.innerHTML = renderBox(box);
        attachBoxEventListeners();
    } catch (error) {
        console.error('Error displaying box:', error);
    }
}

function renderHierarchy(boxes) {
    const container = document.getElementById('hierarchy-view');
    
    if (!boxes || boxes.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No storage boxes yet. Create your first box to get started!</p></div>';
        return;
    }
    
    container.innerHTML = boxes.map(box => renderBox(box)).join('');
    
    // Attach event listeners
    attachBoxEventListeners();
}

function renderBox(box, level = 0) {
    const profitLoss = calculateBoxProfitLoss(box);
    const profitClass = profitLoss > 0 ? 'profit-positive' : profitLoss < 0 ? 'profit-negative' : '';
    
    return `
        <div class="box-item" data-box-id="${box.id}">
            <div class="box-header">
                <div>
                    <div class="box-title">
                        <span>📦</span>
                        <span>${escapeHtml(box.name)}</span>
                        <small style="color: #999;">(${box.items.length} items)</small>
                    </div>
                    ${box.description ? `<div class="box-description">${escapeHtml(box.description)}</div>` : ''}
                </div>
                <div class="box-actions">
                    <button class="btn btn-primary btn-add-item" data-box-id="${box.id}">+ Item</button>
                    <button class="btn btn-secondary btn-edit-box" data-box-id="${box.id}">Edit</button>
                    <button class="btn btn-danger btn-delete-box" data-box-id="${box.id}">Delete</button>
                </div>
            </div>
            <div class="box-content">
                ${box.items.length > 0 ? `
                    <div class="items-list">
                        ${box.items.map(item => renderItem(item)).join('')}
                    </div>
                ` : ''}
                ${box.boxes.length > 0 ? `
                    <div class="nested-boxes">
                        ${box.boxes.map(nestedBox => renderBox(nestedBox, level + 1)).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function renderItem(item) {
    const profitLoss = item.profitLoss || 0;
    const profitClass = profitLoss > 0 ? 'profit-positive' : profitLoss < 0 ? 'profit-negative' : '';
    
    return `
        <div class="item-card" data-item-id="${item.id}">
            <div class="item-header">
                <div class="item-name">
                    <span>📌</span>
                    <span>${escapeHtml(item.name)}</span>
                </div>
                <div class="item-actions">
                    <button class="btn btn-secondary btn-edit-item" data-item-id="${item.id}">Edit</button>
                    <button class="btn btn-danger btn-delete-item" data-item-id="${item.id}">Delete</button>
                </div>
            </div>
            ${item.description ? `<div class="item-description">${escapeHtml(item.description)}</div>` : ''}
            ${(item.boughtAmount > 0 || item.soldAmount > 0) ? `
                <div class="item-financial">
                    ${item.boughtAmount > 0 ? `
                        <div class="financial-row">
                            <span class="financial-label">Bought</span>
                            <div class="financial-value">${item.boughtAmount} @ $${item.boughtPrice.toFixed(2)}</div>
                        </div>
                    ` : ''}
                    ${item.soldAmount > 0 ? `
                        <div class="financial-row">
                            <span class="financial-label">Sold</span>
                            <div class="financial-value">${item.soldAmount} @ avg $${item.averageSoldPrice.toFixed(2)}</div>
                        </div>
                    ` : ''}
                    ${profitLoss !== 0 ? `
                        <div class="financial-row">
                            <span class="financial-label">Profit/Loss</span>
                            <div class="financial-value ${profitClass}">
                                ${profitLoss > 0 ? '+' : ''}$${profitLoss.toFixed(2)}
                            </div>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
        </div>
    `;
}

function calculateBoxProfitLoss(box) {
    let total = 0;
    box.items.forEach(item => {
        total += item.profitLoss || 0;
    });
    box.boxes.forEach(nestedBox => {
        total += calculateBoxProfitLoss(nestedBox);
    });
    return total;
}

// Event Listeners
function attachBoxEventListeners() {
    // Toggle box content
    document.querySelectorAll('.box-header').forEach(header => {
        header.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                const boxItem = e.currentTarget.closest('.box-item');
                boxItem.classList.toggle('expanded');
            }
        });
    });
    
    // Add item buttons
    document.querySelectorAll('.btn-add-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const boxId = e.target.dataset.boxId;
            openItemModal(null, boxId);
        });
    });
    
    // Edit box buttons
    document.querySelectorAll('.btn-edit-box').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const boxId = e.target.dataset.boxId;
            await openBoxModal(boxId);
        });
    });
    
    // Delete box buttons
    document.querySelectorAll('.btn-delete-box').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const boxId = e.target.dataset.boxId;
            if (confirm('Are you sure you want to delete this box? All nested boxes and items will be deleted.')) {
                await deleteBox(boxId);
            }
        });
    });
    
    // Edit item buttons
    document.querySelectorAll('.btn-edit-item').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const itemId = e.target.dataset.itemId;
            await openItemModal(itemId);
        });
    });
    
    // Delete item buttons
    document.querySelectorAll('.btn-delete-item').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const itemId = e.target.dataset.itemId;
            if (confirm('Are you sure you want to delete this item?')) {
                await deleteItem(itemId);
            }
        });
    });
}

// Box CRUD Operations
async function createBox(name, description, parentBoxId) {
    try {
        await apiCall('/api/boxes', {
            method: 'POST',
            body: JSON.stringify({ name, description, parentBoxId })
        });
        await loadData();
    } catch (error) {
        throw error;
    }
}

async function updateBox(id, name, description) {
    try {
        await apiCall(`/api/boxes/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name, description })
        });
        await loadData();
    } catch (error) {
        throw error;
    }
}

async function deleteBox(id) {
    try {
        await apiCall(`/api/boxes/${id}`, {
            method: 'DELETE'
        });
        await loadData();
    } catch (error) {
        alert('Error deleting box: ' + error.message);
    }
}

// Item CRUD Operations
async function createItem(name, description, boxId, boughtAmount, boughtPrice, soldAmount, soldPrice) {
    try {
        const item = await apiCall('/api/items', {
            method: 'POST',
            body: JSON.stringify({ name, description, boxId })
        });
        
        // Update financial data if provided
        if (boughtAmount || boughtPrice || soldAmount || soldPrice) {
            await apiCall(`/api/items/${item.id}`, {
                method: 'PUT',
                body: JSON.stringify({ 
                    boughtAmount: parseFloat(boughtAmount) || 0,
                    boughtPrice: parseFloat(boughtPrice) || 0,
                    soldAmount: parseFloat(soldAmount) || 0,
                    soldPrice: parseFloat(soldPrice) || 0
                })
            });
        }
        
        await loadData();
    } catch (error) {
        throw error;
    }
}

async function updateItem(id, updates) {
    try {
        await apiCall(`/api/items/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
        await loadData();
    } catch (error) {
        throw error;
    }
}

async function deleteItem(id) {
    try {
        await apiCall(`/api/items/${id}`, {
            method: 'DELETE'
        });
        await loadData();
    } catch (error) {
        alert('Error deleting item: ' + error.message);
    }
}

// Search
async function search(query) {
    try {
        const results = await apiCall(`/api/search?q=${encodeURIComponent(query)}`);
        renderSearchResults(results);
    } catch (error) {
        alert('Error searching: ' + error.message);
    }
}

function renderSearchResults(results) {
    const container = document.getElementById('search-results-content');
    const hierarchyView = document.getElementById('hierarchy-view');
    const searchResults = document.getElementById('search-results');
    
    hierarchyView.style.display = 'none';
    searchResults.style.display = 'block';
    
    if (results.boxes.length === 0 && results.items.length === 0) {
        container.innerHTML = '<p>No results found.</p>';
        return;
    }
    
    let html = '';
    
    if (results.boxes.length > 0) {
        html += '<div class="search-section"><h3>Boxes</h3>';
        html += results.boxes.map(box => renderBox(box)).join('');
        html += '</div>';
    }
    
    if (results.items.length > 0) {
        html += '<div class="search-section"><h3>Items</h3>';
        html += '<div class="items-list">';
        html += results.items.map(item => renderItem(item)).join('');
        html += '</div></div>';
    }
    
    container.innerHTML = html;
    attachBoxEventListeners();
}

function clearSearch() {
    document.getElementById('search-input').value = '';
    document.getElementById('search-results').style.display = 'none';
    document.getElementById('hierarchy-view').style.display = 'block';
    currentBoxId = null;
    const treeNodes = document.querySelectorAll('.tree-node');
    if (treeNodes.length > 0) {
        treeNodes.forEach(n => n.classList.remove('selected'));
    }
}

// Modal Functions
async function openBoxModal(boxId = null) {
    const modal = document.getElementById('box-modal');
    const title = document.getElementById('box-modal-title');
    const form = document.getElementById('box-form');
    const errorDiv = document.getElementById('box-error');
    
    // Reset form
    form.reset();
    errorDiv.textContent = '';
    errorDiv.classList.remove('show');
    
    if (boxId) {
        // Edit mode
        title.textContent = 'Edit Box';
        try {
            const box = await apiCall(`/api/boxes/${boxId}`);
            document.getElementById('box-id').value = box.id;
            document.getElementById('box-name').value = box.name;
            document.getElementById('box-description').value = box.description || '';
        } catch (error) {
            alert('Error loading box: ' + error.message);
            return;
        }
    } else {
        // Create mode
        title.textContent = 'Create Box';
        document.getElementById('box-id').value = '';
    }
    
    // Populate parent box dropdown
    await populateBoxDropdown();
    
    modal.classList.add('show');
}

async function populateBoxDropdown() {
    const select = document.getElementById('box-parent');
    const currentBoxId = document.getElementById('box-id').value;
    
    try {
        const data = await apiCall('/api/boxes');
        select.innerHTML = '<option value="">-- Root Level --</option>';
        
        function addBoxOptions(boxes, level = 0) {
            boxes.forEach(box => {
                // Don't allow selecting the box being edited as its own parent
                if (box.id !== currentBoxId) {
                    const indent = '  '.repeat(level);
                    select.innerHTML += `<option value="${box.id}">${indent}${box.name}</option>`;
                    if (box.boxes && box.boxes.length > 0) {
                        addBoxOptions(box.boxes, level + 1);
                    }
                }
            });
        }
        
        addBoxOptions(data.rootBoxes);
    } catch (error) {
        console.error('Error loading boxes:', error);
    }
}

async function openItemModal(itemId = null, boxId = null) {
    const modal = document.getElementById('item-modal');
    const title = document.getElementById('item-modal-title');
    const form = document.getElementById('item-form');
    const errorDiv = document.getElementById('item-error');
    
    // Reset form
    form.reset();
    errorDiv.textContent = '';
    errorDiv.classList.remove('show');
    
    if (itemId) {
        // Edit mode
        title.textContent = 'Edit Item';
        try {
            const item = await apiCall(`/api/items/${itemId}`);
            document.getElementById('item-id').value = item.id;
            document.getElementById('item-name').value = item.name;
            document.getElementById('item-description').value = item.description || '';
            document.getElementById('item-bought-amount').value = item.boughtAmount || '';
            document.getElementById('item-bought-price').value = item.boughtPrice || '';
            document.getElementById('item-sold-amount').value = item.soldAmount || '';
            document.getElementById('item-sold-price').value = item.soldPrice || '';
        } catch (error) {
            alert('Error loading item: ' + error.message);
            return;
        }
    } else {
        // Create mode
        title.textContent = 'Create Item';
        document.getElementById('item-id').value = '';
        document.getElementById('item-box-id').value = boxId || '';
    }
    
    modal.classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// Utility
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Mobile Menu Functions
function openMobileMenu() {
    document.querySelector('.sidebar').classList.add('active');
    document.querySelector('.sidebar-overlay').classList.add('active');
    document.querySelector('.menu-toggle').classList.add('active');
}

function closeMobileMenu() {
    document.querySelector('.sidebar').classList.remove('active');
    document.querySelector('.sidebar-overlay').classList.remove('active');
    document.querySelector('.menu-toggle').classList.remove('active');
}

function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar.classList.contains('active')) {
        closeMobileMenu();
    } else {
        openMobileMenu();
    }
}

// Event Handlers
document.addEventListener('DOMContentLoaded', () => {
    // Mobile menu toggle
    document.getElementById('menu-toggle').addEventListener('click', toggleMobileMenu);
    
    // Close menu when clicking overlay
    document.querySelector('.sidebar-overlay').addEventListener('click', closeMobileMenu);
    
    // Auth tab switching
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            
            // Update active tab
            document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update active form
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            document.getElementById(`${tab}-form`).classList.add('active');
        });
    });
    
    // Login form
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorDiv = document.getElementById('login-error');
        errorDiv.textContent = '';
        errorDiv.classList.remove('show');
        
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        
        try {
            await login(username, password);
            showAppScreen();
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.classList.add('show');
        }
    });
    
    // Register form
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorDiv = document.getElementById('register-error');
        errorDiv.textContent = '';
        errorDiv.classList.remove('show');
        
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        
        try {
            await register(username, email, password);
            showAppScreen();
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.classList.add('show');
        }
    });
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    // Create box button
    document.getElementById('create-box-btn').addEventListener('click', () => openBoxModal());
    
    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', () => {
        clearSearch();
        loadData();
    });
    
    // Search
    document.getElementById('search-btn').addEventListener('click', () => {
        const query = document.getElementById('search-input').value.trim();
        if (query) {
            search(query);
        } else {
            clearSearch();
            loadData();
        }
    });
    
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('search-btn').click();
        }
    });
    
    // Box form
    document.getElementById('box-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorDiv = document.getElementById('box-error');
        errorDiv.textContent = '';
        errorDiv.classList.remove('show');
        
        const id = document.getElementById('box-id').value;
        const name = document.getElementById('box-name').value;
        const description = document.getElementById('box-description').value;
        const parentBoxId = document.getElementById('box-parent').value;
        
        try {
            if (id) {
                await updateBox(id, name, description);
            } else {
                await createBox(name, description, parentBoxId || null);
            }
            closeModal('box-modal');
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.classList.add('show');
        }
    });
    
    // Item form
    document.getElementById('item-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorDiv = document.getElementById('item-error');
        errorDiv.textContent = '';
        errorDiv.classList.remove('show');
        
        const id = document.getElementById('item-id').value;
        const name = document.getElementById('item-name').value;
        const description = document.getElementById('item-description').value;
        const boxId = document.getElementById('item-box-id').value;
        const boughtAmount = document.getElementById('item-bought-amount').value;
        const boughtPrice = document.getElementById('item-bought-price').value;
        const soldAmount = document.getElementById('item-sold-amount').value;
        const soldPrice = document.getElementById('item-sold-price').value;
        
        try {
            if (id) {
                await updateItem(id, {
                    name,
                    description,
                    boughtAmount: parseFloat(boughtAmount) || 0,
                    boughtPrice: parseFloat(boughtPrice) || 0,
                    soldAmount: parseFloat(soldAmount) || 0,
                    soldPrice: parseFloat(soldPrice) || 0
                });
            } else {
                await createItem(name, description, boxId, boughtAmount, boughtPrice, soldAmount, soldPrice);
            }
            closeModal('item-modal');
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.classList.add('show');
        }
    });
    
    // Modal close buttons
    document.querySelectorAll('.close, .close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.classList.remove('show');
            }
        });
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
        }
    });
    
    // Check if user is already logged in
    if (authToken) {
        apiCall('/api/auth/me')
            .then(user => {
                currentUser = user;
                showAppScreen();
            })
            .catch(() => {
                logout();
            });
    } else {
        showAuthScreen();
    }
});
