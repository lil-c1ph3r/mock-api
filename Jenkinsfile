import groovy.json.JsonSlurperClassic

pipeline {
    agent any

    environment {
        REGISTRY = 'localhost:5000'
        IMAGE_NAME = 'mock-api'
        IMAGE_TAG = ''
        SCAN_FAILED = 'false'
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
                    def version = sh(
                        script: "grep '\"version\"' package.json | head -1 | cut -d '\"' -f4",
                        returnStdout: true
                    ).trim()

                    env.IMAGE_TAG = "${version}-${env.BUILD_NUMBER}"
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

        stage('Trivy Scan') {
            steps {
                catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                    script {
                        sh '''
                            echo "Running Trivy scan..."
                            trivy fs . \
                              --format json \
                              --severity HIGH,CRITICAL \
                              --exit-code 0 \
                              --skip-files gitleaks-report.json \
                              --skip-files trivy-report.json \
                              --output trivy-report.json || true
                        '''

                        if (!fileExists('trivy-report.json')) {
                            writeFile file: 'trivy-report.json', text: '{"Results":[]}\n'
                        }

                        def raw = readFile('trivy-report.json').trim()
                        if (!raw) {
                            writeFile file: 'trivy-report.json', text: '{"Results":[]}\n'
                            raw = '{"Results":[]}'
                        }

                        def trivyReport = new JsonSlurperClassic().parseText(raw)
                        int vulnCount = 0
                        int secretCount = 0

                        if (trivyReport?.Results instanceof List) {
                            trivyReport.Results.each { result ->
                                if (result?.Vulnerabilities instanceof List) {
                                    vulnCount += result.Vulnerabilities.size()
                                }
                                if (result?.Secrets instanceof List) {
                                    secretCount += result.Secrets.size()
                                }
                            }
                        }

                        if (vulnCount > 0 || secretCount > 0) {
                            env.SCAN_FAILED = 'true'
                            echo "Trivy findings: vulnerabilities=${vulnCount}, secrets=${secretCount}"
                        }
                    }
                }
            }
        }

        stage('TruffleHog Scan') {
            steps {
                catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                    script {
                        sh '''
                            echo "Running TruffleHog scan..."
                            trufflehog filesystem . --json --no-update > trufflehog-report.json || true
                        '''

                        if (!fileExists('trufflehog-report.json')) {
                            writeFile file: 'trufflehog-report.json', text: ''
                        }

                        def raw = readFile('trufflehog-report.json').trim()
                        if (raw) {
                            env.SCAN_FAILED = 'true'
                            echo 'TruffleHog findings detected.'
                        }
                    }
                }
            }
        }

        stage('Gitleaks Scan') {
            steps {
                catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                    script {
                        sh '''
                            echo "Running Gitleaks scan..."
                            gitleaks detect \
                              --source . \
                              --log-opts="HEAD~1..HEAD" \
                              --report-format json \
                              --report-path gitleaks-report.json \
                              --exit-code 0 || true
                        '''

                        if (!fileExists('gitleaks-report.json')) {
                            writeFile file: 'gitleaks-report.json', text: '[]\n'
                        }

                        def raw = readFile('gitleaks-report.json').trim()
                        if (!raw) {
                            writeFile file: 'gitleaks-report.json', text: '[]\n'
                            raw = '[]'
                        }

                        def gitleaksReport = new JsonSlurperClassic().parseText(raw)
                        if (gitleaksReport instanceof List && gitleaksReport.size() > 0) {
                            env.SCAN_FAILED = 'true'
                            echo "Gitleaks findings: ${gitleaksReport.size()}"
                        }
                    }
                }
            }
        }

        stage('Security Gate') {
            steps {
                script {
                    if (env.SCAN_FAILED == 'true') {
                        error('Security findings detected. Build/push blocked. Check scan reports.')
                    }
                }
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
            echo 'Pipeline completed successfully'
            echo "Image pushed: ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
            script {
                sendTelegramFileIfNonEmpty(
                    'gitleaks-report.json',
                    "SUCCESS - Gitleaks Report | Build #${BUILD_NUMBER}"
                )
                sendTelegramFileIfNonEmpty(
                    'trivy-report.json',
                    "SUCCESS - Trivy Report | Build #${BUILD_NUMBER}"
                )
                sendTelegramFileIfNonEmpty(
                    'trufflehog-report.json',
                    "SUCCESS - TruffleHog Report | Build #${BUILD_NUMBER}"
                )
            }
        }

        failure {
            script {
                sendTelegramFileIfNonEmpty(
                    'gitleaks-report.json',
                    "FAILED - Gitleaks Report | Build #${BUILD_NUMBER}"
                )
                sendTelegramFileIfNonEmpty(
                    'trivy-report.json',
                    "FAILED - Trivy Report | Build #${BUILD_NUMBER}"
                )
                sendTelegramFileIfNonEmpty(
                    'trufflehog-report.json',
                    "FAILED - TruffleHog Report | Build #${BUILD_NUMBER}"
                )
            }
            echo 'Pipeline failed'
        }

        always {
            archiveArtifacts artifacts: '*.json', fingerprint: true
        }
    }
}

def sendTelegramFileIfNonEmpty(String filePath, String captionMessage) {
    if (!fileExists(filePath)) {
        echo "Skip Telegram upload: ${filePath} not found"
        return
    }

    def isNonEmpty = sh(script: "test -s '${filePath}'", returnStatus: true) == 0
    if (!isNonEmpty) {
        echo "Skip Telegram upload: ${filePath} is empty"
        return
    }

    withCredentials([string(credentialsId: 'telegram-bot-token', variable: 'TELEGRAM_TOKEN')]) {
        withEnv([
            "TG_FILE=${filePath}",
            "TG_CAPTION=${captionMessage}"
        ]) {
            sh '''
                curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_TOKEN/sendDocument" \
                  -F chat_id=827881296 \
                  -F document=@"$TG_FILE" \
                  -F caption="$TG_CAPTION"
            '''
        }
    }
}
