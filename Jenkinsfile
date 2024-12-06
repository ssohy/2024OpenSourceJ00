pipeline {
    agent any
    environment {
        PROJECT_ID = 'opensource2024-440504'
        CLUSTER_NAME = 'k8s'
        LOCATION = 'asia-northeast3-a'
        CREDENTIALS_ID = '317051b1-ad33-432b-9b7c-d2d9ef97571e' //GKE Credential 추가 완료
    }
    stages {
        stage("Checkout code") {
            steps {
                checkout scm
            }
        }
        stage("Install dependencies and test DB connection") {
            steps {
                script {
                    // npm install을 실행하여 필요한 패키지 설치
                    sh 'npm install'
                    
                    // DB 연결 테스트 스크립트 실행 (db_connect.js에서 로그 출력)
                    sh 'node -e "require(\'./db/db_connect.js\');"'
                }
            }
        }
        stage("Build image") {
            steps {
                script {
                    myapp = docker.build("ssohy/j00:${env.BUILD_ID}")
                }
            }
        }
        stage("Push image") {
            steps {
                script {
                    docker.withRegistry('https://registry.hub.docker.com', 'ssohy') {
                        myapp.push("latest")
                        myapp.push("${env.BUILD_ID}")
                    }
                }
            }
        }
        stage('Deploy to GKE') {
            when {
                branch 'main'
            }
            steps {
                sh "sed -i 's/j00:latest/j00:${env.BUILD_ID}/g' deployment.yaml"
                step([$class: 'KubernetesEngineBuilder', projectId: env.PROJECT_ID, clusterName: env.CLUSTER_NAME, location: env.LOCATION, manifestPattern: 'deployment.yaml', credentialsId: env.CREDENTIALS_ID, verifyDeployments: true])
            }
        }
    }
}
