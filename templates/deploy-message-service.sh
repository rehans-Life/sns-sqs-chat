#!/bin/bash -ex
sudo yum install -y gcc-c++ make
curl -sL https://rpm.nodesource.com/setup_20.x | sudo -E bash -
sudo yum install -y nodejs

sudo yum install -y git
git clone https://github.com/rehans-Life/sns-sqs-chat.git

sudo yum install amazon-cloudwatch-agent -y

sudo touch /etc/systemd/system/messageService.service
sudo chmod 747 /etc/systemd/system/messageService.service

cat > /etc/systemd/system/messageService.service <<- EOM
[Unit]
Description=messageService
After=network.target multi-user.target

[Service]
ExecStart=/usr/bin/node /sns-sqs-chat/message-service/server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=messageService
User=ec2-user
EnvironmentFile=/sns-sqs-chat/app.env

[Install]
WantedBy=multi-user.target
EOM

touch /sns-sqs-chat/app.env
sudo chmod 747 /sns-sqs-chat/app.env

cat > /sns-sqs-chat/app.env <<- EOM
QUEUE_URL=
MONGO_URI=
MONGO_PASSWORD=

EOM

touch /common-config.toml
sudo chmod 747 /common-config.toml

cat > /common-config.toml <<- EOM
[AmazonCloudWatchAgent]
region = me-south-1
EOM

sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/common-config.toml

cd /sns-sqs-chat/message-service
sudo npm install

sudo systemctl start messageService.service

sudo systemctl enable messageService.service

sudo systemctl status messageService.service