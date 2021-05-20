$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

function btRender( data ) {
	var dot;
	var html = '';
	data.forEach( function( list ) {
		html += '<li data-mac="'+ list.mac +'" data-connected="'+ list.connected +'"><i class="fa fa-bluetooth"></i>'
				+ ( list.connected  ? '<grn>&bull;&ensp;</grn>' : ( list.paired ? '<gr>&bull;&ensp;</gr>' : '' ) )
				+'<a class="liname wh">'+ list.name +'</a>';
				+'</li>';
	} );
	$( '#listbtscan' ).html( html );
}
function btScan() {
	bash( '/srv/http/bash/networks-scanbt.sh', function( data ) {
		if ( data.length ) btRender( data );
		intervalscan = setTimeout( btScan, 12000 );
	}, 'json' );
}
function connect( data ) { // [ ssid, wpa, password, hidden, ip, gw ]
	clearTimeout( intervalscan );
	var ssid = data.ESSID;
	var ip = data.Address;
	if ( ip ) {
		if ( $( '#listlan li' ).length ) {
			notify( ssid, 'Change ...', 'wifi' );
		} else {
			loader();
			location.href = 'http://'+ ip +'/settings.php?p=networks';
			notify( ssid, 'Change URL to '+ ip, 'wifi' );
		}
	} else {
		notify( ssid, $( '#listwl li' ).length ? 'Change ...' : 'Connect ...', 'wifi' );
	}
	bash( [ 'connect', JSON.stringify( data ) ], function( std ) {
		if ( std == -1 ) {
			G.wlconnected =  '';
			info( {
				  icon      : 'wifi'
				, title     : 'Wi-Fi'
				, message   : 'Connect to <wh>'+ ssid +'</wh> failed.'
			} );
		} else {
			$( '.back' ).click();
		}
	} );
}
function editLAN( data ) {
	var data0 = data;
	var message = data.ip ? 'Current: <wh>'+ ( data.dhcp === 'dhcp' ? 'DHCP' : 'Static IP' ) +'</wh><br>&nbsp;' : '';
	info( {
		  icon         : 'lan'
		, title        : ( data.ip ? 'LAN' : 'Add LAN' )
		, message      : message
		, textlabel    : [ 'IP', 'Gateway' ]
		, textvalue    : [ data.ip, data.gateway ]
		, checkchanged : [ data.ip, data.gateway ]
		, textrequired : [ 0 ]
		, preshow      : function() {
			if ( data.dhcp === 'dhcp' || !data.ip ) $( '#infoButton' ).addClass( 'hide' );
		}
		, buttonlabel  : '<i class="fa fa-undo"></i>DHCP'
		, buttonwidth  : 1
		, button       : function() {
			notify( 'LAN IP Address', 'Change URL to '+ G.hostname +'.local ...', 'lan' );
			loader();
			location.href = 'http://'+ G.hostname +'.local/settings.php?p=networks';
			bash( [ 'editlan' ] );
		}
		, ok           : function() {
			var values = infoVal();
			var data1 = {}
			data1.ip = values[ 0 ];
			data1.gateway = values[ 1 ];
			notify( 'LAN IP Address', 'Change ip to '+ data1.ip, 'lan' );
			bash( [ 'editlan', data1.ip, data1.gateway ], function( used ) {
				if ( used == -1 ) {
					info( {
						  icon    : 'lan'
						, title   : 'Duplicate IP'
						, message : 'IP <wh>'+ data1.ip +'</wh> already in use.'
						, ok      : function() {
							editLAN( data0 );
						}
					} );
				}
				bannerHide();
			} );
		}
	} );
}
function editWiFi( data ) {
	var ESSID = data.ESSID || '';
	var Address = data.Address || '';
	var Gateway = data.Gateway || '';
	var Key = data.Key || '';                     // password
	var IP = data.IP === 'static' ? true : false; // dhcp
	var Hidden = data.Hidden || false;
	var Security = data.Security === 'wep' ? true : false
	var cchecked = [];
	if ( IP ) cchecked.push( 0 );
	if ( Hidden ) cchecked.push( 1 );
	if ( Security ) cchecked.push( 2 );
	info( {
		  icon          : ESSID ? 'edit-circle' : 'wifi'
		, title         : ESSID ? 'Edit Saved Connection' : 'New Wi-Fi Connection'
		, textlabel     : [ 'SSID', 'IP', 'Gateway' ]
		, textvalue     : [ ssid, Address, Gateway ]
		, checkbox      : { 'Static IP': 1, 'Hidden SSID': 1, 'WEP': 1 }
		, cchecked      : cchecked
		, passwordlabel : 'Password'
		, passwordvalue : Key
		, textlength    : { 3: 8 }
		, checkchanged  : [ ssid, Address, Gateway, Key, IP, Hidden, Security ]
		, preshow       : function() {
			$( '#infoTextBox' ).prop( 'disabled', 1 );
			if ( !ssid ) $( '#infotextlabel a:eq( 1 ), #infoTextBox1, #infotextlabel a:eq( 2 ), #infoTextBox2' ).hide();
			$( '#infoCheckBox' ).change( function() {
				$( '.infolabel:eq( 1 ), .infolabel:eq( 2 ), #infoTextBox1, #infoTextBox2' ).toggle( $( this ).prop( 'checked' ) );
			} );
		}
		, ok            : function() {
			var k =[ 'ESSID', 'Address', 'Gateway', 'Key', 'IP', 'Hidden', 'Security' ];
			var v = infoVal();
			values = {}
			$.each( v, function( i, v ) {
				if ( i === 4 ) {
					v = v ? 'static' : 'dhcp';
				} else if ( i === 6 ) {
					v = v ? 'wep' : 'wpa';
				}
				values[ k[ i ] ] = v;
			} );
			if ( values.IP === 'dhcp' ) {
				connect( values );
			} else {
				bash( 'ping -c 1 -w 1 '+ values.Address +' &> /dev/null && echo -1', function( std ) {
					if ( std == -1 ) {
						info( {
							  icon    : 'wifi'
							, title   : 'Duplicate IP'
							, message : 'IP <wh>'+ values.Address +'</wh> already in use.'
							, ok      : function() {
								editWiFi( values );
							}
						} );
					} else {
						connect( values );
					}
				} );
			}
		}
	} );
}
function infoAccesspoint() {
	info( {
		  icon    : 'wifi'
		, title   : 'Wi-Fi'
		, message : 'RPi Access Point must be disabled.'
	} );
}
function infoConnect( $this ) {
	var connected = $this.data( 'ip' );
	var ssid = $this.data( 'ssid' );
	var ip = $this.data( 'ip' );
	var gw = $this.data( 'gateway' );
	var wpa = $this.data( 'wpa' );
	var dhcp = $this.data( 'dhcp' );
	var encrypt = $this.data( 'encrypt' ) === 'on';
	var password = $this.data( 'password' );
	var profile = $this.data( 'profile' );
	info( {
		  icon        : 'wifi'
		, title       : ssid
		, message     : !ip ? 'Saved connection' : '<div class="colL">'
				+ ( dhcp === 'dhcp' ? 'DHCP IP' : 'Static IP' ) +'<br>'
				+'Gateway'
			+'</div>'
			+'<div class="colR wh" style="text-align: left;">'
				+ ip +'<br>'
				+ gw
			+'</div>'
		, preshow     : function() {
			if ( profile ) $( '#infoButton1' ).hide();
		}
		, buttonwidth : 1
		, buttonlabel : [
			  '<i class="fa fa-minus-circle"></i> Forget'
			, '<i class="fa fa-edit-circle"></i> Edit'
		]
		, buttoncolor : [
			  red
			, ''
		]
		, button      : [
			  function() {
				clearTimeout( intervalscan );
				notify( ssid, 'Forget ...', 'wifi' );
				bash( [ 'profileremove', ssid ] );
			}
			, function() {
				editWiFi( $this );
			}
		]
		, oklabel : connected ? 'Disconnect' : 'Connect'
		, okcolor : connected ? orange : ''
		, ok      : function() {
			clearTimeout( intervalscan );
			notify( ssid, connected ? 'Disconnect ...' : 'Connect ...', 'wifi blink' );
			if ( connected ) {
				bash( [ 'disconnect' ] );
			} else {
				bash( [ 'profileconnect', ssid ] );
			}
		}
	} );
}
function nicsStatus() {
	bash( '/srv/http/bash/networks-data.sh', function( list ) {
		var list2G = list2JSON( list );
		if ( !list2G ) return
		
		var htmlbt = '';
		var htmllan = '';
		var htmlwl = '';
		if ( G.listbt ) {
			G.listbt.forEach( function( list ) {
				htmlbt += '<li class="bt" data-name="'+ list.name +'" data-connected="'+ list.connected +'" data-mac="'+ list.mac +'"><i class="fa fa-bluetooth"></i>';
				htmlbt += ( list.connected ? '<grn>&bull;</grn>&ensp;' : '<gr>&bull;</gr>&ensp;' ) + list.name +'</li>';
			} );
			$( '#listbt' ).html( htmlbt );
			$( '#ifconfig' ).next().find( 'code' ).text( 'ifconfig; bluetoothctl show' );
		}
		if ( G.listeth ) {
			var val = G.listeth;
			htmllan += '<li class="eth0" data-ip="'+ val.ip +'" data-dhcp="'+ val.dhcp +'" ';
			htmllan += 'data-gateway="'+ val.gateway +'" data-hostname="'+ val.hostname +'">';
			htmllan += '<i class="fa fa-lan"></i><grn>&bull;</grn>&ensp;'+ val.ip +'</li>';
		}
		if ( G.listwlan ) {
			var val = G.listwlan;
			htmlwl += '<li class="wlan0" data-ip="'+ val.ip +'" data-dhcp="'+ val.dhcp +'" data-ssid="'+ val.ssid +'" ';
			htmlwl += 'data-gateway="'+ val.gateway +'" data-hostname="'+ val.hostname +'" ';
			htmlwl += 'data-hidden="'+ val.hidden +'" data-password="'+ val.password +'">';
			var signal = val.dbm > good ? '' : ( val.dbm < fair ? 1 : 2 );
			htmlwl += '<i class="fa fa-wifi'+ signal +'"></i><grn>&bull;</grn>&ensp;';
			if ( !G.hostapd ) {
				htmlwl += val.ssid +'<gr>&ensp;&bull;&ensp;</gr>'+ val.ip +'<gr>&ensp;&raquo;&ensp;'+ val.gateway +'</gr></li>';
			} else {
				htmlwl += '<gr>Access point&ensp;&laquo;&ensp;</gr>'+ G.hostapd.hostapdip +'</li>';
			}
		}
		if ( G.listwlannc ) {
			G.listwlannc.forEach( function( ssid ) {
				htmlwl += '<li data-ssid="'+ ssid +'"><i class="fa fa-wifi"></i><gr>&bull;&ensp;</gr>'+ ssid +'</li>';
			} );
		}
		if ( G.activebt ) {
			var active = $( '#listbt grn' ).length > 0;
			$( '#headbt' )
				.toggleClass( 'noline', htmlbt !== '' )
				.toggleClass( 'status', active );
			$( '#headbt' ).data( 'status', active ? 'bt' : '' );
			$( '#headbt .fa-status' ).toggleClass( 'hide', !active );
			$( '#divbt' ).removeClass( 'hide' );
		} else {
			$( '#divbt' ).addClass( 'hide' );
		}
		if ( G.activeeth ) {
			$( '#listlan' ).html( htmllan );
			$( '#headlan' ).toggleClass( 'noline', htmllan !== '' );
			$( '#lanadd' ).toggleClass( 'hide', htmllan !== '' );
			$( '#divlan' ).removeClass( 'hide' );
		} else {
			$( '#divlan' ).addClass( 'hide' );
		}
		if ( G.activewlan ) {
			$( '#listwl' ).html( htmlwl );
			$( '#headwl' ).toggleClass( 'noline', htmlwl !== '' );
			$( '#divwl' ).removeClass( 'hide' );
		} else {
			$( '#divwl' ).addClass( 'hide' );
		}
		$( '#divaccesspoint' ).toggleClass( 'hide', !G.hostapd );
		if ( $( '#divinterface' ).hasClass( 'hide' ) ) return
		
		renderQR();
		bannerHide();
		[ 'bluetooth', 'lan', 'wlan' ].forEach( function( id ) {
			codeToggle( id, 'status' );
		} );
		showContent();
	} );
}
function qr( msg ) {
	return new QRCode( {
		  msg : msg
		, dim : 130
		, pad : 0
	} );
}
function renderQR() {
	var $el = $( '#listlan li' ).length ? $( '#listlan li' ) : $( '#listwl li' );
	var ip = $el.data( 'ip' );
	if ( ip && ip !== G.hostapd.hostapdip ) {
		var hostname = $el.data( 'hostname' );
		$( '#qrwebui' ).html( qr( 'http://'+ ip ) );
		if( hostname ) ip += '<br><gr>http://</gr>'+ hostname;
		$( '#ipwebui' ).html( ip );
		$( '#divwebui' ).removeClass( 'hide' );
	} else {
		$( '#divwebui' ).addClass( 'hide' );
	}
	if ( G.hostapd ) {
		$( '#ipwebuiap' ).html( '<gr>Web User Interface<br>http://</gr>'+ G.hostapd.hostapdip );
		$( '#ssid' ).text( G.hostapd.ssid );
		$( '#passphrase' ).text( G.hostapd.passphrase )
		$( '#qraccesspoint' ).html( qr( 'WIFI:S:'+ G.ssid +';T:WPA;P:'+ G.passphrase +';' ) );
		$( '#qrwebuiap' ).html( qr( 'http://'+ G.hostapdip ) );
		$( '#boxqr' ).removeClass( 'hide' );
	} else {
		$( '#ipwebuiap, #ssid, #passphrase, #qraccesspoint, #qrwebuiap' ).empty();
		$( '#boxqr' ).addClass( 'hide' );
	}
}
function wlanScan() {
	bash( '/srv/http/bash/networks-scanwlan.sh', function( list ) {
		var html = '';
		if ( list.length ) {
			$.each( list, function( i, val ) {
				html += '<li data-db="'+ val.dbm +'" data-ssid="'+ val.ssid +'" data-encrypt="'+ val.encrypt +'" data-wpa="'+ val.wpa +'"';
				html += val.connected  ? ' data-connected="1"' : '';
				html += val.gateway ? ' data-gateway="'+ val.gateway +'"' : '';
				html += val.ip ? ' data-ip="'+ val.ip +'"' : '';
				html += ' data-dhcp="'+ val.dhcp +'"';
				html += val.password ? ' data-password="'+ val.password +'"' : '';
				html += val.profile ? ' data-profile="'+ val.profile +'">' : '>';
				var signal = val.dbm > good ? '' : ( val.dbm < fair ? 1 : 2 );
				html += '<i class="fa fa-wifi'+ signal +'"></i>'
				html += val.connected ? '<grn>&bull;</grn>&ensp;' : '';
				html += val.dbm < fair ? '<gr>'+ val.ssid +'</gr>' : val.ssid;
				html += val.encrypt === 'on' ? ' <i class="fa fa-lock"></i>' : '';
				html += '<gr>'+ val.dbm +' dBm</gr>';
				html += val.profile && !val.connected ? '&ensp;<i class="fa fa-save-circle wh"></i>' : '';
			} );
		} else {
			html += '<li><i class="fa fa-lock"></i><gr>(no accesspoints found)</gr></li>';
		}
		$( '#listwlscan' ).html( html +'</li>' );
		intervalscan = setTimeout( wlanScan, 12000 );
	}, 'json' );
}
function wlanStatus() {
	$( '#divinterface, #divwebui, #divaccesspoint' ).addClass( 'hide' );
	$( '#divwifi' ).removeClass( 'hide' );
	wlanScan();
}

refreshData = function() {
	if ( !$( '#divwifi' ).hasClass( 'hide' ) ) {
		wlanStatus();
	} else if ( !$( '#divbluetooth' ).hasClass( 'hide' ) ) {
		btScan();
	} else {
		nicsStatus();
	}
	resetLocal();
}
refreshData();
//---------------------------------------------------------------------------------------
var accesspoint = $( '#accesspoint' ).length;
var good = -60;
var fair = -67;
$( '.back' ).click( function() {
	clearTimeout( intervalscan );
	$( '#divinterface, #divaccesspoint' ).removeClass( 'hide' );
	$( '#divbluetooth, #divwifi, #divwebui' ).addClass( 'hide' );
	$( '#listwlscan, #listbtscan' ).empty();
	nicsStatus();
} );
$( '#listbt' ).on( 'click', 'li', function( e ) {
	var $this = $( this );
	var connected = $this.data( 'connected' );
	var name = $this.data( 'name' );
	var mac = $this.data( 'mac' );
	info( {
		  icon    : 'bluetooth'
		, title   : 'Bluetooth'
		, message : name
		, preshow : function() {
			if ( !connected ) $( '#infoOk' ).addClass( 'hide' );
		}
		, buttonwidth : 1
		, buttonlabel : '<i class="fa fa-minus-circle"></i>Forget'
		, buttoncolor : red
		, button      : function() {
			notify( name, 'Forget ... ', 'bluetooth' );
			bash( "/srv/http/bash/networks.sh btremove$'\n'"+ mac );
		}
		, oklabel : 'Disconnect'
		, okcolor : orange
		, ok      : function() {
			notify( name, 'Disconnect ... ', 'bluetooth' );
			bash( '/srv/http/bash/networks.sh btdisconnect' );
		}
	} );
} );
$( '#btscan' ).click( function() {
	$( '#divinterface, #divwebui, #divaccesspoint' ).addClass( 'hide' );
	$( '#divbluetooth' ).removeClass( 'hide' );
	btScan();
} );
$( '#listbtscan' ).on( 'click', 'li', function() {
	$this = $( this );
	var mac = $this.data( 'mac' );
	var name = '<wh>'+ $this.find( '.liname' ).text() +'</wh>';
	if ( !$this.data( 'connected' ) ) {
		notify( 'Bluetooth', 'Pair ...', 'bluetooth' );
		bash( [ 'btpair', mac ], function( data ) {
			bannerHide();
			if ( data != -1 ) {
				$( '.back' ).click();
			} else {
				info( {
					  icon      : 'bluetooth'
					, title     : 'Bluetooth'
					, message   : 'Pair '+ name +' failed'
				} );
			}
		} );
	}
} );
$( '#lanadd' ).click( function() {
	editLAN( { dhcp: '', ip: '', gateway: '' } );
} );
$( '#listlan' ).on( 'click', 'li', function() {
	var $this = $( this );
	if ( !$this.data( 'ip' ) ) return
	
	editLAN( {
		  ip      : $this.data( 'ip' ) || ''
		, gateway : $this.data( 'gateway' ) || ''
		, dhcp    : $this.data( 'dhcp' )
	} );
	$( '#infoCheckBox' ).on( 'click', 'input', function() {
		$( '#infoText' ).toggle( $( this ).prop( 'checked' ) );
	} );
} );
$( '#wladd' ).click( function() {
	'ssid' in G ? infoAccesspoint() : editWiFi();
} );
$( '#wlscan' ).click( function() {
	'ssid' in G ? infoAccesspoint() : wlanStatus();
} );
$( '#listwl' ).on( 'click', 'li', function() {
	if ( !( 'ssid' in G ) ) infoConnect( $( this ) );
} );
$( '#listwlscan' ).on( 'click', 'li', function() {
	var $this = $( this );
	var connected = $this.data( 'connected' );
	var profile = $this.data( 'profile' ) || connected;
	var ssid = $this.data( 'ssid' );
	var wpa = $this.data( 'wpa' ) || 'wep';
	var encrypt = $this.data( 'encrypt' ) === 'on';
	var vals = {
		  ESSID     : ssid
		, IP        : 'dhcp'
	}
	if ( !profile ) {
		if ( encrypt ) {
			info( {
				  icon          : 'wifi'
				, title         : ssid
				, passwordlabel : 'Password'
				, oklabel       : 'Connect'
				, ok            : function() {
					vals.Security = wpa;
					vals.Key      = infoVal();
					connect( vals );
				}
			} );
		} else {
			connect( vals );
		}
	} else {
		infoConnect( $this );
	}
} );
$( '#setting-accesspoint' ).click( function() {
	location.href = 'settings.php?p=features&set=setting-hostapd';
} );

} );
