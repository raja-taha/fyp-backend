# Deploying to AWS EC2

This guide explains how to deploy the application to an AWS EC2 instance using Docker.

## Prerequisites

1. An AWS account
2. An EC2 instance with Amazon Linux 2 or Ubuntu
3. Docker installed on the EC2 instance
4. MongoDB Atlas account or another MongoDB instance

## Setup Environment Variables

Create a `.env` file in the project root with the following variables:

```
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret
NODE_ENV=production
VITE_PUBLIC_BACKEND_URL=http://your-ec2-public-ip:5000
```

## Deployment Steps

1. **Connect to your EC2 instance**:

   ```
   ssh -i path/to/your-key.pem ec2-user@your-ec2-public-ip
   ```

2. **Install Docker** (if not already installed):

   For Amazon Linux 2:

   ```
   sudo yum update -y
   sudo amazon-linux-extras install docker
   sudo service docker start
   sudo systemctl enable docker
   sudo usermod -a -G docker ec2-user
   ```

   For Ubuntu:

   ```
   sudo apt update
   sudo apt install -y docker.io
   sudo systemctl enable --now docker
   sudo usermod -aG docker ubuntu
   ```

3. **Clone the repository**:

   ```
   git clone <your-repository-url>
   cd fyp-backend
   ```

4. **Create the .env file**:

   ```
   nano .env
   ```

   Add the environment variables mentioned above.

5. **Build and run the Docker container**:

   ```
   docker build -t fyp-backend .
   docker run -d -p 5000:5000 --name fyp-backend-container fyp-backend
   ```

6. **Configure security group**:

   - Go to the EC2 dashboard in AWS console
   - Select your instance
   - Click on the security group
   - Add an inbound rule for port 5000 (or whichever port you're using)

7. **Access the application**:
   Your application should now be accessible at `http://your-ec2-public-ip:5000`

## Useful Docker Commands

- **View logs**:

  ```
  docker logs fyp-backend-container
  ```

- **Stop the container**:

  ```
  docker stop fyp-backend-container
  ```

- **Start the container**:

  ```
  docker start fyp-backend-container
  ```

- **Remove the container**:
  ```
  docker rm fyp-backend-container
  ```

## Setting Up a Production Environment

For a production environment, consider:

1. Using Nginx as a reverse proxy
2. Setting up SSL/TLS with Let's Encrypt
3. Implementing proper monitoring with CloudWatch
4. Setting up automatic backups for your database
5. Implementing CI/CD with AWS CodePipeline or GitHub Actions
