#!/bin/bash

. /srv/http/bash/common.sh

if [[ ! -e $filesharedip ]]; then
	if mount | grep -q -m1 'mmcblk0p2 on /'; then
		used_size=( $( df -lh --output=used,size,target | grep '/$' ) )
		list+=',{
  "icon"       : "microsd"
, "mountpoint" : "/<g>mnt/MPD/SD</g>"
, "mounted"    : true
, "source"     : "/dev/mmcblk0p2"
, "size"       : "'${used_size[0]}'B/'${used_size[1]}'B"
}'
	fi
	usb=$( mount | grep ^/dev/sd | cut -d' ' -f1 )
	if [[ $usb ]]; then
		readarray -t usb <<< $usb
		for source in "${usb[@]}"; do
			mountpoint=$( df -l --output=target,source | sed -n "\|$source| {s| *$source||; p}" )
			if [[ $mountpoint ]]; then
				used_size=( $( df -lh --output=used,size,source | grep "$source" ) )
				list+=',{
  "icon"       : "usbdrive"
, "mountpoint" : "'$( stringEscape $mountpoint )'"
, "mounted"    : true
, "source"     : "'$source'"
, "size"       : "'${used_size[0]}'B/'${used_size[1]}'B"
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
fi
nas=$( grep -E '/mnt/MPD/NAS|/srv/http/data' /etc/fstab | tr -s ' ' )
if [[ $nas ]]; then
	readarray -t nas <<< $( cut -d' ' -f1-2 <<< $nas | sort )
	for line in "${nas[@]}"; do
		source=${line/ *}
		source=${source//\\040/ }
		mountpoint=${line/* }
		mountpoint=${mountpoint//\\040/ }
		used_size=( $( timeout 0.1s df -h --output=used,size,source | grep "$source" ) )
		list+=',{
  "icon"       : "networks"
, "mountpoint" : "'$( stringEscape $mountpoint )'"'
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
echo "[ ${list:1} ]"
