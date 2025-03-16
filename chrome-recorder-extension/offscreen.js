let recorder;
let data = [];
let activeStreams = [];
let audioContext;
let tabGain;
let micGain;
let apiKey = '';
let apiEndpoint = 'https://assistant.ai.omvpb.ovh/api/transcribe'; // URL par défaut
let userEmail = 'jacquemet.julien@gmail.com'; // Email par défaut
let recordingStartTime;
let recordingDuration = 0;
let meetingInfo = null;

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.target === "offscreen") {
    switch (message.type) {
      case "start-recording":
        // Mettre à jour les paramètres si présents dans le message
        if (message.settings) {
          if (message.settings.apiKey !== undefined) {
            apiKey = message.settings.apiKey;
            console.log("API key set from message");
          }
          if (message.settings.apiEndpoint !== undefined) {
            apiEndpoint = message.settings.apiEndpoint;
            console.log("API endpoint set from message");
          }
          if (message.settings.userEmail !== undefined) {
            userEmail = message.settings.userEmail;
            console.log("User email set from message");
          }
        }
        
        if (message.meetingInfo) {
          meetingInfo = message.meetingInfo;
          console.log("Received meeting info for recording:", meetingInfo);
        }
        startRecording(message.data);
        break;
      case "stop-recording":
        stopRecording();
        break;
      case "update-volume":
        updateVolume(message.source, message.value);
        break;
      case "update-settings":
        updateSettings(message.settings);
        break;
      case "update-meeting-info":
        updateMeetingInfo(message.meetingInfo);
        break;
      default:
        console.warn("Unrecognized message:", message.type);
    }
  }
});

// Mettre à jour le volume
function updateVolume(source, value) {
  if (source === "tab" && tabGain) {
    tabGain.gain.value = value;
    console.log(`Tab volume set to ${value}`);
  } else if (source === "mic" && micGain) {
    micGain.gain.value = value;
    console.log(`Mic volume set to ${value}`);
  }
}

// Mettre à jour les paramètres
function updateSettings(settings) {
  if (settings.apiKey !== undefined) {
    apiKey = settings.apiKey;
  }
  if (settings.apiEndpoint !== undefined) {
    apiEndpoint = settings.apiEndpoint;
  }
  if (settings.userEmail !== undefined) {
    userEmail = settings.userEmail;
  }
}

// Mettre à jour les informations de réunion
function updateMeetingInfo(info) {
  if (info) {
    meetingInfo = info;
    console.log("Meeting info updated:", meetingInfo);
    
    // Log des informations qui seront envoyées à l'API
    console.log("Updated API parameters:", {
      meetcontext: info.context || "(vide)",
      meetparticipant: info.attendees || "(vide)"
    });
  }
}

// Charger les paramètres au démarrage
async function loadSettings() {
  try {
    console.log("Loading settings...");
    
    // Vérifier si chrome.storage est disponible
    if (!chrome || !chrome.storage || !chrome.storage.sync) {
      console.warn("chrome.storage.sync is not available in this context");
      return {
        micVolume: 0.7,
        tabVolume: 1.0,
        audioQuality: 'medium'
      };
    }
    
    console.log("Accessing Chrome storage API...");
    const result = await chrome.storage.sync.get([
      'micVolume', 
      'tabVolume', 
      'audioQuality', 
      'apiKey',
      'apiEndpoint',
      'userEmail',
      'meetingAttendees', 
      'meetingContext'
    ]);
    
    console.log("Settings retrieved:", {
      micVolume: result.micVolume,
      tabVolume: result.tabVolume,
      audioQuality: result.audioQuality,
      apiKeyExists: !!result.apiKey,
      apiEndpoint: result.apiEndpoint,
      userEmail: result.userEmail || '(default)'
    });
    
    if (result.apiKey) {
      apiKey = result.apiKey;
      console.log("API key loaded successfully");
    } else {
      console.warn("No API key found in storage");
    }
    
    if (result.apiEndpoint) {
      apiEndpoint = result.apiEndpoint;
      console.log("API endpoint loaded successfully");
    }
    
    if (result.userEmail) {
      userEmail = result.userEmail;
      console.log("User email loaded successfully");
    }
    
    // Charger les informations de réunion si elles ne sont pas déjà définies
    if (!meetingInfo && (result.meetingAttendees || result.meetingContext)) {
      meetingInfo = {
        attendees: result.meetingAttendees || '',
        context: result.meetingContext || '',
        startTime: new Date().toISOString()
      };
      console.log("Meeting info loaded from storage:", meetingInfo);
    }
    
    return {
      micVolume: result.micVolume !== undefined ? result.micVolume / 100 : 0.7,
      tabVolume: result.tabVolume !== undefined ? result.tabVolume / 100 : 1.0,
      audioQuality: result.audioQuality || 'medium'
    };
  } catch (error) {
    console.warn("Error loading settings:", error);
    return {
      micVolume: 0.7,
      tabVolume: 1.0,
      audioQuality: 'medium'
    };
  }
}

// Déterminer le débit audio en fonction de la qualité
function getBitrate(quality) {
  switch (quality) {
    case 'low':
      return 32000;
    case 'high':
      return 128000;
    default: // medium
      return 64000;
  }
}

// Fonction pour formater les métadonnées de la réunion
function formatMeetingMetadata() {
  if (!meetingInfo) return '';
  
  let metadata = '';
  
  if (meetingInfo.context) {
    metadata += `Contexte: ${meetingInfo.context}\n\n`;
  }
  
  if (meetingInfo.attendees) {
    metadata += `Participants: ${meetingInfo.attendees}\n\n`;
  }
  
  if (meetingInfo.url) {
    metadata += `Source: ${meetingInfo.url}\n\n`;
  }
  
  if (meetingInfo.startTime) {
    const date = new Date(meetingInfo.startTime);
    const formattedDate = date.toLocaleDateString('fr-FR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    metadata += `Date: ${formattedDate}\n\n`;
  }
  
  if (metadata) {
    metadata += '----------\n\n';
  }
  
  return metadata;
}

async function startRecording(streamId) {
  if (recorder?.state === "recording") {
    throw new Error("Called startRecording while recording is in progress.");
  }

  await stopAllStreams();
  recordingStartTime = Date.now();

  try {
    // Charger les paramètres - avec gestion des erreurs pour éviter l'échec total
    let settings;
    try {
      settings = await loadSettings();
      console.log("Settings loaded:", settings);
    } catch (settingsError) {
      console.error("Failed to load settings, using defaults:", settingsError);
      settings = {
        micVolume: 0.7,
        tabVolume: 1.0,
        audioQuality: 'medium'
      };
    }
    
    // Vérifier si la clé API est disponible après le chargement des paramètres
    console.log("API key after loading settings:", apiKey ? "API key is set" : "API key is still missing");
    
    // Obtenir le flux audio de l'onglet
    const tabStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId,
        },
      },
      video: false,
    });

    // Obtenir le flux du microphone avec suppression de bruit
    const micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });

    activeStreams.push(tabStream, micStream);

    // Créer le contexte audio
    audioContext = new AudioContext();

    // Créer les sources et la destination
    const tabSource = audioContext.createMediaStreamSource(tabStream);
    const micSource = audioContext.createMediaStreamSource(micStream);
    const destination = audioContext.createMediaStreamDestination();

    // Créer les nœuds de gain
    tabGain = audioContext.createGain();
    micGain = audioContext.createGain();

    // Définir les valeurs de gain selon les paramètres
    tabGain.gain.value = settings.tabVolume;
    micGain.gain.value = settings.micVolume;

    // Connecter l'audio de l'onglet aux haut-parleurs et à l'enregistreur
    tabSource.connect(tabGain);
    tabGain.connect(audioContext.destination);
    tabGain.connect(destination);

    // Connecter le micro uniquement à l'enregistreur (évite l'écho)
    micSource.connect(micGain);
    micGain.connect(destination);

    // Déterminer le format audio supporté
    let mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }
    }
    
    // Configurer les options selon la qualité audio choisie
    const recordingOptions = {
      mimeType: mimeType,
      audioBitsPerSecond: getBitrate(settings.audioQuality)
    };
    
    console.log(`Starting recording with quality: ${settings.audioQuality}, bitrate: ${recordingOptions.audioBitsPerSecond}`);

    // Démarrer l'enregistrement
    recorder = new MediaRecorder(destination.stream, recordingOptions);
    data = [];
    
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        data.push(event.data);
        
        // Envoyer les statistiques d'enregistrement
        sendRecordingStats();
      }
    };
    
    recorder.onstop = async () => {
      recordingDuration = Date.now() - recordingStartTime;
      console.log(`Recording stopped. Duration: ${Math.floor(recordingDuration/1000)} seconds`);
      
      try {
        const blob = new Blob(data, { type: mimeType });        
        await transcribeAudio(blob, mimeType);
      } catch (error) {
        console.error("Error processing recording:", error);
        sendMessageSafely({
          type: "recording-error",
          target: "popup",
          error: error.message,
        });
      } finally {
        // Nettoyer les ressources
        recorder = undefined;
        data = [];
        
        sendMessageSafely({
          type: "recording-stopped",
          target: "service-worker",
        });
      }
    };

    // Démarrer l'enregistrement avec un intervalle de 1 seconde
    recorder.start(1000);
    window.location.hash = "recording";

    // Mettre à jour l'icône
    sendMessageSafely({
      type: "update-icon",
      target: "service-worker",
      recording: true,
    });
    
    // Envoyer une statistique initiale
    setTimeout(sendRecordingStats, 1000);
    
  } catch (error) {
    console.error("Error starting recording:", error);
    sendMessageSafely({
      type: "recording-error",
      target: "popup",
      error: error.message,
    });
  }
}

// Envoyer les statistiques d'enregistrement
function sendRecordingStats() {
  if (data.length > 0) {
    try {
      // Calculer la taille totale
      let totalSize = 0;
      for (const chunk of data) {
        totalSize += chunk.size;
      }
      
      // Envoyer les statistiques au popup
      sendMessageSafely({
        type: "recording-stats",
        target: "popup",
        totalSize: totalSize,
        segmentCount: data.length
      });
    } catch (error) {
      console.error("Error sending recording stats:", error);
    }
  }
}

// Modifier la fonction downloadRecording pour utiliser le nom de fichier personnalisé
async function downloadRecording(blob, mimeType) {
  const extension = getExtensionFromMimeType(mimeType);
  let fileName = generateDefaultFileName(extension);
  
  try {
    // Récupérer le nom de fichier personnalisé depuis le storage
    try {
      // Vérifier si chrome.storage.local est disponible
      if (chrome && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get(['currentRecordingFileName']);
        if (result && result.currentRecordingFileName) {
          fileName = result.currentRecordingFileName;
          console.log("Using custom filename from storage:", fileName);
        }
      } else {
        console.warn("chrome.storage.local is not available, using generated filename");
      }
    } catch (storageError) {
      console.warn("Impossible de récupérer le nom de fichier personnalisé:", storageError.message);
      // On continue avec le nom par défaut généré
    }
    
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = fileName;
    downloadLink.click();
    
    URL.revokeObjectURL(url);
    console.log(`Fichier téléchargé: ${fileName}`);
    
    // Envoyer un message au popup pour le log de debug
    sendMessageSafely({
      target: "popup",
      type: "debug",
      message: `Fichier téléchargé: ${fileName}`
    });
  } catch (error) {
    console.error(`Erreur lors du téléchargement du fichier ${fileName}:`, error);
    sendMessageSafely({
      target: "popup",
      type: "debug",
      message: `Erreur lors du téléchargement: ${error.message}`
    });
  }
}

// Fonction utilitaire pour obtenir l'extension à partir du type MIME
function getExtensionFromMimeType(mimeType) {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4')) return 'mp4';
  return 'audio';
}

// Transcrire l'audio
async function transcribeAudio(blob, mimeType) {
  try {
    console.log("Starting transcription with API key:", apiKey ? "API key present" : "API key missing");
    console.log("Using API endpoint:", apiEndpoint);
    console.log("Using email:", userEmail || '(default)');
    
    // Déterminer l'extension du fichier
    const extension = mimeType.includes('webm') ? 'webm' : 
                      mimeType.includes('ogg') ? 'ogg' : 
                      mimeType.includes('mp4') ? 'mp4' : 'audio';
    
    // Créer un objet FormData
    const formData = new FormData();
    formData.append("file", blob, `recording.${extension}`);
    formData.append("email", userEmail || 'jacquemet.julien@gmail.com');
    
    // Ajouter les métadonnées de réunion si disponibles
    if (meetingInfo) {
          
      // Ajouter les métadonnées formatées si nécessaire
      const formattedMetadata = formatMeetingMetadata();
      if (formattedMetadata) {
        formData.append("metaData", formattedMetadata);
      }
      
      console.log("Meeting info added to API request:", {
        meetcontext: meetingInfo.context || "(vide)",
        meetparticipant: meetingInfo.attendees || "(vide)",
        meetsource: meetingInfo.url || "(vide)"
      });
    }
    
    console.log(`Sending transcription request to API, file type: ${extension}, size: ${blob.size} bytes`);
    
    // Envoyer à l'API pour transcription
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });
    
    if (!response.ok) {
      console.error(`API response not OK: ${response.status} ${response.statusText}`);
      throw new Error(`Erreur HTTP: ${response.status} - ${response.statusText}`);
    }
    
    // Traiter la réponse
    const data = await response.json();
    console.log("Transcription received! Response:", data);
    
    // Extraire le texte de transcription
    let transcriptionText = data.message || data.transcription || (typeof data === 'string' ? data : JSON.stringify(data));
    
    // Message simple confirmant l'envoi par mail
    // Si la réponse contient déjà un message explicite, on le garde
    if (!transcriptionText.includes("mail") && !transcriptionText.includes("email")) {
      transcriptionText = "Votre transcription a été envoyée par email.";
    }
    
    console.log("Transcription text to send:", transcriptionText);
    
    // Envoyer la transcription au popup
    sendMessageSafely({
      type: "transcription-complete",
      target: "popup",
      transcription: transcriptionText
    });
    
    console.log("Transcription message sent to popup");
    
    // Également télécharger l'audio
    downloadRecording(blob, mimeType);
    
  } catch (error) {
    console.error("Transcription error:", error);
    sendMessageSafely({
      type: "recording-error",
      target: "popup",
      error: `Erreur de transcription: ${error.message}`
    });
    
    // En cas d'erreur de transcription, télécharger au moins l'audio
    downloadRecording(blob, mimeType);
  }
}

async function stopRecording() {
  if (recorder && recorder.state === "recording") {
    recorder.stop();
  }

  await stopAllStreams();
  window.location.hash = "";

  sendMessageSafely({
    type: "update-icon",
    target: "service-worker",
    recording: false,
  });
}

async function stopAllStreams() {
  // Fermer le contexte audio
  if (audioContext) {
    try {
      if (audioContext.state !== 'closed') {
        await audioContext.close();
      }
    } catch (error) {
      console.error("Error closing AudioContext:", error);
    }
    audioContext = null;
  }
  
  // Arrêter tous les flux
  activeStreams.forEach((stream) => {
    stream.getTracks().forEach((track) => {
      track.stop();
    });
  });

  activeStreams = [];
  
  // Réinitialiser les nœuds de gain
  tabGain = null;
  micGain = null;
  
  // Petit délai pour s'assurer que tout est bien arrêté
  await new Promise((resolve) => setTimeout(resolve, 100));
}

// Fonction pour envoyer un message de façon sécurisée
function sendMessageSafely(message) {
  try {
    chrome.runtime.sendMessage(message)
      .then(() => console.log(`Message ${message.type} sent successfully`))
      .catch(error => {
        // Gérer spécifiquement l'erreur de canal fermé
        if (error.message && error.message.includes("message channel closed")) {
          console.log(`Message channel closed before ${message.type} message could be delivered`);
        } else {
          console.error(`Error sending ${message.type} message:`, error);
        }
      });
  } catch (error) {
    console.error(`Failed to send ${message.type} message:`, error);
  }
}

// Générer un nom de fichier par défaut
function generateDefaultFileName(extension) {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0];
  const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');
  
  // Si on a l'URL source dans meetingInfo, on l'utilise
  let urlPart = "";
  try {
    if (meetingInfo && meetingInfo.url) {
      const url = new URL(meetingInfo.url);
      urlPart = url.hostname;
    }
  } catch (error) {
    console.warn("Error extracting hostname from URL:", error);
  }
  
  return `recording-${dateStr}_${timeStr}${urlPart ? '_' + urlPart : ''}.${extension}`;
}
