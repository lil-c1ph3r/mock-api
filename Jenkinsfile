pipeline {
    agent any

    environment {
        REGISTRY = 'localhost:5000'
        IMAGE_NAME = 'mock-api'
        IMAGE_TAG = ''
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
                    env.VERSION = sh(
                        script: "grep '\"version\"' package.json | head -1 | cut -d '\"' -f4",
                        returnStdout: true
                    ).trim()

                    if (!env.VERSION) {
                        error("Version not found in package.json")
                    }

                    env.IMAGE_TAG = "${env.VERSION}-${env.BUILD_NUMBER}"

                    echo "Building image version: ${env.IMAGE_TAG}"
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

        stage('Trivy & TruffleHog & Gitleaks') {
            steps {
                sh '''
                    set -e

                    echo "Running Trivy scan..."
                    trivy fs . \
                    --severity HIGH,CRITICAL \
                    --exit-code 1 \
                    --skip-files gitleaks-report.json \
                    --output trivy-report.json \
                    --skip-files trivy-report.json

                    echo "Running TruffleHog scan..."
                    trufflehog filesystem . --json --no-update > trufflehog-report.json

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
                    docker build -t ${env.IMAGE_NAME}:${env.IMAGE_TAG} .
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
                        echo "$NEXUS_PASS" | docker login ${env.REGISTRY} -u "$NEXUS_USER" --password-stdin
                        docker tag ${env.IMAGE_NAME}:${env.IMAGE_TAG} ${env.REGISTRY}/${env.IMAGE_NAME}:${env.IMAGE_TAG}
                        docker push ${env.REGISTRY}/${env.IMAGE_NAME}:${env.IMAGE_TAG}
                    """
                }
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully ✅'
            echo "Image pushed: ${env.REGISTRY}/${env.IMAGE_NAME}:${env.IMAGE_TAG}"
        }
        failure {
            echo "Pipeline failed ❌"
        }
        always {
            archiveArtifacts artifacts: '*.json', fingerprint: true
        }
    }
}