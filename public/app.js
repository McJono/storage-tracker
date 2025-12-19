// API Configuration
const API_BASE = window.location.origin;
let authToken = localStorage.getItem('authToken');
let currentUser = null;
let currentBoxId = localStorage.getItem('currentBoxId'); // Track selected box in folder tree

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

// Helper function for pluralization
function pluralize(count, singular, plural) {
    return count !== 1 ? plural : singular;
}

// Helper function to refresh current view after data changes
async function refreshCurrentView() {
    const data = await apiCall('/api/boxes');
    renderFolderTree(data.rootBoxes);
    if (currentBoxId) {
        await displayBox(currentBoxId);
    } else {
        renderHierarchy(data.rootBoxes);
    }
    await loadStats();
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

async function requestMagicLink(email) {
    const data = await apiCall('/api/auth/request-magic-link', {
        method: 'POST',
        body: JSON.stringify({ email })
    });
    
    return data;
}

async function verifyMagicLink(token) {
    const data = await apiCall('/api/auth/verify-magic-link', {
        method: 'POST',
        body: JSON.stringify({ token })
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
    currentBoxId = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentBoxId');
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
    loadShares(); // Load family sharing data
}

// Data Loading
async function loadData() {
    try {
        const data = await apiCall('/api/boxes');
        renderFolderTree(data.rootBoxes);
        
        // Restore the last viewed box if it exists
        if (currentBoxId) {
            try {
                await displayBox(currentBoxId);
                // Highlight the selected box in the tree
                const selectedNode = document.querySelector(`.tree-node[data-box-id="${currentBoxId}"]`);
                if (selectedNode) {
                    selectedNode.classList.add('selected');
                }
            } catch (error) {
                // If the box no longer exists, clear the selection and show hierarchy
                console.warn('Saved box no longer exists, clearing selection');
                currentBoxId = null;
                localStorage.removeItem('currentBoxId');
                renderHierarchy(data.rootBoxes);
            }
        } else {
            renderHierarchy(data.rootBoxes);
        }
        
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
    
    // Store expanded state before re-rendering
    const expandedBoxes = new Set();
    document.querySelectorAll('.tree-item.expanded').forEach(item => {
        expandedBoxes.add(item.dataset.boxId);
    });
    
    container.innerHTML = boxes.map(box => renderTreeNode(box)).join('');
    
    // Restore expanded state after re-rendering
    expandedBoxes.forEach(boxId => {
        const treeItem = container.querySelector(`.tree-item[data-box-id="${boxId}"]`);
        if (treeItem) {
            treeItem.classList.add('expanded');
            const toggle = treeItem.querySelector('.tree-toggle');
            if (toggle && !toggle.classList.contains('empty')) {
                toggle.textContent = '▼';
            }
        }
    });
    
    // Attach event listeners
    attachTreeEventListeners();
}

function renderTreeNode(box) {
    const hasChildren = box.boxes && box.boxes.length > 0;
    const itemCount = box.items ? box.items.length : 0;
    const nestedBoxCount = box.boxes ? box.boxes.length : 0;
    const isSelected = currentBoxId === box.id;
    
    // Build count display: show items and nested boxes
    let countDisplay = '';
    if (itemCount > 0 || nestedBoxCount > 0) {
        const parts = [];
        if (itemCount > 0) {
            parts.push(`${itemCount} ${pluralize(itemCount, 'item', 'items')}`);
        }
        if (nestedBoxCount > 0) {
            parts.push(`${nestedBoxCount} ${pluralize(nestedBoxCount, 'box', 'boxes')}`);
        }
        countDisplay = parts.join(', ');
    }
    
    return `
        <div class="tree-item" data-box-id="${box.id}">
            <div class="tree-node ${isSelected ? 'selected' : ''}" data-box-id="${box.id}">
                <span class="tree-toggle ${hasChildren ? '' : 'empty'}">▶</span>
                <span class="tree-icon">📦</span>
                <span class="tree-label">${escapeHtml(box.name)}</span>
                ${countDisplay ? `<span class="tree-count">${countDisplay}</span>` : ''}
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
            
            // Clear search if active
            const searchResults = document.getElementById('search-results');
            if (searchResults.style.display !== 'none') {
                document.getElementById('search-input').value = '';
                searchResults.style.display = 'none';
                document.getElementById('hierarchy-view').style.display = 'block';
                hideSuggestions();
            }
            
            // Update selected state
            document.querySelectorAll('.tree-node').forEach(n => n.classList.remove('selected'));
            e.currentTarget.classList.add('selected');
            currentBoxId = boxId;
            localStorage.setItem('currentBoxId', boxId);
            
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
    
    // Build the info tags for items and nested boxes
    let infoTags = '';
    if (box.items.length > 0) {
        infoTags += `<small style="color: #999;">(${box.items.length} ${pluralize(box.items.length, 'item', 'items')})</small>`;
    }
    if (box.boxes.length > 0) {
        infoTags += `<small style="color: #999;">(${box.boxes.length} ${pluralize(box.boxes.length, 'box', 'boxes')})</small>`;
    }
    
    return `
        <div class="box-item" data-box-id="${box.id}">
            <div class="box-header">
                <div>
                    <div class="box-title">
                        <span>📦</span>
                        <span>${escapeHtml(box.name)}</span>
                        ${infoTags}
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
                    <span>${item.amount > 0 ? `${item.amount} × ` : ''}${escapeHtml(item.name)}</span>
                </div>
                <div class="item-actions">
                    <button class="btn btn-success btn-increment-item" data-item-id="${item.id}" title="Add items">+</button>
                    <button class="btn btn-warning btn-decrement-item" data-item-id="${item.id}" title="Remove items">−</button>
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

// Family Sharing Functions
async function loadShares() {
    try {
        const shares = await apiCall('/api/shares');
        displayShares(shares);
        updateSharingSummary(shares);
    } catch (error) {
        console.error('Error loading shares:', error);
    }
}

function displayShares(shares) {
    // Display pending invitations
    const pendingSection = document.getElementById('pending-invitations-section');
    const pendingList = document.getElementById('pending-invitations-list');
    
    if (shares.pending && shares.pending.length > 0) {
        pendingSection.style.display = 'block';
        pendingList.innerHTML = shares.pending.map(share => `
            <div class="sharing-item">
                <div class="sharing-item-info">
                    <div class="sharing-item-email">${share.ownerEmail || share.ownerUsername}</div>
                    <div class="sharing-item-status pending">Pending invitation</div>
                </div>
                <div class="sharing-item-actions">
                    <button class="btn btn-small btn-accept" onclick="acceptShare('${share.id}')">Accept</button>
                    <button class="btn btn-small btn-reject" onclick="rejectShare('${share.id}')">Reject</button>
                </div>
            </div>
        `).join('');
    } else {
        pendingSection.style.display = 'none';
    }
    
    // Display outgoing shares (people you're sharing with)
    const sharedWithList = document.getElementById('shared-with-list');
    if (shares.outgoing && shares.outgoing.length > 0) {
        sharedWithList.innerHTML = shares.outgoing.map(share => {
            const statusText = share.status === 'pending' ? 'Invitation sent' : 'Active';
            const statusClass = share.status === 'pending' ? 'pending' : 'accepted';
            return `
                <div class="sharing-item">
                    <div class="sharing-item-info">
                        <div class="sharing-item-email">${share.sharedWithEmail}</div>
                        <div class="sharing-item-status ${statusClass}">${statusText}</div>
                    </div>
                    <div class="sharing-item-actions">
                        <button class="btn btn-small btn-remove" onclick="removeShare('${share.id}')">Remove</button>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        sharedWithList.innerHTML = '<p class="empty-sharing">You haven\'t shared your account with anyone yet.</p>';
    }
    
    // Display incoming shares (accounts you're sharing from)
    const sharedFromSection = document.getElementById('shared-from-section');
    const sharedFromList = document.getElementById('shared-from-list');
    
    if (shares.incoming && shares.incoming.length > 0) {
        sharedFromSection.style.display = 'block';
        sharedFromList.innerHTML = shares.incoming.map(share => `
            <div class="sharing-item">
                <div class="sharing-item-info">
                    <div class="sharing-item-email">${share.ownerEmail || share.ownerUsername}</div>
                    <div class="sharing-item-status accepted">Sharing this account</div>
                </div>
                <div class="sharing-item-actions">
                    <button class="btn btn-small btn-remove" onclick="removeShare('${share.id}')">Stop Sharing</button>
                </div>
            </div>
        `).join('');
    } else {
        sharedFromSection.style.display = 'none';
    }
}

function updateSharingSummary(shares) {
    const sharingContent = document.getElementById('family-sharing-content');
    const totalSharing = (shares.outgoing?.length || 0) + (shares.incoming?.length || 0);
    const pendingCount = shares.pending?.length || 0;
    
    if (totalSharing > 0 || pendingCount > 0) {
        let summaryText = '';
        if (shares.incoming && shares.incoming.length > 0) {
            summaryText = `Sharing from: ${shares.incoming[0].ownerEmail}`;
        } else if (shares.outgoing && shares.outgoing.length > 0) {
            summaryText = `Sharing with ${shares.outgoing.length} ${shares.outgoing.length === 1 ? 'person' : 'people'}`;
        }
        
        sharingContent.innerHTML = `
            <div style="font-size: 0.875rem; margin-bottom: 0.5rem;">${summaryText}</div>
            ${pendingCount > 0 ? `<div style="font-size: 0.875rem; color: #f39c12; margin-bottom: 0.5rem;">${pendingCount} pending ${pendingCount === 1 ? 'invitation' : 'invitations'}</div>` : ''}
            <button id="manage-sharing-btn" class="btn btn-secondary btn-full">Manage Sharing</button>
        `;
    } else {
        sharingContent.innerHTML = '<button id="manage-sharing-btn" class="btn btn-secondary btn-full">Manage Sharing</button>';
    }
    
    // Re-attach event listener
    document.getElementById('manage-sharing-btn').addEventListener('click', openSharingModal);
}

async function createShare(email) {
    try {
        const share = await apiCall('/api/shares', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
        
        document.getElementById('share-success').textContent = 'Invitation sent successfully!';
        document.getElementById('share-success').classList.add('show');
        document.getElementById('share-error').textContent = '';
        document.getElementById('share-email').value = '';
        
        setTimeout(() => {
            document.getElementById('share-success').classList.remove('show');
        }, 3000);
        
        await loadShares();
    } catch (error) {
        document.getElementById('share-error').textContent = error.message;
        document.getElementById('share-success').classList.remove('show');
    }
}

async function acceptShare(shareId) {
    try {
        await apiCall(`/api/shares/${shareId}/accept`, {
            method: 'POST'
        });
        
        await loadShares();
        await loadData(); // Reload data as we now have access to shared storage
        alert('Share accepted! You now have access to the shared storage.');
    } catch (error) {
        alert('Error accepting share: ' + error.message);
    }
}

async function rejectShare(shareId) {
    try {
        await apiCall(`/api/shares/${shareId}/reject`, {
            method: 'POST'
        });
        
        await loadShares();
        alert('Share rejected.');
    } catch (error) {
        alert('Error rejecting share: ' + error.message);
    }
}

async function removeShare(shareId) {
    if (!confirm('Are you sure you want to remove this share? This action cannot be undone.')) {
        return;
    }
    
    try {
        await apiCall(`/api/shares/${shareId}`, {
            method: 'DELETE'
        });
        
        await loadShares();
        await loadData(); // Reload data as storage access may have changed
        alert('Share removed successfully.');
    } catch (error) {
        alert('Error removing share: ' + error.message);
    }
}

function openSharingModal() {
    loadShares();
    document.getElementById('sharing-modal').classList.add('show');
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
    
    // Increment item buttons
    document.querySelectorAll('.btn-increment-item').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const itemId = e.target.dataset.itemId;
            openTransactionModal(itemId, 'buy');
        });
    });
    
    // Decrement item buttons
    document.querySelectorAll('.btn-decrement-item').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const itemId = e.target.dataset.itemId;
            openTransactionModal(itemId, 'sell');
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
        
        await refreshCurrentView();
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
        
        await refreshCurrentView();
    } catch (error) {
        throw error;
    }
}

async function deleteBox(id) {
    try {
        await apiCall(`/api/boxes/${id}`, {
            method: 'DELETE'
        });
        
        // If we deleted the current box, clear selection
        if (currentBoxId === id) {
            currentBoxId = null;
            localStorage.removeItem('currentBoxId');
        }
        
        await refreshCurrentView();
    } catch (error) {
        alert('Error deleting box: ' + error.message);
    }
}

// Item CRUD Operations
async function createItem(name, description, boxId, amount, boughtAmount, boughtPrice, soldAmount, soldPrice) {
    try {
        const item = await apiCall('/api/items', {
            method: 'POST',
            body: JSON.stringify({ name, description, boxId })
        });
        
        // Update financial data if provided
        const hasFinancialData = amount !== '' || boughtAmount !== '' || boughtPrice !== '' || soldAmount !== '' || soldPrice !== '';
        if (hasFinancialData) {
            await apiCall(`/api/items/${item.id}`, {
                method: 'PUT',
                body: JSON.stringify({ 
                    amount: parseFloat(amount) || 0,
                    boughtAmount: parseFloat(boughtAmount) || 0,
                    boughtPrice: parseFloat(boughtPrice) || 0,
                    soldAmount: parseFloat(soldAmount) || 0,
                    soldPrice: parseFloat(soldPrice) || 0
                })
            });
        }
        
        // Set the current box to the one we just added an item to
        currentBoxId = boxId;
        localStorage.setItem('currentBoxId', boxId);
        
        // Refresh view to show the new item in the current box
        await refreshCurrentView();
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
        
        // Refresh view after updating item
        if (currentBoxId) {
            await refreshCurrentView();
        } else {
            await loadData();
        }
    } catch (error) {
        throw error;
    }
}

async function deleteItem(id) {
    try {
        await apiCall(`/api/items/${id}`, {
            method: 'DELETE'
        });
        
        await refreshCurrentView();
    } catch (error) {
        alert('Error deleting item: ' + error.message);
    }
}

// Search
let searchTimeout = null;
let currentSuggestionIndex = -1;

async function search(query) {
    try {
        const results = await apiCall(`/api/search?q=${encodeURIComponent(query)}`);
        renderSearchResults(results);
        hideSuggestions();
    } catch (error) {
        alert('Error searching: ' + error.message);
    }
}

async function showSuggestions(query) {
    if (!query || query.length < 1) {
        hideSuggestions();
        return;
    }

    try {
        const results = await apiCall(`/api/search?q=${encodeURIComponent(query)}`);
        renderSuggestions(results);
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        hideSuggestions();
    }
}

function renderSuggestions(results) {
    const container = document.getElementById('search-suggestions');
    currentSuggestionIndex = -1;
    
    if (results.boxes.length === 0 && results.items.length === 0) {
        container.innerHTML = '<div class="no-suggestions">No results found</div>';
        container.classList.add('show');
        return;
    }
    
    let html = '';
    
    // Limit to first 5 boxes and 5 items for suggestions
    const boxes = results.boxes.slice(0, 5);
    const items = results.items.slice(0, 5);
    
    boxes.forEach(box => {
        const pathStr = box.path.length > 0 
            ? box.path.map(p => p.name).join(' > ')
            : 'Root';
        html += `
            <div class="suggestion-item" data-type="box" data-id="${box.id}">
                <div>
                    <span class="suggestion-type box">Box</span>
                    <span class="suggestion-name">📦 ${escapeHtml(box.name)}</span>
                </div>
                ${box.path.length > 0 ? `<div class="suggestion-path">${escapeHtml(pathStr)}</div>` : ''}
            </div>
        `;
    });
    
    items.forEach(item => {
        const pathStr = item.path.map(p => p.name).join(' > ');
        html += `
            <div class="suggestion-item" data-type="item" data-id="${item.id}">
                <div>
                    <span class="suggestion-type item">Item</span>
                    <span class="suggestion-name">📌 ${escapeHtml(item.name)}</span>
                </div>
                <div class="suggestion-path">${escapeHtml(pathStr)}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    container.classList.add('show');
}

function hideSuggestions() {
    const container = document.getElementById('search-suggestions');
    container.classList.remove('show');
    currentSuggestionIndex = -1;
}

function navigateSuggestions(direction) {
    const container = document.getElementById('search-suggestions');
    const items = container.querySelectorAll('.suggestion-item');
    
    if (items.length === 0) return;
    
    // Remove current selection
    if (currentSuggestionIndex >= 0 && currentSuggestionIndex < items.length) {
        items[currentSuggestionIndex].classList.remove('selected');
    }
    
    // Update index
    if (direction === 'down') {
        currentSuggestionIndex = (currentSuggestionIndex + 1) % items.length;
    } else if (direction === 'up') {
        currentSuggestionIndex = currentSuggestionIndex <= 0 ? items.length - 1 : currentSuggestionIndex - 1;
    }
    
    // Add new selection
    items[currentSuggestionIndex].classList.add('selected');
    items[currentSuggestionIndex].scrollIntoView({ block: 'nearest' });
}

function selectCurrentSuggestion() {
    const container = document.getElementById('search-suggestions');
    const items = container.querySelectorAll('.suggestion-item');
    
    if (currentSuggestionIndex >= 0 && currentSuggestionIndex < items.length) {
        items[currentSuggestionIndex].click();
        return true;
    }
    return false;
}

function renderPathBreadcrumb(path) {
    if (!path || path.length === 0) {
        return '<div class="result-path">📍 Root</div>';
    }
    
    const pathParts = path.map((p, index) => 
        `<span class="result-path-part clickable" data-box-id="${p.id}">${escapeHtml(p.name)}</span>`
    ).join('<span class="result-path-separator">›</span>');
    
    return `<div class="result-path">📍 ${pathParts}</div>`;
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
        results.boxes.forEach(box => {
            html += '<div class="search-result-item">';
            html += renderPathBreadcrumb(box.path);
            html += renderBox(box);
            html += '</div>';
        });
        html += '</div>';
    }
    
    if (results.items.length > 0) {
        html += '<div class="search-section"><h3>Items</h3>';
        results.items.forEach(item => {
            html += '<div class="search-result-item">';
            html += renderPathBreadcrumb(item.path);
            html += '<div class="items-list">';
            html += renderItem(item);
            html += '</div>';
            html += '</div>';
        });
        html += '</div>';
    }
    
    container.innerHTML = html;
    attachBoxEventListeners();
    attachBreadcrumbListeners();
}

function attachBreadcrumbListeners() {
    // Attach click listeners to breadcrumb path parts
    document.querySelectorAll('.result-path-part.clickable').forEach(part => {
        part.addEventListener('click', async (e) => {
            e.stopPropagation();
            const boxId = e.currentTarget.dataset.boxId;
            
            // Clear search and navigate to the box
            clearSearch();
            
            // Update selected state in tree
            document.querySelectorAll('.tree-node').forEach(n => n.classList.remove('selected'));
            const selectedNode = document.querySelector(`.tree-node[data-box-id="${boxId}"]`);
            if (selectedNode) {
                selectedNode.classList.add('selected');
            }
            
            currentBoxId = boxId;
            localStorage.setItem('currentBoxId', boxId);
            
            // Load and display the selected box
            await displayBox(boxId);
        });
    });
}

function clearSearch() {
    document.getElementById('search-input').value = '';
    document.getElementById('search-results').style.display = 'none';
    document.getElementById('hierarchy-view').style.display = 'block';
    hideSuggestions();
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

async function openTransactionModal(itemId, type) {
    const modal = document.getElementById('transaction-modal');
    const title = document.getElementById('transaction-modal-title');
    const form = document.getElementById('transaction-form');
    const errorDiv = document.getElementById('transaction-error');
    
    // Reset form
    form.reset();
    errorDiv.textContent = '';
    errorDiv.classList.remove('show');
    
    // Set transaction type
    document.getElementById('transaction-item-id').value = itemId;
    document.getElementById('transaction-type').value = type;
    
    // Set modal title
    if (type === 'buy') {
        title.textContent = 'Add Items (Purchase)';
    } else {
        title.textContent = 'Remove Items (Sell)';
    }
    
    modal.classList.add('show');
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
            document.getElementById('item-amount').value = item.amount || '';
            document.getElementById('item-bought-amount').value = item.boughtAmount || '';
            document.getElementById('item-bought-price').value = item.boughtPrice || '';
            document.getElementById('item-sold-amount').value = item.soldAmount || '';
            document.getElementById('item-sold-price').value = item.soldPrice || '';
            // Set the box ID to the current box we're viewing
            document.getElementById('item-box-id').value = currentBoxId || '';
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
    
    // Magic Link form (Passwordless login)
    document.getElementById('magic-link-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorDiv = document.getElementById('magic-link-error');
        const messageDiv = document.getElementById('magic-link-message');
        errorDiv.textContent = '';
        errorDiv.classList.remove('show');
        messageDiv.textContent = '';
        messageDiv.classList.remove('show');
        
        const email = document.getElementById('magic-link-email').value;
        
        try {
            const result = await requestMagicLink(email);
            messageDiv.textContent = result.message || 'Magic link sent! Check your email to log in.';
            messageDiv.classList.add('show');
            document.getElementById('magic-link-email').value = '';
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.classList.add('show');
        }
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
    
    // Register form - removed because register form no longer exists in HTML
    // Registration is available via the API endpoint /api/auth/register if needed
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    // Create box button
    document.getElementById('create-box-btn').addEventListener('click', () => openBoxModal());
    
    // Manage sharing button (initialized later after loading shares)
    document.getElementById('manage-sharing-btn').addEventListener('click', openSharingModal);
    
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
    
    // Search input with autocomplete
    document.getElementById('search-input').addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        // Clear any pending search timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        // Debounce the search - wait 300ms after user stops typing
        if (query) {
            searchTimeout = setTimeout(() => {
                showSuggestions(query);
            }, 300);
        } else {
            hideSuggestions();
        }
    });
    
    document.getElementById('search-input').addEventListener('keydown', (e) => {
        const suggestionsVisible = document.getElementById('search-suggestions').classList.contains('show');
        
        if (e.key === 'Enter') {
            e.preventDefault();
            if (suggestionsVisible && !selectCurrentSuggestion()) {
                document.getElementById('search-btn').click();
            } else if (!suggestionsVisible) {
                document.getElementById('search-btn').click();
            }
        } else if (e.key === 'ArrowDown' && suggestionsVisible) {
            e.preventDefault();
            navigateSuggestions('down');
        } else if (e.key === 'ArrowUp' && suggestionsVisible) {
            e.preventDefault();
            navigateSuggestions('up');
        } else if (e.key === 'Escape') {
            hideSuggestions();
        }
    });
    
    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        const searchContainer = document.querySelector('.search-container');
        if (searchContainer && !searchContainer.contains(e.target)) {
            hideSuggestions();
        }
    });
    
    // Handle suggestion item clicks with event delegation
    document.getElementById('search-suggestions').addEventListener('click', (e) => {
        const suggestionItem = e.target.closest('.suggestion-item');
        if (suggestionItem) {
            const query = document.getElementById('search-input').value;
            search(query);
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
        const amount = document.getElementById('item-amount').value;
        const boughtAmount = document.getElementById('item-bought-amount').value;
        const boughtPrice = document.getElementById('item-bought-price').value;
        const soldAmount = document.getElementById('item-sold-amount').value;
        const soldPrice = document.getElementById('item-sold-price').value;
        
        try {
            if (id) {
                // When editing, ensure currentBoxId is set if we have a boxId
                if (boxId && !currentBoxId) {
                    currentBoxId = boxId;
                    localStorage.setItem('currentBoxId', boxId);
                }
                await updateItem(id, {
                    name,
                    description,
                    amount: parseFloat(amount) || 0,
                    boughtAmount: parseFloat(boughtAmount) || 0,
                    boughtPrice: parseFloat(boughtPrice) || 0,
                    soldAmount: parseFloat(soldAmount) || 0,
                    soldPrice: parseFloat(soldPrice) || 0
                });
            } else {
                await createItem(name, description, boxId, amount, boughtAmount, boughtPrice, soldAmount, soldPrice);
            }
            closeModal('item-modal');
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.classList.add('show');
        }
    });
    
    // Transaction form handler (for +/- buttons)
    document.getElementById('transaction-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorDiv = document.getElementById('transaction-error');
        errorDiv.textContent = '';
        errorDiv.classList.remove('show');
        
        const itemId = document.getElementById('transaction-item-id').value;
        const type = document.getElementById('transaction-type').value;
        const quantity = parseFloat(document.getElementById('transaction-quantity').value);
        const price = parseFloat(document.getElementById('transaction-price').value);
        
        if (!quantity || quantity <= 0) {
            errorDiv.textContent = 'Please enter a valid quantity';
            errorDiv.classList.add('show');
            return;
        }
        
        if (!price || price < 0) {
            errorDiv.textContent = 'Please enter a valid price';
            errorDiv.classList.add('show');
            return;
        }
        
        try {
            // Get current item data
            const item = await apiCall(`/api/items/${itemId}`);
            
            let updates;
            if (type === 'buy') {
                // Adding items (purchase) - calculate weighted average price
                const totalBought = item.boughtAmount + quantity;
                const newBoughtPrice = ((item.boughtAmount * (item.boughtPrice || 0)) + (quantity * price)) / totalBought;
                    
                updates = {
                    amount: item.amount + quantity,
                    boughtAmount: totalBought,
                    boughtPrice: newBoughtPrice
                };
            } else {
                // Removing items (sell)
                if (quantity > item.amount) {
                    errorDiv.textContent = `Cannot sell ${quantity} items. Only ${item.amount} available.`;
                    errorDiv.classList.add('show');
                    return;
                }
                // Note: soldPrice stores total revenue, average is calculated when displayed
                updates = {
                    amount: Math.max(0, item.amount - quantity),
                    soldAmount: item.soldAmount + quantity,
                    soldPrice: item.soldPrice + (quantity * price)
                };
            }
            
            await updateItem(itemId, updates);
            closeModal('transaction-modal');
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.classList.add('show');
        }
    });
    
    // Share form handler
    document.getElementById('share-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('share-email').value;
        await createShare(email);
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
    
    // Check for magic link token in URL hash
    const hash = window.location.hash;
    if (hash && hash.startsWith('#token=')) {
        const token = decodeURIComponent(hash.substring(7));
        window.location.hash = ''; // Clear the hash
        
        // Verify the magic link token
        verifyMagicLink(token)
            .then(() => {
                showAppScreen();
            })
            .catch((error) => {
                alert('Login failed: ' + error.message);
                showAuthScreen();
            });
        return; // Skip normal auth check
    }
    
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
