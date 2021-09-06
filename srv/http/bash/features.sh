#!/bin/bash

dirbash=/srv/http/bash
dirsystem=/srv/http/data/system

# convert each line to each args
readarray -t args <<< "$1"

pushstream() {
	curl -s -X POST http://127.0.0.1/pub?id=$1 -d "$2"
}
pushRefresh() {
	data=$( /srv/http/bash/features-data.sh )
	pushstream refresh "$data"
}
pushRefreshNetworks() {
	data=$( /srv/http/bash/networks-data.sh )
	pushstream refresh "$data"
}
featureSet() {
	systemctl restart $@
	systemctl -q is-active $@ && systemctl enable $@
	pushRefresh
}

case ${args[0]} in

shairport-sync | spotifyd | upmpdcli )
	service=${args[0]}
	enable=${args[1]}
	[[ $enable == true ]] && enable=enable || enable=disable
	systemctl $enable --now $service
	pushRefresh
	;;
aplaydevices )
	aplay -L | grep -v '^\s\|^null' | head -c -1
	;;
autoplay )
	[[ ${args[1]} == true ]] && touch $dirsystem/autoplay || rm -f $dirsystem/autoplay
	pushRefresh
	;;
autoplaycd )
	[[ ${args[1]} == true ]] && touch $dirsystem/autoplaycd || rm -f $dirsystem/autoplaycd
	pushRefresh
	;;
hostapddisable )
	systemctl disable --now hostapd
	ifconfig wlan0 0.0.0.0
	pushRefresh
	pushRefreshNetworks
	;;
hostapdset )
	if [[ ${#args[@]} > 1 ]]; then
		iprange=${args[1]}
		router=${args[2]}
		password=${args[3]}
		sed -i -e "s/^\(dhcp-range=\).*/\1$iprange/
" -e "s/^\(.*option:router,\).*/\1$router/
" -e "s/^\(.*option:dns-server,\).*/\1$router/
" /etc/dnsmasq.conf
		sed -i -e '/^#*wpa\|^#*rsn/ s/^#*//
' -e "s/\(wpa_passphrase=\).*/\1$password/
" /etc/hostapd/hostapd.conf
	else
		router=$( grep router /etc/dnsmasq.conf | cut -d, -f2 )
		sed -i -e '/^wpa\|^rsn/ s/^/#/' /etc/hostapd/hostapd.conf
	fi
	ifconfig wlan0 &> /dev/null || /srv/http/bash/system.sh wlanset$'\n'true
	netctl stop-all
	ifconfig wlan0 $router
	featureSet hostapd
	pushRefreshNetworks
	;;
localbrowserdisable )
	ply-image /srv/http/assets/img/splash.png
	systemctl disable --now bootsplash localbrowser
	systemctl enable --now getty@tty1
	sed -i 's/\(console=\).*/\1tty1/' /boot/cmdline.txt
	pushRefresh
	;;
localbrowserset )
	screenoff=$(( ${args[1]} * 60 ))
	zoom=${args[2]}
	rotate=${args[3]}
	cursor=${args[4]}
	if [[ -e $dirsystem/localbrowserval ]]; then
		conf=( $( cat $dirsystem/localbrowserval 2> /dev/null | cut -d= -f2 ) )
		prevscreenoff=$( grep screenoff <<< "$conf" | cut -d= -f2 )
		prevzoom=$( grep zoom <<< "$conf" | cut -d= -f2 )
		prevrotate=$( grep rotate <<< "$conf" | cut -d= -f2 )
		prevcursor=$( grep cursor <<< "$conf" | cut -d= -f2 )
	fi
	[[ $screenoff != $prevscreenoff ]] && DISPLAY=:0 xset dpms $screenoff $screenoff $screenoff
	if [[ $rotate != $prevrotate ]]; then
		if grep -q 'waveshare\|tft35a' /boot/config.txt; then
			case $rotate in
				NORMAL) degree=0;;
				CW )    degree=270;;
				CCW )   degree=90;;
				UD )    degree=180;;
			esac
			sed -i "/waveshare\|tft35a/ s/\(rotate=\).*/\1$degree/" /boot/config.txt
			cp -f /etc/X11/{lcd$degree,xorg.conf.d/99-calibration.conf}
			echo Rotate GPIO LCD screen > /srv/http/data/shm/reboot
			reboot=1
		else
			rotateconf=/etc/X11/xorg.conf.d/99-raspi-rotate.conf
			if [[ $rotate == NORMAL ]]; then
				rm -f $rotateconf
			else
				case $rotate in
					CW )  matrix='0 1 0 -1 0 1 0 0 1';;
					CCW ) matrix='0 -1 1 1 0 0 0 0 1';;
					UD )  matrix='-1 0 1 0 -1 1 0 0 1';;
				esac
				sed -e "s/ROTATION_SETTING/$rotate/
				" -e "s/MATRIX_SETTING/$matrix/" /etc/X11/xinit/rotateconf > $rotateconf
			fi
		fi
		$dirbash/cmd.sh rotateSplash$'\n'$rotate
		ply-image /srv/http/assets/img/splash.png
	fi
	sed -i 's/\(console=\).*/\1tty3 quiet loglevel=0 logo.nologo vt.global_cursor_default=0/' /boot/cmdline.txt
	echo -n "\
screenoff=$screenoff
zoom=$zoom
rotate=$rotate
cursor=$cursor
" > $dirsystem/localbrowserval
	systemctl disable --now getty@tty1
	if [[ -z $reboot ]]; then
		featureSet bootsplash localbrowser
		systemctl restart bootsplash localbrowser
		systemctl -q is-active localbrowser && systemctl enable bootsplash localbrowser
	fi
	pushRefresh
	;;
logindisable )
	rm -f $dirsystem/login*
	sed -i '/^bind_to_address/ s/".*"/"0.0.0.0"/' /etc/mpd.conf
	systemctl restart mpd
	pushRefresh
	;;
loginset )
	touch $dirsystem/login
	sed -i '/^bind_to_address/ s/".*"/"127.0.0.1"/' /etc/mpd.conf
	systemctl restart mpd
	pushRefresh
	;;
mpdscribbledisable )
	systemctl disable --now mpdscribble@mpd
	pushRefresh
	;;
mpdscribbleset )
	user=${args[1]}
	pwd=${args[2]}
	sed -i -e "s/^\(username =\).*/\1 $user/
	" -e "s/^\(password =\).*/\1 $pwd/
	" /etc/mpdscribble.conf
	if systemctl restart mpdscribble@mpd; then
		systemctl enable mpdscribble@mpd
	else
		systemctl disable mpdscribble@mpd
		echo -1
	fi
	pushRefresh
	;;
smbdisable )
	systemctl disable --now smb
	pushRefresh
	;;
smbset )
	smbconf=/etc/samba/smb.conf
	sed -i '/read only = no/ d' $smbconf
	[[ ${args[1]} == true ]] && sed -i '/path = .*SD/ a\	read only = no' $smbconf
	[[ ${args[2]} == true ]] && sed -i '/path = .*USB/ a\	read only = no' $smbconf
	systemctl restart smb
	systemctl -q is-active smb && systemctl enable smb
	pushRefresh
	;;
snapclientdisable )
	rm $dirsystem/snapclient
	pushRefresh
	;;
snapclientset )
	latency=${args[1]}
	sed -i '/OPTS=/ s/".*"/"--latency='$latency'"/' /etc/default/snapclient
	touch $dirsystem/snapclient
	pushRefresh
	;;
snapserver )
	if [[ ${args[1]} == true ]]; then
		systemctl enable --now snapserver
	else
		systemctl disable --now snapserver
		$dirbash/snapcast.sh serverstop
	fi
	$dirbash/mpd-conf.sh
	pushRefresh
	;;
streaming )
	[[ ${args[1]} == true ]] && touch $dirsystem/streaming || rm -f $dirsystem/streaming
	$dirbash/mpd-conf.sh
	pushRefresh
	;;
	
esac
