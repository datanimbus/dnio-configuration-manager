#!/bin/bash

set -e

TAG=`cat CURRENT_CM`


echo "****************************************************"
echo "data.stack:cm :: Deploying Image in K8S :: $NAMESPACE"
echo "****************************************************"

kubectl set image deployment/cm cm=$ECR_URL/data.stack.cm:$TAG -n $NAMESPACE --record=true


echo "****************************************************"
echo "data.stack:cm :: Image Deployed in K8S AS $ECR_URL/data.stack.cm:$TAG"
echo "****************************************************"
