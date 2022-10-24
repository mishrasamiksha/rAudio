#!/bin/bash

. /srv/http/bash/common.sh

startup=$( systemd-analyze | grep '^Startup finished' | cut -d' ' -f 4,7 | sed -e 's/\....s/s/g; s/ / + /' )
timezone=$( timedatectl | awk '/zone:/ {print $3}' )
status="\
$( cut -d' ' -f1-3 /proc/loadavg | sed 's| | <gr>•</gr> |g' )<br>\
$( /opt/vc/bin/vcgencmd measure_temp | sed -E 's/temp=(.*).C/\1 °C/' )<br>\
$( date +'%F <gr>•</gr> %T' )<wide> <gr>• $timezone</gr></wide><br>\
$( uptime -p | tr -d 's,' | sed 's/up //; s/ day/d/; s/ hour/h/; s/ minute/m/' )<wide>&ensp;<gr>since $( uptime -s | cut -d: -f1-2 | sed 's/ / • /' )</gr></wide><br>\
$( [[ $startup ]] && echo "$startup<wide>&ensp;<gr>(kernel + userspace)</gr></wide>" || echo . . . )"
! : >/dev/tcp/8.8.8.8/53 && status+="<br><i class='fa fa-warning'></i>&ensp;No Internet connection"
throttled=$( /opt/vc/bin/vcgencmd get_throttled | cut -d= -f2 )
if [[ $throttled == 0x1 ]]; then # https://www.raspberrypi.org/documentation/raspbian/applications/vcgencmd.md
	status+="<br><i class='fa fa-warning blink red'></i>&ensp;Voltage under 4.7V - detected now <code>0x1</code>"
elif [[ $throttled == 0x10000 ]]; then
	status+="<br><i class='fa fa-warning yl'></i>&ensp;Voltage under 4.7V - occurred <code>0x10000</code>"
fi
# for interval refresh
[[ $1 == status ]] && echo $status && exit

readarray -t cpu <<< $( lscpu | awk '/Core|Model name|CPU max/ {print $NF}' )
cpu=${cpu[0]}
core=${cpu[1]}
speed=${cpu[2]/.*}
(( $speed < 1000 )) && speed+=' MHz' || speed=$( echo "print $speed / 1000" | perl )' GHz'
(( $core > 1 )) && soccpu="$core x $cpu" || soccpu=$cpu
soccpu+=" @ $speed"
rpimodel=$( sed -E 's/ Model |\x0//; s/ Plus/+/; s|( Rev.*)|<gr>\1</gr>|' /proc/device-tree/model )
if [[ $rpimodel == *BeagleBone* ]]; then
	soc=AM3358
else
	cpuInfo
	case $C in
		0 ) soc=BCM2835;; # 0, 1
		1 ) soc=BCM2836;; # 2
		2 ) case $BB in
				04|08 ) soc=BCM2837;;   # 2 1.2, 3B
				0d|0e ) soc=BCM2837B0;; # 3A+, 3B+
				12 )    soc=BCM2710A1;; # 0 2W
			esac
			;;
		3 ) soc=BCM2711;; # 4
	esac
fi
soc+=$( free -h | awk '/^Mem/ {print " <gr>•</gr> "$2}' | sed -E 's|(.i)| \1B|' )
version=$( < $dirsystem/version )
system="\
rAudio $( getContent $diraddons/r$version )<br>\
$( uname -rm | sed -E 's|-rpi-ARCH (.*)| <gr>\1</gr>|' )<br>\
$rpimodel<br>\
$soc<br>\
$soccpu"

if ifconfig | grep -q eth0; then
	if [[ -e $dirsystem/soundprofile.conf ]]; then
		soundprofileconf="[ $( cut -d= -f2 $dirsystem/soundprofile.conf | xargs | tr ' ' , ) ]"
	else
		soundprofileconf="[ \
$( sysctl vm.swappiness | awk '{print $NF}'  ), \
$( ifconfig eth0 | awk '/mtu/ {print $NF}' ), \
$( ifconfig eth0 | awk '/txqueuelen/ {print $4}' ) \
]"
	fi
fi

# sd, usb and nas
smb=$( isactive smb )
if mount | grep -q 'mmcblk0p2 on /'; then
	used_size=( $( df -lh --output=used,size,target | grep '/$' ) )
	list+=',{
  "icon"       : "microsd"
, "mountpoint" : "/mnt/MPD/SD"
, "mounted"    : true
, "source"     : "/dev/mmcblk0p2"
, "size"       : "'${used_size[0]}'B/'${used_size[1]}'B"
, "nfs"        : '$( grep -q $dirsd /etc/exports && echo true )'
, "smb"        : '$smb'
}'
fi
usb=$( mount | grep ^/dev/sd | cut -d' ' -f1 )
if [[ $usb ]]; then
	readarray -t usb <<< "$usb"
	for source in "${usb[@]}"; do
		mountpoint=$( df -l --output=target,source \
						| grep "$source" \
						| sed "s| *$source||" )
		if [[ $mountpoint ]]; then
			used_size=( $( df -lh --output=used,size,source | grep "$source" ) )
			list+=',{
  "icon"       : "usbdrive"
, "mountpoint" : "'$mountpoint'"
, "mounted"    : true
, "source"     : "'$source'"
, "size"       : "'${used_size[0]}'B/'${used_size[1]}'B"
, "nfs"        : '$( grep -q "$mountpoint" /etc/exports && echo true )'
, "smb"        : '$( [[ $smb == true && $mountpoint == $dirusb ]] && echo true )'
}'
		else
			label=$( e2label $source )
			[[ ! $label ]] && label=?
			list+=',{"icon":"usbdrive","mountpoint":"'$dirusb/$label'","mounted":false,"source":"'$source'"}'
		fi
		[[ ! $hddapm ]] && hddapm=$( hdparm -B $source \
										| grep -m1 APM_level \
										| tr -d -c 0-9 )
	done
fi
nas=$( awk '/.mnt.MPD.NAS|.srv.http.data/ {print $1" "$2}' /etc/fstab | sort )
if [[ $nas ]]; then
	readarray -t nas <<< "$nas"
	for line in "${nas[@]}"; do
		source=$( echo $line | cut -d' ' -f1 | sed 's/\\040/ /g' )
		mountpoint=$( echo $line | cut -d' ' -f2 | sed 's/\\040/ /g' )
		used_size=( $( timeout 0.1s df -h --output=used,size,source | grep "$source" ) )
		list+=',{
  "icon"       : "networks"
, "mountpoint" : "'$mountpoint'"'
		if [[ $used_size ]]; then
			list+='
, "mounted"    : true
, "source"     : "'$source'"
, "size"       : "'${used_size[0]}'B/'${used_size[1]}'B"
}'
		else
			list+='
, "mounted"    : false
, "source"     : "'$source'"
}'
		fi
	done
fi
list="[ ${list:1} ]"

if grep -q dtparam=i2c_arm=on /boot/config.txt; then
	dev=$( ls /dev/i2c* 2> /dev/null | cut -d- -f2 )
	lines=$( i2cdetect -y $dev 2> /dev/null )
	if [[ $lines ]]; then
		i2caddress=$( echo "$lines" \
						| grep -v '^\s' \
						| cut -d' ' -f2- \
						| tr -d ' \-' \
						| grep -v UU \
						| awk NF \
						| sort -u )
		lcdcharaddr="[ $(( "0x$i2caddress" )) ]"
	fi
fi
if [[ -e $dirsystem/lcdchar.conf ]]; then # cols charmap inf address chip pin_rs pin_rw pin_e pins_data backlight
	vals=$( sed -e '/var]/ d
			' -E -e '/charmap|inf|chip/ s/.*=(.*)/"\1"/; s/.*=//
			' -E -e 's/[][]//g; s/,/ /g; s/(True|False)/\l\1/
			' $dirsystem/lcdchar.conf )
	if grep -q i2c <<< "$vals"; then
		vals=$( sed -E 's/^(true|false)$/15 18 16 21 22 23 24 \1/' <<< "$vals" )
	else
		vals=$( sed 's/"gpio"/& 39 "PCF8574"/' <<< "$vals" )
	fi
	lcdcharconf='[ '$( echo $vals | tr ' ' , )' ]'
fi
oledchip=$( grep mpd_oled /etc/systemd/system/mpd_oled.service | cut -d' ' -f3 )
baudrate=$( grep baudrate /boot/config.txt | cut -d= -f3 )
[[ ! $baudrate ]] && baudrate=800000
mpdoledconf='[ '$oledchip', '$baudrate' ]'
if [[ -e $dirsystem/audiophonics ]]; then
	powerbuttonconf='[ 5, 5, 40, 5, true ]'
elif [[ -e $dirsystem/powerbutton.conf ]]; then
	powerbuttonconf="[ $( cut -d= -f2 $dirsystem/powerbutton.conf | xargs | tr ' ' , ), false ]"
fi
[[ -e $dirsystem/rotaryencoder.conf ]] && rotaryencoderconf="[ $( cut -d= -f2 $dirsystem/rotaryencoder.conf | xargs | tr ' ' , ) ]"
[[ -e $dirsystem/vuled.conf ]] && vuledconf="[ $( tr ' ' , < $dirsystem/vuled.conf ) ]"

data+='
  "page"             : "system"
, "audioaplayname"   : "'$( getContent $dirsystem/audio-aplayname )'"
, "audiooutput"      : "'$( getContent $dirsystem/audio-output )'"
, "camilladsp"       : '$( exists $dirsystem/camilladsp )'
, "hddapm"           : '$hddapm'
, "hddsleep"         : '${hddapm/128/false}'
, "hostapd"          : '$( isactive hostapd )'
, "hostname"         : "'$( hostname )'"
, "i2seeprom"        : '$( grep -q force_eeprom_read=0 /boot/config.txt && echo true )'
, "lcd"              : '$( grep -q 'dtoverlay=.*rotate=' /boot/config.txt && echo true )'
, "lcdchar"          : '$( exists $dirsystem/lcdchar )'
, "lcdcharaddr"      : '$lcdcharaddr'
, "lcdcharconf"      : '$lcdcharconf'
, "list"             : '$list'
, "lcdmodel"         : "'$( getContent $dirsystem/lcdmodel )'"
, "mpdoled"          : '$( exists $dirsystem/mpdoled )'
, "mpdoledconf"      : '$mpdoledconf'
, "nfsserver"        : '$( isactive nfs-server )'
, "ntp"              : "'$( grep '^NTP' /etc/systemd/timesyncd.conf | cut -d= -f2 )'"
, "powerbutton"      : '$( systemctl -q is-active powerbutton || [[ $audiophonics == true ]] && echo true )'
, "powerbuttonconf"  : '$powerbuttonconf'
, "relays"           : '$( exists $dirsystem/relays )'
, "rotaryencoder"    : '$( isactive rotaryencoder )'
, "rotaryencoderconf": '$rotaryencoderconf'
, "shareddata"       : '$( [[ -L $dirmpd ]] && echo true )'
, "soundprofile"     : '$( exists $dirsystem/soundprofile )'
, "soundprofileconf" : '$soundprofileconf'
, "status"           : "'$status'"
, "startup"          : '$( [[ $startup ]] && echo true )'
, "system"           : "'$system'"
, "timezone"         : "'$timezone'"
, "usbautoupdate"    : '$( [[ -e $dirsystem/usbautoupdate && ! -e $filesharedip ]] && echo true )'
, "vuled"            : '$( exists $dirsystem/vuled )'
, "vuledconf"        : '$vuledconf
if [[ -e $dirshm/onboardwlan ]]; then
	data+='
, "wlan"             : '$( lsmod | grep -q brcmfmac && echo true )'
, "wlanconf"         : [ "'$( cut -d'"' -f2 /etc/conf.d/wireless-regdom )'", '$( [[ ! -e $dirsystem/wlannoap ]] && echo true )' ]
, "wlanconnected"    : '$( ip r | grep -q "^default.*wlan0" && echo true )
	discoverable=true
	if grep -q ^dtparam=krnbt=on /boot/config.txt; then
		bluetooth=true
		bluetoothactive=$( isactive bluetooth )
		if [[ $bluetoothactive == true ]]; then
			discoverable=$( bluetoothctl show | grep -q 'Discoverable: yes' && echo true )
		fi
	fi
	data+='
, "bluetooth"        : '$bluetooth'
, "bluetoothactive"  : '$bluetoothactive'
, "bluetoothconf"    : [ '$discoverable', '$( exists $dirsystem/btformat )' ]
, "btconnected"      : '$( [[ $( awk NF $dirshm/btconnected ) ]] && echo true )
fi

data2json "$data" $1
