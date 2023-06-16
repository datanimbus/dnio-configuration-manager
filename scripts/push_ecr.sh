#!/bin/bash

set -e

TAG=`cat CURRENT_CM`


echo "****************************************************"
echo "data.stack:cm :: Pushing Image to ECR :: $ECR_URL/data.stack.cm:$TAG"
echo "****************************************************"

$(aws ecr get-login --no-include-email)
docker tag data.stack.cm:$TAG $ECR_URL/data.stack.cm:$TAG
docker push $ECR_URL/data.stack.cm:$TAG

echo "****************************************************"
echo "data.stack:cm :: Image pushed to ECR AS $ECR_URL/data.stack.cm:$TAG"
echo "****************************************************"


echo "****************************************************"
echo "data.stack:cm :: Pushing Image to ECR :: $ECR_URL/data.stack.flow.base:$TAG"
echo "****************************************************"

docker tag data.stack.flow.base:$TAG $ECR_URL/data.stack.flow.base:$TAG
docker push $ECR_URL/data.stack.flow.base:$TAG

echo "****************************************************"
echo "data.stack:cm :: Image pushed to ECR AS $ECR_URL/data.stack.flow.base:$TAG"
echo "****************************************************"


# echo "****************************************************"
# echo "data.stack:cm :: Pushing Image to ECR :: $ECR_URL/data.stack.b2b.base:$TAG"
# echo "****************************************************"

# docker tag data.stack.b2b.base:$TAG $ECR_URL/data.stack.b2b.base:$TAG
# docker push $ECR_URL/data.stack.b2b.base:$TAG

# echo "****************************************************"
# echo "data.stack:bm :: Image pushed to ECR AS $ECR_URL/data.stack.b2b.base:$TAG"
# echo "****************************************************"


# echo "****************************************************"
# echo "data.stack:cm :: Pushing Image to ECR :: $ECR_URL/data.stack.faas.base:$TAG"
# echo "****************************************************"

# docker tag data.stack.faas.base:$TAG $ECR_URL/data.stack.faas.base:$TAG
# docker push $ECR_URL/data.stack.faas.base:$TAG

# echo "****************************************************"
# echo "data.stack:bm :: Image pushed to ECR AS $ECR_URL/data.stack.faas.base:$TAG"
# echo "****************************************************"
