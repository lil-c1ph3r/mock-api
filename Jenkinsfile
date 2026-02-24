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
        stage('Push to Registry') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'docker-registry-creds', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh '''
                    echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin registry:5000
                    docker tag sample-api:latest registry:5000/sample-api:latest
                    docker push registry:5000/sample-api:latest
                    '''
                }
            }
        }
    }
}