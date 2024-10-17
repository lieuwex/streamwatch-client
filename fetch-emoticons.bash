#!/bin/sh

curl -L 'https://twitchemotes.com/channels/52385053' | pup 'img.emote json{}' | jq 'map({(."data-regex"): ."data-image-id" }) | add' > src/emoticons.json
