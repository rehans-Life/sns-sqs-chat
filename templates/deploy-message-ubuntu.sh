#!/bin/bash -ex

sudo apt update
sudo apt install nodejs -y
sudo apt install npm -y

sudo apt install -y git
git clone https://github.com/rehans-Life/sns-sqs-chat.git

wget https://amazoncloudwatch-agent.s3.amazonaws.com/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb

sudo apt-get install libcap2-bin -y
sudo setcap cap_net_bind_service=+ep `readlink -f \`which node\`` 

sudo touch /etc/systemd/system/socketServer.service
sudo chmod 747 /etc/systemd/system/socketServer.service

cat > /etc/systemd/system/socketServer.service <<- EOM
[Unit]
Description=socketServer
After=network.target multi-user.target

[Service]
ExecStart=/bin/node /sns-sqs-chat/server/src/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=socketServer
User=ubuntu
EnvironmentFile=/sns-sqs-chat/app.env

[Install]
WantedBy=multi-user.target
EOM

MY_HOSTNAME=$(curl http://169.254.169.254/latest/meta-data/public-hostname)

touch /sns-sqs-chat/app.env
sudo chmod 747 /sns-sqs-chat/app.env

cat > /sns-sqs-chat/app.env <<- EOM
PORT=80
BACKEND_URI=
FRONTEND_URI=
SNS_TOPIC_ARN=
MONGO_URI=
MONGO_PASSWORD=
EOM

touch /config.json
sudo chmod 747 /config.json

GROUP_NAME="aws-chat-group"

cat > /config.json <<- EOM
{
        "agent": {
            "metrics_collection_interval": 60,
            "run_as_user": "cwagent",
            "region": "me-south-1"
        },
        "logs": {
                "logs_collected": {
                        "files": {
                                "collect_list": [
                                        {
                                            "file_path": "/var/log/syslog",
                                            "log_group_name": $GROUP_NAME,
                                            "log_stream_name": "socket-server",
                                            "retention_in_days": -1,
                                        }
                                ]
                        }
                }
        },
        "metrics": {
                "aggregation_dimensions": [
                        [
                                "InstanceId"
                        ]
                ],
                "append_dimensions": {
                        "AutoScalingGroupName": "${aws:AutoScalingGroupName}",
                        "ImageId": "${aws:ImageId}",
                        "InstanceId": "${aws:InstanceId}",
                        "InstanceType": "${aws:InstanceType}"
                },
                "metrics_collected": {
                        "collectd": {
                                "metrics_aggregation_interval": 60
                        },
                        "disk": {
                                "measurement": [
                                        "used_percent"
                                ],
                                "metrics_collection_interval": 60,
                                "resources": [
                                        "*"
                                ]
                        },
                        "cpu": {
                            "totalcpu": true
                        },
                        "mem": {
                                "measurement": [
                                        "mem_used_percent"
                                ],
                                "metrics_collection_interval": 60
                        },
                        "statsd": {
                                "metrics_aggregation_interval": 60,
                                "metrics_collection_interval": 10,
                                "service_address": ":8125"
                        }
                }
        },
        "traces": {
                "buffer_size_mb": 3,
                "concurrency": 8,
                "insecure": false,
                "region_override": "me-south-1",
                "traces_collected": {
                        "xray": {
                                "bind_address": "127.0.0.1:2000",
                                "tcp_proxy": {
                                        "bind_address": "127.0.0.1:2000"
                                }
                        }
                }
        }
}
EOM
sudo chmod 644 /var/log/syslog

sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/config.json

cd /sns-sqs-chat/server
sudo npm install

sudo systemctl start socketServer.service 
sudo systemctl enable socketServer.service
sudo systemctl status socketServer.service 