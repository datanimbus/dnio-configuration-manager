#!/bin/bash
set -e
if [ -f $WORKSPACE/../TOGGLE ]; then
    echo "****************************************************"
    echo "data.stack.cm :: Toggle mode is on, terminating build"
    echo "data.stack.cm :: BUILD CANCLED"
    echo "****************************************************"
    exit 0
fi

cd ..

cDate=`date +%Y.%m.%d.%H.%M` #Current date and time

if [ -f $WORKSPACE/../CICD ]; then
    CICD=`cat $WORKSPACE/../CICD`
fi
if [ -f $WORKSPACE/../DATA_STACK_RELEASE ]; then
    REL=`cat $WORKSPACE/../DATA_STACK_RELEASE`
fi
if [ -f $WORKSPACE/../DOCKER_REGISTRY ]; then
    DOCKER_REG=`cat $WORKSPACE/../DOCKER_REGISTRY`
fi
BRANCH='dev'
if [ -f $WORKSPACE/../BRANCH ]; then
    BRANCH=`cat $WORKSPACE/../BRANCH`
fi
if [ $1 ]; then
    REL=$1
fi
if [ ! $REL ]; then
    echo "****************************************************"
    echo "data.stack.cm :: Please Create file DATA_STACK_RELEASE with the releaese at $WORKSPACE or provide it as 1st argument of this script."
    echo "data.stack.cm :: BUILD FAILED"
    echo "****************************************************"
    exit 0
fi
TAG=$REL
if [ $2 ]; then
    TAG=$TAG"-"$2
fi
if [ $3 ]; then
    BRANCH=$3
fi
if [ $CICD ]; then
    echo "****************************************************"
    echo "data.stack.cm :: CICI env found"
    echo "****************************************************"
    TAG=$TAG"_"$cDate
    if [ ! -f $WORKSPACE/../DATA_STACK_NAMESPACE ]; then
        echo "****************************************************"
        echo "data.stack.cm :: Please Create file DATA_STACK_NAMESPACE with the namespace at $WORKSPACE"
        echo "data.stack.cm :: BUILD FAILED"
        echo "****************************************************"
        exit 0
    fi
    DATA_STACK_NS=`cat $WORKSPACE/../DATA_STACK_NAMESPACE`
fi


sh $WORKSPACE/scripts/prepare_yaml.sh $REL $2


cd $WORKSPACE


echo "****************************************************"
echo "data.stack.cm :: Using build :: "$TAG
echo "****************************************************"

echo "****************************************************"
echo "data.stack.cm :: Adding IMAGE_TAG in Dockerfile :: "$TAG
echo "****************************************************"
sed -i.bak s#__image_tag__#$TAG# Dockerfile

if [ -f $WORKSPACE/../CLEAN_BUILD_CM ]; then
    echo "****************************************************"
    echo "data.stack.cm :: Doing a clean build"
    echo "****************************************************"
    
    # docker build --no-cache -t data.stack.bm.$TAG --build-arg LATEST_B2BGW=$LATEST_B2BGW --build-arg RELEASE=$REL .
    docker build --no-cache -t data.stack.cm:$TAG --build-arg RELEASE=$REL .
    rm $WORKSPACE/../CLEAN_BUILD_CM


    echo "****************************************************"
    echo "data.stack.cm :: Building Processflow Base Image"
    echo "****************************************************"
    
    cd $WORKSPACE/../dn-flow-base
    docker build --no-cache -t data.stack.flow.base:$TAG .


    # echo "****************************************************"
    # echo "data.stack.cm :: Building B2B Base Image"
    # echo "****************************************************"
    
    # cd $WORKSPACE/../ds-b2b-base
    # docker build --no-cache -t data.stack.b2b.base:$TAG .


    # echo "****************************************************"
    # echo "data.stack.bm :: Building Faas Image"
    # echo "****************************************************"

    # cd $WORKSPACE/../ds-faas
    # docker build --no-cache -t data.stack.faas.base:$TAG .

    cd $WORKSPACE
    echo "****************************************************"
    echo "data.stack.cm :: Copying deployment files"
    echo "****************************************************"

    if [ $CICD ]; then
        sed -i.bak s#__docker_registry_server__#$DOCKER_REG# cm.yaml
        sed -i.bak s/__release_tag__/"'$REL'"/ cm.yaml
        sed -i.bak s#__release__#$TAG# cm.yaml
        sed -i.bak s#__namespace__#$DATA_STACK_NS# cm.yaml
        sed -i.bak '/imagePullSecrets/d' cm.yaml
        sed -i.bak '/- name: regsecret/d' cm.yaml

        kubectl delete deploy cm -n $DATA_STACK_NS || true # deleting old deployement
        kubectl delete service cm -n $DATA_STACK_NS || true # deleting old service
        #creating cm deployment
        kubectl create -f cm.yaml
    fi

else
    echo "****************************************************"
    echo "data.stack.cm :: Doing a normal build"
    echo "****************************************************"
    # docker build -t data.stack.bm:$TAG --build-arg LATEST_B2BGW=$LATEST_B2BGW --build-arg RELEASE=$REL .
    docker build -t data.stack.cm:$TAG --build-arg RELEASE=$REL .

    echo "****************************************************"
    echo "data.stack.cm :: Building Processflow Base Image"
    echo "****************************************************"
    
    cd $WORKSPACE/../dn-flow-base
    docker build -t data.stack.flow.base:$TAG .


    # echo "****************************************************"
    # echo "data.stack.cm :: Building B2B Base Image"
    # echo "****************************************************"
    
    # cd $WORKSPACE/../ds-b2b-base
    # docker build -t data.stack.b2b.base:$TAG .


    # echo "****************************************************"
    # echo "data.stack.cm :: Building Faas Base Image"
    # echo "****************************************************"

    # cd $WORKSPACE/../ds-faas
    # docker build --no-cache -t data.stack.faas.base:$TAG .

    cd $WORKSPACE

    if [ $CICD ]; then
        if [ $DOCKER_REG ]; then
            kubectl set image deployment/cm cm=$DOCKER_REG/data.stack.cm:$TAG -n $DATA_STACK_NS --record=true
        else 
            kubectl set image deployment/cm cm=data.stack.cm:$TAG -n $DATA_STACK_NS --record=true
        fi
    fi
fi
if [ $DOCKER_REG ]; then
    echo "****************************************************"
    echo "data.stack.cm :: Docker Registry found, pushing image"
    echo "****************************************************"

    docker tag data.stack.cm:$TAG $DOCKER_REG/data.stack.cm:$TAG
    docker push $DOCKER_REG/data.stack.cm:$TAG
    docker tag data.stack.flow.base:$TAG $DOCKER_REG/data.stack.flow.base:$TAG
    docker push $DOCKER_REG/data.stack.flow.base:$TAG
    #  docker tag data.stack.b2b.base:$TAG $DOCKER_REG/data.stack.b2b.base:$TAG
    # docker push $DOCKER_REG/data.stack.b2b.base:$TAG
    # docker tag data.stack.faas.base:$TAG $DOCKER_REG/data.stack.faas.base:$TAG
    # docker push $DOCKER_REG/data.stack.faas.base:$TAG
fi
echo "****************************************************"
echo "data.stack.cm :: BUILD SUCCESS :: data.stack.cm:$TAG"
echo "****************************************************"
echo $TAG > $WORKSPACE/../LATEST_CM
