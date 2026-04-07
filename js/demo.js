// ===========================
// AGENCE IA - Demo Module
// ===========================

let selectedSector = null;
let uploadedImage = null;
let uploadedImageData = null;

// --- Sector Selection ---
function selectSector(el) {
  // Remove active from all
  document.querySelectorAll('#sectorGrid .sector-card').forEach(card => {
    card.style.borderColor = '';
    card.style.boxShadow = '';
    card.style.background = '';
  });

  // Set active
  el.style.borderColor = 'var(--primary)';
  el.style.boxShadow = '0 0 30px rgba(14, 165, 233, 0.3)';
  selectedSector = el.dataset.sector;

  // Unlock step 2
  const step2 = document.getElementById('step2');
  step2.style.opacity = '1';
  step2.style.pointerEvents = 'auto';
}

// --- Drag & Drop ---
const uploadZone = document.getElementById('uploadZone');

if (uploadZone) {
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('drag-over');
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      processFile(files[0]);
    }
  });
}

function handleFileSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    processFile(files[0]);
  }
}

function processFile(file) {
  if (file.size > 10 * 1024 * 1024) {
    showToast('⚠️', 'L\'image ne doit pas dépasser 10 Mo.');
    return;
  }

  uploadedImage = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    uploadedImageData = e.target.result;
    const previewImg = document.getElementById('previewImg');
    previewImg.src = uploadedImageData;

    document.getElementById('uploadPreview').style.display = 'block';
    document.getElementById('uploadZone').style.display = 'none';

    // Unlock step 3
    const step3 = document.getElementById('step3');
    step3.style.opacity = '1';
    step3.style.pointerEvents = 'auto';
  };
  reader.readAsDataURL(file);
}

function removeImage() {
  uploadedImage = null;
  uploadedImageData = null;
  document.getElementById('previewImg').src = '';
  document.getElementById('uploadPreview').style.display = 'none';
  document.getElementById('uploadZone').style.display = 'block';
  document.getElementById('fileInput').value = '';

  // Lock step 3
  const step3 = document.getElementById('step3');
  step3.style.opacity = '0.4';
  step3.style.pointerEvents = 'none';
}

// --- AI Analysis Integration (Nano Banana 2 API) ---
const KIE_API_KEY = window.ENV?.KIE_API_KEY; // Loaded from js/env.js, do not expose in production

async function startAnalysis() {
  if (!selectedSector) {
    showToast('⚠️', 'Veuillez sélectionner un secteur d\'activité.');
    return;
  }
  if (!uploadedImageData) {
    showToast('⚠️', 'Veuillez importer une image.');
    return;
  }

  // Show step 4
  const step4 = document.getElementById('step4');
  step4.style.display = 'block';
  step4.scrollIntoView({ behavior: 'smooth' });

  // Show scanning state
  document.getElementById('scanningState').style.display = 'block';
  document.getElementById('resultState').style.display = 'none';

  const progressBar = document.getElementById('scanProgress');
  const percentText = document.getElementById('scanPercent');
  document.getElementById('scanEmoji').textContent = '🤖';
  document.getElementById('scanTitle').textContent = 'Analyse KIE AI en cours...';
  document.getElementById('scanDesc').textContent = 'Communication avec Nano Banana 2...';
  progressBar.style.width = '10%';
  percentText.textContent = '10%';

  const startTime = Date.now();

  try {
    document.getElementById('scanDesc').textContent = 'Hébergement temporaire de l\'image...';
    // L'API KIE nécessite une URL publique, nous hébergeons temporairement l'image
    const publicImageUrl = await uploadImageToTmpfiles(uploadedImageData);

    document.getElementById('scanDesc').textContent = 'Communication avec Nano Banana 2...';
    const imageUrl = await runKieApiEnhancement(publicImageUrl, selectedSector);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    progressBar.style.width = '100%';
    percentText.textContent = '100%';
    document.getElementById('scanTitle').textContent = 'Terminé ! Image sublimée prête.';
    document.getElementById('scanDesc').textContent = 'Génération réussie.';

    setTimeout(() => showResult(imageUrl, duration), 1000);
  } catch (error) {
    console.error("API Error:", error);
    document.getElementById('scanEmoji').textContent = '❌';
    document.getElementById('scanTitle').textContent = 'Erreur lors de la génération';
    document.getElementById('scanDesc').textContent = error.message.substring(0, 100);
    progressBar.style.background = '#ef4444';
  }
}

async function uploadImageToTmpfiles(dataUrl) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const formData = new FormData();
  formData.append('file', blob, 'image.jpg');

  const uploadRes = await fetch('https://tmpfiles.org/api/v1/upload', {
    method: 'POST',
    body: formData
  });
  const data = await uploadRes.json();
  if (data.status === 'success') {
    return data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
  }
  throw new Error("Erreur de proxy d'image temporaire.");
}

async function runKieApiEnhancement(publicImageUrl, sector) {
  const style = getStyleLabel();
  const sectorLabel = getSectorLabel(sector);
  const prompt = `Professional high-end commercial photo shoot, highly detailed, visually stunning, studio lighting, 8k resolution photography, for a ${sectorLabel} business, in a ${style} style. Photorealistic, crisp focus, excellent composition.`;

  const formatVal = document.getElementById('outputFormat')?.value || '2k';
  const resolution = formatVal === '4k' ? '4K' : '2K';

  const payload = {
    model: "nano-banana-2",
    input: {
      prompt: prompt,
      image_input: [publicImageUrl],
      aspect_ratio: "auto",
      resolution: resolution,
      output_format: "jpg"
    }
  };

  document.getElementById('scanDesc').textContent = 'Création de la tâche de rendu...';

  const response = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${KIE_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (data.code !== 200) {
    throw new Error(data.msg || "Échec de la création de la tâche");
  }

  const taskId = data.data.taskId;
  return pollKieApiTask(taskId);
}

async function pollKieApiTask(taskId) {
  const progressBar = document.getElementById('scanProgress');
  const percentText = document.getElementById('scanPercent');
  document.getElementById('scanDesc').textContent = 'Génération Nano Banana en cours (jusqu\'à 30s)...';
  let progress = 30;

  while (true) {
    await new Promise(r => setTimeout(r, 3000)); // Poll every 3 seconds

    if (progress < 90) {
      progress += Math.floor(Math.random() * 8) + 2;
      progressBar.style.width = `${progress}%`;
      percentText.textContent = `${progress}%`;
    }

    const response = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${KIE_API_KEY}`
      }
    });

    if (!response.ok) continue;

    const data = await response.json();
    if (data.code === 200 && data.data) {
      const state = data.data.state;
      if (state === "success") {
        const resultJson = JSON.parse(data.data.resultJson);
        return resultJson.resultUrls[0];
      } else if (state === "fail") {
        throw new Error(`La tâche a échoué: ${data.data.failMsg || 'Erreur GPU ou Serveur'}`);
      }
    }
  }
}

function showResult(generatedImageUrl, durationInSeconds) {
  document.getElementById('scanningState').style.display = 'none';
  document.getElementById('resultState').style.display = 'block';

  // Set before/after images
  const beforeImg = document.getElementById('beforeImage');
  const afterImg = document.getElementById('afterImage');
  const baSlider = document.getElementById('baSlider');
  const previewImg = document.getElementById('previewImg');

  if (previewImg && previewImg.naturalWidth) {
    baSlider.style.aspectRatio = `${previewImg.naturalWidth} / ${previewImg.naturalHeight}`;
  }

  beforeImg.src = uploadedImageData;
  afterImg.src = generatedImageUrl;

  // Wait for the new AI image to load to set matching dimensions for the before image container
  afterImg.onload = () => {
    beforeImg.style.width = afterImg.offsetWidth + 'px';
    beforeImg.style.height = afterImg.offsetHeight + 'px';
    beforeImg.style.minWidth = afterImg.offsetWidth + 'px';
  };

  // Set info strip
  document.getElementById('infoSector').textContent = getSectorLabel(selectedSector);
  document.getElementById('infoFormat').textContent = document.getElementById('outputFormat').value.toUpperCase();
  document.getElementById('infoStyle').textContent = getStyleLabel();
  document.getElementById('infoTime').textContent = durationInSeconds + 's';

  // Init slider
  initBeforeAfterSlider();

  // Show scan overlay animation
  const overlay = document.getElementById('scanOverlay');
  overlay.classList.add('active');
  setTimeout(() => overlay.classList.remove('active'), 2500);

  // 🔥 Sauvegarde automatique vers Supabase en arrière-plan
  const metadata = {
    sector: selectedSector,
    style: getStyleLabel(),
    format: document.getElementById('outputFormat')?.value?.toUpperCase() || '2K',
    duration: durationInSeconds
  };

  if (typeof StorageService !== 'undefined') {
    StorageService.autoSave(generatedImageUrl, metadata)
      .then(result => {
        if (result) {
          console.log('✅ Image auto-sauvegardée dans Supabase:', result.url);
        }
      })
      .catch(err => console.warn('Auto-save échoué:', err.message));
  }
}

// --- Before / After Slider ---
function initBeforeAfterSlider() {
  const slider = document.getElementById('baSlider');
  const before = document.getElementById('baBefore');
  const handle = document.getElementById('baHandle');

  if (!slider) return;

  let isDragging = false;

  function updateSlider(x) {
    const rect = slider.getBoundingClientRect();
    let pos = (x - rect.left) / rect.width;
    pos = Math.max(0.02, Math.min(0.98, pos));

    before.style.width = (pos * 100) + '%';
    handle.style.left = (pos * 100) + '%';
  }

  slider.addEventListener('mousedown', (e) => {
    isDragging = true;
    updateSlider(e.clientX);
  });

  window.addEventListener('mousemove', (e) => {
    if (isDragging) {
      updateSlider(e.clientX);
    }
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Touch support
  slider.addEventListener('touchstart', (e) => {
    isDragging = true;
    updateSlider(e.touches[0].clientX);
  });

  slider.addEventListener('touchmove', (e) => {
    if (isDragging) {
      e.preventDefault();
      updateSlider(e.touches[0].clientX);
    }
  });

  slider.addEventListener('touchend', () => {
    isDragging = false;
  });
}

// --- Download Result ---
function downloadResult() {
  const afterImg = document.getElementById('afterImage');
  if (!afterImg?.src) return;

  const link = document.createElement('a');
  link.download = `agence-ia-${selectedSector}-${Date.now()}.jpg`;
  link.href = afterImg.src;
  link.click();

  showToast('✅', 'Image téléchargée avec succès !');
}

// --- Save to Gallery (Supabase Storage) ---
async function saveToGallery() {
  const afterImg = document.getElementById('afterImage');
  if (!afterImg?.src) {
    showToast('⚠️', 'Aucune image à sauvegarder.');
    return;
  }

  const btn = event.target;
  const originalText = btn.textContent;
  btn.textContent = '⏳ Sauvegarde...';
  btn.disabled = true;

  try {
    const metadata = {
      sector: selectedSector,
      style: getStyleLabel(),
      format: document.getElementById('outputFormat').value.toUpperCase(),
      duration: document.getElementById('infoTime').textContent.replace('s', '')
    };

    // Sauvegarder UNIQUEMENT l'image générée
    await StorageService.saveGeneratedImage(afterImg.src, metadata);
  } catch (error) {
    console.error('Save error:', error);
    showToast('⚠️', 'Erreur lors de la sauvegarde: ' + error.message);
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

// --- Share ---
function shareResult() {
  if (navigator.share) {
    navigator.share({
      title: 'Résultat Agence IA',
      text: `Découvrez la transformation IA pour le secteur ${getSectorLabel(selectedSector)} !`,
      url: window.location.href
    });
  } else {
    navigator.clipboard.writeText(window.location.href);
    showToast('🔗', 'Lien copié dans le presse-papier !');
  }
}

// --- Reset ---
function resetDemo() {
  // Reset sector
  document.querySelectorAll('#sectorGrid .sector-card').forEach(card => {
    card.style.borderColor = '';
    card.style.boxShadow = '';
  });
  selectedSector = null;

  // Reset upload
  removeImage();

  // Lock steps
  document.getElementById('step2').style.opacity = '0.4';
  document.getElementById('step2').style.pointerEvents = 'none';
  document.getElementById('step3').style.opacity = '0.4';
  document.getElementById('step3').style.pointerEvents = 'none';
  document.getElementById('step4').style.display = 'none';

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- Helpers ---
function getSectorLabel(sector) {
  const labels = {
    restaurant: '🍽️ Restaurant',
    immobilier: '🏠 Immobilier',
    auto: '🚗 Auto-Moto',
    hotel: '🏨 Hôtellerie',
    coiffure: '💇 Coiffure'
  };
  return labels[sector] || sector;
}

function getStyleLabel() {
  const val = document.getElementById('outputStyle')?.value;
  const labels = {
    enhanced: 'Amélioré',
    vibrant: 'Vibrant',
    cinematic: 'Cinématique',
    luxury: 'Luxe',
    tropical: 'Tropical'
  };
  return labels[val] || val;
}

// --- Video Demo Feature ---
let videoImg1Url = "";
let videoImg2Url = "";

async function generateVideoDemo() {
  const afterImg = document.getElementById('afterImage');
  if (!afterImg || !afterImg.src || afterImg.src === window.location.href) {
    showToast('⚠️', 'Veuillez d\'abord générer une image avant de créer une vidéo.');
    return;
  }

  // Unlock & Show Step 5
  document.getElementById('step5').style.display = 'block';
  document.getElementById('step5').scrollIntoView({ behavior: 'smooth' });

  document.getElementById('videoScanningState').style.display = 'block';
  document.getElementById('videoResultState').style.display = 'none';

  const videoBtn = document.getElementById('generateVideoBtn');
  videoBtn.disabled = true;
  videoBtn.textContent = '⏳ Génération...';

  const progressBar = document.getElementById('videoScanProgress');
  const percentText = document.getElementById('videoScanPercent');
  progressBar.style.width = '10%';
  percentText.textContent = '10%';

  try {
    videoImg1Url = afterImg.src;
    document.getElementById('videoImg1').src = videoImg1Url;

    // Animate progress slightly while we wait
    let progress = 10;
    const interval = setInterval(() => {
      if (progress < 90) {
        progress += Math.floor(Math.random() * 5);
        progressBar.style.width = progress + '%';
        percentText.textContent = progress + '%';
      }
    }, 2000);

    // Prompt for 2nd angle
    const style = getStyleLabel();
    const sectorLabel = getSectorLabel(selectedSector);
    const prompt = `Same identical scene as reference, but from a DIFFERENT camera angle. Wide shot, cinematic camera movement, visually stunning, 8k resolution, for a ${sectorLabel} business, in a ${style} style. Photorealistic.`;

    // We assume publicImageUrl is still valid or we pass the base64 again. But since we have the tmpfiles URL if the user hasn't refreshed:
    // We need to re-upload the afterImage just in case, but since afterImage is already a URL from KIE, we can pass it directly!
    // KIE returns a public URL in resultUrls. Let's pass it directly.
    const payload = {
      model: "nano-banana-2",
      input: {
        prompt: prompt,
        image_input: [videoImg1Url],
        aspect_ratio: "16:9", // Force 16:9 for video
        resolution: "2K",
        output_format: "jpg"
      }
    };

    const response = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${KIE_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error("Erreur de l'API KIE");
    const data = await response.json();
    if (data.code !== 200) throw new Error("Échec createTask");

    videoImg2Url = await pollKieApiTask(data.data.taskId);
    clearInterval(interval);

    progressBar.style.width = '100%';
    percentText.textContent = '100%';

    document.getElementById('videoImg2').src = videoImg2Url;

    setTimeout(() => {
      document.getElementById('videoScanningState').style.display = 'none';
      document.getElementById('videoResultState').style.display = 'block';
      playVideoAnimation();
      videoBtn.textContent = '✅ Vidéo générée';
    }, 1000);

  } catch (error) {
    console.error("Video Gen Error:", error);
    showToast('❌', 'Erreur lors de la création de la vidéo');
    videoBtn.disabled = false;
    videoBtn.textContent = '🎥 Réessayer';
  }
}

function playVideoAnimation() {
  const container = document.getElementById('videoContainer');

  // Remove class to reset animation
  container.classList.remove('video-animate');
  // Trigger reflow
  void container.offsetWidth;
  // Add class to restart
  container.classList.add('video-animate');
}

function replayVideo() {
  playVideoAnimation();
}
