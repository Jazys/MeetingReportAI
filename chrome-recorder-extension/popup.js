// Variables pour le timer et les statistiques
let startTime;
let timerInterval;
let statsInterval;

// Éléments de l'interface
const startButton = document.getElementById("startRecord");
const stopButton = document.getElementById("stopRecord");
const permissionStatus = document.getElementById("permissionStatus");
const timerElement = document.getElementById("timer");
const statsElement = document.getElementById("recording-stats");
const transcriptionSection = document.getElementById("transcription-section");
const transcriptionText = document.getElementById("transcription-text");

// Éléments pour les sections dépliables
const toggleApiSection = document.getElementById("toggleApiSection");
const apiKeySection = document.getElementById("apiKeySection");
const apiArrow = document.getElementById("apiArrow");
const toggleAudioSection = document.getElementById("toggleAudioSection");
const audioSettingsSection = document.getElementById("audioSettingsSection");
const audioArrow = document.getElementById("audioArrow");
const toggleApiVisibility = document.getElementById("toggleApiVisibility");
const apiKeyInput = document.getElementById("apiKey");
const notification = document.getElementById("notification");

// Éléments pour la section informations réunion
const toggleMeetingSection = document.getElementById("toggleMeetingSection");
const meetingInfoSection = document.getElementById("meetingInfoSection");
const meetingArrow = document.getElementById("meetingArrow");
const meetingAttendees = document.getElementById("meetingAttendees");
const meetingContext = document.getElementById("meetingContext");
const saveMeetingInfo = document.getElementById("saveMeetingInfo");

// Éléments pour la configuration API
const apiEndpointInput = document.getElementById("apiEndpoint");

// Ajouter les éléments pour la section debug
const toggleDebugSection = document.getElementById("toggleDebugSection");
const debugSection = document.getElementById("debugSection");
const debugArrow = document.getElementById("debugArrow");
const debugCurrentUrl = document.getElementById("debugCurrentUrl");
const debugFileName = document.getElementById("debugFileName");
const debugLogs = document.getElementById("debugLogs");

// Charger la clé API depuis Chrome storage au démarrage
async function loadApiKey() {
  try {
    console.log("Loading API configuration from Chrome storage");
    const result = await chrome.storage.sync.get(['apiKey', 'apiEndpoint', 'userEmail']);
    
    if (result.apiKey) {
      console.log("API key loaded successfully");
      document.getElementById("apiKey").value = result.apiKey;
    }
    
    if (result.apiEndpoint) {
      console.log("API endpoint loaded successfully");
      document.getElementById("apiEndpoint").value = result.apiEndpoint;
    } else {
      // Définir l'URL par défaut
      document.getElementById("apiEndpoint").value = "https://assistant.ai.omvpb.ovh/api/transcribe";
    }
    
    if (result.userEmail) {
      console.log("Email loaded successfully");
      document.getElementById("userEmail").value = result.userEmail;
    }
  } catch (error) {
    console.error("Error loading API configuration:", error);
  }
}

// Charger les informations de réunion depuis Chrome storage
async function loadMeetingInfo() {
  try {
    console.log("Loading meeting info from Chrome storage");
    const result = await chrome.storage.sync.get(['meetingAttendees', 'meetingContext']);
    
    if (result.meetingAttendees) {
      console.log("Meeting attendees loaded successfully");
      meetingAttendees.value = result.meetingAttendees;
    }
    
    if (result.meetingContext) {
      console.log("Meeting context loaded successfully");
      meetingContext.value = result.meetingContext;
    }
  } catch (error) {
    console.error("Error loading meeting info:", error);
  }
}

// Charger les données au démarrage
loadApiKey();
loadMeetingInfo();

// Fonction pour afficher une notification
function showNotification(message, isSuccess = true) {
  notification.textContent = message;
  notification.classList.remove("hidden", "bg-green-100", "text-green-800", "bg-red-100", "text-red-800");
  
  if (isSuccess) {
    notification.classList.add("bg-green-100", "text-green-800");
  } else {
    notification.classList.add("bg-red-100", "text-red-800");
  }
  
  notification.classList.remove("hidden");
  
  setTimeout(() => {
    notification.classList.add("hidden");
  }, 3000);
}

// Fonction pour afficher une erreur
function showError(message) {
  permissionStatus.textContent = message;
  permissionStatus.classList.remove("hidden");
}

// Fonction pour masquer l'erreur
function hideError() {
  permissionStatus.classList.add("hidden");
}

// Vérifier les permissions du microphone
async function checkMicrophonePermission() {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    return true;
  } catch (error) {
    return false;
  }
}

// Mettre à jour l'interface selon l'état d'enregistrement
async function updateInterface(isRecording) {
  if (isRecording) {
    startButton.classList.add("hidden");
    stopButton.classList.remove("hidden");
    timerElement.classList.remove("hidden");
    statsElement.classList.add("hidden");
    
    // Désactiver les boutons de configuration pendant l'enregistrement
    toggleApiSection.disabled = true;
    toggleApiSection.classList.add("opacity-50", "cursor-not-allowed");
    toggleAudioSection.disabled = true;
    toggleAudioSection.classList.add("opacity-50", "cursor-not-allowed");
    toggleMeetingSection.disabled = true;
    toggleMeetingSection.classList.add("opacity-50", "cursor-not-allowed");
    
    // Récupérer l'heure de début depuis le storage
    try {
      if (chrome && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get(['recordingStartTime']);
        if (result.recordingStartTime) {
          startTime = result.recordingStartTime;
        } else {
          startTime = Date.now();
          // Sauvegarder l'heure de début si elle n'existe pas
          await chrome.storage.local.set({ recordingStartTime: startTime });
        }
      } else {
        // Fallback si chrome.storage.local n'est pas disponible
        startTime = Date.now();
      }
    } catch (error) {
      console.error("Erreur lors de l'accès à chrome.storage.local:", error);
      startTime = Date.now();
    }
    
    startTimer();
  } else {
    stopButton.classList.add("hidden");
    startButton.classList.remove("hidden");
    timerElement.classList.add("hidden");
    statsElement.classList.add("hidden");
    
    // Réactiver les boutons de configuration
    toggleApiSection.disabled = false;
    toggleApiSection.classList.remove("opacity-50", "cursor-not-allowed");
    toggleAudioSection.disabled = false;
    toggleAudioSection.classList.remove("opacity-50", "cursor-not-allowed");
    toggleMeetingSection.disabled = false;
    toggleMeetingSection.classList.remove("opacity-50", "cursor-not-allowed");
    
    stopTimer();
  }
}

// Fonction pour démarrer le timer
function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  
  timerInterval = setInterval(() => {
    const duration = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(duration / 60).toString().padStart(2, "0");
    const seconds = (duration % 60).toString().padStart(2, "0");
    document.getElementById("duration").textContent = `${minutes}:${seconds}`;
  }, 1000);
}

// Fonction pour arrêter le timer
function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// Vérifier l'état de l'enregistrement quand le popup s'ouvre
async function checkRecordingState() {
  const hasPermission = await checkMicrophonePermission();
  if (!hasPermission) {
    chrome.tabs.create({ url: "permission.html" });
    return;
  }

  try {
  const contexts = await chrome.runtime.getContexts({});
  const offscreenDocument = contexts.find(
    (c) => c.contextType === "OFFSCREEN_DOCUMENT"
  );

    if (offscreenDocument && offscreenDocument.documentUrl.endsWith("#recording")) {
      // L'enregistrement est en cours
      await updateInterface(true);
  } else {
      // Pas d'enregistrement en cours
      await updateInterface(false);
    }
  } catch (error) {
    console.error("Erreur lors de la vérification du document offscreen:", error);
    await updateInterface(false);
  }
  
  // Initialiser les contrôles de volume et qualité audio
  initializeControls();
  
  // Initialiser les gestionnaires d'événements pour l'interface
  initializeUIHandlers();
}

// Gestionnaires d'événements pour l'interface utilisateur
function initializeUIHandlers() {
  // Gestion du bouton de la section API
  toggleApiSection.addEventListener('click', () => {
    apiKeySection.classList.toggle('hidden');
    apiKeySection.classList.toggle('expanded');
    apiArrow.classList.toggle('rotate-180');
  });
  
  // Gestion du bouton de la section réglages audio
  toggleAudioSection.addEventListener('click', () => {
    audioSettingsSection.classList.toggle('hidden');
    audioSettingsSection.classList.toggle('expanded');
    audioArrow.classList.toggle('rotate-180');
  });
  
  // Gestion du bouton de la section informations réunion
  toggleMeetingSection.addEventListener('click', () => {
    meetingInfoSection.classList.toggle('hidden');
    meetingInfoSection.classList.toggle('expanded');
    meetingArrow.classList.toggle('rotate-180');
  });
  
  // Bouton pour afficher/masquer la clé API
  toggleApiVisibility.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      toggleApiVisibility.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
      `;
    } else {
      apiKeyInput.type = 'password';
      toggleApiVisibility.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      `;
    }
  });
  
  // Bouton pour sauvegarder les informations de réunion
  saveMeetingInfo.addEventListener('click', () => {
    const attendeesValue = meetingAttendees.value.trim();
    const contextValue = meetingContext.value.trim();
    
    console.log("Saving meeting info to Chrome storage...");
    
    chrome.storage.sync.set({ 
      meetingAttendees: attendeesValue, 
      meetingContext: contextValue 
    }, () => {
      console.log("Meeting info saved successfully");
      
      // Ajouter ces informations aux métadonnées de l'enregistrement
      try {
        chrome.runtime.sendMessage({
          type: "update-meeting-info",
          target: "service-worker",
          meetingInfo: { 
            attendees: attendeesValue, 
            context: contextValue 
          }
        });
        console.log("Meeting info sent to service worker");
        
        // Afficher une notification de succès
        showNotification("Informations de réunion sauvegardées", true);
      } catch (error) {
        console.error("Error sending meeting info to service worker:", error);
        showNotification("Erreur lors de la sauvegarde des informations", false);
      }
    });
  });
  
  // Gestion du bouton de la section debug
  toggleDebugSection.addEventListener('click', () => {
    debugSection.classList.toggle('hidden');
    debugSection.classList.toggle('expanded');
    debugArrow.classList.toggle('rotate-180');
    updateDebugInfo(); // Mettre à jour les infos quand on ouvre la section
  });
}

// Initialiser les contrôles de volume et qualité audio
function initializeControls() {
  // Initialiser les curseurs de volume
  const micVolume = document.getElementById("micVolume");
  const micVolumeValue = document.getElementById("micVolumeValue");
  const tabVolume = document.getElementById("tabVolume");
  const tabVolumeValue = document.getElementById("tabVolumeValue");
  
  // Charger les valeurs sauvegardées
  chrome.storage.sync.get(["micVolume", "tabVolume", "audioQuality", "apiKey"], (result) => {
    // Volume du micro
    if (result.micVolume !== undefined) {
      micVolume.value = result.micVolume;
      micVolumeValue.textContent = `${result.micVolume}%`;
    }
    
    // Volume de l'onglet
    if (result.tabVolume !== undefined) {
      tabVolume.value = result.tabVolume;
      tabVolumeValue.textContent = `${result.tabVolume}%`;
    }
    
    // Qualité audio
    if (result.audioQuality) {
      document.getElementById("audioQuality").value = result.audioQuality;
    }
    
    // Clé API
    if (result.apiKey) {
      document.getElementById("apiKey").value = result.apiKey;
    }
  });
  
  // Gestionnaires d'événements pour les curseurs
  micVolume.addEventListener("input", () => {
    micVolumeValue.textContent = `${micVolume.value}%`;
    chrome.storage.sync.set({ micVolume: parseInt(micVolume.value) });
  });
  
  tabVolume.addEventListener("input", () => {
    tabVolumeValue.textContent = `${tabVolume.value}%`;
    chrome.storage.sync.set({ tabVolume: parseInt(tabVolume.value) });
  });
  
  // Qualité audio
  document.getElementById("audioQuality").addEventListener("change", (event) => {
    chrome.storage.sync.set({ audioQuality: event.target.value });
  });
  
  // Bouton de sauvegarde de la configuration API
  document.getElementById("saveApiKey").addEventListener("click", () => {
    const apiKey = document.getElementById("apiKey").value;
    const apiEndpoint = document.getElementById("apiEndpoint").value;
    const userEmail = document.getElementById("userEmail").value || "";
    
    console.log("Saving API configuration to Chrome storage...");
    
    chrome.storage.sync.set({ 
      apiKey,
      apiEndpoint,
      userEmail
    }, () => {
      console.log("API configuration saved successfully");
      
      // Envoyer la configuration à offscreen.js
      try {
        chrome.runtime.sendMessage({
          type: "update-settings",
          target: "service-worker",
          settings: { 
            apiKey,
            apiEndpoint,
            userEmail
          }
        });
        console.log("API configuration sent to service worker");
        
        // Afficher une notification de succès
        showNotification("Configuration sauvegardée avec succès", true);
      } catch (error) {
        console.error("Error sending API configuration to service worker:", error);
        showNotification("Erreur lors de la sauvegarde de la configuration", false);
      }
    });
  });
}

// Initialiser le popup
document.addEventListener("DOMContentLoaded", async () => {
  await checkRecordingState();
  setupOnboarding();
});

// Gérer l'onboarding
async function setupOnboarding() {
  const onboardingGuide = document.getElementById("onboardingGuide");
  const dismissOnboarding = document.getElementById("dismissOnboarding");
  const step1 = document.getElementById("step1");
  const step2 = document.getElementById("step2");
  const step3 = document.getElementById("step3");
  
  // Vérifier si l'utilisateur a déjà vu l'onboarding
  const { onboardingComplete } = await chrome.storage.sync.get(['onboardingComplete']);
  
  // Vérifier si la configuration est complète
  const { apiKey, apiEndpoint, userEmail } = await chrome.storage.sync.get(['apiKey', 'apiEndpoint', 'userEmail']);
  const configComplete = apiKey && apiKey.length > 0;
  
  // Mettre à jour l'état des étapes
  if (configComplete) {
    step1.classList.remove('font-medium');
    step1.classList.add('text-green-600');
    step1.innerHTML = '<span>Configurez votre clé API</span> ✓';
    
    step2.classList.remove('text-gray-500');
    step2.classList.add('font-medium');
    
    // Si la config est complète mais que nous sommes encore en onboarding, ouvrir meeting info
    if (!onboardingComplete && apiKeySection.classList.contains('hidden')) {
      toggleMeetingSection.click();
    }
  } else {
    // Auto-expand la section API si config incomplète et section cachée
    if (apiKeySection.classList.contains('hidden')) {
      toggleApiSection.click();
    }
  }
  
  // Afficher le guide si l'utilisateur est nouveau ou si la configuration est incomplète
  if (!onboardingComplete || !configComplete) {
    onboardingGuide.classList.remove('hidden');
  }
  
  // Écouter les clics sur le bouton "Ne plus afficher"
  dismissOnboarding.addEventListener('click', () => {
    chrome.storage.sync.set({ onboardingComplete: true });
    onboardingGuide.classList.add('hidden');
  });
  
  // Ajouter des écouteurs pour mettre à jour les étapes en temps réel
  document.getElementById("saveApiKey").addEventListener('click', updateOnboardingSteps);
  document.getElementById("saveMeetingInfo").addEventListener('click', updateOnboardingSteps);
}

// Mettre à jour visuellement les étapes de l'onboarding
async function updateOnboardingSteps() {
  const step1 = document.getElementById("step1");
  const step2 = document.getElementById("step2");
  const step3 = document.getElementById("step3");
  
  // Vérifier si la configuration est complète
  const { apiKey } = await chrome.storage.sync.get(['apiKey']);
  const configComplete = apiKey && apiKey.length > 0;
  
  // Vérifier si les infos de réunion sont remplies
  const meetingFilled = meetingAttendees.value.trim().length > 0 || meetingContext.value.trim().length > 0;
  
  // Mettre à jour l'état des étapes
  if (configComplete) {
    step1.classList.remove('font-medium', 'text-gray-500');
    step1.classList.add('text-green-600');
    step1.innerHTML = '<span>Configurez votre clé API</span> ✓';
    
    if (meetingFilled) {
      step2.classList.remove('font-medium', 'text-gray-500');
      step2.classList.add('text-green-600');
      step2.innerHTML = '<span>Ajoutez des informations de réunion</span> ✓';
      
      step3.classList.remove('text-gray-500');
      step3.classList.add('font-medium');
    } else {
      step2.classList.remove('text-gray-500', 'text-green-600');
      step2.classList.add('font-medium');
    }
  }
}

// Gérer le clic sur le bouton de démarrage
startButton.addEventListener("click", async () => {
  try {
    addDebugLog("Démarrage de l'enregistrement...");
    // Récupérer l'onglet actif
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    // Vérifier si l'onglet peut être enregistré
    if (
      !tab ||
      tab.url.startsWith("chrome://") ||
      tab.url.startsWith("chrome-extension://")
    ) {
      showError("Impossible d'enregistrer les pages système de Chrome. Essayez sur une page web standard.");
      return;
    }

    // Créer le document offscreen s'il n'existe pas
    const contexts = await chrome.runtime.getContexts({});
    const offscreenDocument = contexts.find(
      (c) => c.contextType === "OFFSCREEN_DOCUMENT"
    );

    if (!offscreenDocument) {
      await chrome.offscreen.createDocument({
        url: "offscreen.html",
        reasons: ["USER_MEDIA"],
        justification: "Recording from chrome.tabCapture API",
      });
    }

    // Obtenir l'ID du flux et démarrer l'enregistrement
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tab.id,
    });

    // Envoyer les informations de réunion avec la commande d'enregistrement
    const meetingInfo = {
      attendees: meetingAttendees.value.trim(),
      context: meetingContext.value.trim(),
      startTime: new Date().toISOString(),
      url: tab.url
    };

    chrome.runtime.sendMessage({
      type: "start-recording",
      target: "offscreen",
      data: streamId,
      meetingInfo: meetingInfo
    });

    // Mettre à jour l'interface
    await updateInterface(true);
    hideError();
    
    // Mettre à jour les infos de debug avant de démarrer
    await updateDebugInfo();
    
    addDebugLog("Enregistrement démarré avec succès");
  } catch (error) {
    addDebugLog(`Erreur au démarrage: ${error.message}`);
    showError("Échec du démarrage de l'enregistrement: " + error.message);
    console.error("Erreur au démarrage:", error);
  }
});

// Gérer le clic sur le bouton d'arrêt
stopButton.addEventListener("click", () => {
  addDebugLog("Arrêt de l'enregistrement...");
  // Envoyer la commande d'arrêt
    chrome.runtime.sendMessage({
      type: "stop-recording",
      target: "offscreen",
    });
  
  // Mettre à jour l'interface
  updateInterface(false);
});

// Écouter les messages de l'extension
chrome.runtime.onMessage.addListener((message) => {
  console.log("Message reçu dans le popup:", message);
  
  if (message.target === "popup") {
    switch (message.type) {
      case "recording-error":
        showError(message.error);
        updateInterface(false);
        break;
        
      case "recording-stopped":
        updateInterface(false);
        break;
        
      case "transcription-complete":
        console.log("Transcription reçue:", message.transcription ? 
          message.transcription.substring(0, 100) + "..." : "vide");
        
        if (message.transcription) {
          transcriptionText.textContent = message.transcription;
          transcriptionSection.classList.remove("hidden");
          console.log("Section de transcription affichée");
        } else {
          console.error("Transcription vide reçue");
          showError("La transcription a été reçue mais est vide. Veuillez réessayer.");
        }
        break;
        
      // Pour rétrocompatibilité avec l'ancien format
      case "transcriptionComplete":
        console.log("Transcription reçue (ancien format):", message.transcription ? 
          message.transcription.substring(0, 100) + "..." : "vide");
        
        if (message.transcription) {
          transcriptionText.textContent = message.transcription;
          transcriptionSection.classList.remove("hidden");
          console.log("Section de transcription affichée (ancien format)");
        }
        break;
        
      case "recording-stats":
        if (message.totalSize !== undefined) {
          const sizeInMB = message.totalSize / (1024 * 1024);
          const sizeText = sizeInMB < 1 ? `${Math.round(sizeInMB * 1024)} Ko` : `${sizeInMB.toFixed(2)} Mo`;
          
          // On met à jour l'affichage dans les éléments de stats cachés
          // pour maintenir la cohérence des données
          document.getElementById("fileSize").textContent = sizeText;
          
          // Mettre à jour directement les éléments dans la section debug
          if (document.getElementById("debugFileSize")) {
            document.getElementById("debugFileSize").textContent = sizeText;
          }
          
          // Ne pas ajouter de log pour éviter de remplir la zone de logs
          // addDebugLog(`Taille estimée: ${sizeText}`);
        }
        
        if (message.segmentCount !== undefined) {
          // Mettre à jour l'élément caché
          document.getElementById("segmentCount").textContent = message.segmentCount;
          
          // Mettre à jour directement les éléments dans la section debug
          if (document.getElementById("debugSegmentCount")) {
            document.getElementById("debugSegmentCount").textContent = message.segmentCount;
          }
          
          // Ne pas ajouter de log pour éviter de remplir la zone de logs
          // addDebugLog(`Segments: ${message.segmentCount}`);
        }
        break;
      
      case "debug":
        // Ne logger que les messages de debug explicites
        if (message.message) {
          addDebugLog(message.message);
        }
        break;
        
      default:
        console.log("Message de type inconnu:", message.type);
    }
  }
});

// Fonction pour ajouter un log de debug
function addDebugLog(message) {
  const timestamp = new Date().toLocaleTimeString();
  const log = `[${timestamp}] ${message}\n`;
  debugLogs.textContent = log + debugLogs.textContent;
  console.log(message); // Garder aussi le log dans la console
}

// Fonction pour mettre à jour les informations de debug
async function updateDebugInfo() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      // Mettre à jour l'URL
      debugCurrentUrl.textContent = tab.url;
      
      // Générer et afficher le nom de fichier qui sera utilisé
      const date = new Date().toISOString().split('T')[0];
      const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
      const urlPart = new URL(tab.url).hostname;
      const fileName = `recording-${date}_${time}_${urlPart}.webm`;
      debugFileName.textContent = fileName;
      
      // Sauvegarder le nom du fichier pour l'utiliser lors de l'enregistrement
      try {
        if (chrome && chrome.storage && chrome.storage.local) {
          await chrome.storage.local.set({ currentRecordingFileName: fileName });
        }
      } catch (error) {
        console.error("Erreur lors de l'accès à chrome.storage.local:", error);
      }
    }
  } catch (error) {
    console.error(`Erreur lors de la mise à jour des infos de debug: ${error.message}`);
  }
}

// Modifier la fonction pour utiliser le nom de fichier sauvegardé
async function downloadRecording(blob, mimeType) {
  try {
    let fileName = `recording-${new Date().toISOString()}.${getExtensionFromMimeType(mimeType)}`;
    
    // Sécuriser l'accès à chrome.storage.local
    try {
      if (chrome && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get(['currentRecordingFileName']);
        if (result && result.currentRecordingFileName) {
          fileName = result.currentRecordingFileName;
        }
      }
    } catch (error) {
      console.error("Erreur lors de l'accès à chrome.storage.local:", error);
    }
    
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = fileName;
    downloadLink.click();
    
    URL.revokeObjectURL(url);
    // Ne pas envoyer de log pour ce téléchargement
    console.log(`Fichier téléchargé: ${fileName}`);
  } catch (error) {
    console.error(`Erreur lors du téléchargement: ${error.message}`);
  }
}

// Fonction utilitaire pour obtenir l'extension à partir du type MIME
function getExtensionFromMimeType(mimeType) {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4')) return 'mp4';
  return 'audio';
}
