import { useState } from 'react';

export default function AudioUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState("");

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (data.transcript) {
      setTranscript(data.transcript);
    } else {
      alert("Erreur lors de la transcription");
    }
  };

  return (
    <div>
      <h2>Transcription audio</h2>
      <input type="file" accept="audio/webm" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={handleUpload}>Transcrire</button>
      <pre>{transcript}</pre>
    </div>
  );
}
