# Usa una imagen base de Node.js
FROM node:18

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copia el archivo package.json y package-lock.json al contenedor
COPY package*.json ./

# Instala las dependencias
RUN npm install

# Copia el resto de los archivos de la aplicación al contenedor
COPY . .
COPY wait-for-it.sh /usr/src/app/wait-for-it.sh

# Expone el puerto que usa tu aplicación
EXPOSE 8000

# Define el comando para iniciar la aplicación
CMD ["npm", "start"]