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

    // Show loading bar instead of upload zone
    document.getElementById('uploadZone').style.display = 'none';
    document.getElementById('uploadLoading').style.display = 'block';
    
    // Simulate progress
    const progressBar = document.getElementById('uploadProgressBar');
    const percentText = document.getElementById('uploadProgressPercent');
    let uploadProg = 10;
    progressBar.style.width = '10%';
    percentText.textContent = '10%';
    
    const loadInt = setInterval(() => {
      if (uploadProg < 92) {
        uploadProg += Math.floor(Math.random() * 8) + 2;
        progressBar.style.width = uploadProg + '%';
        percentText.textContent = uploadProg + '%';
      }
    }, 400);
    
    // Validation avec Gemini
    const result = await validateImageWithGemini(dataUrl, selectedSector);
    
    clearInterval(loadInt);
    progressBar.style.width = '100%';
    percentText.textContent = '100%';
    
    // Slight delay so the user sees 100%
    setTimeout(() => {
      document.getElementById('uploadLoading').style.display = 'none';

      if (!result.valid) {
        removeImage();
        if (result.error) {
          showImageError('Problème technique', result.error, null);
        } else {
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

      // Unlock step 3
      const step3 = document.getElementById('step3');
      step3.style.opacity = '1';
      step3.style.pointerEvents = 'auto';
      
      showToast('✅', 'Image validée avec succès par l\'IA ! ✨');
    }, 400);
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
  document.getElementById('uploadLoading').style.display = 'none';
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

async function pollKieApiTask(taskId, options = {}) {
  const {
    progressBar = document.getElementById('scanProgress'),
    percentText = document.getElementById('scanPercent'),
    descElement = document.getElementById('scanDesc'),
    initialProgress = 30,
    descText = 'Génération en cours (jusqu\'à 30s)...',
    timeoutMs = 10 * 60 * 1000 // 10 minutes par défaut
  } = options;

  if (descElement && descText) {
    descElement.textContent = descText;
  }
  let progress = initialProgress;
  const startTime = Date.now();
  let errorCount = 0;
  let delay = 3000; // Exponential backoff

  while (true) {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error("L'API est actuellement surchargée (délai dépassé). Veuillez réessayer plus tard.");
    }

    await new Promise(r => setTimeout(r, delay));
    delay = Math.min(delay * 1.3, 8000); // augmente le délai jusqu'à 8s max

    if (progress < 90) {
      // Ralentir visuellement la progression pour correspondre aux longs délais
      progress += Math.floor(Math.random() * 3) + 1;
      if (progressBar) progressBar.style.width = `${progress}%`;
      if (percentText) percentText.textContent = `${progress}%`;
    }

    try {
      const response = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${KIE_API_KEY}`
        }
      });

      if (!response.ok) {
        errorCount++;
        if (errorCount > 5) throw new Error("Trop d'erreurs réseau avec l'API KIE.");
        continue;
      }
      
      errorCount = 0; // reset on success

      const data = await response.json();
      if (data.code === 200 && data.data) {
        const state = data.data.state;
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`⏳ Poll [${elapsed}s]: state="${state}", taskId="${taskId}"`);
        
        // Mettre à jour le texte de description avec l'état
        if (descElement) {
          const stateLabels = {
            'waiting': 'En file d\'attente...',
            'queuing': 'Dans la file de traitement...',
            'generating': 'Génération en cours...'
          };
          if (stateLabels[state]) descElement.textContent = stateLabels[state];
        }

        if (state === "success") {
          const resultJson = JSON.parse(data.data.resultJson);
          console.log("✅ Résultat:", resultJson);
          return resultJson.resultUrls[0];
        } else if (state === "fail") {
          console.error("❌ Échec:", data.data);
          throw new Error(`La tâche a échoué: ${data.data.failMsg || 'Erreur GPU ou Serveur'}`);
        }
      }
    } catch (err) {
      if (err.message.includes("surchargée") || err.message.includes("failMsg") || err.message.includes("réseau")) {
        throw err;
      }
      // Other generic fetch errors (like CORS, network loss locally)
      errorCount++;
      if (errorCount > 5) throw new Error("Connexion perdue avec le serveur de génération.");
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

// Polling dédié pour Veo 3.1 — gère la structure resultJson de Veo
async function pollVeoTask(taskId, progressBar, percentText, titleElement) {
  const timeoutMs = 12 * 60 * 1000; // 12 minutes
  const start = Date.now();
  let delay = 5000; // Veo est lent, démarrer à 5s
  let progress = 15;
  let errorCount = 0;

  while (Date.now() - start < timeoutMs) {
    await new Promise(r => setTimeout(r, delay));
    delay = Math.min(delay * 1.4, 15000); // backoff exponentiel, max 15s

    if (progress < 90) {
      progress += Math.floor(Math.random() * 4) + 1;
      if (progressBar) progressBar.style.width = `${progress}%`;
      if (percentText) percentText.textContent = `${progress}%`;
    }

    try {
      const res = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
        headers: { "Authorization": `Bearer ${KIE_API_KEY}` }
      });

      if (!res.ok) {
        errorCount++;
        if (errorCount > 5) throw new Error("Trop d'erreurs réseau lors du polling Veo.");
        continue;
      }

      errorCount = 0;
      const json = await res.json();
      const d = json.data;
      const elapsed = Math.round((Date.now() - start) / 1000);
      console.log(`⏳ Veo Poll [${elapsed}s]: state="${d?.state}", taskId="${taskId}"`);

      const stateLabels = {
        waiting: 'En file d\'attente Veo 3.1...',
        queuing: 'Dans la file de génération...',
        generating: 'Génération de la vidéo en cours...'
      };
      if (titleElement && stateLabels[d?.state]) {
        titleElement.textContent = stateLabels[d.state];
      }

      if (d?.state === 'success') {
        // resultJson est une chaîne JSON : "{\"resultUrls\":[\"...\"]}"
        const parsed = JSON.parse(d.resultJson);
        const url = parsed.resultUrls?.[0];
        if (!url) throw new Error('Veo a réussi mais aucune URL de vidéo retournée.');
        console.log('✅ Veo vidéo prête:', url);
        return url;
      }

      if (d?.state === 'fail') {
        throw new Error(`Veo a échoué : ${d.failMsg || d.failCode || 'Erreur inconnue'}`);
      }

    } catch (err) {
      // Ne pas absorber les erreurs métier (fail, no URL)
      if (
        err.message.includes('Veo a échoué') ||
        err.message.includes('aucune URL') ||
        err.message.includes('erreurs réseau')
      ) throw err;
      errorCount++;
      if (errorCount > 5) throw new Error('Connexion perdue avec le serveur Veo.');
      console.warn('Veo poll fetch error (retry):', err.message);
    }
  }

  throw new Error('La génération Veo 3.1 a dépassé le temps limite (12 min). Réessayez.');
}

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
    // Utiliser l'URL publique KIE originale (pas le blob ni le data: URL)
    videoImg1Url = lastGeneratedPublicUrl || afterImg.src;
    console.log("🎬 Vidéo: URL image source:", videoImg1Url);

    // Vérifier que l'URL est bien publique (pas un blob ni un data: URI)
    if (videoImg1Url.startsWith('blob:')) {
      throw new Error("L'image source est un blob local. Veuillez régénérer l'image avant de créer la vidéo.");
    }
    
    // Si c'est un data: URL (watermark canvas), on doit le re-héberger
    if (videoImg1Url.startsWith('data:')) {
      console.log("🎬 Vidéo: Image source est un data: URL (watermark), re-hébergement...");
      document.getElementById('videoScanTitle').textContent = 'Hébergement de l\'image source...';
      videoImg1Url = await uploadImageToTmpfiles(videoImg1Url);
      console.log("🎬 Vidéo: Image re-hébergée:", videoImg1Url);
    }

    const style = getStyleLabel();
    const sectorLabel = getSectorLabel(selectedSector);

    // Construire un prompt riche en TEXT_2_VIDEO (plus fiable que REFERENCE_2_VIDEO)
    const prompt = `Cinematic slow motion promotional video for a ${sectorLabel} business. Smooth camera movement, professional studio lighting, highly detailed, ${style} style, photorealistic 4K quality. Elegant and visually stunning.`;

    document.getElementById('videoScanTitle').textContent = 'Envoi de la requête à Veo 3.1...';

    // TEXT_2_VIDEO uniquement — fiable et sans dépendance à une URL image publique
    const payload = {
      prompt: prompt,
      model: "veo3_fast",
      generationType: "TEXT_2_VIDEO",
      aspect_ratio: "16:9"
    };

    console.log("🎬 Veo payload:", JSON.stringify(payload, null, 2));

    const response = await fetch("https://api.kie.ai/api/v1/veo/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${KIE_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log("🎬 Veo réponse brute:", responseText);

    if (!response.ok) throw new Error(`API Veo ${response.status}: ${responseText.substring(0, 200)}`);

    const data = JSON.parse(responseText);
    if (data.code !== 200) throw new Error(`Veo API: ${data.msg || JSON.stringify(data)}`);

    const taskId = data.data?.taskId;
    if (!taskId) throw new Error('Pas de taskId retourné par l\'API Veo.');
    console.log("🎬 Veo taskId:", taskId);

    // Polling dédié Veo
    videoImg2Url = await pollVeoTask(
      taskId,
      progressBar,
      percentText,
      document.getElementById('videoScanTitle')
    );

    progressBar.style.width = '100%';
    percentText.textContent = '100%';
    document.getElementById('videoScanTitle').textContent = 'Chargement de la vidéo...';
    console.log("🎬 Vidéo générée URL:", videoImg2Url);

    // --- Affichage du player ---
    const player = document.getElementById('videoResultPlayer');
    player.removeAttribute('src');
    player.innerHTML = '';
    player.style.display = 'block';
    player.load();

    const oldFallback = document.getElementById('videoDirectLink');
    if (oldFallback) oldFallback.remove();
    const oldIframe = document.getElementById('videoIframeFallback');
    if (oldIframe) oldIframe.remove();

    // Méthode 1 : Blob (contourne CORS pour la lecture)
    let videoReady = false;
    try {
      const videoResponse = await fetch(videoImg2Url);
      if (videoResponse.ok) {
        const videoBlob = await videoResponse.blob();
        const videoBlobUrl = URL.createObjectURL(videoBlob);
        console.log("🎬 Blob vidéo créé, taille:", videoBlob.size, "type:", videoBlob.type);
        const source = document.createElement('source');
        source.src = videoBlobUrl;
        source.type = videoBlob.type || 'video/mp4';
        player.appendChild(source);
        player.dataset.blobUrl = videoBlobUrl;
        player.dataset.originalUrl = videoImg2Url;
        player.load();
        videoReady = true;
      }
    } catch (blobErr) {
      console.warn("⚠️ Blob fetch échoué (CORS):", blobErr.message);
    }

    // Méthode 2 : URL directe fallback
    if (!videoReady) {
      const source = document.createElement('source');
      source.src = videoImg2Url;
      source.type = 'video/mp4';
      player.appendChild(source);
      player.dataset.originalUrl = videoImg2Url;
      player.load();
    }

    // Attendre que la vidéo soit prête (max 10s)
    await new Promise((resolve) => {
      const t = setTimeout(resolve, 10000);
      player.addEventListener('canplay', () => { clearTimeout(t); resolve(); }, { once: true });
      player.addEventListener('loadeddata', () => { clearTimeout(t); resolve(); }, { once: true });
      player.addEventListener('error', () => { clearTimeout(t); resolve(); }, { once: true });
    });

    document.getElementById('videoScanningState').style.display = 'none';
    document.getElementById('videoResultState').style.display = 'block';

    try { await player.play(); } catch (e) { console.warn("Autoplay bloqué:", e.message); }

    // Fallback si le player ne fonctionne pas
    if (player.readyState < 2 || player.error) {
      player.style.display = 'none';
      const container = player.parentElement;
      const iframeEl = document.createElement('div');
      iframeEl.id = 'videoIframeFallback';
      iframeEl.style.cssText = 'width:100%; aspect-ratio:16/9;';
      iframeEl.innerHTML = `<iframe src="${videoImg2Url}" style="width:100%;height:100%;border:none;" allowfullscreen></iframe>`;
      container.appendChild(iframeEl);

      const linkDiv = document.createElement('div');
      linkDiv.id = 'videoDirectLink';
      linkDiv.style.cssText = 'text-align:center; margin-top:16px;';
      linkDiv.innerHTML = `
        <p style="color:var(--text-secondary); margin-bottom:12px;">Si la vidéo ne s'affiche pas, ouvrez-la directement :</p>
        <a href="${videoImg2Url}" target="_blank" class="btn btn-secondary">🔗 Ouvrir dans un nouvel onglet</a>
      `;
      document.getElementById('videoResultState').appendChild(linkDiv);
    }

    player.onerror = () => {
      player.style.display = 'none';
      if (!document.getElementById('videoDirectLink')) {
        const linkDiv = document.createElement('div');
        linkDiv.id = 'videoDirectLink';
        linkDiv.style.cssText = 'text-align:center; margin-top:16px;';
        linkDiv.innerHTML = `<a href="${videoImg2Url}" target="_blank" class="btn btn-secondary">🔗 Ouvrir la vidéo dans un nouvel onglet</a>`;
        document.getElementById('videoResultState').appendChild(linkDiv);
      }
    };

    videoBtn.textContent = '✅ Vidéo générée';

    if (typeof QuotaService !== 'undefined') {
      await QuotaService.recordVideoGeneration();
    }

  } catch (error) {
    console.error("Video Gen Error:", error);
    document.getElementById('videoScanningState').style.display = 'none';
    showToast('❌', 'Vidéo: ' + (error.message || 'Erreur inconnue').substring(0, 120));
    videoBtn.disabled = false;
    videoBtn.textContent = '🎥 Réessayer';
  }
}

// Téléchargement sécurisé via Blob pour contourner CORS
async function downloadVideoResult() {
  const player = document.getElementById('videoResultPlayer');
  // Avec l'approche <source>, player.src peut être vide — utiliser dataset ou source
  const originalUrl = player?.dataset?.originalUrl;
  const sourceEl = player?.querySelector('source');
  const videoSrc = originalUrl || player?.src || sourceEl?.src;
  
  if (!player || !videoSrc) {
    showToast('⚠️', 'Aucune vidéo à télécharger.');
    return;
  }

  try {
    showToast('⏳', 'Préparation du format MP4...');
    
    // Utiliser le blob URL déjà stocké, ou re-télécharger si nécessaire
    let blobUrl = player.dataset.blobUrl;
    
    if (!blobUrl) {
      try {
        const response = await fetch(originalUrl || videoSrc);
        const blob = await response.blob();
        blobUrl = URL.createObjectURL(blob);
      } catch (fetchErr) {
        // CORS bloqué - ouvrir directement dans un nouvel onglet
        console.warn("Fetch vidéo échoué, ouverture directe:", fetchErr.message);
        window.open(originalUrl || videoSrc, '_blank');
        showToast('🔗', 'La vidéo s\'ouvre dans un nouvel onglet — faites clic-droit > Enregistrer');
        return;
      }
    }
    
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `propulsia-veo3-video-${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    showToast('⬇️', 'Téléchargement de la vidéo réussi !');
  } catch (err) {
    console.error("Erreur téléchargement vidéo:", err);
    // Dernier fallback : ouvrir l'URL dans un nouvel onglet
    if (originalUrl) {
      window.open(originalUrl, '_blank');
      showToast('🔗', 'La vidéo s\'ouvre dans un nouvel onglet');
    } else {
      showToast('⚠️', 'Le téléchargement a échoué. Essayez clic-droit sur la vidéo.');
    }
  }
}
