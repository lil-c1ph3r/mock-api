pipeline {
    agent any

    environment {
        REGISTRY = 'localhost:5000'
        IMAGE_NAME = 'sample-api'

        CLI_BIN_PATH = '/usr/local/bin'
        TRUFFLEHOG = "${CLI_BIN_PATH}/trufflehog"
        GITLEAKS = "${CLI_BIN_PATH}/gitleaks"

        TRUFFLEHOG_REPORT = 'trufflehog-report.json'
        GITLEAKS_REPORT = 'gitleaks-report.json'
    }

    stages {
        stage('Pull Code') {
            steps {
                git url: 'https://github.com/lil-c1ph3r/mock-api.git',
                    branch: 'main',
                    credentialsId: 'github-creds'
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
                sh 'trivy fs .'
            }
        }
        stage('Secret Scan (TruffleHog & Gitleaks)') {
            steps {
                sh """
            echo "Running TruffleHog scan..."
            ${TRUFFLEHOG} filesystem . --json --no-update > ${TRUFFLEHOG_REPORT} || true

            echo "Running Gitleaks scan..."
            ${GITLEAKS} detect --source . --report-format json --report-path ${GITLEAKS_REPORT} || true
        """
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
        }
        failure {
            echo 'Pipeline failed ❌'
        }
        always {
            archiveArtifacts artifacts: '*.json', fingerprint: true
        }
    }
}
