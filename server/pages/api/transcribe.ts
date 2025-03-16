import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import multer from 'multer';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import WhisperProcessor from '../../queues/WhisperProcessor';

const Cors = require('cors');

ffmpeg.setFfmpegPath(ffmpegPath.path);

const upload = multer({ dest: '/app/uploads/' });

export const config = {
  api: {
    bodyParser: false,
  },
};

const cors = Cors({
  methods: ['POST', 'GET', 'OPTIONS'], // Méthodes autorisées
  origin: '*', // Remplacez '*' par votre domaine si nécessaire
});

async function runCors(req, res) {
  return new Promise((resolve, reject) => {
    cors(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req, res) {
  console.log("🔹 API transcribe appelée");

  await runCors(req, res);

  if (req.method === 'OPTIONS') {
    // Répondre à la requête OPTIONS
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    console.log("🚨 Méthode non autorisée :", req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log("🔹 Attente du fichier...");
    await runMiddleware(req, res, upload.single('file'));

    const uploadedFilePath = req.file.path;
    console.log("✅ Fichier reçu :", uploadedFilePath);

    const outputFilePath = `/app/uploads/${Date.now()}.wav`;

    console.log("🔹 Conversion WebM -> WAV en 16 kHz, mono, PCM 16 bits...");
    await new Promise((resolve, reject) => {
      ffmpeg(uploadedFilePath)
        .audioFrequency(16000)   // Forcer en 16 kHz
        .audioChannels(1)        // Mono obligatoire
        .audioCodec('pcm_s16le') // PCM 16 bits
        .toFormat('wav')
        .on('start', (cmd) => console.log("🎬 Commande FFmpeg :", cmd))
        .on('end', () => {
          console.log("✅ Conversion terminée :", outputFilePath);
          resolve(true);
        })
        .on('error', (err) => {
          console.error("🚨 Erreur FFmpeg :", err);
          reject(err);
        })
        .save(outputFilePath);
    });

    // Suppression du fichier original
    fs.unlinkSync(uploadedFilePath);

    // Récupération de l'email et du modèle depuis le corps de la requête
    const email = req.body.email;
    const model = req.body.model || "Pas de contexte fourni"; // Valeur par défaut si non fourni
    const metaData = req.body.metaData || "";

    if (!email) {
      return res.status(400).json({ error: "L'email est requis" });
    }

    // Ajout du job à la queue Whisper avec le modèle
    const whisperProcessor = WhisperProcessor.getInstance();
    whisperProcessor.addJob(outputFilePath, email, model, metaData)
      .catch(error => {
        console.error("🚨 Erreur lors du traitement Whisper :", error);
        // Ici vous pourriez implémenter une notification d'erreur à l'utilisateur
      });

    console.log("🔹 Job ajouté à la queue Whisper avec l'email :", email, "et le modèle :", model, "et le metaData :", metaData);

    return res.status(200).json({ 
      message: "Votre fichier a été reçu. Un email vous sera envoyé une fois la transcription terminée."
    });

  } catch (error) {
    console.error("🚨 Erreur API :", error);
    return res.status(500).json({ error: error.message || "Erreur inconnue" });
  }
}
