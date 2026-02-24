pipeline {
    agent any

    stages {

        stage('Fetch Secrets from Vault') {
            steps {
                withVault([vaultSecrets: [[
                    path: 'secret/data/sample-api',
                    secretValues: [
                        [envVar: 'DB_USER', vaultKey: 'DB_USER'],
                        [envVar: 'DB_PASS', vaultKey: 'DB_PASS'],
                        [envVar: 'API_KEY', vaultKey: 'API_KEY']
                    ]
                ]]]) {

                    sh '''
                        echo "DB_USER=$DB_USER" > .env
                        echo "DB_PASS=$DB_PASS" >> .env
                        echo "API_KEY=$API_KEY" >> .env
                        cat .env
                    '''
                }
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
    }
}