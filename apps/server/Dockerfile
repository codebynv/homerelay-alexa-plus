FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY dist ./dist
COPY data ./data
EXPOSE 4000
CMD ["node", "dist/index.js"]
