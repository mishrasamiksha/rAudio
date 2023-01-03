#!/bin/bash

. /srv/http/bash/common.sh

if [[ ! -e $dirdata/addons ]]; then # create-ros.sh
	echo $1 > $diraddons/r1
else                                # reset
	reset=1
	grep -q '^status=.*play' $dirshm/status && $dirbash/cmd.sh playerstop
# config.txt
	cpuInfo
	config="\
gpu_mem=32
initramfs initramfs-linux.img followkernel
max_usb_current=1
disable_splash=1
disable_overscan=1
dtparam=audio=on"
	[[ $onboardwireless ]] && config+="
dtparam=krnbt=on"
	[[ $rpi0 ]] && config+="
force_turbo=1
hdmi_drive=2
over_voltage=2"
	echo "$config" > /boot/config.txt
	
# css color
	[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color$'\n'reset
	
# i2c
	sed -i -E '/dtparam=i2c_arm=on|dtparam=spi=on|dtparam=i2c_arm_baudrate/ d' /boot/config.txt &> /dev/null
	sed -i -E '/i2c-bcm2708|i2c-dev|^\s*$/ d' /etc/modules-load.d/raspberrypi.conf &> /dev/null
	
# lcd
	grep -q -m1 'dtoverlay=.*rotate=' /boot/config.txt && $dirsettings/system.sh lcd$'\n'false
	
# mpd
	mpc -q crossfade 0
	find $dirmpdconf -maxdepth 1 -type l -exec rm {} \; # mpd.conf symlink
	echo 'audio_buffer_size  "4096"' > $dirmpdconf/conf/buffer.conf
	echo 'max_output_buffer_size  "8192"' > $dirmpdconf/conf/outputbuffer.conf
	echo 'replaygain          "album"' > $dirmpdconf/conf/rplaygain.conf
	
# nas
	readarray -t dirs <<< $( find $dirnas -mindepth 1 -maxdepth 1 -type d )
	for dir in "${dirs[@]}"; do
		umount -l "$dir" &> /dev/null
		rmdir "$dir" &> /dev/null
	done
	sed -i '3,$ d' /etc/fstab
	sed -i '/^#/! d' /etc/exports
	
# strteamer
	sed -i -E 's/^(ssid=).*/\1rAudio/' /etc/hostapd/hostapd.conf
	sed -i -E 's/(name = ").*/\1rAudio"/' /etc/shairport-sync.conf
	sed -i -E 's/^(friendlyname = ).*/\1rAudio/' /etc/upmpdcli.conf
	
# system
	systemctl -q disable bluetooth hostapd camilladsp nfs-server powerbutton rtsp-simple-server shairport-sync smb snapclient spotifyd upmpdcli &> /dev/null
	sed -i 's|^Server = http://.*mirror|Server = http://mirror|' /etc/pacman.d/mirrorlist
	mv $dirdata/{addons,mpdconf} /tmp
	rm -rf $dirdata $dirshareddata /mnt/MPD/.mpdignore $dirnas/.mpdignore /etc/modules-load.d/loopback.conf
fi

# data directories
mkdir -p $dirdata/{addons,audiocd,bookmarks,lyrics,mpd,playlists,system,webradio,webradio/img} /mnt/MPD/{NAS,SD,USB}
ln -sf /dev/shm $dirdata
ln -sf /mnt /srv/http/
chown -h http:http $dirshm /srv/http/mnt

# addons - new/reset
if [[ $reset ]]; then
	mv /tmp/{addons,mpdconf} $dirdata
else
	dirs=$( ls $dirdata )
	for dir in $dirs; do
		printf -v dir$dir '%s' $dirdata/$dir
	done
fi

# camillagui
if [[ -e /usr/bin/camilladsp ]]; then
	dircamillagui=/srv/http/settings/camillagui/build
	ln -sf /srv/http/assets/fonts $dircamillagui
	ln -sf /srv/http/assets/css/colors.css $dircamillagui
	ln -sf /srv/http/assets/img/icon.png $dircamillagui
fi

# display
true='album albumartist artist bars buttons composer conductor count cover date fixedcover genre
	label latest nas playbackswitch playlists plclear plsimilar sd time usb volume webradio'
false='albumbyartist audiocdplclear backonleft barsalways camilladsp covervu hidecover
	multiraudio noswipe radioelapsed tapaddplay tapreplaceplay vumeter'
for i in $true; do
	lines+='
, "'$i'": true'
done
for i in $false; do
	lines+='
, "'$i'": false'
done
jq -S <<< {${lines:2}} > $dirsystem/display

# localbrowser
if [[ -e /usr/bin/chromium ]]; then
	rm -rf /root/.config/chromium
	echo "\
rotate=NORMAL
zoom=100
screenoff=0
onwhileplay=false
cursor=false" > $dirsystem/localbrowser.conf
	systemctl -q enable localbrowser
fi

# relays
cat << EOF > $dirsystem/relays.conf
pin='[ 11,13,15,16 ]'
name='[ "DAC","PreAmp","Amp","Subwoofer" ]'
onorder='[ "DAC","PreAmp","Amp","Subwoofer" ]'
offorder='[ "Subwoofer","Amp","PreAmp", "DAC" ]'
on=( 11 13 15 16 )
ond=( 2 2 2 )
off=( 16 15 13 11 )
offd=( 2 2 2 )
timer=5
EOF

# system
hostnamectl set-hostname rAudio
sed -i 's/#NTP=.*/NTP=pool.ntp.org/' /etc/systemd/timesyncd.conf
sed -i 's/".*"/"00"/' /etc/conf.d/wireless-regdom
timedatectl set-timezone UTC
usermod -a -G root http # add user http to group root to allow /dev/gpiomem access
touch $dirsystem/usbautoupdate

# webradio
curl -sL https://github.com/rern/rAudio-addons/raw/main/webradio/radioparadise.tar.xz | bsdtar xf - -C $dirwebradio
if [[ ! -e $dirmpd/counts ]]; then
	echo '{
  "playlists" : '$( ls -1 $dirplaylists | wc -l )'
, "webradio"  : '$( find -L $dirwebradio -type f ! -path '*/img/*' | wc -l )'
}' > $dirmpd/counts
fi


# set ownership and permissions
$dirsettings/system.sh dirpermissions

[[ $reset ]] && $dirbash/cmd.sh power$'\n'reboot
