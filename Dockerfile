FROM node:8.9.1

ENV PORT=3771
ENV NODE_ENV=production
ENV DATABASE_URL=postgres://NO_SUCH_DB

EXPOSE $PORT

#VOLUME /var/logs/
#VOLUME /var/files/


COPY package.json /
COPY package-lock.json ./


RUN npm install

COPY ./ ./


ENTRYPOINT [ "npm", "run", "serve"]




# diplomat.chw6mh4lnutm.eu-central-1.rds.amazonaws.com:5432/stox
