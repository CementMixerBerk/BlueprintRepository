
let constrain = 15;

function transforms(x, y, el) {
  let box = el.getBoundingClientRect();
  let calcX = -(y - box.y - (box.height / 2)) / constrain;
  let calcY = (x - box.x - (box.width / 2)) / constrain;
  
  return `perspective(300px) rotateX(${calcX}deg) rotateY(${calcY}deg)`;
}

function hoverCard(e) {
  if (!e.currentTarget.classList.contains('joker-card') && !e.currentTarget.classList.contains('modal-image')) {
    return;
  }
  const card = e.currentTarget;
  const coords = [e.clientX, e.clientY];
  card.style.transform = transforms.apply(null, [...coords, card]);
}

function noHoverCard(e) {
  if (!e.currentTarget.classList.contains('joker-card') && !e.currentTarget.classList.contains('modal-image')) {
    return;
  }
  e.currentTarget.style.transform = 'perspective(300px) rotateX(0deg) rotateY(0deg)';
}

// Add event listeners to all joker cards
document.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('.joker-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', hoverCard);
    card.addEventListener('mouseleave', noHoverCard);
  });
});
