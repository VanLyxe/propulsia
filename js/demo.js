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

  if (!selectedSector) {
    showToast('⚠️', 'Veuillez d\'abord sélectionner un secteur d\'activité.');
    return;
  }

  showToast('⏳', 'Vérification de l\'image par IA... 🤔');

  uploadedImage = file;
  const reader = new FileReader();
  reader.onload = async (e) => {
    const dataUrl = e.target.result;
    
    // Validation avec Gemini
    const result = await validateImageWithGemini(dataUrl, selectedSector);
    
    if (!result.valid) {
      removeImage();
      if (result.error) {
        // Erreur technique
        showImageError(
          'Problème technique',
          result.error,
          null
        );
      } else {
        // Image non conforme au secteur
        const sectorLabel = getSectorLabel(selectedSector);
        const expectedImages = getSectorExpectedImages(selectedSector);
        showImageError(
          `Image non conforme au secteur ${sectorLabel}`,
          result.reason || `L'image que vous avez importée ne correspond pas au secteur « ${sectorLabel} ».`,
          expectedImages
        );
      }
      return;
    }

    // Fermer le modal d'erreur s'il est ouvert
    hideImageError();

    uploadedImageData = dataUrl;
    const previewImg = document.getElementById('previewImg');
    previewImg.src = uploadedImageData;

    document.getElementById('uploadPreview').style.display = 'block';
    document.getElementById('uploadZone').style.display = 'none';

    // Unlock step 3
    const step3 = document.getElementById('step3');
    step3.style.opacity = '1';
    step3.style.pointerEvents = 'auto';
    
    showToast('✅', 'Image validée avec succès par l\'IA ! ✨');
  };
  reader.readAsDataURL(file);
}

// Fonction de validation d'image via Gemini 3 Flash (via kie.ai proxy)
async function validateImageWithGemini(dataUrl, sector) {
  // Utilise la clé KIE qui fonctionne pour le proxy Gemini sur api.kie.ai
  const apiKey = window.ENV?.KIE_API_KEY;
  if (!apiKey) {
    return { valid: false, error: "Clé API KIE introuvable dans env.js.", reason: null }; 
  }

  const parts = dataUrl.split(',');
  const mimeType = parts[0].match(/:(.*?);/)[1];
  const base64Data = parts[1];
  const sectorLabel = getSectorLabel(sector);
  const expectedImages = getSectorExpectedImages(sector);

  const sectorRules = getSectorValidationRules(sector);

  const prompt = `Tu es un système strict de validation d'images pour une plateforme marketing.
L'utilisateur a sélectionné le secteur d'activité : "${sectorLabel}".

Voici les SEULS types d'images acceptés pour ce secteur :
${sectorRules}

Analyse l'image fournie et détermine si elle correspond à AU MOINS UN des critères listés ci-dessus.
Si l'image ne correspond à AUCUN de ces critères, elle doit être rejetée.

Réponds UNIQUEMENT avec un JSON valide (sans markdown, sans backticks) dans ce format exact :
{"valid": true} ou {"valid": false, "reason": "Explication courte en français de pourquoi l'image ne correspond pas au secteur"}

Ne donne aucune autre réponse que le JSON.`;

  try {
    const response = await fetch("https://api.kie.ai/gemini/v1/models/gemini-3-flash-v1betamodels:streamGenerateContent", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        stream: true,
        contents: [{
          role: "user",
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      let statusString = response.status.toString();
      return { valid: false, error: `API Gemini (${statusString}): ${errText.substring(0,120)}`, reason: null };
    }
    
    // Lire le body complet en texte pour le parser de manière robuste
    const rawBody = await response.text();
    console.log("Gemini raw body:", rawBody);

    // Extraire le texte Gemini depuis différents formats possibles de réponse
    let fullText = "";

    // Helper : extraire le texte d'un objet réponse Gemini
    function extractTextFromGeminiObj(obj) {
      return obj?.candidates?.[0]?.content?.parts
        ?.filter(p => p.text)
        ?.map(p => p.text)
        ?.join("") ?? "";
    }

    // Stratégie 1 : JSON simple (réponse non-stream)
    try {
      const json = JSON.parse(rawBody);
      if (Array.isArray(json)) {
        // Tableau de chunks SSE
        fullText = json.map(extractTextFromGeminiObj).join("");
      } else {
        fullText = extractTextFromGeminiObj(json);
      }
    } catch {
      // Stratégie 2 : lignes SSE (data: {...}) ou JSON par ligne
      const lines = rawBody.split("\n").filter(Boolean);
      for (const rawLine of lines) {
        let line = rawLine.trim();
        // Retirer le préfixe SSE "data: "
        if (line.startsWith("data:")) {
          line = line.substring(5).trim();
        }
        if (line === "[DONE]" || line === "") continue;
        try {
          const json = JSON.parse(line);
          fullText += extractTextFromGeminiObj(json);
        } catch { /* ligne partielle, on continue */ }
      }
    }

    if (!fullText) {
       console.error("Gemini : aucun texte extrait. Body brut:", rawBody.substring(0, 500));
       return { valid: false, error: "Analyse bloquée (réponse vide ou format inattendu).", reason: null };
    }

    console.log("Gemini texte extrait:", fullText);

    // Parse la réponse JSON de Gemini (le modèle doit répondre {"valid": true/false})
    try {
      const cleaned = fullText.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return { 
        valid: parsed.valid === true, 
        error: null, 
        reason: parsed.reason || null 
      };
    } catch (parseErr) {
      // Fallback : chercher des indices dans la réponse texte brute
      console.warn("Gemini n'a pas répondu en JSON pur, fallback texte:", fullText);
      const lower = fullText.toLowerCase();
      if (lower.includes('"valid": true') || lower.includes('"valid":true')) {
        return { valid: true, error: null, reason: null };
      }
      // Extraire la raison si possible
      const reasonMatch = fullText.match(/"reason"\s*:\s*"([^"]+)"/);
      return { 
        valid: false, 
        error: null, 
        reason: reasonMatch ? reasonMatch[1] : "L'image ne semble pas correspondre au secteur sélectionné." 
      };
    }
  } catch (error) {
    console.error("Erreur validateImageWithGemini:", error);
    return { valid: false, error: error.message, reason: null };
  }
}

// Retourne les règles de validation détaillées pour chaque secteur (utilisé dans le prompt Gemini)
function getSectorValidationRules(sector) {
  const rules = {
    restaurant: `- Un plat cuisiné ou de la nourriture présentée
- Une boisson (verre, cocktail, bouteille sur une table, etc.)
- Un bâtiment vu de l'intérieur dans lequel on voit des tables et des chaises en nombre (caractéristique d'un restaurant)
- Un bâtiment vu de l'intérieur dans lequel on voit un bar / comptoir`,
    immobilier: `- Tout type de bâtiment, que ce soit vu de l'extérieur ou de l'intérieur
- Même un bâtiment en ruine, en construction, ou détruit est accepté
- Maisons, appartements, immeubles, villas, façades, pièces à vivre, jardins`,
    auto: `- Tout type de véhicule : voiture, moto, camion, scooter, vélo, etc.
- Un bâtiment dans lequel on peut voir des véhicules (garage, concession, atelier mécanique, parking)`,
    hotel: `- Un bâtiment vu de l'intérieur montrant des chambres d'hôtel
- Un bâtiment vu de l'intérieur montrant des salles de bains
- Un bâtiment vu de l'intérieur montrant une réception / accueil / lobby`,
    coiffure: `- Des personnes qui montrent leur coiffure ou se font coiffer
- Un bâtiment vu de l'intérieur avec des sièges face à des miroirs et du matériel de coiffure`
  };
  return rules[sector] || 'Images en rapport avec le secteur';
}

// Retourne un résumé des images attendues pour l'affichage dans le modal d'erreur
function getSectorExpectedImages(sector) {
  const expected = {
    restaurant: 'Plats, boissons, intérieur de restaurant avec tables/chaises, bar ou comptoir',
    immobilier: 'Tout type de bâtiment (intérieur ou extérieur, même en ruine ou en construction)',
    auto: 'Véhicules de tout genre, garages, concessions, ateliers avec véhicules',
    hotel: "Intérieur de bâtiment avec chambres, salles de bains, ou réception/lobby",
    coiffure: 'Personnes montrant leur coiffure, intérieur de salon avec sièges face à des miroirs et matériel de coiffure'
  };
  return expected[sector] || 'Images en rapport avec le secteur';
}

// Affiche le modal d'erreur d'image
function showImageError(title, reason, expectedImages) {
  let modal = document.getElementById('imageErrorModal');
  
  // Créer le modal s'il n'existe pas
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'imageErrorModal';
    modal.className = 'image-error-modal';
    document.body.appendChild(modal);
  }

  const expectedHtml = expectedImages 
    ? `<div class="image-error-expected">
        <strong>📋 Images acceptées pour ce secteur :</strong>
        <p>${expectedImages}</p>
      </div>` 
    : '';

  modal.innerHTML = `
    <div class="image-error-backdrop" onclick="hideImageError()"></div>
    <div class="image-error-content glass-card">
      <button class="image-error-close" onclick="hideImageError()">✕</button>
      <div class="image-error-icon">🚫</div>
      <h3 class="image-error-title">${title}</h3>
      <p class="image-error-reason">${reason}</p>
      ${expectedHtml}
      <div class="image-error-actions">
        <button class="btn btn-primary" onclick="hideImageError(); document.getElementById('fileInput').click();">📸 Choisir une autre image</button>
        <button class="btn btn-secondary" onclick="hideImageError()">Fermer</button>
      </div>
    </div>
  `;

  modal.classList.add('active');
  // Aussi montrer un toast pour feedback
  showToast('🚫', 'Image rejetée — elle ne correspond pas au secteur.');
}

// Cache le modal d'erreur
function hideImageError() {
  const modal = document.getElementById('imageErrorModal');
  if (modal) {
    modal.classList.remove('active');
  }
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

  // Vérification du quota d'images
  if (typeof QuotaService !== 'undefined') {
    const quota = await QuotaService.canGenerateImage();
    if (!quota.allowed) {
      showToast('🚫', `Limite atteinte ! Vous avez utilisé vos ${quota.limit} générations d'images ce mois-ci. Passez au Pro pour un accès illimité.`);
      return;
    }
    if (quota.remaining !== '∞') {
      showToast('📊', `Génération ${quota.used + 1}/${quota.limit} ce mois-ci`);
    }
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

async function showResult(generatedImageUrl, durationInSeconds) {
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

  // --- Déterminer si le filigrane est nécessaire ---
  let needsWatermark = false;
  if (typeof QuotaService !== 'undefined') {
    try {
      await QuotaService.recordImageGeneration();
      needsWatermark = await QuotaService.shouldApplyWatermark();
    } catch (e) {
      console.warn('Quota recording failed:', e.message);
      needsWatermark = true; // Par défaut, appliquer le filigrane
    }
  }

  // --- Toujours télécharger l'image en blob (évite CORS pour canvas et upload) ---
  lastGeneratedPublicUrl = generatedImageUrl; // Sauvegarder l'URL publique pour la vidéo
  let imageBlob = null;
  let blobUrl = null;
  try {
    const response = await fetch(generatedImageUrl);
    imageBlob = await response.blob();
    blobUrl = URL.createObjectURL(imageBlob);
  } catch (e) {
    console.warn('Fetch image failed, fallback URL directe:', e.message);
  }

  if (needsWatermark && blobUrl) {
    // Appliquer le filigrane via canvas
    const tempImg = new Image();
    tempImg.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const w = tempImg.naturalWidth;
      const h = tempImg.naturalHeight;
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(tempImg, 0, 0, w, h);

      // Filigrane centré en diagonale
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(-Math.PI / 6);
      const fontSize = Math.max(40, Math.round(Math.min(w, h) * 0.12));
      ctx.font = `bold ${fontSize}px 'Outfit', Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillText('PropulsIA', 0, 0);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.strokeText('PropulsIA', 0, 0);
      ctx.restore();

      const smallFS = Math.max(12, Math.round(h * 0.02));
      ctx.font = `bold ${smallFS}px 'Outfit', Arial, sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = 'rgba(170, 255, 0, 0.5)';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText('⚡ PropulsIA — Plan Gratuit', w - 10, h - 10);
      ctx.shadowBlur = 0;

      afterImg.src = canvas.toDataURL('image/jpeg', 0.92);
      URL.revokeObjectURL(blobUrl);
    };
    tempImg.src = blobUrl;
    showToast('⚡', 'Plan Gratuit : filigrane PropulsIA appliqué. Passez au Pro pour le retirer.');
  } else if (blobUrl) {
    afterImg.src = blobUrl;
  } else {
    afterImg.src = generatedImageUrl;
  }

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

  // 🔥 Sauvegarde automatique vers Supabase — utilise le blob déjà téléchargé
  if (typeof StorageService !== 'undefined' && imageBlob) {
    const metadata = {
      sector: selectedSector,
      style: getStyleLabel(),
      format: document.getElementById('outputFormat')?.value?.toUpperCase() || '2K',
      duration: durationInSeconds
    };
    StorageService.autoSaveBlob(imageBlob, metadata)
      .then(result => {
        if (result) console.log('✅ Image sauvegardée dans Supabase:', result.url);
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
let lastGeneratedPublicUrl = ""; // URL publique KIE originale (pas le blob)

async function generateVideoDemo() {
  const afterImg = document.getElementById('afterImage');
  if (!afterImg || !afterImg.src || afterImg.src === window.location.href) {
    showToast('⚠️', 'Veuillez d\'abord générer une image avant de créer une vidéo.');
    return;
  }

  // Vérification du quota de vidéos
  if (typeof QuotaService !== 'undefined') {
    const quota = await QuotaService.canGenerateVideo();
    if (!quota.allowed) {
      showToast('🚫', `Limite atteinte ! Vous avez utilisé vos ${quota.limit} génération(s) de vidéo ce mois-ci. Passez au Pro pour plus.`);
      return;
    }
    if (quota.remaining !== '∞') {
      showToast('📊', `Vidéo ${quota.used + 1}/${quota.limit} ce mois-ci`);
    }
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
    // Utiliser l'URL publique KIE originale (pas le blob)
    videoImg1Url = lastGeneratedPublicUrl || afterImg.src;
    document.getElementById('videoImg1').src = afterImg.src;

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

    // Enregistrer la génération vidéo dans le quota
    if (typeof QuotaService !== 'undefined') {
      await QuotaService.recordVideoGeneration();
    }

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
