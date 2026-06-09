pipeline {
    agent any

    environment {
        REGISTRY    = '127.0.0.1:8082'
        IMAGE_NAME  = 'mock-api'
        VAULT_ADDR  = 'http://127.0.0.1:8200'
        VAULT_PATH  = '/v1/mock-api/data/dev'
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
                    def VERSION = sh(
                        script: "grep '\"version\"' package.json | head -1 | cut -d '\"' -f4",
                        returnStdout: true
                    ).trim()
                    env.IMAGE_TAG = "${VERSION}-${env.BUILD_NUMBER}"
                    echo "IMAGE_TAG: ${env.IMAGE_TAG}"
                }
            }
        }

        stage('Fetch Secrets from Vault') {
            steps {
                withVault(
                    configuration: [
                        vaultUrl:            "${VAULT_ADDR}",
                        vaultCredentialId:   'vault-token',
                        engineVersion:       2
                    ],
                    vaultSecrets: [[
                        path: "${VAULT_PATH}",
                        secretValues: [
                            [envVar: 'AWS_ACCESS_KEY_ID',     vaultKey: 'AWS_ACCESS_KEY_ID'],
                            [envVar: 'AWS_SECRET_ACCESS_KEY', vaultKey: 'AWS_SECRET_ACCESS_KEY'],
                            [envVar: 'AWS_REGION',            vaultKey: 'AWS_REGION'],
                            [envVar: 'DB_HOST',               vaultKey: 'DB_HOST'],
                            [envVar: 'DB_PORT',               vaultKey: 'DB_PORT'],
                            [envVar: 'DB_NAME',               vaultKey: 'DB_NAME'],
                            [envVar: 'DB_USER',               vaultKey: 'DB_USER'],
                            [envVar: 'DB_PASSWORD',           vaultKey: 'DB_PASSWORD'],
                            [envVar: 'JWT_SECRET',            vaultKey: 'JWT_SECRET'],
                            [envVar: 'API_KEY',               vaultKey: 'API_KEY'],
                        ]
                    ]]
                ) {
                    sh 'echo "Secrets fetched from Vault successfully"'
                    script {
                        env.APP_ENV_ARGS = [
                            "AWS_ACCESS_KEY_ID=${env.AWS_ACCESS_KEY_ID}",
                            "AWS_SECRET_ACCESS_KEY=${env.AWS_SECRET_ACCESS_KEY}",
                            "AWS_REGION=${env.AWS_REGION}",
                            "DB_HOST=${env.DB_HOST}",
                            "DB_PORT=${env.DB_PORT}",
                            "DB_NAME=${env.DB_NAME}",
                            "DB_USER=${env.DB_USER}",
                            "DB_PASSWORD=${env.DB_PASSWORD}",
                            "JWT_SECRET=${env.JWT_SECRET}",
                            "API_KEY=${env.API_KEY}",
                        ].collect { "--build-arg $it" }.join(' ')
                    }
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build $APP_ENV_ARGS -t $IMAGE_NAME:$IMAGE_TAG .'
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

        stage('Deploy to Server') {
            steps {
                withVault(
                    configuration: [
                        vaultUrl:          "${VAULT_ADDR}",
                        vaultCredentialId: 'vault-token',
                        engineVersion:     2
                    ],
                    vaultSecrets: [[
                        path: "${VAULT_PATH}",
                        secretValues: [
                            [envVar: 'AWS_ACCESS_KEY_ID',     vaultKey: 'AWS_ACCESS_KEY_ID'],
                            [envVar: 'AWS_SECRET_ACCESS_KEY', vaultKey: 'AWS_SECRET_ACCESS_KEY'],
                            [envVar: 'AWS_REGION',            vaultKey: 'AWS_REGION'],
                            [envVar: 'DB_HOST',               vaultKey: 'DB_HOST'],
                            [envVar: 'DB_PORT',               vaultKey: 'DB_PORT'],
                            [envVar: 'DB_NAME',               vaultKey: 'DB_NAME'],
                            [envVar: 'DB_USER',               vaultKey: 'DB_USER'],
                            [envVar: 'DB_PASSWORD',           vaultKey: 'DB_PASSWORD'],
                            [envVar: 'JWT_SECRET',            vaultKey: 'JWT_SECRET'],
                            [envVar: 'API_KEY',               vaultKey: 'API_KEY'],
                        ]
                    ]]
                ) {
                    withCredentials([
                        usernamePassword(
                            credentialsId: 'nexus-creds',
                            usernameVariable: 'NEXUS_USER',
                            passwordVariable: 'NEXUS_PASS'
                        ),
                        sshUserPrivateKey(
                            credentialsId: 'ec2-ssh-key',
                            keyFileVariable: 'SSH_KEY'
                        )
                    ]) {
                        sh """
                            ssh -i "\$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@ec2-122-248-196-223.ap-southeast-1.compute.amazonaws.com bash <<'ENDSSH'
                                echo "${NEXUS_PASS}" | docker login ${REGISTRY} -u "${NEXUS_USER}" --password-stdin
                                docker pull ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
                                docker stop ${IMAGE_NAME} || true
                                docker rm ${IMAGE_NAME} || true
                                docker run -d \\
                                    --name ${IMAGE_NAME} \\
                                    --restart unless-stopped \\
                                    -p 127.0.0.1:3000:3000 \\
                                    -e AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}" \\
                                    -e AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}" \\
                                    -e AWS_REGION="${AWS_REGION}" \\
                                    -e DB_HOST="${DB_HOST}" \\
                                    -e DB_PORT="${DB_PORT}" \\
                                    -e DB_NAME="${DB_NAME}" \\
                                    -e DB_USER="${DB_USER}" \\
                                    -e DB_PASSWORD="${DB_PASSWORD}" \\
                                    -e JWT_SECRET="${JWT_SECRET}" \\
                                    -e API_KEY="${API_KEY}" \\
                                    ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
ENDSSH
                        """
                    }
                }
            }
        }
    }
}
