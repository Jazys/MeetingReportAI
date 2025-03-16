document.addEventListener('DOMContentLoaded', () => {
  const requestPermissionButton = document.getElementById("requestPermission");
  const statusElement = document.getElementById("status");
  
  requestPermissionButton.addEventListener("click", async () => {
    try {
      // Animation pendant la demande de permission
      requestPermissionButton.disabled = true;
      requestPermissionButton.classList.add("opacity-75");
      requestPermissionButton.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Demande en cours...
      `;
      
      // Demander la permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      
      // Afficher le succès
      statusElement.classList.remove("hidden", "status-error");
      statusElement.classList.add("status-success");
      statusElement.innerHTML = `
        <div class="flex items-center">
          <svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>Permission accordée ! Vous pouvez fermer cet onglet.</span>
        </div>
      `;
      
      // Changer le bouton
      requestPermissionButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        Succès - Fermer cet onglet
      `;
      requestPermissionButton.classList.remove("bg-blue-600", "hover:bg-blue-700", "opacity-75");
      requestPermissionButton.classList.add("bg-green-600", "hover:bg-green-700");
      requestPermissionButton.disabled = false;
      
      // Fermer automatiquement après un délai
      setTimeout(() => {
        window.close();
      }, 3000);
      
      // Permettre à l'utilisateur de fermer manuellement
      requestPermissionButton.addEventListener("click", () => {
        window.close();
      }, { once: true });
      
    } catch (error) {
      // Afficher l'erreur
      statusElement.classList.remove("hidden", "status-success");
      statusElement.classList.add("status-error");
      statusElement.innerHTML = `
        <div class="flex items-center">
          <svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Permission refusée. Veuillez autoriser l'accès au microphone pour utiliser l'extension.</span>
        </div>
      `;
      
      // Réinitialiser le bouton
      requestPermissionButton.disabled = false;
      requestPermissionButton.classList.remove("opacity-75");
      requestPermissionButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
        </svg>
        Réessayer
      `;
    }
  });
}); 