#!/bin/sh

set -ex

if [ ! -d dd-downloader ]; then
    git clone https://github.com/jiseongnoh/dd-downloader.git
    cd dd-downloader
    git checkout hostname
    go build
fi

pip install pytz python-dotenv pytimeparse

