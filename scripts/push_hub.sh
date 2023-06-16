#!/bin/bash

set -e

TAG=`cat CURRENT_CM`

echo "****************************************************"
echo "data.stack:cm :: Pushing Image to Docker Hub :: appveen/data.stack.cm:$TAG"
echo "****************************************************"

docker tag data.stack.cm:$TAG appveen/data.stack.cm:$TAG
docker push appveen/data.stack.cm:$TAG

echo "****************************************************"
echo "data.stack:cm :: Image Pushed to Docker Hub AS appveen/data.stack.cm:$TAG"
echo "****************************************************"


echo "****************************************************"
echo "data.stack:cm :: Pushing Image to Docker Hub :: appveen/data.stack.flow.base:$TAG"
echo "****************************************************"

docker tag data.stack.flow.base:$TAG appveen/data.stack.flow.base:$TAG
docker push appveen/data.stack.flow.base:$TAG

echo "****************************************************"
echo "data.stack:cm :: Image Pushed to Docker Hub AS appveen/data.stack.flow.base:$TAG"
echo "****************************************************"


# echo "****************************************************"
# echo "data.stack:cm :: Pushing Image to Docker Hub :: appveen/data.stack.b2b.base:$TAG"
# echo "****************************************************"

# docker tag data.stack.b2b.base:$TAG appveen/data.stack.b2b.base:$TAG
# docker push appveen/data.stack.b2b.base:$TAG

# echo "****************************************************"
# echo "data.stack:bm :: Image Pushed to Docker Hub AS appveen/data.stack.b2b.base:$TAG"
# echo "****************************************************"


# echo "****************************************************"
# echo "data.stack:cm :: Pushing Image to Docker Hub :: appveen/data.stack.faas.base:$TAG"
# echo "****************************************************"

# docker tag data.stack.faas.base:$TAG appveen/data.stack.faas.base:$TAG
# docker push appveen/data.stack.faas.base:$TAG

# echo "****************************************************"
# echo "data.stack:bm :: Image Pushed to Docker Hub AS appveen/data.stack.faas.base:$TAG"
# echo "****************************************************"
