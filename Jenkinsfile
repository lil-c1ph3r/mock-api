pipeline {
    agent any

    stages {

        stage('Pull Code') {
            steps {
                git url: 'http://gitlab:80/root/sample-api.git',
                    branch: 'main',
                    credentialsId: 'gitlab-creds'
            }
        }

        stage('Fetch Secrets from Vault') {
            withVault([
                configuration: [
                    vaultUrl: 'http://vault:8200',
                    vaultCredentialId: 'vault-token'
                ],
                vaultSecrets: [[
                    path: 'secret/data/sample-api',
                    secretValues: [
                        [envVar: 'DB_USER', vaultKey: 'DB_USER'],
                        [envVar: 'DB_PASS', vaultKey: 'DB_PASS'],
                        [envVar: 'API_KEY', vaultKey: 'API_KEY']
                    ]
                ]]
            ]) {

                sh '''
                echo "DB_USER=$DB_USER" > .env
                echo "DB_PASS=$DB_PASS" >> .env
                echo "API_KEY=$API_KEY" >> .env
                cat .env
            '''
            }
        }


        stage('Trivy Scan') {
            steps {
                sh 'trivy fs .'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t sample-api:latest .'
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
                echo "Logging into Nexus..."
                echo $NEXUS_PASS | docker login localhost:5000 -u $NEXUS_USER --password-stdin

                echo "Tagging image..."
                docker tag sample-api:latest localhost:5000/sample-api:latest

                echo "Pushing image to Nexus..."
                docker push localhost:5000/sample-api:latest
            '''
        }
    }
}
    }
}