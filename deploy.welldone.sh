#!/usr/bin/env bash



pushd ../stox-client
npm run prod
popd

! rm -fr ./dist/
mv ../stox-client/dist ./dist

eval $(docker-machine env welldone-tests-server)

export PORT=3771
IMG=stox

docker build -t $IMG .

! docker rm -f $IMG

docker run \
        --name $IMG \
        -e PORT=$PORT \
        --env-file=.env \
        -p $PORT:$PORT \
        --restart unless-stopped \
        -d \
        $IMG

docker logs $IMG

eval $(docker-machine env -u)

