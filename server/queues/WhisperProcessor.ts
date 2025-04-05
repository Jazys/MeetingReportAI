import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Resend } from 'resend';

interface WhisperJob {
  id: string;
  wavFilePath: string;
  email: string;
  model: string;
  metaData: string;
  resolve: (transcript: string) => void;
  reject: (error: Error) => void;
}

class WhisperProcessor {
  private static instance: WhisperProcessor;
  private queue: WhisperJob[] = [];
  private isProcessing: boolean = false;
  private resend: Resend;

  private constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.startJobChecker(); // Start the job checker
  }

  public static getInstance(): WhisperProcessor {
    if (!WhisperProcessor.instance) {
      WhisperProcessor.instance = new WhisperProcessor();
    }
    return WhisperProcessor.instance;
  }

  public async addJob(wavFilePath: string, email: string, model: string = "Pas de contexte fourni", metaData: string = ""): Promise<string> {
    return new Promise((resolve, reject) => {
      const job: WhisperJob = {
        id: Date.now().toString(),
        wavFilePath,
        email,
        model,
        metaData,
        resolve,
        reject
      };

      this.queue.push(job);
      this.processNextJob();
    });
  }

  private async processNextJob() {
    console.log("🔄 Verifie si un job est en cours ou si la queue est vide...");
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    console.log("🔄 Un Nouveau Job est prêt à être traité...");

    this.isProcessing = true;
    const job = this.queue.shift()!;

    try {
      const transcript = await this.processWhisperJob(job);
      job.resolve(transcript);
    } catch (error) {
      job.reject(error);
    } finally {
      this.isProcessing = false;
      this.processNextJob(); // Process the next job if there is one
    }
  }

  private startJobChecker() {
    setInterval(() => {
      this.processNextJob(); // Check for new jobs every 10 minutes
    }, 10 * 60 * 1000); // 10 minutes in milliseconds
  }

  private async sendTranscriptionEmail(email: string, transcript: string) {
    try {
      const response = await this.resend.emails.send({
        from: 'contact@batisseurdunumerique.fr',
        to: email,
        subject: 'Votre transcription est prête',
        html: `
          <h1>Transcription terminée</h1>
          <p>Voici votre transcription :</p>
          <pre>${transcript}</pre>
        `
      });
      console.log("✉️ Email envoyé avec succès à", email);
      console.log("✉️ Email status", response);
    } catch (error) {
      console.error("🚨 Erreur lors de l'envoi de l'email:", error);
    }
  }

  private async processWhisperJob(job: WhisperJob): Promise<string> {
    const whisperPath = '/app/whisper.cpp/main';
    const modelPath = '/app/whisper.cpp/models/ggml-medium.bin';
    const outputBasePath = job.wavFilePath.replace('.wav', '');
    const transcriptPath = `${outputBasePath}.txt`;

    const command = `${whisperPath} -m ${modelPath} -f ${job.wavFilePath} --language fr --output-txt --output-file ${outputBasePath}`;

    try {
      await new Promise<void>((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
          if (error) {
            console.error("🚨 Erreur Whisper :", error);
            reject(error);
            return;
          }
          console.log("✅ Whisper exécuté avec succès");
          resolve();
        });
      });

      if (!fs.existsSync(transcriptPath)) {
        throw new Error("Le fichier transcription n'a pas été généré");
      }

      const transcript = fs.readFileSync(transcriptPath, 'utf8');

      // Envoi de la transcription à n8n
      try {
        const n8nUrl = 'https://auto.ai.omvpb.ovh/webhook/3de95f6c-cfa2-4a2b-83d0-cf216abb252e';
        const n8nResponse = await fetch(n8nUrl, {
          method: 'POST',
          body: JSON.stringify({ email: job.email, transcript: transcript, model: job.model, metaData: job.metaData }),
        });
        console.log("🔹 Réponse de n8n :", n8nResponse);
      } catch (error) {
        console.error("🚨 Erreur lors de l'envoi de la transcription à n8n:", error);
      }

      // Envoi de l'email avec la transcription
      await this.sendTranscriptionEmail(job.email, transcript);

      // Nettoyage
      fs.unlinkSync(job.wavFilePath);
      fs.unlinkSync(transcriptPath);

      return transcript;
    } catch (error) {
      // En cas d'erreur, on essaie de nettoyer les fichiers
      try {
        if (fs.existsSync(job.wavFilePath)) fs.unlinkSync(job.wavFilePath);
        if (fs.existsSync(transcriptPath)) fs.unlinkSync(transcriptPath);
      } catch (cleanupError) {
        console.error("Erreur lors du nettoyage:", cleanupError);
      }
      throw error;
    }
  }
}

export default WhisperProcessor; 