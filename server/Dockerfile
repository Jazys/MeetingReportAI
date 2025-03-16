# Utilisation d'une image Node.js officielle
FROM node:18

# Installation des dépendances système
RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    build-essential \
    cmake \
    curl \
    libopenblas-dev \
    && rm -rf /var/lib/apt/lists/*

# Création du dossier d'application
WORKDIR /app

# Installer Whisper.cpp SEULEMENT si le dossier n'existe pas déjà
RUN test -d /app/whisper.cpp || git clone --depth 1 https://github.com/ggerganov/whisper.cpp /app/whisper.cpp

# Compiler Whisper.cpp
WORKDIR /app/whisper.cpp
RUN make && \
    cp build/bin/whisper-cli /app/whisper.cpp/main && \
    chmod +x /app/whisper.cpp/main && \
    ./models/download-ggml-model.sh medium

# Revenir dans /app
WORKDIR /app

# Copier et installer les dépendances Node.js
COPY package.json ./

RUN rm -rf node_modules && npm install

# Copier le reste du projet
COPY . .

# Forcer la résolution des modules
ENV PATH="/app/node_modules/.bin:$PATH"


# Exposer le port Next.js
EXPOSE 3000

# Démarrer Next.js
CMD ["npm", "run", "dev"]
