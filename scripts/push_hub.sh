#!/bin/bash

set -e

TAG=`cat CURRENT_CM`

echo "****************************************************"
echo "data.stack:cm :: Pushing Image to Docker Hub :: datanimbus/data.stack.cm:$TAG"
echo "****************************************************"

docker tag data.stack.cm:$TAG datanimbus/data.stack.cm:$TAG
docker push datanimbus/data.stack.cm:$TAG

echo "****************************************************"
echo "data.stack:cm :: Image Pushed to Docker Hub AS datanimbus/data.stack.cm:$TAG"
echo "****************************************************"


echo "****************************************************"
echo "data.stack:cm :: Pushing Image to Docker Hub :: datanimbus/data.stack.flow.base:$TAG"
echo "****************************************************"

docker tag data.stack.flow.base:$TAG datanimbus/data.stack.flow.base:$TAG
docker push datanimbus/data.stack.flow.base:$TAG

echo "****************************************************"
echo "data.stack:cm :: Image Pushed to Docker Hub AS datanimbus/data.stack.flow.base:$TAG"
echo "****************************************************"


# echo "****************************************************"
# echo "data.stack:cm :: Pushing Image to Docker Hub :: datanimbus/data.stack.b2b.base:$TAG"
# echo "****************************************************"

# docker tag data.stack.b2b.base:$TAG datanimbus/data.stack.b2b.base:$TAG
# docker push datanimbus/data.stack.b2b.base:$TAG

# echo "****************************************************"
# echo "data.stack:bm :: Image Pushed to Docker Hub AS datanimbus/data.stack.b2b.base:$TAG"
# echo "****************************************************"


# echo "****************************************************"
# echo "data.stack:cm :: Pushing Image to Docker Hub :: datanimbus/data.stack.faas.base:$TAG"
# echo "****************************************************"

# docker tag data.stack.faas.base:$TAG datanimbus/data.stack.faas.base:$TAG
# docker push datanimbus/data.stack.faas.base:$TAG

# echo "****************************************************"
# echo "data.stack:bm :: Image Pushed to Docker Hub AS datanimbus/data.stack.faas.base:$TAG"
# echo "****************************************************"
