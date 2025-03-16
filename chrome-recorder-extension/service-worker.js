// Variables d'état
let activeTabId = null;
let isRecording = false;
let meetingInfo = null;

// Écouteur de messages
chrome.runtime.onMessage.addListener(async (message) => {
  if (message.target === "service-worker") {
    switch (message.type) {
      case "request-recording":
        try {
          const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });

          // Vérifier si on peut enregistrer cet onglet
          if (
            !tab ||
            tab.url.startsWith("chrome://") ||
            tab.url.startsWith("chrome-extension://")
          ) {
            chrome.runtime.sendMessage({
              type: "recording-error",
              target: "popup",
              error:
                "Impossible d'enregistrer les pages système de Chrome. Veuillez essayer sur une page web standard.",
            });
            return;
          }

          // S'assurer qu'on a accès à l'onglet
          await chrome.tabs.update(tab.id, {});
          activeTabId = tab.id;

          // Obtenir un MediaStream pour l'onglet actif
          const streamId = await chrome.tabCapture.getMediaStreamId({
            targetTabId: tab.id,
          });

          // Stocker l'heure de début d'enregistrement
          const startTime = Date.now();
          await chrome.storage.local.set({ recordingStartTime: startTime });
          
          // Charger les paramètres à transmettre au document offscreen
          let settings = {};
          try {
            // Récupérer les paramètres depuis le stockage
            const result = await chrome.storage.sync.get([
              'micVolume', 
              'tabVolume', 
              'audioQuality', 
              'apiKey',
              'apiEndpoint',
              'userEmail'
            ]);
            
            settings = {
              micVolume: result.micVolume,
              tabVolume: result.tabVolume,
              audioQuality: result.audioQuality,
              apiKey: result.apiKey,
              apiEndpoint: result.apiEndpoint,
              userEmail: result.userEmail
            };
            
            console.log("Settings loaded for offscreen:", {
              micVolume: settings.micVolume,
              tabVolume: settings.tabVolume, 
              audioQuality: settings.audioQuality,
              hasApiKey: !!settings.apiKey,
              hasApiEndpoint: !!settings.apiEndpoint
            });
          } catch (error) {
            console.error("Error loading settings from storage:", error);
          }

          // Envoyer le streamId au document offscreen pour démarrer l'enregistrement
          chrome.runtime.sendMessage({
            type: "start-recording",
            target: "offscreen",
            data: streamId,
            meetingInfo: message.meetingInfo || null,
            settings: settings
          });

          // Enregistrer les informations de réunion
          if (message.meetingInfo) {
            meetingInfo = message.meetingInfo;
            console.log("Meeting info received:", meetingInfo);
          }

          isRecording = true;
          updateIcon(true);
        } catch (error) {
          console.error("Error starting recording:", error);
          chrome.runtime.sendMessage({
            type: "recording-error",
            target: "popup",
            error: error.message,
          });
        }
        break;

      case "recording-stopped":
        isRecording = false;
        updateIcon(false);
        // Effacer l'heure de début d'enregistrement
        await chrome.storage.local.remove('recordingStartTime');
        relayMessage({
          type: "recording-stopped",
          target: "popup"
        });
        break;

      case "update-icon":
        updateIcon(message.recording);
        break;
        
      // Retransmettre les statistiques au popup
      case "recording-stats":
        relayMessage({
          type: "recording-stats",
          target: "popup",
          totalSize: message.totalSize,
          segmentCount: message.segmentCount
        });
        break;
        
      // Retransmettre la transcription au popup
      case "transcription-complete":
        console.log("Transcription complete message received, relaying to popup");
        relayMessage({
          type: "transcription-complete",
          target: "popup",
          transcription: message.transcription
        });
        break;
        
      // Mise à jour des contrôles de volume
      case "update-volume":
        chrome.runtime.sendMessage({
          type: "update-volume",
          target: "offscreen",
          source: message.source,
          value: message.value
        });
        break;
        
      // Mise à jour des paramètres
      case "update-settings":
        chrome.runtime.sendMessage({
          type: "update-settings",
          target: "offscreen",
          settings: message.settings
        });
        break;
        
      // Mise à jour des informations de réunion
      case "update-meeting-info":
        console.log("Updating meeting info:", message.meetingInfo);
        meetingInfo = message.meetingInfo;
        
        // Transmettre à offscreen.js si un enregistrement est en cours
        if (isRecording) {
          chrome.runtime.sendMessage({
            type: "update-meeting-info",
            target: "offscreen",
            meetingInfo: meetingInfo
          });
        }
        break;
    }
  }
});

// Retransmettre un message au popup
function relayMessage(message) {
  try {
    console.log("Relaying message to popup:", message);
    
    // Vérifier si le popup est ouvert avant d'envoyer le message
    chrome.runtime.getContexts({})
      .then(contexts => {
        // Rechercher un contexte de type POPUP
        const popupExists = contexts.some(context => context.contextType === "POPUP");
        
        if (popupExists) {
          // Le popup est ouvert, envoyer le message
          return chrome.runtime.sendMessage(message);
        } else {
          // Le popup n'est pas ouvert, ne pas envoyer le message
          console.log("Popup not open, message not sent");
          return Promise.resolve();
        }
      })
      .then(() => console.log("Message handling completed"))
      .catch(error => {
        // Gérer spécifiquement l'erreur de canal fermé
        if (error.message && error.message.includes("message channel closed")) {
          console.log("Popup was closed before message could be sent");
        } else {
          console.error("Error in message relay:", error);
        }
      });
  } catch (error) {
    console.error("Error in relayMessage:", error);
  }
}

// Mettre à jour l'icône
function updateIcon(recording) {
  const path = recording ? "icons/recording.png" : "icons/not-recording.png";
  chrome.action.setIcon({ path });
}

// Gérer les raccourcis clavier
chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-recording") {
    if (isRecording) {
      // Arrêter l'enregistrement
      chrome.runtime.sendMessage({
        type: "stop-recording",
        target: "offscreen",
      });
    } else {
      // Démarrer l'enregistrement
      chrome.runtime.sendMessage({
        type: "request-recording",
        target: "service-worker",
      });
    }
  }
});

// Gérer la fermeture des onglets
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === activeTabId && isRecording) {
    console.log("The recording tab was closed, stopping recording");
    chrome.runtime.sendMessage({
      type: "stop-recording",
      target: "offscreen",
    });
    isRecording = false;
    updateIcon(false);
  }
});
