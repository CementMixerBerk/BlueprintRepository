// Load jokers data from the text file
fetch('https://balatro-calculator-default-rtdb.firebaseio.com/.json')
  .then(response => response.json())
  .then(data => displayJokers(data.jokers))
  .catch(error => console.error('Error loading jokers:', error));

function displayJokers(jokers) {
  const gallery = document.getElementById('jokers-gallery');
  gallery.innerHTML = '';

  // Close info box when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.joker-card')) {
      document.querySelectorAll('.joker-info').forEach(info => {
        info.classList.remove('active');
      });
    }
  });

  jokers.forEach(joker => {
    const card = document.createElement('div');
    card.className = 'joker-card';

    const triggersHtml = joker.triggers 
      ? `<p class="joker-triggers">Triggers: ${joker.triggers.join(', ')}</p>` 
      : '';

    card.innerHTML = `
      <img src="${joker.image}" alt="${joker.name}" onerror="this.src='https://placehold.co/150x150/222/fff?text=${joker.name}'" class="joker-image">
      <h2 class="joker-name">${joker.name}</h2>
    `;

    card.addEventListener('click', (e) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';

      const modalContent = document.createElement('div');
      modalContent.className = 'modal-content';

      const modalImage = joker.image ? 
        `<img src="${joker.image}" alt="${joker.name}" class="modal-image">` : 
        `<div class="modal-image placeholder">${joker.name}</div>`;

      const info = document.createElement('div');
      info.className = 'modal-info';
      info.innerHTML = `
        <h2 class="joker-name">${joker.name}</h2>
        <p class="joker-effect">${joker.effect}</p>
        <p class="joker-rarity ${joker.rarity.toLowerCase()}">${joker.rarity}</p>
        ${joker.unlock_condition && !joker.unlock_condition.toLowerCase().includes('default') ? 
          `<p class="joker-unlock">Unlock: ${joker.unlock_condition}</p>` : ''}
        ${triggersHtml}
      `;

      const jokerBox = document.createElement('div');
      jokerBox.className = 'joker-box';
      jokerBox.innerHTML = modalImage;

      const infoBox = document.createElement('div');
      infoBox.className = 'joker-info';
      infoBox.innerHTML = `
        <h2 class="joker-name">${joker.name}</h2>
        <p class="joker-effect">${joker.effect}</p>
        <p class="joker-rarity ${joker.rarity.toLowerCase()}">${joker.rarity}</p>
        ${joker.unlock_condition && !joker.unlock_condition.toLowerCase().includes('default') ? 
          `<p class="joker-unlock">Unlock: ${joker.unlock_condition}</p>` : ''}
        ${triggersHtml}
      `;

      modalContent.appendChild(jokerBox);
      modalContent.appendChild(infoBox);
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