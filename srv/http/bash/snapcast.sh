#!/bin/bash

# as server - features.sh > this:
#    - force clients stop on disabled
#    - data for sshpass from snapclient
# as client - main.js > this:
#    - connect / disconnect


dirshm=/srv/http/data/shm
serverfile=$dirshm/serverip
clientfile=$dirshm/clientip

pushstream() {
	curl -s -X POST http://$1/pub?id=snapcast -d "$2"
}

if [[ $1 == start ]]; then # client start - save server ip
	mpc -q stop
	systemctl start snapclient
	sleep 2
	serverip=$( journalctl -u snapclient | grep 'Connected to' | tail -1 | awk '{print $NF}' )
	if [[ -n $serverip ]]; then
		[[ ! -e $dirshm/player-snapclient ]] && $dirbash/cmd.sh playerstart$'\n'snapcast
		echo $serverip > $serverfile
		clientip=$( ifconfig | awk '/inet .*broadcast/ {print $2}' )
		sshpass -p ros \
			ssh -qo StrictHostKeyChecking=no root@$serverip \
			"/srv/http/bash/snapcast.sh $clientip $serverip"
		systemctl try-restart bluezdbus shairport-sync spotifyd upmpdcli &> /dev/null
	else
		systemctl stop snapclient
		echo -1
	fi
elif [[ $1 == serverstop ]]; then # force stop clients
	if [[ -e $clientfile ]]; then
		readarray -t clientip < $clientfile
		for ip in "${clientip[@]}"; do
			[[ -n $ip ]] && pushstream $ip -1
		done
		rm -f $clientfile
	fi
else # sshpass from client
	clientip=$1
	serverip=$2
	sed -i "/$clientip/ d" $clientfile &> /dev/null
	[[ -s $clientfile ]] || rm $clientfile
	if [[ -n $serverip ]]; then # initial connect
		echo $clientip >> $clientfile
		status=$( /srv/http/bash/status.sh snapclient )
		curl -s -X POST http://$clientip/pub?id=mpdplayer -d "$status"
	fi
fi
