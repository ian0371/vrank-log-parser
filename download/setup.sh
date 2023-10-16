#!/bin/sh

set -ex

if [ -z dd-downloader ]; then
    git clone https://github.com/jiseongnoh/dd-downloader.git
    cd dd-downloader
    git checkout hostname
    make
fi

pip install pytz python-dotenv pytimeparse

