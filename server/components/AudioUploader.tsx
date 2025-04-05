import { useState } from 'react';
import styles from './AudioUploader.module.css'; // Utilisation des CSS Modules

export default function AudioUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState("");
  const [email, setEmail] = useState("");
  const [context, setContext] = useState("");
  const [participants, setParticipants] = useState("");
  const [source, setSource] = useState("");

  const handleUpload = async () => {
    if (!file) return;

    // Construction des métadonnées
    const metaData = `Contexte: ${context}\nParticipants: ${participants}\nSource: ${source}`;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("email", email);
    formData.append("metaData", metaData);

    const response = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (data.message) {
      alert("En cours de transcription, veuillez patienter... Vous recevrez un email avec le résultat.");
    }
  };

  return (
    <div className={styles.audioUploader}>
      <h2>Transcription Audio</h2>
      
      <div className={styles.formGroup}>
        <label htmlFor="fileInput" className={styles.label}>Fichier audio</label>
        <input 
          id="fileInput"
          type="file" 
          accept="audio/webm" 
          onChange={(e) => setFile(e.target.files?.[0] || null)} 
          className={styles.fileInput} 
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="emailInput" className={styles.label}>Email</label>
        <input 
          id="emailInput"
          type="text" 
          placeholder="Email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          className={styles.textInput} 
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="contextInput" className={styles.label}>Contexte de la réunion</label>
        <input 
          id="contextInput"
          type="text" 
          placeholder="Contexte de la réunion" 
          value={context} 
          onChange={(e) => setContext(e.target.value)} 
          className={styles.textInput} 
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="participantsInput" className={styles.label}>Participants</label>
        <input 
          id="participantsInput"
          type="text" 
          placeholder="Participants" 
          value={participants} 
          onChange={(e) => setParticipants(e.target.value)} 
          className={styles.textInput} 
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="sourceInput" className={styles.label}>Source</label>
        <input 
          id="sourceInput"
          type="text" 
          placeholder="Source" 
          value={source} 
          onChange={(e) => setSource(e.target.value)} 
          className={styles.textInput} 
        />
      </div>

      <button onClick={handleUpload} className={styles.uploadButton}>Transcrire</button>
      <pre className={styles.transcript}>{transcript}</pre>
    </div>
  );
}
