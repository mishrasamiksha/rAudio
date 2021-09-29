$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( '.enable' ).click( function() {
	var idname = {
		  buffer       : 'Custom Audio Buffer'
		, bufferoutput : 'Custom Output Buffer'
		, crossfade    : 'Crossfade'
		, custom       : "User's Custom Settings"
		, replaygain   : 'Replay Gain'
		, soxr         : 'SoXR Custom Settings'
	}
	var id = this.id;
	if ( $( this ).prop( 'checked' ) ) {
		$( '#setting-'+ id ).click();
	} else {
		bash( [ id +'disable' ] );
		notify( idname[ id ], 'Disable ...', 'mpd' );
	}
} );
$( '.enablenoset' ).click( function() {
	var idname = {
		  autoupdate    : 'Auto Update'
		, equalizer     : 'Equalizer'
		, ffmpeg        : 'FFmpeg Decoder'
		, normalization : 'Normalization'
	}
	var checked = $( this ).prop( 'checked' );
	var id = this.id;
	notify( idname[ id ], checked, 'mpd' );
	bash( [ id, checked ] );
} );
var setmpdconf = '/srv/http/bash/mpd-conf.sh';
var warning = `\
<wh><i class="fa fa-warning fa-lg"></i>&ensp;Lower amplifier volume.</wh>
Signal will be set to original level (0dB).
Beware of too high volume from speakers.`;
$( '#audiooutput' ).change( function() {
	var card = $( this ).val();
	var dev = G.devices[ card ];
	notify( 'Audio Output Device', 'Change ...', 'mpd' );
	bash( [ 'audiooutput', dev.aplayname, card, dev.name, dev.hwmixer ] );
} );
$( '#hwmixer' ).change( function() {
	var hwmixer = $( this ).val();
	notify( 'Hardware Mixer', 'Change ...', 'mpd' );
	bash( [ 'hwmixer', device.aplayname, hwmixer ] );
} );
$( '#setting-hwmixer' ).click( function() {
	var novolume = device.mixertype === 'none';
	bash( [ 'volumeget', 'db' ], function( voldb ) {
		var voldb = voldb.split( ' ' );
		var vol = voldb[ 0 ];
		var db = voldb[ 1 ];
		info( {
			  icon          : 'volume'
			, title         : 'Mixer Device Volume'
			, message       : device.hwmixer
			, rangevalue    : vol
			, footer        : ( novolume ? '0dB (No Volume)' : db +' dB' )
			, beforeshow    : function() {
				if ( novolume ) {
					$( '#infoRange input' ).prop( 'disabled', 1 );
				} else {
					$( '#infoContent' ).after( '<div class="infomessage warning hide"><br>'+ warning +'</div>' );
					$( '#infoButtons a:eq( 0 )' ).addClass( 'hide' );
					$( '#infoButtons a:eq( 1 )' ).toggleClass( 'hide', db === '0.00' );
					$( '#infoRange input' ).on( 'click input keyup', function() {
						var val = $( this ).val();
						$( '#infoRange .value' ).text( val );
						bash( 'amixer -Mq sset "'+ device.hwmixer +'" '+ val +'%' );
					} ).on( 'mouseup touchend keyup', function() {
						bash( [ 'volumeget', 'push' ] );
					} );
				}
			}
			, buttonnoreset : 1
			, buttonlabel   : novolume ? '' : [ 'OK', '<i class="fa fa-set0"></i>0dB' ]
			, button        : novolume ? '' : [ 
				  function() { bash( [ 'volume0db', device.hwmixer ] ) }
				, function() {
					$( '#infoContent' ).addClass( 'hide' );
					$( '.warning, #infoButtons a:eq( 0 )' ).removeClass( 'hide' ); // ok
					$( '#infoButtons a:eq( 1 )' ).addClass( 'hide' );              // 0dB
				}
			]
			, okno          : 1
		} );
	} );
} );
$( '#mixertype' ).change( function() {
	var mixertype = $( this ).val();
	if ( mixertype === 'none' ) {
		info( {
			  icon    : 'volume'
			, title   : 'Volume Control'
			, message : warning
			, cancel  : function() {
				$( '#mixertype' )
					.val( device.mixertype )
					.selectric( 'refresh' );
			}
			, ok      : function() {
				setMixerType( mixertype );
			}
		} );
	} else {
		setMixerType( mixertype );
	}
} );
$( '#setting-equalizer' ).click( function() {
	bash( [ 'equalizerval' ], function( data ) {
		G.eqcurrent = data.current;
		var vcurrent = data.values.join( '' );
		data.values.push( data.current );
		var options = '';
		data.presets.forEach( function( name ) {
			options += '<option value="'+ name +'">'+ name +'</option>';
		} );
		var content = `
<div id="eq">
<div id="eqflatline"></div>
<div class="infomessage">Hz
<div class="hz"><a>31</a><a>63</a><a>125</a><a>250</a><a>500</a><a>1,000</a><a>2,000</a><a>4,000</a><a>8,000</a><a>16,000</a></div></div>
<div id="infoRange" class="vertical">${ '<input type="range">'.repeat( 10 ) }</div>
<br>
<i id="eqdelete" class="ibtn fa fa-minus-circle hide"></i>
<i id="eqrename" class="ibtn fa fa-edit-circle"></i>
<i id="eqsave" class="ibtn fa fa-save"></i>
<select id="eqpreset">${ options }</select><input id="eqname" type="text" class="hide">
<i id="eqnew" class="ibtn fa fa-plus-circle"></i><i id="eqcancel" class="ibtn fa fa-times bl hide"></i>
<i id="eqflat" class="ibtn fa fa-set0"></i>
</div>`;
		info( {
			  icon       : 'sliders fa90'
			, title      : 'Equalizer'
			, content    : content
			, boxwidth   : 150
			, values     : data.values
			, beforeshow : function() {
				var eqnew = 0;
				var eqrename = 0;
				$( '#infoBox' ).css( 'width', '600px' );
				$( '#eqrename' ).toggleClass( 'disabled', G.eqcurrent === '(unnamed)' || G.eqcurrent === 'Flat' );
				$( '#eqnew' ).toggleClass( 'disabled', G.eqcurrent !== '(unnamed)' || G.eqcurrent === 'Flat' );
				$( '#eqsave' ).addClass( 'disabled' );
				$( '#eqflat' ).toggleClass( 'disabled', G.eqcurrent === 'Flat' )
				var freq = [ 31, 63, 125, 250, 500, 1, 2, 4, 8, 16 ];
				$( '#infoRange input' ).on( 'click input keyup', function() {
					var $this = $( this );
					var i = $this.index( 'input' );
					var val = $( this ).val();
					var unit = i < 5 ? ' Hz' : ' kHz';
					var band = '0'+ i +'. '+ freq[ i ] + unit;
					bash( 'su mpd -c "amixer -D equal sset \\"'+ band +'\\" '+ val +'"' );
					var vnew = infoVal().slice( 0, -2 ).join( '' );
					var vflat = '66'.repeat( 10 );
					var changed = vnew !== vcurrent;
					var flat = vnew === vflat;
					$( '#eqsave' ).toggleClass( 'disabled', !changed );
					$( '#eqnew' ).toggleClass( 'disabled', !changed || flat )
					$( '#eqflat' ).toggleClass( 'disabled', flat )
				} );
				$( '#eqpreset' ).change( function() {
					equalizerPreset( $( this ).val() );
				} );
				$( '#eqname' ).on( 'keyup paste cut', function() {
					var val = $( this ).val();
					var exists = data.presets.indexOf( val ) !== -1;
					if ( eqnew ) {
						var changed = val !== '' && !exists;
					} else { // rename
						var changed = val !== G.eqcurrent && !exists;
					}
					$( '#eqsave' ).toggleClass( 'disabled', !changed );
				} );
				$( '#eqdelete' ).click( function() {
					var eqname = $( '#eqpreset' ).val();
					bash( [ 'equalizerval', 'delete', eqname ], function( data ) {
						data.values.push( 'Flat' );
						O.values = data.values;
						setValues();
						$( '#eqpreset option[value="'+ eqname +'"]' ).remove();
						$( '#eqpreset' ).selectric( 'refresh' );
						$( '#eqrename, #eqsave' ).addClass( 'disabled' );
					}, 'json' );
					$( '#eqcancel' ).click();
				} );
				$( '#eqrename' ).click( function() {
					eqrename = 1;
					$( '#eqrename, #eqdelete' ).toggleClass( 'hide' );
					$( '#eqname' ).val( G.eqcurrent );
					$( '#eqnew' ).click();
					eqnew = 0;
				} );
				$( '#eqsave' ).click( function() {
					var cmd = '';
					var eqname = $( '#eqname' ).val();
					if ( $( '#eqrename' ).hasClass( 'hide' ) ) {
						var cmd = [ 'equalizerval', 'rename', G.eqcurrent, eqname ];;
					} else if ( $( '#eqrename' ).hasClass( 'disabled' ) ) {
						var cmd = [ 'equalizerval', 'new', eqname ];
					}
					if ( cmd ) {
						G.eqcurrent = eqname;
						bash( cmd, function( names ) {
							if ( names[ 0 ] !== 'Flat' ) {
								notify( 'Equalizer Preset', 'Values already exist as '+ names[ 0 ], 'sliders fa90', 3000 );
								return
							}
							
							var options = '';
							names.forEach( function( name ) {
								options += '<option value="'+ name +'">'+ name +'</option>';
							} );
							$( '#eqpreset' )
								.html( options )
								.val( eqname )
								.selectric( 'refresh' );
						}, 'json' );
					} else {
						bash( [ 'equalizerval', 'save', $( '#eqpreset' ).val() ] );
					}
					$( '#eqcancel' ).click();
				} );
				$( '#eqnew' ).click( function() {
					eqnew = 1;
					$( '#eqnew, #eq .selectric-wrapper' ).addClass( 'hide' );
					$( '#eqname, #eqcancel' ).removeClass( 'hide' );
					$( '#infoRange, #eqrename' ).addClass( 'disabled' );
					$( '#eqsave' ).addClass( 'disabled' );
				} );
				$( '#eqcancel' ).click( function() {
					$( '#eqrename, #eqnew, #eq .selectric-wrapper' ).removeClass( 'hide' );
					$( '#eqname, #eqcancel, #eqdelete' ).addClass( 'hide' );
					$( '#infoRange' ).removeClass( 'disabled' );
					$( '#eqrename, #eqsave' ).toggleClass( 'disabled', G.eqcurrent === '(unnamed)' || G.eqcurrent === 'Flat' );
					$( '#eqname' ).val( '' );
					eqnew = eqrename = 0;
				} );
				$( '#eqflat' ).click( function() {
					equalizerPreset( 'Flat' );
				} );
			}
			, buttonnoreset : 1
			, okno          : 1
		} );
	}, 'json' );
} );
$( '#novolume' ).click( function() {
	var checked = $( this ).prop( 'checked' );
	if ( checked ) {
		info( {
			  icon    : 'volume'
			, title   : 'No Volume'
			, message : warning
			, ok      : function() {
				notify( 'No Volume', 'Enable ...', 'mpd' );
				bash( [ 'novolume', device.aplayname, device.card, device.hwmixer ] );
			}
		} );
	} else {
		info( {
			  icon         : 'volume'
			, title        : 'No Volume'
			, message      : `\
No volume</wh> will be disabled on:
&emsp; &bull; Select a Mixer Control
&emsp; &bull; Enable any Volume options`
			, messagealign : 'left'
		} );
		$( this ).prop( 'checked', 1 );
	}
} );
$( '#dop' ).click( function() {
	var checked = $( this ).prop( 'checked' );
	notify( 'DSP over PCM', checked, 'mpd' );
	bash( [ 'dop', checked, device.aplayname ] );
} );
$( '#setting-crossfade' ).click( function() {
	info( {
		  icon         : 'mpd'
		, title        : 'Crossfade'
		, textlabel    : 'Seconds'
		, boxwidth     : 60
		, values       : G.crossfadeconf
		, checkchanged : ( G.crossfade ? 1 : 0 )
		, checkblank   : 1
		, cancel       : function() {
			$( '#crossfade' ).prop( 'checked', G.crossfade );
		}
		, ok           : function() {
			bash( [ 'crossfadeset', infoVal() ] );
			notify( 'Crossfade', G.crossfade ? 'Change ...' : 'Enable ...', 'mpd' );
		}
	} );
} );
$( '#setting-replaygain' ).click( function() {
	info( {
		  icon         : 'mpd'
		, title        : 'Replay Gain'
		, radio        : { Auto: 'auto', Album: 'album', Track: 'track' }
		, values       : G.replaygainconf
		, checkchanged : ( G.replaygain ? 1 : 0 )
		, cancel       : function() {
			$( '#replaygain' ).prop( 'checked', G.replaygain );
		}
		, ok           : function() {
			bash( [ 'replaygainset', infoVal() ] );
			notify( 'Replay Gain', G.replaygain ? 'Change ...' : 'Enable ...', 'mpd' );
		}
	} );
} );
$( '#filetype' ).click( function() {
	$( '#divfiletype' ).toggleClass( 'hide' );
} );
$( '#setting-buffer' ).click( function() {
	info( {
		  icon         : 'mpd'
		, title        : 'Custom Audio Buffer'
		, message      : '<code>audio_buffer_size</code> (default: 4096)'
		, textlabel    : 'Size <gr>(kB)</gr>'
		, boxwidth     : 125
		, values       : G.bufferconf
		, checkchanged : ( G.buffer ? 1 : 0 )
		, checkblank   : 1
		, cancel       : function() {
			$( '#buffer' ).prop( 'checked', G.buffer );
		}
		, ok           : function() {
			bash( [ 'bufferset', infoVal() ] );
			notify( 'Custom Audio Buffer', G.buffer ? 'Change ...' : 'Enable ...', 'mpd' );
		}
	} );
} );
$( '#setting-bufferoutput' ).click( function() {
	info( {
		  icon         : 'mpd'
		, title        : 'Custom Output Buffer'
		, message      : '<code>max_output_buffer_size</code> (default: 8192)'
		, textlabel    : 'Size <gr>(kB)</gr>'
		, boxwidth     : 125
		, values       : G.bufferoutputconf
		, checkchanged : ( G.bufferoutput ? 1 : 0 )
		, checkblank   : 1
		, cancel       : function() {
			$( '#bufferoutput' ).prop( 'checked', G.bufferoutput );
		}
		, ok           : function() {
			bash( [ 'bufferoutputset', infoVal() ] );
			notify( 'Custom Output Buffer', G.bufferoutput ? 'Change ...' : 'Enable ...', 'mpd' );
		}
	} );
} );
var soxrinfo = `\
<table>
<tr><td>Precision</td>
	<td><select>
		<option value="16">16</option>
		<option value="20">20</option>
		<option value="24">24</option>
		<option value="28">28</option>
		<option value="32">32</option>
		</select></td><td>&nbsp;<gr>bit</gr></td>
</tr>
<tr><td>Phase Response</td>
	<td><input type="text"></td><td>&nbsp;<gr>0-100</gr></td>
</tr>
<tr><td>Passband End</td>
	<td><input type="text"></td><td>&nbsp;<gr>0-100%</gr></td>
</tr>
<tr><td>Stopband Begin</td>
	<td><input type="text"></td><td>&nbsp;<gr>100-150%</gr></td>
</tr>
<tr><td>Attenuation</td>
	<td><input type="text"></td><td>&nbsp;<gr>0-30dB</gr></td>
</tr>
<tr><td>Rolloff</td>
	<td colspan="2"><select>
			<option value="0">0 - Small</option>
			<option value="1">1 - Medium</option>
			<option value="2">2 - None</option>
			<option value="8">8 - High precision</option>
			<option value="16">16 - Double precision</option>
			<option value="32">32 - Variable rate</option>
		</select>
	</td>
</tr>
</table>`;
$( '#setting-soxr' ).click( function() {
	info( {
		  icon          : 'mpd'
		, title         : 'SoXR Custom Settings'
		, content       : soxrinfo
		, values        : G.soxrconf
		, checkchanged  : ( G.soxr ? 1 : 0 )
		, checkblank    : 1
		, beforeshow    : function() {
			var $extra = $( '#infoContent tr:eq( 5 )' );
			$extra.find( '.selectric, .selectric-wrapper' ).css( 'width', '100%' );
			$extra.find( '.selectric-items' ).css( 'min-width', '100%' );
		}
		, boxwidth      : 80
		, cancel        : function() {
			$( '#soxr' ).prop( 'checked', G.soxr );
		}
		, ok            : function() {
			bash( [ 'soxrset', ...infoVal() ] );
			notify( 'SoXR Custom Settings', G.soxr ? 'Change ...' : 'Enable ...', 'mpd' );
		}
	} );
} );
var custominfo = `\
<table width="100%">
<tr><td><code>/etc/mpd.conf</code></td></tr>
<tr><td><pre>
...
user                   "mpd"</pre></td></tr>
	<tr><td><textarea></textarea></td></tr>
	<tr><td><pre>
...
audio_output {
	...
	mixer_device   "hw:N"</pre></td></tr>
<tr><td><textarea style="padding-left: 39px"></textarea></td></tr>
<tr><td><pre style="margin-top: -20px">
}</pre></td></tr>
</table>`;
$( '#setting-custom' ).click( function() {
	bash( [ 'customget', device.aplayname ], function( val ) {
		var val = val.split( '^^' );
		var valglobal = val[ 0 ].trim(); // remove trailing
		var valoutput = val[ 1 ].trim();
		info( {
			  icon         : 'mpd'
			, title        : "User's Configurations"
			, content      : custominfo.replace( 'N', G.asoundcard )
			, values       : [ valglobal, valoutput ]
			, checkchanged : ( G.custom ? 1 : 0 )
			, cancel       : function() {
				$( '#custom' ).prop( 'checked', G.custom );
			}
			, ok           : function() {
				var values = infoVal();
				if ( !values[ 0 ] && !values[ 1 ] ) {
					bash( [ 'customdisable' ] );
					notify( "User's Custom Settings", 'Disable ...', 'mpd' );
					return
				}
				
				bash( [ 'customset', values[ 0 ], values[ 1 ], device.aplayname ], function( std ) {
					if ( std == -1 ) {
						bannerHide();
						info( {
							  icon    : 'mpd'
							, title   : "User's Configurations"
							, message : 'MPD failed with the added lines'
										+'<br>Restored to previous configurations.'
						} );
					}
				} );
				notify( "User's Custom Settings", G.custom ? 'Change ...' : 'Enable ...', 'mpd' );
			}
		} );
	} );
} );

} ); // document ready end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

function equalizerPreset( name ) {
	G.eqcurrent = name;
	bash( [ 'equalizerval', 'preset', name ], function( data ) {
		data.values.push( name );
		O.values = data.values;
		$( '#eqpreset option[value=0]' ).remove();
		$( '#eqpreset' ).selectric( 'refresh' );
		setValues();
		$( '#eqrename' ).toggleClass( 'disabled', name === 'Flat' );
		$( '#eqsave, #eqnew' ).addClass( 'disabled' )
	}, 'json' );
	$( '#eqflat' ).toggleClass( 'disabled', name === 'Flat' );
}
function renderPage( list ) {
	if ( typeof list === 'string' ) { // on load, try catching any errors
		var list2G = list2JSON( list );
		if ( !list2G ) return
	} else {
		G = list;
	}
	var htmlstatus =  G.version +'<br>'
	if ( G.counts ) {
		htmlstatus += G.counts.song.toLocaleString() +'&nbsp;<i class="fa fa-music gr"></i>&emsp;'
					+ G.counts.webradio.toLocaleString() +'&nbsp;<i class="fa fa-webradio gr"></i>';
	} else {
		htmlstatus += '<gr>Updating ...</gr>';
	}
	if ( !G.active ) htmlstatus += '<br><i class="fa fa-warning red"></i>&ensp;MPD not running'
	$( '#statusvalue' ).html( htmlstatus );
	if ( G.asoundcard == -1 ) {
		$( '.soundcard' ).addClass( 'hide' );
	} else {
		$( '.soundcard' ).removeClass( 'hide' );
		device = G.devices[ G.asoundcard ];
		var htmldevices = '';
		$.each( G.devices, function() {
			htmldevices += '<option value="'+ this.card +'">'+ this.name +'</option>';
		} );
		$( '#audiooutput' )
			.html( htmldevices )
			.val( G.asoundcard );
		var htmlhwmixer = device.mixermanual ? '<option value="auto">Auto</option>' : '';
		device.mixerdevices.forEach( function( mixer ) {
			htmlhwmixer += '<option value="'+ mixer +'">'+ mixer +'</option>';
		} );
		$( '#hwmixer' )
			.html( htmlhwmixer )
			.val( device.hwmixer );
		var htmlmixertype = '<option value="none">None / 0dB</option>';
		if ( device.mixers ) htmlmixertype += '<option value="hardware">Mixer device</option>';
		htmlmixertype += '<option value="software">MPD software</option>';
		$( '#mixertype' )
			.html( htmlmixertype )
			.val( device.mixertype );
		$( '#setting-hwmixer' ).toggleClass( 'hide', device.mixers === 0 );
		$( '#novolume' ).prop( 'checked', device.mixertype === 'none' && !G.crossfade && !G.equalizer && !G.normalization && !G.replaygain );
		$( '#divdop' ).toggleClass( 'disabled', device.aplayname.slice( 0, 7 ) === 'bcm2835' );
		$( '#dop' ).prop( 'checked', device.dop == 1 );
		selectricRender();
	}
	$( '#crossfade' ).prop( 'checked', G.crossfade );
	$( '#setting-crossfade' ).toggleClass( 'hide', !G.crossfade );
	$( '#normalization' ).prop( 'checked', G.normalization );
	$( '#replaygain' ).prop( 'checked', G.replaygain );
	$( '#setting-replaygain' ).toggleClass( 'hide', !G.replaygain );
	$( '#equalizer' ).prop( 'checked', G.equalizer );
	$( '#setting-equalizer' ).toggleClass( 'hide', !G.equalizer );
	$( '#buffer' ).prop( 'checked', G.buffer );
	$( '#setting-buffer' ).toggleClass( 'hide', !G.buffer );
	$( '#bufferoutput' ).prop( 'checked', G.bufferoutput );
	$( '#setting-bufferoutput' ).toggleClass( 'hide', !G.bufferoutput );
	$( '#ffmpeg' ).prop( 'checked', G.ffmpeg );
	$( '#autoupdate' ).prop( 'checked', G.autoupdate );
	$( '#custom' ).prop( 'checked', G.custom );
	$( '#setting-custom' ).toggleClass( 'hide', !G.custom );
	$( '#soxr' ).prop( 'checked', G.soxr );
	$( '#setting-soxr' ).toggleClass( 'hide', !G.soxr );
	[ 'asound', 'mpdconf', 'mount' ].forEach( function( id ) {
		codeToggle( id, 'status' );
	} );
	if ( $( '#infoRange .value' ).length ) {
		bash( [ 'volumeget', 'db' ], function( voldb ) {
			var voldb = voldb.split( ' ' );
			var vol = voldb[ 0 ];
			var db = voldb[ 1 ];
			$( '#infoRange .value' ).text( vol );
			$( '#infoRange input' ).val( vol );
			$( '.infofooter' ).text( db +' dB' );
			$( '#infoButtons a:eq( 1 )' ).toggleClass( 'hide', db === '0.00' );
		} );
	}
	resetLocal();
	showContent();
}
function setMixerType( mixertype ) {
	var hwmixer = device.mixers ? device.hwmixer : '';
	notify( 'Mixer Control', 'Change ...', 'mpd' );
	bash( [ 'mixertype', mixertype, device.aplayname, hwmixer ] );
}
