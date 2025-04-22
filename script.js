if (typeof firebase === 'undefined') {
  console.error('Firebase SDK failed to load. Please check your network connection or try again later.');
  document.body.innerHTML = '<h1 style="color: red; text-align: center;">Error: Firebase SDK failed to load. Please check your network connection or try again later.</h1>';
  throw new Error('Firebase SDK not loaded');
}

// Firebase Configuration and Initialization
const firebaseConfig = {
  apiKey: "AIzaSyC6EYRjYpo5jNwJAs3CaeUnp67iV9u2L1k",
  authDomain: "balatro-calculator.firebaseapp.com",
  databaseURL: "https://balatro-calculator-default-rtdb.firebaseio.com",
  projectId: "balatro-calculator",
  storageBucket: "balatro-calculator.firebasestorage.app",
  messagingSenderId: "410524174929",
  appId: "1:410524174929:web:d815d55a092de201b68670",
  measurementId: "G-4GTLGCB0K4"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Cache for preloaded data
let cachedUserFavorites = null;
let cachedFavoritesOrder = null;
let cachedPublicUsers = null;

// Navigation logic
const navLinks = document.querySelectorAll('.nav-link');
const pages = document.querySelectorAll('.page');

function navigateToPage(pageId) {
  pages.forEach(page => page.classList.remove('active'));
  navLinks.forEach(link => link.classList.remove('active'));

  document.getElementById(pageId).classList.add('active');
  document.querySelector(`[data-page="${pageId}"]`).classList.add('active');

  if (pageId === 'favorites') {
    loadFavorites();
  }
}

navLinks.forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    const pageId = this.getAttribute('data-page');
    navigateToPage(pageId);
  });
});

// Set initial page
const initialPage = window.location.hash.substring(1) || 'collection';
navigateToPage(initialPage);

// Authentication functionality
const authButtons = document.querySelector('.auth-buttons');
let currentUser = null;

function updateAuthUI(user, username) {
  if (user) {
    const displayName = username || 'User';
    authButtons.innerHTML = `
      <span class="welcome-message">Welcome, ${displayName}!</span>
      <button id="logoutBtn" class="auth-btn">Logout</button>
    `;
    document.getElementById('logoutBtn').addEventListener('click', logout);
  } else {
    authButtons.innerHTML = `
      <button id="loginBtn" class="auth-btn">Login</button>
      <button id="signupBtn" class="auth-btn">Sign Up</button>
    `;
    document.getElementById('loginBtn').addEventListener('click', showLoginModal);
    document.getElementById('signupBtn').addEventListener('click', showSignupModal);
  }
}

function showLoginModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';
  modalContent.innerHTML = `
    <div class="auth-modal">
      <h2>Login</h2>
      <div class="auth-group">
        <label>Username:</label>
        <input type="text" id="loginUsername" placeholder="Enter username">
      </div>
      <div class="auth-group">
        <label>Password:</label>
        <input type="password" id="loginPassword" placeholder="Enter password">
      </div>
      <div id="loginError" class="error-message"></div>
      <button id="submitLogin" class="auth-submit-btn">Login</button>
    </div>
  `;

  overlay.appendChild(modalContent);
  document.body.appendChild(overlay);

  overlay.style.display = 'block';

  document.getElementById('submitLogin').addEventListener('click', handleLogin);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });
}

function showSignupModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';
  modalContent.innerHTML = `
    <div class="auth-modal">
      <h2>Sign Up</h2>
      <div class="auth-group">
        <label>Username:</label>
        <input type="text" id="signupUsername" placeholder="Enter username">
      </div>
      <div class="auth-group">
        <label>Email:</label>
        <input type="email" id="signupEmail" placeholder="Enter email">
      </div>
      <div class="auth-group">
        <label>Password:</label>
        <input type="password" id="signupPassword" placeholder="Enter password">
      </div>
      <div class="auth-group">
        <label>Confirm Password:</label>
        <input type="password" id="confirmPassword" placeholder="Confirm password">
      </div>
      <div id="signupError" class="error-message"></div>
      <button id="submitSignup" class="auth-submit-btn">Sign Up</button>
    </div>
  `;

  overlay.appendChild(modalContent);
  document.body.appendChild(overlay);

  overlay.style.display = 'block';

  document.getElementById('submitSignup').addEventListener('click', handleSignup);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });
}

async function handleLogin() {
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  const errorDiv = document.getElementById('loginError');

  if (!username || !password) {
    errorDiv.textContent = 'Please fill in all fields';
    return;
  }

  try {
    // Find user by username
    const usersRef = firebase.database().ref('users');
    const snapshot = await usersRef.orderByChild('username').equalTo(username).once('value');
    const users = snapshot.val();

    if (!users) {
      errorDiv.textContent = 'Username not found';
      return;
    }

    const userId = Object.keys(users)[0];
    const userData = users[userId];
    const email = userData.email;

    if (!email) {
      errorDiv.textContent = 'No email associated with this username';
      return;
    }

    await firebase.auth().signInWithEmailAndPassword(email, password);
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) overlay.remove();
  } catch (error) {
    console.error('Login error:', error);
    errorDiv.textContent = error.message || 'An error occurred during login';
  }
}

async function handleSignup() {
  const username = document.getElementById('signupUsername').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const errorDiv = document.getElementById('signupError');

  if (!username || !email || !password || !confirmPassword) {
    errorDiv.textContent = 'Please fill in all fields';
    return;
  }

  if (password !== confirmPassword) {
    errorDiv.textContent = 'Passwords do not match';
    return;
  }

  try {
    // Check if username already exists
    const usersRef = firebase.database().ref('users');
    const snapshot = await usersRef.orderByChild('username').equalTo(username).once('value');
    if (snapshot.exists()) {
      errorDiv.textContent = 'Username already taken';
      return;
    }

    // Proceed with signup
    const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    await firebase.database().ref('users/' + user.uid).set({
      username: username,
      email: email,
      favoritesPublic: false
    });

    const overlay = document.querySelector('.modal-overlay');
    if (overlay) overlay.remove();
  } catch (error) {
    console.error('Signup error:', error);
    errorDiv.textContent = error.message || 'An error occurred during signup';
  }
}

function logout() {
  firebase.auth().signOut().then(() => {
    updateAuthUI(null, null);
    cachedUserFavorites = null;
    cachedFavoritesOrder = null;
    cachedPublicUsers = null;
    loadFavorites();
  }).catch((error) => {
    console.error('Logout error:', error);
  });
}

// Preload user favorites on auth state change
firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    try {
      const snapshot = await firebase.database().ref('users/' + user.uid).once('value');
      const userData = snapshot.val();
      const username = userData ? userData.username : null;
      updateAuthUI(user, username);
      currentUser = user;

      // Preload user favorites and order
      const favoritesRef = firebase.database().ref(`users/${user.uid}/favorites`);
      const orderRef = firebase.database().ref(`users/${user.uid}/favoritesOrder`);
      const [favoritesSnapshot, orderSnapshot] = await Promise.all([
        favoritesRef.once('value'),
        orderRef.once('value')
      ]);
      cachedUserFavorites = favoritesSnapshot.val();
      cachedFavoritesOrder = orderSnapshot.val() || [];
      loadFavorites();
    } catch (error) {
      console.error('Error fetching user data:', error);
      updateAuthUI(user, null);
      currentUser = user;
      loadFavorites();
    }
  } else {
    updateAuthUI(null, null);
    currentUser = null;
    cachedUserFavorites = null;
    cachedFavoritesOrder = null;
    cachedPublicUsers = null;
    loadFavorites();
  }
});

let jokersData = [];
let currentSort = 'cost-asc';
let currentSearch = '';

function loadJokersData() {
  fetch('https://balatro-calculator-default-rtdb.firebaseio.com/jokers.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data) {
        jokersData = Object.values(data);
        updateDisplay();
      } else {
        console.error('No jokers data found in the response');
        document.getElementById('jokers-gallery').innerHTML = '<p>No jokers data available.</p>';
      }
    })
    .catch(error => {
      console.error('Error loading jokers:', error.message);
      document.getElementById('jokers-gallery').innerHTML = `<p>Error loading jokers: ${error.message}</p>`;
    });
}

// Load joker data immediately on page load
loadJokersData();

function sortJokers(jokers, sortBy) {
  const rarityOrder = {
    'Common': 1,
    'Uncommon': 2,
    'Rare': 3,
    'Legendary': 4
  };

  const getCostValue = (joker) => {
    if (joker.rarity === 'Legendary') return Number.MAX_SAFE_INTEGER;
    const costStr = (joker.cost || '').toString();
    const numericCost = parseInt(costStr.replace(/[^0-9]/g, '')) || 0;
    return numericCost;
  };

  const sortedJokers = [...jokers];
  switch (sortBy) {
    case 'cost-asc':
      return sortedJokers.sort((a, b) => getCostValue(a) - getCostValue(b));
    case 'cost-desc':
      return sortedJokers.sort((a, b) => getCostValue(b) - getCostValue(a));
    case 'rarity-asc':
      return sortedJokers.sort((a, b) => (rarityOrder[a.rarity] || 0) - (rarityOrder[b.rarity] || 0));
    case 'rarity-desc':
      return sortedJokers.sort((a, b) => (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0));
    case 'name-asc':
      return sortedJokers.sort((a, b) => a.name.localeCompare(b.name));
    case 'name-desc':
      return sortedJokers.sort((a, b) => b.name.localeCompare(a.name));
    default:
      return sortedJokers;
  }
}

function sortPublicUsers(users, sortBy) {
  switch (sortBy) {
    case 'most-recent':
      return users.sort((a, b) => {
        const aLastFavorited = a.lastFavorited || 0;
        const bLastFavorited = b.lastFavorited || 0;
        return bLastFavorited - aLastFavorited;
      });
    case 'most-likes':
      return users.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    default:
      return users;
  }
}

function filterJokers(jokers, searchTerm) {
  if (!searchTerm) return jokers;
  return jokers.filter(joker => 
    joker.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
}

function updateDisplay() {
  let filteredJokers = filterJokers(jokersData, currentSearch);
  let sortedJokers = sortJokers(filteredJokers, currentSort);
  displayJokers(sortedJokers);
}

document.getElementById('sortBy').addEventListener('change', (e) => {
  currentSort = e.target.value;
  updateDisplay();
});

document.getElementById('searchInput').addEventListener('input', (e) => {
  currentSearch = e.target.value;
  updateDisplay();
});

async function toggleFavorite(jokerName, starButton) {
  if (!currentUser) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'favorite-message';
    messageDiv.textContent = 'Please login to favorite';
    starButton.parentElement.appendChild(messageDiv);
    setTimeout(() => {
      if (messageDiv && messageDiv.parentElement) {
        messageDiv.parentElement.removeChild(messageDiv);
      }
    }, 2000);
    return;
  }

  const userId = currentUser.uid;
  const jokerRef = firebase.database().ref(`users/${userId}/favorites/${jokerName}`);

  try {
    const snapshot = await jokerRef.once('value');
    const isFavorited = snapshot.val();

    if (isFavorited) {
      await jokerRef.remove();
      starButton.classList.remove('favorited');
    } else {
      await jokerRef.set({ timestamp: Date.now() });
      starButton.classList.add('favorited');
    }
    // Update cached favorites
    cachedUserFavorites = (await firebase.database().ref(`users/${userId}/favorites`).once('value')).val();
    loadFavorites();
  } catch (error) {
    console.error('Error toggling favorite:', error);
  }
}

async function isJokerFavorited(jokerName) {
  if (!currentUser) return false;
  const userId = currentUser.uid;
  const jokerRef = firebase.database().ref(`users/${userId}/favorites/${jokerName}`);
  const snapshot = await jokerRef.once('value');
  return snapshot.val() || false;
}

async function toggleFavoritesPublic() {
  if (!currentUser) {
    alert('Please login to set favorites visibility');
    return;
  }

  const userId = currentUser.uid;
  const userRef = firebase.database().ref(`users/${userId}`);
  const snapshot = await userRef.once('value');
  const userData = snapshot.val();
  const newPublicState = !userData.favoritesPublic;

  await userRef.update({ favoritesPublic: newPublicState });
  // Invalidate public favorites cache
  cachedPublicUsers = null;
  loadFavorites();
}

async function saveFavoritesOrder(userId, newOrder) {
  const favoritesRef = firebase.database().ref(`users/${userId}/favoritesOrder`);
  await favoritesRef.set(newOrder);
  // Update cached order
  cachedFavoritesOrder = newOrder;
}

async function loadFavoritesOrder(userId) {
  if (cachedFavoritesOrder) {
    return cachedFavoritesOrder;
  }
  const favoritesRef = firebase.database().ref(`users/${userId}/favoritesOrder`);
  const snapshot = await favoritesRef.once('value');
  cachedFavoritesOrder = snapshot.val() || [];
  return cachedFavoritesOrder;
}

async function loadFavorites() {
  const favoritesGallery = document.getElementById('favorites-gallery');
  const favoritesRight = document.querySelector('.favorites-right');
  favoritesGallery.innerHTML = '<p class="no-favorites-message">Loading favorites...</p>';

  if (favoritesRight) {
    favoritesRight.dataset.loading = 'true';
  }

  try {
    if (!currentUser) {
      favoritesGallery.innerHTML = '<p class="no-favorites-message">Please login to view favorites</p>';
      if (favoritesRight) {
        favoritesRight.dataset.loading = 'false';
      }
      return;
    }

    const userId = currentUser.uid;
    const userRef = firebase.database().ref(`users/${userId}`);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val() || {};
    const isPublic = userData.favoritesPublic || false;

    // Use cached favorites if available
    let favorites = cachedUserFavorites;
    if (!favorites) {
      const favoritesRef = firebase.database().ref(`users/${userId}/favorites`);
      const snapshot = await favoritesRef.once('value');
      favorites = snapshot.val();
      cachedUserFavorites = favorites;
    }

    if (!favorites) {
      favoritesGallery.innerHTML = '<p class="no-favorites-message">No favorited jokers yet</p>';
      if (favoritesRight) {
        favoritesRight.dataset.loading = 'false';
      }
      return;
    }

    const favoritedJokerNames = Object.keys(favorites);
    let favoritedJokers = jokersData.filter(joker => favoritedJokerNames.includes(joker.name));
    const favoritesOrder = await loadFavoritesOrder(userId);

    if (favoritesOrder.length > 0) {
      favoritedJokers.sort((a, b) => {
        const aIndex = favoritesOrder.indexOf(a.name);
        const bIndex = favoritesOrder.indexOf(b.name);
        return aIndex - bIndex;
      });
    }

    if (favoritedJokers.length === 0) {
      favoritesGallery.innerHTML = '<p class="no-favorites-message">No favorited jokers yet</p>';
      if (favoritesRight) {
        favoritesRight.dataset.loading = 'false';
      }
      return;
    }

    favoritesGallery.innerHTML = `
      <div class="favorites-container">
        <div class="favorites-left">
          <button id="togglePublicBtn" class="auth-btn" style="margin: 0 0 20px 0;">${isPublic ? 'Make Private' : 'Make Public'}</button>
          <div id="favorites-gallery-content" class="gallery sortable" style="padding: 0;"></div>
        </div>
        <div class="favorites-right">
          <div class="favorites-tab">Public Favourites</div>
          <h2>Public Favorites</h2>
          <div class="sorting-controls">
            <label>Sort by:</label>
            <select id="sortPublicFavorites">
              <option value="most-recent" ${currentSort === 'most-recent' ? 'selected' : ''}>Most Recent</option>
              <option value="most-likes" ${currentSort === 'most-likes' ? 'selected' : ''}>Most Likes</option>
            </select>
          </div>
          <div class="search-controls">
            <input type="text" id="searchPublicFavorites" placeholder="Search users..." style="width: 100%;">
          </div>
          <div id="public-favorites-list" style="margin-top: 10px; max-height: 600px; overflow-y: auto;">
            <p class="no-favorites-message">Loading public favorites...</p>
          </div>
        </div>
      </div>
    `;

    displayDraggableJokers(favoritedJokers, 'favorites-gallery-content');

    const style = document.createElement('style');
    style.innerHTML = `
      #favorites-gallery-content.gallery {
        grid-template-columns: repeat(5, 1fr);
        gap: 20px;
        padding: 0;
        justify-items: start;
      }
      #favorites-gallery-content .joker-card {
        margin: 0;
      }
      @media (max-width: 1200px) {
        #favorites-gallery-content.gallery {
          grid-template-columns: repeat(4, 1fr);
        }
      }
      @media (max-width: 800px) {
        #favorites-gallery-content.gallery {
          grid-template-columns: repeat(3, 1fr);
        }
      }
      @media (max-width: 600px) {
        #favorites-gallery-content.gallery {
          grid-template-columns: repeat(2, 1fr);
        }
      }
    `;
    document.head.appendChild(style);

    document.getElementById('togglePublicBtn').addEventListener('click', toggleFavoritesPublic);

    new Sortable(document.getElementById('favorites-gallery-content'), {
      animation: 150,
      onEnd: async (evt) => {
        const newOrder = Array.from(document.querySelectorAll('#favorites-gallery-content .joker-card')).map(card => card.querySelector('.joker-name').textContent);
        await saveFavoritesOrder(userId, newOrder);
      }
    });

    // Setup favorites tab toggle with debounce
    const favoritesRightElement = document.querySelector('.favorites-right');
    const favoritesTab = document.querySelector('.favorites-tab');
    if (favoritesTab && favoritesRightElement) {
      let isClickAllowed = true;
      favoritesTab.addEventListener('click', () => {
        if (favoritesRightElement.dataset.loading === 'true' || !isClickAllowed) {
          return;
        }
        isClickAllowed = false;
        favoritesRightElement.classList.toggle('open');
        setTimeout(() => {
          isClickAllowed = true;
        }, 300);
      });
    }

    // Load public favorites
    let publicUsers = cachedPublicUsers;
    if (!publicUsers) {
      const usersRef = firebase.database().ref('users');
      const publicSnapshot = await usersRef.once('value');
      const users = publicSnapshot.val();
      publicUsers = [];

      for (const userId in users) {
        if (users[userId].favoritesPublic) {
          const favoritesRef = firebase.database().ref(`users/${userId}/favorites`);
          const favoritesSnapshot = await favoritesRef.once('value');
          const favorites = favoritesSnapshot.val();
          if (favorites) {
            const favoritedJokerNames = Object.keys(favorites);
            const userFavorites = jokersData.filter(joker => favoritedJokerNames.includes(joker.name));
            if (userFavorites.length > 0) {
              const favoritesOrder = await loadFavoritesOrder(userId);
              if (favoritesOrder.length > 0) {
                userFavorites.sort((a, b) => {
                  const aIndex = favoritesOrder.indexOf(a.name);
                  const bIndex = favoritesOrder.indexOf(b.name);
                  return aIndex - bIndex;
                });
              }
              const lastFavorited = Math.max(...Object.values(favorites).map(fav => fav.timestamp || 0));
              const likesRef = firebase.database().ref(`users/${userId}/likes`);
              const likesSnapshot = await likesRef.once('value');
              const likes = likesSnapshot.val() || 0;
              publicUsers.push({ userId, username: users[userId].username, favorites: userFavorites, lastFavorited, likes });
            }
          }
        }
      }
      cachedPublicUsers = publicUsers;
    }

    const list = document.getElementById('public-favorites-list');
    if (!publicUsers || publicUsers.length === 0) {
      list.innerHTML = '<p class="no-favorites-message">No public favorites available.</p>';
    } else {
      const sortedUsers = sortPublicUsers(publicUsers, currentSort);
      list.innerHTML = '';
      sortedUsers.forEach(user => {
        if (user.favorites && user.favorites.length > 0) {
          const topCard = user.favorites[0];
          const userItem = document.createElement('div');
          userItem.className = 'public-user-item';
          userItem.innerHTML = `
            <span class="user-name">${user.username || 'Anonymous'}</span>
            <img src="${topCard.image}" alt="${topCard.name}" onerror="this.src='https://placehold.co/150x150/222/fff?text=${topCard.name}'" class="top-card-preview">
          `;
          userItem.addEventListener('click', () => showUserTopFive(user));
          list.appendChild(userItem);
        }
      });

      if (list.children.length === 0) {
        list.innerHTML = '<p class="no-favorites-message">No public favorites available.</p>';
      }
    }

    // Setup public favorites search
    const searchPublicInput = document.getElementById('searchPublicFavorites');
    if (searchPublicInput) {
      searchPublicInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const userItems = document.querySelectorAll('.public-user-item');
        
        userItems.forEach(item => {
          const username = item.querySelector('.user-name').textContent.toLowerCase();
          if (username.includes(searchTerm)) {
            item.style.display = 'flex';
          } else {
            item.style.display = 'none';
          }
        });
      });
    }

    document.getElementById('sortPublicFavorites').addEventListener('change', (e) => {
      currentSort = e.target.value;
      loadFavorites();
    });

    if (favoritesRight) {
      favoritesRight.dataset.loading = 'false';
    }

  } catch (error) {
    console.error('Error loading favorites:', error);
    favoritesGallery.innerHTML = `<p class="no-favorites-message">Error loading favorites: ${error.message}</p>`;
    if (favoritesRight) {
      favoritesRight.dataset.loading = 'false';
    }
  }
}

async function showUserTopFive(user) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';

  if (!user.favorites || user.favorites.length === 0) {
    modalContent.innerHTML = `
      <div class="auth-modal">
        <h2>${user.username}'s Top 5 Favorites</h2>
        <p class="no-favorites-message">This user has no favorited jokers.</p>
        <button class="auth-submit-btn" onclick="this.parentElement.parentElement.parentElement.remove()">Close</button>
      </div>
    `;
  } else {
    const topFive = `
      <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 20px; width: 100%;">
        ${user.favorites.slice(0, 5).map(joker => `
          <div class="joker-card" onmousemove="hoverCard(event)" onmouseleave="noHoverCard(event)">
            <img src="${joker.image}" alt="${joker.name}" onerror="this.src='https://placehold.co/150x150/222/fff?text=${joker.name}'" class="joker-image">
            <h2 class="joker-name">${joker.name}</h2>
          </div>
        `).join('')}
      </div>
    `;

    const likesRef = firebase.database().ref(`users/${user.userId}/likedBy`);
    const likesSnapshot = await likesRef.once('value');
    let likedBy = likesSnapshot.val() || [];
    const isLiked = likedBy.includes(currentUser?.uid);
    const likeClass = isLiked ? 'like-button liked' : 'like-button';

    modalContent.innerHTML = `
      <div class="auth-modal">
        <h2>${user.username}'s Top 5 Favorites</h2>
        <div class="gallery">${topFive}</div>
        <div class="like-section">
          <button class="${likeClass}" aria-label="Like ${user.username}'s favorites"></button>
          <span class="like-count">${user.likes || 0}</span> Likes
        </div>
        <button class="auth-submit-btn" onclick="this.parentElement.parentElement.parentElement.remove()">Close</button>
      </div>
    `;
  }

  overlay.appendChild(modalContent);
  document.body.appendChild(overlay);

  overlay.style.display = 'block';

  const likeButton = modalContent.querySelector('.like-button');
  if (likeButton) {
    likeButton.addEventListener('click', async () => {
      if (!currentUser) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'favorite-message';
        messageDiv.textContent = 'Please login to like';
        likeButton.parentElement.appendChild(messageDiv);
        setTimeout(() => {
          if (messageDiv && messageDiv.parentElement) {
            messageDiv.parentElement.removeChild(messageDiv);
          }
        }, 2000);
        return;
      }

      const userId = user.userId;
      const likesRef = firebase.database().ref(`users/${userId}/likes`);
      const likedByRef = firebase.database().ref(`users/${userId}/likedBy`);
      let likesSnapshot = await likesRef.once('value');
      let likedBySnapshot = await likedByRef.once('value');
      let likes = likesSnapshot.val() || 0;
      let likedBy = likedBySnapshot.val() || [];

      if (!Array.isArray(likedBy)) {
        likedBy = [];
      }

      const userIndex = likedBy.indexOf(currentUser.uid);
      if (userIndex > -1) {
        likedBy.splice(userIndex, 1);
        likes -= 1;
        likeButton.classList.remove('liked');
      } else {
        likedBy.push(currentUser.uid);
        likes += 1;
        likeButton.classList.add('liked');
      }

      await likedByRef.set(likedBy);
      await likesRef.set(likes);
      const likeCountElement = modalContent.querySelector('.like-count');
      likeCountElement.textContent = likes;

      // Invalidate public favorites cache
      cachedPublicUsers = null;
      loadFavorites();
    });
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });
}

function displayJokers(jokers, galleryId = 'jokers-gallery') {
  const gallery = document.getElementById(galleryId);
  gallery.innerHTML = '';

  if (jokers.length === 0 && galleryId === 'jokers-gallery') {
    gallery.innerHTML = '<p>No jokers found matching your search.</p>';
    return;
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.joker-card')) {
      document.querySelectorAll('.joker-info').forEach(info => {
        info.classList.remove('active');
      });
    }
  });

  jokers.forEach(async (joker) => {
    const card = document.createElement('div');
    card.className = 'joker-card';
    card.addEventListener('mousemove', hoverCard);
    card.addEventListener('mouseleave', noHoverCard);
    const jokerImage = document.createElement('div');
    jokerImage.className = 'joker-image-container';

    const triggersHtml = joker.triggers
      ? `<p class="joker-triggers">Triggers: ${joker.triggers.join(', ')}</p>`
      : '';

    card.innerHTML = `
      <img src="${joker.image}" alt="${joker.name}" onerror="this.src='https://placehold.co/150x150/222/fff?text=${joker.name}'" class="joker-image">
      <h2 class="joker-name">${joker.name}</h2>
    `;

    card.addEventListener('click', async (e) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';

      const modalContent = document.createElement('div');
      modalContent.className = 'modal-content';

      const modalImage = joker.image ?
        `<img src="${joker.image}" alt="${joker.name}" class="modal-image" onmousemove="hoverCard(event)" onmouseleave="noHoverCard(event)">` :
        `<div class="modal-image placeholder" onmousemove="hoverCard(event)" onmouseleave="noHoverCard(event)">${joker.name}</div>`;

      const isFavorited = await isJokerFavorited(joker.name);
      const starClass = isFavorited ? 'favorite-star favorited' : 'favorite-star';

      const info = document.createElement('div');
      info.className = 'modal-info';
      info.innerHTML = `
        <div class="cost-tag">${joker.cost || '0'}</div>
        <div class="joker-name-wrapper">
          <div class="modal-joker-name ${joker.rarity.toLowerCase()}">${joker.name}</div>
          <button class="${starClass}" aria-label="Favorite ${joker.name}"></button>
        </div>
        <div class="joker-effect">${joker.effect}</div>
        <div class="joker-rarity ${joker.rarity.toLowerCase()}">${joker.rarity}</div>
        ${joker.unlock_condition && !joker.unlock_condition.toLowerCase().includes('default') ?
          `<div class="joker-unlock">Unlock: ${joker.unlock_condition}</div>` : ''}
        ${triggersHtml}
      `;

      const jokerBox = document.createElement('div');
      jokerBox.className = 'joker-box';
      jokerBox.innerHTML = modalImage;

      modalContent.appendChild(jokerBox);
      modalContent.appendChild(info);
      overlay.appendChild(modalContent);
      document.body.appendChild(overlay);

      overlay.style.display = 'block';

      const starButton = info.querySelector('.favorite-star');
      starButton.addEventListener('click', () => toggleFavorite(joker.name, starButton));

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          document.body.removeChild(overlay);
        }
      });

      e.stopPropagation();
    });

    gallery.appendChild(card);
  });
}

function displayDraggableJokers(jokers, galleryId = 'jokers-gallery') {
  const gallery = document.getElementById(galleryId);
  gallery.innerHTML = '';

  if (jokers.length === 0 && galleryId === 'jokers-gallery') {
    gallery.innerHTML = '<p>No jokers found matching your search.</p>';
    return;
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.joker-card')) {
      document.querySelectorAll('.joker-info').forEach(info => {
        info.classList.remove('active');
      });
    }
  });

  jokers.forEach(async (joker) => {
    const card = document.createElement('div');
    card.className = 'joker-card';
    card.addEventListener('mousemove', hoverCard);
    card.addEventListener('mouseleave', noHoverCard);
    const jokerImage = document.createElement('div');
    jokerImage.className = 'joker-image-container';

    const triggersHtml = joker.triggers
      ? `<p class="joker-triggers">Triggers: ${joker.triggers.join(', ')}</p>`
      : '';

    card.innerHTML = `
      <img src="${joker.image}" alt="${joker.name}" onerror="this.src='https://placehold.co/150x150/222/fff?text=${joker.name}'" class="joker-image">
      <h2 class="joker-name">${joker.name}</h2>
    `;

    card.addEventListener('click', async (e) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';

      const modalContent = document.createElement('div');
      modalContent.className = 'modal-content';

      const modalImage = joker.image ?
        `<img src="${joker.image}" alt="${joker.name}" class="modal-image" onmousemove="hoverCard(event)" onmouseleave="noHoverCard(event)">` :
        `<div class="modal-image placeholder" onmousemove="hoverCard(event)" onmouseleave="noHoverCard(event)">${joker.name}</div>`;

      const isFavorited = await isJokerFavorited(joker.name);
      const starClass = isFavorited ? 'favorite-star favorited' : 'favorite-star';

      const info = document.createElement('div');
      info.className = 'modal-info';
      info.innerHTML = `
        <div class="cost-tag">${joker.cost || '0'}</div>
        <div class="joker-name-wrapper">
          <div class="modal-joker-name ${joker.rarity.toLowerCase()}">${joker.name}</div>
          <button class="${starClass}" aria-label="Favorite ${joker.name}"></button>
        </div>
        <div class="joker-effect">${joker.effect}</div>
        <div class="joker-rarity ${joker.rarity.toLowerCase()}">${joker.rarity}</div>
        ${joker.unlock_condition && !joker.unlock_condition.toLowerCase().includes('default') ?
          `<div class="joker-unlock">Unlock: ${joker.unlock_condition}</div>` : ''}
        ${triggersHtml}
      `;

      const jokerBox = document.createElement('div');
      jokerBox.className = 'joker-box';
      jokerBox.innerHTML = modalImage;

      modalContent.appendChild(jokerBox);
      modalContent.appendChild(info);
      overlay.appendChild(modalContent);
      document.body.appendChild(overlay);

      overlay.style.display = 'block';

      const starButton = info.querySelector('.favorite-star');
      starButton.addEventListener('click', () => toggleFavorite(joker.name, starButton));

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          document.body.removeChild(overlay);
        }
      });

      e.stopPropagation();
    });

    gallery.appendChild(card);
  });
}

function displayPublicJokers(jokers) {
  const gallery = document.getElementById('public-favorites-gallery');
  gallery.innerHTML = '';

  jokers.forEach(async (joker) => {
    const card = document.createElement('div');
    card.className = 'joker-card';
    card.addEventListener('mousemove', hoverCard);
    card.addEventListener('mouseleave', noHoverCard);

    card.innerHTML = `
      <img src="${joker.image}" alt="${joker.name}" onerror="this.src='https://placehold.co/150x150/222/fff?text=${joker.name}'" class="joker-image">
      <h2 class="joker-name">${joker.name} (by ${joker.username})</h2>
    `;

    card.addEventListener('click', async (e) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';

      const modalContent = document.createElement('div');
      modalContent.className = 'modal-content';

      const modalImage = joker.image ?
        `<img src="${joker.image}" alt="${joker.name}" class="modal-image" onmousemove="hoverCard(event)" onmouseleave="noHoverCard(event)">` :
        `<div class="modal-image placeholder" onmousemove="hoverCard(event)" onmouseleave="noHoverCard(event)">${joker.name}</div>`;

      const info = document.createElement('div');
      info.className = 'modal-info';
      info.innerHTML = `
        <div class="cost-tag">${joker.cost || '0'}</div>
        <div class="joker-name-wrapper">
          <div class="modal-joker-name ${joker.rarity.toLowerCase()}">${joker.name}</div>
        </div>
        <div class="joker-effect">${joker.effect}</div>
        <div class="joker-rarity ${joker.rarity.toLowerCase()}">${joker.rarity}</div>
        ${joker.unlock_condition && !joker.unlock_condition.toLowerCase().includes('default') ?
          `<div class="joker-unlock">Unlock: ${joker.unlock_condition}</div>` : ''}
        ${joker.triggers ? `<p class="joker-triggers">Triggers: ${joker.triggers.join(', ')}</p>` : ''}
        <p class="joker-cost">Shared by: ${joker.username}</p>
      `;

      const jokerBox = document.createElement('div');
      jokerBox.className = 'joker-box';
      jokerBox.innerHTML = modalImage;

      modalContent.appendChild(jokerBox);
      modalContent.appendChild(info);
      overlay.appendChild(modalContent);
      document.body.appendChild(overlay);

      overlay.style.display = 'block';

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          document.body.removeChild(overlay);
        }
      });

      e.stopPropagation();
    });

    gallery.appendChild(card);
  });
}