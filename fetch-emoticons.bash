#!/bin/sh

curl -L 'https://twitchemotes.com/channels/52385053' | pup 'img.emote json{}' > src/emoticons.json
