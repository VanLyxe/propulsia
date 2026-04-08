// ===========================
// PROPULSIA - Main JavaScript
// propulsia.io
// ===========================

// --- Custom Checkbox Toggle (PropulsIA styled) ---
function toggleCheckOption(el) {
  el.classList.toggle('checked');
  // Animate glow
  el.classList.add('check-animate');
  setTimeout(() => el.classList.remove('check-animate'), 400);
  // Sync hidden checkbox value
  const checkbox = el.querySelector('input[type="checkbox"]');
  if (checkbox) checkbox.checked = el.classList.contains('checked');
}

// --- FAQ Accordion Toggle ---
function toggleFaq(el) {
  const parent = el.closest ? el.closest('.glass-card') : el.parentElement;
  const content = el.nextElementSibling;
  const arrow = el.querySelector('span:last-child');
  if (!content) return;
  const isOpen = content.style.display !== 'none';
  content.style.display = isOpen ? 'none' : 'block';
  if (arrow) arrow.style.transform = isOpen ? '' : 'rotate(180deg)';
}


// --- Header Scroll Effect ---
const header = document.getElementById('header');
if (header) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
}

// --- Mobile Menu ---
function toggleMobileMenu() {
  const nav = document.getElementById('mobileNav');
  if (nav) nav.classList.toggle('active');
}

// --- Scroll Reveal ---
function initReveal() {
  const reveals = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, index * 100);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  reveals.forEach(el => observer.observe(el));
}

// --- Particles ---
function initParticles() {
  const container = document.getElementById('particles');
  if (!container) return;

  for (let i = 0; i < 30; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDuration = (Math.random() * 15 + 10) + 's';
    particle.style.animationDelay = Math.random() * 10 + 's';
    particle.style.width = (Math.random() * 3 + 1) + 'px';
    particle.style.height = particle.style.width;
    container.appendChild(particle);
  }
}

// --- Smooth Scroll ---
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// --- Contact Form ---
function handleContactForm(e) {
  e.preventDefault();
  const name = document.getElementById('contactName')?.value;
  const email = document.getElementById('contactEmail')?.value;
  
  if (name && email) {
    showToast('✅', `Merci ${name} ! Votre message a bien été envoyé. Nous vous répondrons rapidement.`);
    e.target.reset();
  }
}

// --- Toast Notification ---
function showToast(icon, message, duration = 4000) {
  const toast = document.getElementById('toast');
  const toastIcon = document.getElementById('toastIcon');
  const toastMsg = document.getElementById('toastMessage');
  
  if (!toast) return;
  
  if (toastIcon) toastIcon.textContent = icon;
  if (toastMsg) toastMsg.textContent = message;
  
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// --- Smooth Number Counter ---
function animateCounters() {
  const counters = document.querySelectorAll('[data-count]');
  counters.forEach(counter => {
    const target = parseInt(counter.getAttribute('data-count'));
    const duration = 2000;
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        counter.textContent = target;
        clearInterval(timer);
      } else {
        counter.textContent = Math.floor(current);
      }
    }, 16);
  });
}

// --- Update Nav Auth State ---
// Remplace "Connexion" par "Mon compte" si l'utilisateur est connecté
async function updateAuthNav() {
  // Attendre que Supabase soit initialisé
  if (!window.supabaseClient) return;

  try {
    const { data } = await window.supabaseClient.auth.getSession();
    if (data?.session?.user) {
      const navBtn = document.getElementById('navLoginBtn');
      const mobileBtn = document.getElementById('mobileLoginBtn');

      if (navBtn) {
        navBtn.href = 'account.html';
        navBtn.textContent = 'Mon compte';
      }
      if (mobileBtn) {
        mobileBtn.href = 'account.html';
        mobileBtn.textContent = 'Mon compte';
      }
    }
  } catch (e) {
    console.warn('Auth nav check failed:', e.message);
  }
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  initReveal();
  initParticles();
  // Mettre à jour la nav après un court délai pour laisser Supabase s'initialiser
  setTimeout(updateAuthNav, 200);
});
