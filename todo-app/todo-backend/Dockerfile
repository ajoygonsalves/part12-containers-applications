FROM node:20

WORKDIR /usr/src/app

COPY --chown=node:node . .

RUN npm ci --omit-dev

ENV DEBUG=todo-backend:*, PORT=3000

USER node

CMD npm start

