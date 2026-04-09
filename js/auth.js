// ===========================
// AGENCE IA - Auth Module (Supabase)
// ===========================

// URL de base pour les redirections Supabase (doit correspondre au Site URL dans le Dashboard Supabase)
const AUTH_BASE_URL = 'http://localhost:3000';

// --- Toggle Password Visibility ---
function togglePasswordVisibility(btn) {
  const input = btn.parentElement.querySelector('input');
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
    btn.title = 'Masquer le mot de passe';
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
    btn.title = 'Afficher le mot de passe';
  }
}

// Initialise les boutons toggle sur tous les champs password de la page
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('input[type="password"]').forEach(input => {
    // Wrapper relatif pour le positionnement du bouton
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative; width:100%;';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    // Bouton œil
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '👁️';
    btn.title = 'Afficher le mot de passe';
    btn.style.cssText = `
      position:absolute; right:12px; top:50%; transform:translateY(-50%);
      background:none; border:none; cursor:pointer; font-size:1.1rem;
      padding:4px; line-height:1; opacity:0.6; transition:opacity 0.2s;
    `;
    btn.addEventListener('mouseenter', () => btn.style.opacity = '1');
    btn.addEventListener('mouseleave', () => btn.style.opacity = '0.6');
    btn.addEventListener('click', () => togglePasswordVisibility(btn));
    wrapper.appendChild(btn);

    // Ajouter du padding à droite pour que le texte ne passe pas sous le bouton
    input.style.paddingRight = '44px';
  });
});

// --- Auth Tab Switching ---
function switchAuthTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const tabs = document.querySelectorAll('.auth-tab');

  if (!loginForm || !registerForm) return;

  tabs.forEach(t => t.classList.remove('active'));

  if (tab === 'login') {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    tabs[0]?.classList.add('active');
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    tabs[1]?.classList.add('active');
  }
}

// --- Login ---
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail')?.value;
  const password = document.getElementById('loginPassword')?.value;
  const rememberMe = document.getElementById('rememberMe')?.checked;

  if (!email || !password) return;

  try {
    const { data, error } = await window.supabaseClient.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) throw error;

    // Sauvegarder l'email si "Se souvenir de moi" est coché
    if (rememberMe) {
      localStorage.setItem('propulsia_remember_email', email);
      localStorage.setItem('propulsia_remember_checked', 'true');
    } else {
      localStorage.removeItem('propulsia_remember_email');
      localStorage.removeItem('propulsia_remember_checked');
    }

    const userMeta = data.user.user_metadata || {};
    const name = userMeta.first_name || email.split('@')[0];

    showToast('✅', `Bienvenue ${name} ! Redirection en cours...`);
    
    setTimeout(() => {
      window.location.href = 'production.html';
    }, 1500);
  } catch (error) {
    showToast('⚠️', 'Email ou mot de passe incorrect.');
    console.error('Login error:', error.message);
  }
}

// --- Init Login Page : pré-remplissage + redirection si déjà connecté ---
async function initLoginPage() {
  // Pré-remplir l'email si "Se souvenir de moi" était coché
  const savedEmail = localStorage.getItem('propulsia_remember_email');
  const wasChecked = localStorage.getItem('propulsia_remember_checked');

  if (savedEmail && wasChecked) {
    const emailInput = document.getElementById('loginEmail');
    const rememberBox = document.getElementById('rememberMe');
    if (emailInput) emailInput.value = savedEmail;
    if (rememberBox) rememberBox.checked = true;
  }

  // Rediriger si déjà connecté
  if (window.supabaseClient) {
    try {
      const { data } = await window.supabaseClient.auth.getSession();
      if (data?.session?.user) {
        window.location.href = 'production.html';
      }
    } catch (e) {
      // Silencieux
    }
  }
}

// --- Register ---
async function handleRegister(e) {
  e.preventDefault();
  const firstName = document.getElementById('regFirstName')?.value;
  const lastName = document.getElementById('regLastName')?.value;
  const email = document.getElementById('regEmail')?.value;
  const password = document.getElementById('regPassword')?.value;
  const confirm = document.getElementById('regPasswordConfirm')?.value;

  if (password !== confirm) {
    showToast('⚠️', 'Les mots de passe ne correspondent pas.');
    return;
  }

  try {
    const { data, error } = await window.supabaseClient.auth.signUp({
      email: email,
      password: password,
      options: {
        emailRedirectTo: AUTH_BASE_URL + '/verify-email.html',
        data: {
          first_name: firstName,
          last_name: lastName,
          company: document.getElementById('regCompany')?.value || '',
          role: 'prospect',
          plan: 'discover'
        }
      }
    });

    if (error) throw error;

    // Vérifier si la confirmation d'email est requise
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      showToast('⚠️', 'Cet email est déjà enregistré. Veuillez vous connecter.');
      return;
    }

    // Rediriger vers la page d'attente de vérification
    showToast('🎉', 'Inscription réussie ! Vérifiez votre email pour activer votre compte.');
    
    setTimeout(() => {
      window.location.href = 'verify-email.html?pending=true&email=' + encodeURIComponent(email);
    }, 2000);
  } catch (error) {
    showToast('⚠️', 'Erreur lors de l\'inscription: ' + error.message);
    console.error('Register error:', error.message);
  }
}

// --- Check Auth & Access Control ---
async function checkAuth() {
  if (!window.supabaseClient) return null;
  const { data, error } = await window.supabaseClient.auth.getSession();
  if (error || !data || !data.session) return null;
  return data.session.user;
}

async function requireAuth(redirectTo = 'login.html') {
  const user = await checkAuth();
  if (!user) {
    window.location.href = redirectTo;
    return null;
  }
  return user;
}

async function hasAccess(requiredRole) {
  const user = await checkAuth();
  if (!user) return false;

  const role = user.user_metadata?.role || 'prospect';
  const roleHierarchy = { admin: 3, subscriber: 2, prospect: 1 };
  return (roleHierarchy[role] || 0) >= (roleHierarchy[requiredRole] || 0);
}

// --- Logout ---
async function logout() {
  if (window.supabaseClient) {
    await window.supabaseClient.auth.signOut();
  }
  window.location.href = 'index.html';
}

// --- Subscription Plans ---
function toggleBilling(type) {
  const monthlyBtn = document.getElementById('billingMonthly');
  const annualBtn = document.getElementById('billingAnnual');
  const pricePro = document.getElementById('pricePro');

  if (!monthlyBtn || !annualBtn) return;

  if (type === 'monthly') {
    monthlyBtn.style.background = 'var(--gradient-primary)';
    monthlyBtn.style.color = 'white';
    annualBtn.style.background = 'transparent';
    annualBtn.style.color = 'var(--text-muted)';
    if (pricePro) pricePro.innerHTML = '29 900 <span>XPF/mois</span>';
  } else {
    annualBtn.style.background = 'var(--gradient-primary)';
    annualBtn.style.color = 'white';
    monthlyBtn.style.background = 'transparent';
    monthlyBtn.style.color = 'var(--text-muted)';
    if (pricePro) pricePro.innerHTML = '23 900 <span>XPF/mois</span>';
  }
}

function selectPlan(plan) {
  const modal = document.getElementById('subModal');
  if (!modal) return;

  const icon = document.getElementById('subModalIcon');
  const title = document.getElementById('subModalTitle');
  const desc = document.getElementById('subModalDesc');
  const cardGroup = document.getElementById('subCard')?.closest('.form-group');
  const expiryRow = cardGroup?.parentElement?.querySelector('.form-row');

  // Stocker le plan sélectionné pour processSubscription
  modal.dataset.selectedPlan = plan;

  switch (plan) {
    case 'discover':
      if (icon) icon.textContent = '🆓';
      if (title) title.textContent = 'Plan Découverte';
      if (desc) desc.textContent = 'Créez votre compte gratuit pour commencer à utiliser nos outils.';
      // Cacher les champs de paiement pour le plan gratuit
      if (cardGroup) cardGroup.style.display = 'none';
      if (expiryRow) expiryRow.style.display = 'none';
      const submitBtn = modal.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.textContent = '✅ Activer le plan gratuit';
      break;
    case 'pro':
      if (icon) icon.textContent = '⭐';
      if (title) title.textContent = 'Abonnement Professionnel — 29 900 XPF/mois';
      if (desc) desc.textContent = 'Débloquez tous les outils de production IA.';
      // Afficher les champs de paiement
      if (cardGroup) cardGroup.style.display = 'block';
      if (expiryRow) expiryRow.style.display = 'flex';
      const submitBtnPro = modal.querySelector('button[type="submit"]');
      if (submitBtnPro) submitBtnPro.textContent = '💳 Confirmer l\'abonnement';
      break;
  }

  modal.classList.add('active');
}

async function processSubscription(e) {
  e.preventDefault();
  const email = document.getElementById('subEmail')?.value;
  if (!email) return;

  const modal = document.getElementById('subModal');
  const selectedPlan = modal?.dataset.selectedPlan || 'discover';

  // Vérifier les champs de paiement pour le plan Pro
  if (selectedPlan === 'pro') {
    const card = document.getElementById('subCard')?.value?.trim();
    if (!card || card.length < 16) {
      showToast('⚠️', 'Veuillez entrer un numéro de carte valide.');
      return;
    }
  }

  const user = await checkAuth();
  if (!user) {
    showToast('⚠️', 'Veuillez vous connecter ou vous inscrire avant de vous abonner.');
    return;
  }

  const planConfig = {
    discover: { role: 'prospect', label: 'Découverte', redirect: 'demo.html' },
    pro: { role: 'subscriber', label: 'Professionnel', redirect: 'production.html' }
  };

  const config = planConfig[selectedPlan] || planConfig.discover;

  try {
    const { error } = await window.supabaseClient.auth.updateUser({
      data: {
        role: config.role,
        plan: selectedPlan,
        subscribeTime: new Date().toISOString()
      }
    });

    if (error) throw error;

    modal.classList.remove('active');
    showToast('🎉', `Plan ${config.label} activé avec succès !`);

    setTimeout(() => {
      window.location.href = config.redirect;
    }, 2000);
  } catch (error) {
    showToast('⚠️', 'Erreur lors de l\'activation: ' + error.message);
  }
}

// ===========================
// PASSWORD RESET FUNCTIONS
// ===========================

// --- Forgot Password : Request reset link ---
async function handleForgotPassword(e) {
  e.preventDefault();
  const email = document.getElementById('forgotEmail')?.value;
  const btn = document.getElementById('forgotBtn');

  if (!email) {
    showToast('⚠️', 'Veuillez entrer votre adresse email.');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Envoi en cours...';
  }

  try {
    // Utiliser l'URL de base pour la redirection (doit correspondre au Site URL Supabase)
    const redirectUrl = AUTH_BASE_URL + '/reset-password.html';
    console.log('Reset redirect URL:', redirectUrl);
    
    const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) throw error;

    // Afficher l'étape 2
    document.getElementById('forgotStep1').style.display = 'none';
    document.getElementById('forgotStep2').style.display = 'block';
    document.getElementById('sentEmail').textContent = email;

    showToast('✅', 'Email de réinitialisation envoyé !');
  } catch (error) {
    showToast('⚠️', 'Erreur : ' + error.message);
    console.error('Forgot password error:', error.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Envoyer le lien →';
    }
  }
}

// --- Resend reset email ---
async function resendResetEmail() {
  const email = document.getElementById('sentEmail')?.textContent;
  const btn = document.getElementById('resendBtn');

  if (!email) return;

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Envoi...';
  }

  try {
    // Utiliser l'URL de base pour la redirection (doit correspondre au Site URL Supabase)
    const redirectUrl = AUTH_BASE_URL + '/reset-password.html';
    
    const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) throw error;

    showToast('✅', 'Email renvoyé avec succès !');
  } catch (error) {
    showToast('⚠️', 'Erreur : ' + error.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '🔄 Renvoyer l\'email';
    }
  }
}

// --- Check password strength ---
function checkPasswordStrength(password) {
  const strengthBar = document.getElementById('strengthBar');
  const strengthText = document.getElementById('strengthText');

  if (!strengthBar || !strengthText) return;

  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  const colors = ['#ef4444', '#f97316', '#fbbf24', '#84cc16', '#22c55e'];
  const texts = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'];

  const level = Math.min(strength, 5);
  const percentage = (level / 5) * 100;

  strengthBar.style.width = percentage + '%';
  strengthBar.style.backgroundColor = colors[level - 1] || '#ef4444';
  strengthText.textContent = level > 0 ? texts[level - 1] : '';
  strengthText.style.color = colors[level - 1] || '#ef4444';
}

// --- Reset Password : Set new password ---
async function handleResetPassword(e) {
  e.preventDefault();
  const newPassword = document.getElementById('newPassword')?.value;
  const confirmPassword = document.getElementById('confirmNewPassword')?.value;
  const btn = document.getElementById('resetBtn');

  if (!newPassword || !confirmPassword) {
    showToast('⚠️', 'Veuillez remplir tous les champs.');
    return;
  }

  if (newPassword.length < 8) {
    showToast('⚠️', 'Le mot de passe doit contenir au moins 8 caractères.');
    return;
  }

  if (newPassword !== confirmPassword) {
    showToast('⚠️', 'Les mots de passe ne correspondent pas.');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Mise à jour...';
  }

  try {
    const { error } = await window.supabaseClient.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;

    document.getElementById('resetForm').style.display = 'none';
    document.getElementById('resetSuccess').style.display = 'block';

    showToast('🎉', 'Mot de passe mis à jour avec succès !');
  } catch (error) {
    showToast('⚠️', 'Erreur : ' + error.message);
    console.error('Reset password error:', error.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Mettre à jour le mot de passe →';
    }
  }
}

// --- Verify reset token on page load ---
async function verifyResetToken() {
  const hash = window.location.hash;
  const params = new URLSearchParams(hash.replace('#', '?'));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const type = params.get('type');

  const loadingDiv = document.getElementById('resetLoading');
  const formDiv = document.getElementById('resetForm');
  const errorDiv = document.getElementById('resetError');

  if (!loadingDiv || !formDiv || !errorDiv) return;

  // Vérifier si c'est bien une récupération de mot de passe
  if (type !== 'recovery' || !accessToken) {
    loadingDiv.style.display = 'none';
    errorDiv.style.display = 'block';
    return;
  }

  try {
    // Échanger le token pour établir une session
    const { data, error } = await window.supabaseClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || ''
    });

    if (error) throw error;

    // Token valide, afficher le formulaire
    loadingDiv.style.display = 'none';
    formDiv.style.display = 'block';

    showToast('✅', 'Lien vérifié. Définissez votre nouveau mot de passe.');
  } catch (error) {
    console.error('Token verification error:', error.message);
    loadingDiv.style.display = 'none';
    errorDiv.style.display = 'block';
  }
}

// ===========================
// EMAIL VERIFICATION FUNCTIONS
// ===========================

// --- Check if email needs verification after registration ---
async function checkEmailVerification(user) {
  if (!user) return false;

  // Vérifier si l'email est confirmé
  if (user.email_confirmed_at) {
    return true;
  }

  // L'email n'est pas confirmé
  return false;
}

// --- Resend verification email ---
async function resendVerificationEmail(email) {
  try {
    const { error } = await window.supabaseClient.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: window.location.origin + '/verify-email.html'
      }
    });

    if (error) throw error;

    showToast('✅', 'Email de vérification renvoyé !');
  } catch (error) {
    showToast('⚠️', 'Erreur : ' + error.message);
    console.error('Resend verification error:', error.message);
  }
}

// --- Verify email token on page load ---
async function verifyEmailToken() {
  const hash = window.location.hash;
  const params = new URLSearchParams(hash.replace('#', '?'));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const type = params.get('type');

  const loadingDiv = document.getElementById('verifyLoading');
  const successDiv = document.getElementById('verifySuccess');
  const errorDiv = document.getElementById('verifyError');

  if (!loadingDiv || !successDiv || !errorDiv) return;

  // Vérifier si c'est bien une confirmation d'email
  if (type === 'signup' && accessToken) {
    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || ''
      });

      if (error) throw error;

      loadingDiv.style.display = 'none';
      successDiv.style.display = 'block';

      showToast('🎉', 'Email confirmé avec succès !');
    } catch (error) {
      console.error('Email verification error:', error.message);
      loadingDiv.style.display = 'none';
      errorDiv.style.display = 'block';
    }
  } else {
    // Pas de token dans l'URL, vérifier la session
    const { data } = await window.supabaseClient.auth.getSession();
    if (data.session?.user?.email_confirmed_at) {
      loadingDiv.style.display = 'none';
      successDiv.style.display = 'block';
    } else {
      loadingDiv.style.display = 'none';
      errorDiv.style.display = 'block';
    }
  }
}

// --- FAQ Toggle ---
function toggleFaq(header) {
  const content = header.nextElementSibling;
  const arrow = header.querySelector('span');

  if (content.style.display === 'none' || !content.style.display) {
    content.style.display = 'block';
    if (arrow) arrow.style.transform = 'rotate(180deg)';
  } else {
    content.style.display = 'none';
    if (arrow) arrow.style.transform = 'rotate(0deg)';
  }
}
