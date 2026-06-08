pipeline {
    agent any

    environment {
        REGISTRY   = 'host.docker.internal:8082'
        IMAGE_NAME = 'mock-api'
    }

    stages {
        stage('Pull Code') {
            steps {
                git url: 'https://github.com/lil-c1ph3r/mock-api.git',
                    branch: 'main',
                    credentialsId: 'github-token'
            }
        }

        stage('Set Image Version') {
            steps {
                script {
                    VERSION = sh(
                        script: "grep '\"version\"' package.json | head -1 | cut -d '\"' -f4",
                        returnStdout: true
                    ).trim()
                    IMAGE_TAG = "${VERSION}-${env.BUILD_NUMBER}"
                    echo "Building image version: ${IMAGE_TAG}"
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .'
            }
        }

        stage('Push to Nexus') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'nexus-creds',
                    usernameVariable: 'NEXUS_USER',
                    passwordVariable: 'NEXUS_PASS'
                )]) {
                    sh '''
                        echo "$NEXUS_PASS" | docker login "$REGISTRY" -u "$NEXUS_USER" --password-stdin
                        docker tag "$IMAGE_NAME:$IMAGE_TAG" "$REGISTRY/$IMAGE_NAME:$IMAGE_TAG"
                        docker push "$REGISTRY/$IMAGE_NAME:$IMAGE_TAG"
                    '''
                }
            }
        }
    }
}