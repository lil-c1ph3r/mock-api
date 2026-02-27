pipeline {
    agent any

    environment {
        REGISTRY = 'localhost:5000'
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

        stage('Fetch Secrets from Vault') {
            steps {
                withVault([
                    vaultSecrets: [[
                        path: 'secret/sample-api',
                        engineVersion: 2,
                        secretValues: [
                            [envVar: 'DB_USER', vaultKey: 'DB_USER'],
                            [envVar: 'DB_PASS', vaultKey: 'DB_PASS'],
                            [envVar: 'API_KEY', vaultKey: 'API_KEY']
                        ]
                    ]],
                ]) {
                    sh '''
                        echo "Creating .env file from Vault"
                        echo "DB_USER=$DB_USER" > .env
                        echo "DB_PASS=$DB_PASS" >> .env
                        echo "API_KEY=$API_KEY" >> .env
                    '''
                }
            }
        }

        stage('Trivy Scan') {
            steps {
                sh '''
                    echo "Running Trivy scan..."
                    trivy fs . \
                    --severity HIGH,CRITICAL \
                    --exit-code 1 \
                    --skip-files gitleaks-report.json \
                    --output trivy-report.json \
                    --skip-files trivy-report.json
                '''
            }
        }

        stage('TruffleHog Scan') {
            steps {
                sh '''
                    echo "Running TruffleHog scan..."
                    trufflehog filesystem . --json --no-update > trufflehog-report.json
                '''
            }
        }

        stage('Gitleaks Scan') {
            steps {
                sh '''
                    echo "Running Gitleaks scan..."
                    gitleaks detect \
                    --source . \
                    --log-opts="HEAD~1..HEAD" \
                    --report-format json \
                    --report-path gitleaks-report.json \
                    --exit-code 1
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                sh """
                    docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .
                """
            }
        }

        stage('Push to Nexus') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'nexus-creds',
                    usernameVariable: 'NEXUS_USER',
                    passwordVariable: 'NEXUS_PASS'
                )]) {
                    sh """
                        echo "$NEXUS_PASS" | docker login ${REGISTRY} -u "$NEXUS_USER" --password-stdin
                        docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
                        docker push ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
                    """
                }
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully ✅'
            echo "Image pushed: ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
            script {
                sendTelegramFile(
                    "gitleaks-report.json",
                    "✅ SUCCESS - Gitleaks Report\nBuild #${BUILD_NUMBER}"
                )
                sendTelegramFile(
                    "trivy-report.json",
                    "✅ SUCCESS - Trivy Report\nBuild #${BUILD_NUMBER}"
                )
                sendTelegramFile(
                    "trufflehog-report.json",
                    "✅ SUCCESS - TruffleHog Report\nBuild #${BUILD_NUMBER}"
                )
            }
        }
        failure {
            script {
                if (fileExists("gitleaks-report.json")) {
                    sendTelegramFile(
                        "gitleaks-report.json",
                        "❌ FAILED - Gitleaks Report\nBuild #${BUILD_NUMBER}"
                    )
                }

                if (fileExists("trivy-report.json")) {
                    sendTelegramFile(
                        "trivy-report.json",
                        "❌ FAILED - Trivy Report\nBuild #${BUILD_NUMBER}"
                    )
                }
                if (fileExists("trufflehog-report.json")) {
                    sendTelegramFile(
                        "trufflehog-report.json",
                        "❌ FAILED - TruffleHog Report\nBuild #${BUILD_NUMBER}"
                    )
                }
                
            }
            echo "Pipeline failed ❌"
        }
        always {
            archiveArtifacts artifacts: '*.json', fingerprint: true
        }
    }
}
    def sendTelegramFile(filePath, captionMessage) {
        withCredentials([string(credentialsId: 'telegram-bot-token', variable: 'TELEGRAM_TOKEN')]) {
        sh """
        curl -s -X POST https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendDocument \
          -F chat_id=827881296 \
          -F document=@${filePath} \
          -F caption="${captionMessage}"
        """
        }
    }
