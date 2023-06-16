#!/bin/bash

set -e

TAG=`cat CURRENT_CM`


echo "****************************************************"
echo "data.stack:cm :: Cleaning Up Local Images :: $TAG"
echo "****************************************************"

docker rmi data.stack.cm:$TAG -f
docker rmi data.stack.flow.base:$TAG -f
# docker rmi data.stack.b2b.base:$TAG -f
# docker rmi data.stack.faas.base:$TAG -f
