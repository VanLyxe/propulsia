// ===========================
// PROPULSIA - Production Module
// propulsia.io
// ===========================

let batchFiles = [];

// --- Tab Switching ---
function switchTab(tabName, el) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.style.display = 'none';
  });

  // Remove active from nav
  document.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.classList.remove('active');
  });

  // Show selected
  const target = document.getElementById('tab-' + tabName);
  if (target) target.style.display = 'block';
  if (el) el.classList.add('active');
}

// --- Batch Upload ---
const batchUploadZone = document.getElementById('batchUploadZone');
const batchFileInput = document.getElementById('batchFileInput');

if (batchUploadZone) {
  batchUploadZone.addEventListener('click', () => batchFileInput?.click());

  batchUploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    batchUploadZone.classList.add('drag-over');
  });

  batchUploadZone.addEventListener('dragleave', () => {
    batchUploadZone.classList.remove('drag-over');
  });

  batchUploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    batchUploadZone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    addBatchFiles(files);
  });
}

if (batchFileInput) {
  batchFileInput.addEventListener('change', (e) => {
    addBatchFiles(Array.from(e.target.files));
  });
}

function addBatchFiles(files) {
  if (files.length === 0) return;
  
  files.forEach(file => {
    if (batchFiles.length >= 20) return;
    batchFiles.push(file);
  });

  updateBatchPreview();
}

function updateBatchPreview() {
  const preview = document.getElementById('batchPreview');
  const grid = document.getElementById('batchGrid');
  const count = document.getElementById('batchCount');
  
  if (!preview || !grid) return;

  if (batchFiles.length === 0) {
    preview.style.display = 'none';
    return;
  }

  preview.style.display = 'block';
  count.textContent = batchFiles.length + ' image(s) sélectionnée(s)';
  grid.innerHTML = '';

  batchFiles.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const div = document.createElement('div');
      div.style.cssText = 'position:relative; border-radius:var(--radius-md); overflow:hidden; aspect-ratio:1; border:1px solid var(--border-color);';
      div.innerHTML = `
        <img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover;">
        <button onclick="removeBatchFile(${index})" style="position:absolute; top:4px; right:4px; width:24px; height:24px; background:rgba(248,113,113,0.9); border-radius:50%; cursor:pointer; color:white; font-size:0.7rem; border:none; display:flex; align-items:center; justify-content:center;">✕</button>
        <div style="position:absolute; bottom:0; left:0; right:0; padding:4px 8px; background:rgba(0,0,0,0.7); font-size:0.7rem; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${file.name}
        </div>
      `;
      grid.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
}

function removeBatchFile(index) {
  batchFiles.splice(index, 1);
  updateBatchPreview();
}

function clearBatch() {
  batchFiles = [];
  updateBatchPreview();
  if (batchFileInput) batchFileInput.value = '';
}

// --- Batch Processing Simulation ---
function startBatchProcessing() {
  if (batchFiles.length === 0) {
    showToast('⚠️', 'Veuillez importer au moins une image.');
    return;
  }

  const progressDiv = document.getElementById('batchProgress');
  const bar = document.getElementById('batchProgressBar');
  const text = document.getElementById('batchProgressText');
  
  if (!progressDiv) return;

  progressDiv.style.display = 'block';
  progressDiv.scrollIntoView({ behavior: 'smooth' });

  let current = 0;
  const total = batchFiles.length;

  function processNext() {
    if (current >= total) {
      showToast('✅', `Traitement terminé ! ${total} images ont été améliorées.`);
      setTimeout(() => {
        progressDiv.style.display = 'none';
        bar.style.width = '0%';
      }, 3000);
      return;
    }

    current++;
    const pct = Math.round((current / total) * 100);
    bar.style.width = pct + '%';
    text.textContent = `${current} / ${total} images traitées`;

    setTimeout(processNext, 800 + Math.random() * 600);
  }

  processNext();
}

// --- Email Preview Generation ---
function generateEmailPreview() {
  const preview = document.getElementById('emailPreview');
  if (!preview) return;

  // Show loading
  preview.innerHTML = `
    <div style="text-align:center; padding:40px;">
      <div style="font-size:2rem; margin-bottom:12px; animation: pulse 1.5s infinite;">🤖</div>
      <p style="color:var(--text-secondary);">Génération du message en cours...</p>
    </div>
  `;

  // Simulate generation
  setTimeout(() => {
    preview.innerHTML = `
      <div style="font-family: 'Inter', sans-serif;">
        <div style="margin-bottom:16px; padding-bottom:12px; border-bottom:1px solid var(--border-color);">
          <div style="font-size:0.8rem; color:var(--text-muted);">De : contact@propulsia.io</div>
          <div style="font-size:0.8rem; color:var(--text-muted);">Objet : <strong style="color:var(--text-primary);">Optimisez la visibilité de votre restaurant grâce à l'IA</strong></div>
        </div>
        <div style="font-size:0.9rem; line-height:1.7; color:var(--text-secondary);">
          <p>Bonjour,</p>
          <p>Je me présente, je suis Fred de <strong style="color:var(--primary);">PropulsIA</strong>. Nous sommes spécialisés dans l'amélioration de photos et la création de contenus visuels par intelligence artificielle pour les commerces de Polynésie.</p>
          <p>En parcourant votre page Google, j'ai remarqué que vos photos pourraient bénéficier d'une mise en valeur professionnelle. Voici ce que nous pourrions faire :</p>
          <ul style="margin:12px 0; padding-left:20px; list-style:disc;">
            <li>✨ Photos de plats ultra-professionnelles</li>
            <li>🎬 Clip vidéo promotionnel (15-30s)</li>
            <li>📱 Visuels optimisés réseaux sociaux</li>
          </ul>
          <p><strong>Nous proposons un essai gratuit</strong> : envoyez-nous simplement une de vos photos et vous verrez le résultat en quelques secondes.</p>
          <p>Seriez-vous disponible pour un appel rapide cette semaine ?</p>
          <p style="margin-top:20px;">Cordialement,<br><strong style="color:var(--text-primary);">Fred — PropulsIA</strong><br>
          <span style="font-size:0.8rem;">📞 +689 87 73 71 81 | 🌐 propulsia.io</span></p>
        </div>
      </div>
    `;
    showToast('✅', 'Message généré par PropulsIA avec succès !');
  }, 2000);
}

// ===========================
// PROPULSIA - Watermark Engine
// Applies brand watermark on free plan exports
// ===========================

/**
 * Applies PropulsIA watermark to an image element or canvas.
 * @param {HTMLImageElement|HTMLCanvasElement} source - The image/canvas to watermark
 * @param {string} planType - 'free' triggers watermark, 'pro'/'enterprise' skips it
 * @returns {HTMLCanvasElement} Canvas with watermark applied (or original if paid plan)
 */
function applyPropulsIAWatermark(source, planType = 'free') {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Get dimensions
  const width = source.naturalWidth || source.width || 800;
  const height = source.naturalHeight || source.height || 600;
  canvas.width = width;
  canvas.height = height;

  // Draw original image
  ctx.drawImage(source, 0, 0, width, height);

  if (planType !== 'free') return canvas; // No watermark for paid plans

  // --- PropulsIA Watermark --- 
  const padding = 14;
  const barHeight = 36;
  const fontSize = Math.max(12, Math.round(height * 0.025));

  // Semi-transparent background strip
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, height - barHeight, width, barHeight);

  // Neon green glow text
  ctx.shadowColor = '#AAFF00';
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#AAFF00';
  ctx.font = `bold ${fontSize}px 'Outfit', sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  ctx.fillText('⚡ PropulsIA', width - padding, height - barHeight / 2);

  // Reset shadow
  ctx.shadowBlur = 0;

  return canvas;
}

/**
 * Watermarks an <img> element in-place (replaces src with watermarked canvas data URL).
 * Call this after image generation on free plan.
 * @param {string} imgId - ID of the <img> element
 * @param {string} planType - 'free' | 'pro' | 'enterprise'
 */
function watermarkImageById(imgId, planType = 'free') {
  if (planType !== 'free') return;
  const img = document.getElementById(imgId);
  if (!img) return;

  img.onload = function() {
    const watermarked = applyPropulsIAWatermark(img, planType);
    img.src = watermarked.toDataURL('image/jpeg', 0.92);
  };

  // If already loaded
  if (img.complete && img.naturalWidth > 0) {
    const watermarked = applyPropulsIAWatermark(img, planType);
    img.src = watermarked.toDataURL('image/jpeg', 0.92);
  }
}

// Auto-apply watermark toast notification on batch completion (free plan)
const _origProcessNext = window._origProcessNextRef;
if (typeof startBatchProcessing === 'function') {
  const _originalStart = startBatchProcessing;
  // Wrap to show watermark notice on free plan
  window.startBatchProcessingWithWatermark = function() {
    _originalStart();
    const currentPlan = localStorage.getItem('propulsia_plan') || 'free';
    if (currentPlan === 'free') {
      setTimeout(() => {
        showToast('⚡', 'Plan Gratuit : logo PropulsIA ajouté en filigrane sur vos exports.');
      }, 1200);
    }
  };
}
