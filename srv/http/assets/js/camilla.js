/*
Biquad
	- Lowpass, Highpass       : freq Q
	- Lowshelf, Highshelf     : gain freq slope/Q
	- LowpassFO, HighpassFO   : freq
	- LowshelfFO, HighshelfFO : gain freq
	- Peaking                 : gain freq Q/bandwidth
	- Notch, Bandpass, Allpass: freq Q/bandwidth
	- AllpassFO               : freq
	- LinkwitzTransform       : Q_actual Q_target freq_act freq_target
	- Free                    : a1 a2 b0 b1 b2
BiquadCombo
	- (all): order freq
Conv
	- Raw    : [filename] [format] skip_bytes_lines read_bytes_lines
	- Wave   : [filename] channel
	- Values : [values] length
Dither
	- (all except Uniform): bits
	- Uniform             : bits amplitude
	
(no subtype)
Delay    : ms samples XsSubsample
Gain     : gain X*Inverted X*Mute
Volume   : ramp_time
Loudness : reference_level high_boost low_boost ramp_time
DiffEq   : [a] [b]
*/
$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( '#divprofile .add' ).on( 'click', function() {
	info( {
		  icon         : SW.icon
		, title        : 'New Profile'
		, message      : 'Copy <wh>'+ S.fileconf +'</wh> as:'
		, textlabel    : 'Name'
		, values       : S.fileconf
		, checkblank   : true
		, checkchanged : true
		, ok           : () => {
			var name = infoVal();
			if ( S.lsconf.includes( name +'.yml' ) ) {
				info( {
					  icon    : SW.icon
					, title   : 'New Profile'
					, message : 'Name exists: '+ name
					, ok      : () => $( '#divprofile .add' ).trigger( 'click' )
				} );
			} else {
				bash( [ 'confcopy', S.fileconf, name, 'CMD NAME NEWNAME' ] );
				notify( SW.icon, 'Profile', 'New: <wh>'+ name +'</wh> ...' );
			}
		}
	} );
} );
$( '#divprofile .settings' ).on( 'click', function() {
	info( {
		  icon         : SW.icon
		, title        : 'Interface Setting'
		, message      : 'Show:'
		, messagealign : 'left'
		, checkbox     : [ 'Volume, Bass, Treble', 'Capture/Playback in Devices' ]
		, values       : S.camillaconf
		, checkchanged : true
		, ok           : () => {
			var val = infoVal();
			bash( [ 'camilla', val.controls, val.capture_playback, 'CFG CONTROLS CAPTURE_PLAYBACK' ] );
			notify( SW.icon, 'Setting', 'Change...' );
		}
	} );
} );
$( '#profile' ).on( 'change', function() {
	var name = $( this ).val();
	bash( [ 'confswitch', name, 'CMD NAME' ] );
	notify( SW.icon, 'Profile', 'Switch to&ensp;<wh>'+ name +'</wh> ...' );
} );
$( '#setting-profile' ).on( 'click', function() {
	info( {
		  icon         : SW.icon
		, title        : 'Edit Profile'
		, textlabel    : 'Name'
		, values       : S.fileconf
		, checkblank   : true
		, checkchanged : true
		, buttonlabel  : 'Delete'
		, buttoncolor  : red
		, button       : () => {
			var name = infoVal();
			bash( [ 'confdelete', name, 'CMD NAME' ] );
			notify( SW.icon, 'Profile', 'Delete: <wh>'+ name +'</wh> ...' );
		}
		, oklabel      : 'Rename'
		, ok           : () => {
			var name = infoVal();
			bash( [ 'confrename', S.fileconf, name, 'CMD NAME NEWNAME' ] );
			notify( SW.icon, 'Profile', 'Rename to&ensp;<wh>'+ name +'</wh> ...' );
		}
	} );
} );
$( '#setting-capture' ).on( 'click', function() {
	
} );
$( '#setting-playback' ).on( 'click', function() {
	
} );
$( '#divsettings .settings' ).on( 'click', function() {
	var textlabel  = L.sampling.slice( 1 );
	textlabel.push( 'Other' );
	var values     = {};
	L.sampling.forEach( k => values[ k ] = D[ k ] );
	if ( ! L.samplerate.includes( D.samplerate ) ) values.samplerate = 'Other';
	values.other = values.samplerate;
	info( {
		  icon         : SW.icon
		, title        : 'Devices'
		, selectlabel  : 'Sample Rate'
		, select       : L.samplerate
		, textlabel    : labelArraySet( textlabel )
		, boxwidth     : 120
		, order        : [ 'select', 'text' ]
		, values       : values
		, checkblank   : true
		, checkchanged : true
		, beforeshow   : () => {
			$( '.trselect' ).after( $( 'tr' ).last() );
			var $trother = $( '.trtext' ).eq( 0 );
			$trother.toggleClass( 'hide', values.samplerate !== 'Other' );
			$( '.trselect select' ).on( 'change', function() {
				otherToggle( $trother, $( this ).val() );
			} );
		}
		, ok           : () => {
			var val = infoVal();
			if ( val.samplerate === 'Other' ) val.samplerate = val.other;
			delete val.other;
			$.each( val, ( k, v ) => D[ k ] = v );
			saveConfig( 'Sample Rate' );
		}
	} );
} );
$( '#setting-enable_rate_adjust' ).on( 'click', function() {
	info( {
		  icon         : SW.icon
		, title        : 'Rate Adjust'
		, numberlabel  : [ 'Adjust period', 'Target level' ]
		, boxwidth     : 100
		, values       : { adjust_period: D.adjust_period, target_level: D.target_level }
		, checkchanged : D.enable_rate_adjust
		, cancel       : switchCancel
		, ok           : () => {
			var val =  infoVal();
			[ 'adjust_period', 'target_level' ].forEach( k => D[ k ] = val[ k ] );
			D.enable_rate_adjust = true;
			saveConfig( 'Rate Adjust' );
		}
	} );
} );
$( '#setting-enable_resampling' ).on( 'click', function() {
	infoResampling( D.resampler_type === 'FreeAsync' );
} );
$( '#divsettings' ).on( 'click', '.add.filters', function() {
	infoFilters( 'Biquad', 'Lowpass' );
} ).on( 'click', '.add.mixers', function() {
	infoMixer();
} ).on( 'click', '.mixer-icon', function() {
	infoMapping();
} );
$( '#divmixers' ).on( 'click', 'li', function( e ) {
	var $this = $( this );
	if ( $this.hasClass( 'lihead' )
		|| $( e.target ).is( 'i' ) ) return
	
	if ( ! $this.find( '.i-mixers' ).length ) {
		infoMapping( $this.data( 'name' ), $this.data( 'dest' ) );
		return
	}
	
	var name = $this.find( '.li1' ).text();
	var data   = M[ name ].mapping;
	var li   = '<li class="lihead">Mapping:'+ ico( 'add wh addmapping' ) + ico( 'arrow-left back' ) +'</li>';
	data.forEach( kv => {
		var channel = '';
		kv.sources.forEach( s => {
			channel += ', '+ s.channel;
		} );
		li += '<li data-name="'+ name +'" data-dest="'+ kv.dest +'">'+ ico( kv.mute ? 'mute bl unmute' : 'devices mute' )
			 +'<div class="li1">Destination: '+ kv.dest +'</div>'
			 +'<div class="li2">Sources: '+ channel.slice( 2 ) +'</div></li>';
	} );
	$( '#divmixers .entries' ).html( li );
} ).on( 'click', 'li i', function( e ) {
	var $this = $( this );
	if ( $this.hasClass( 'i-mixers' ) ) {
		infoMixer( $this.next().text() );
	} else if ( $this.hasClass( 'addmapping' ) ) {
		var name = $this.parent().next().data( 'name' );
		var dest = M[ name ].mapping.length;
		infoMapping( name, dest );
	} else if ( $this.hasClass( 'back' ) ) {
		$( '.lihead' ).remove();
		$( '#mixers' ).trigger( 'click' );
	} else {
		muteDestination( $this );
	}
} );
$( '#bar-bottom div' ).on( 'click', function() {
	var id       = this.id;
	L.currenttab = id;
	$( '.section' )
	$( '#divsettings .add' )
		.prop( 'class', 'i-add add '+ id )
		.toggleClass( 'hide', [ 'controls', 'devices' ].includes( id ) );
	$( '#divsettings .settings' ).toggleClass( 'hide', id !== 'devices' );
	renderTab( id );
} );

} ); // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

var SW = { icon: 'camilladsp' }
var L  = {
	  currenttab : 'controls'
	, devicetype : [ 'Alsa', 'CoreAudio', 'Pulse', 'Wasapi', 'Jack', 'Stdin', 'File' ]
	, format     : [ 'S16LE', 'S24LE', 'S24LE3', 'S32LE', 'FLOAT32LE', 'FLOAT64LE', 'TEXT' ]
	, freeasync  : {
		  keys          : [ 'sinc_len', 'oversampling_ratio', 'interpolation', 'window', 'f_cutoff' ]
		, interpolation : [ 'Cubic', 'Linear', 'Nearest' ]
		, window        : [ 'Blackman', 'Blackman2', 'BlackmanHarris', 'BlackmanHarris2', 'Hann', 'Hann2' ]
	}
	, samplerate : [ 44100, 48000, 88200, 96000, 176400, 192000, 352800, 384000, 705600, 768000, 'Other' ]
	, sampletype : [ 'Synchronous', 'FastAsync', 'BalancedAsync', 'AccurateAsync', 'FreeAsync' ]
	, sampling   : [ 'samplerate', 'chunksize', 'queuelimit', 'silence_threshold', 'silence_timeout', 'rate_measure_interval' ]
	, subtype    : {
		  Biquad      : [ 'Lowpass', 'Highpass', 'Lowshelf', 'Highshelf', 'LowpassFO', 'HighpassFO', 'LowshelfFO', 'HighshelfFO'
						, 'Peaking', 'Notch', 'Bandpass', 'Allpass', 'AllpassFO', 'LinkwitzTransform', 'Free' ]
		, BiquadCombo : [ 'ButterworthLowpass', 'ButterworthHighpass', 'LinkwitzRileyLowpass', 'LinkwitzRileyHighpass' ]
		, Conv        : [ 'Raw', 'Wave', 'Values' ]
		, Dither      : [ 'Simple', 'Uniform', 'Lipshitz441', 'Fweighted441', 'Shibata441', 'Shibata48', 'None' ]
	}
	, type       : [ 'Biquad', 'BiquadCombo', 'Conv', 'Delay', 'Gain', 'Volume', 'Loudness', 'DiffEq', 'Dither' ]
}
var Fkv = {
	  pass    : {
		  number : { freq: 1000, q: 0.5 }
	  }
	, shelf   : {
		  number : { gain: 6, freq: 1000, q: 6 }
		, radio  : [ 'Q', 'Samples' ]
	}
	, passFO  : {
		  number : { freq: 1000 }
	}
	, shelfFO : {
		  number : { gain: 6, freq: 1000 }
	}
	, notch   : {
		  number : { freq: 1000, q: 0.5 }
		, radio  : [ 'Q', 'Bandwidth' ]
	}
}
var F  = {
	  Lowpass           : Fkv.pass
	, Highpass          : Fkv.pass
	, Lowshelf          : Fkv.shelf
	, Highshelf         : Fkv.shelf
	, LowpassFO         : Fkv.passFO
	, HighpassFO        : Fkv.passFO
	, LowshelfFO        : Fkv.shelfFO
	, HighshelfFO       : Fkv.shelfFO
	, Peaking           : {
		  number : { gain: 6, freq: 1000, q: 1.5 }
		, radio  : [ 'Q', 'Bandwidth' ]
	}
	, Notch             : Fkv.notch
	, Bandpass          : Fkv.notch
	, Allpass           : Fkv.notch
	, AllpassFO         : Fkv.passFO
	, LinkwitzTransform : {
		number: { q_act: 1.5, q_target: 0.5, freq_act: 50, freq_target: 25 }
	}
	, Free              : {
		number: { a1: 0, a2: 0, b0: -1, b1: 1, b2: 0 }
	}
	, BiquadCombo       : {
		number: { order: 2, freq: 1000 }
	}
	, Raw               : { 
		  select : { filename: '', format: '' }
		, number : { skip_bytes_lines: 0, read_bytes_lines: 0 }
	}
	, Wave              : {
		  select : { filename: '' }
		, number : { channel: 0 }
	}
	, Values            : {
		  text   : { values: '1, 0, 0, 0' }
		, number : { length: 0 }
	}
	, Delay             : {
		  number   : { ms: 0 }
		, radio    : [ 'ms', 'Samples' ]
		, checkbox : { subsample: false }
	}
	, Gain              : {
		  number   : { gain: 0 }
		, checkbox : { inverted: false, mute: false }
	}
	, Volume            : {
		number: { ramp_time: 200 }
	}
	, Loudness          : {
		number: { reference_level: 5, high_boost: 5, low_boost: 5, ramp_time: 200 }
	}
	, DiffEq            : {
		text: { a: '1, 0', b: '1, 0' }
	}
	, Dither            : {
		number: { bits: 16 }
	}
}
// capture / playback
var CPkv = {
	  tc     : {
		  select : { type: 'Alsa' }
		, number : { channels: 2 }
	}
	, tcsd   : {
		  select : { type: 'Alsa', sampleformat: 'S16LE' }
		, number : { channels: 2 }
		, text   : { device: '' }
	}
	, wasapi : {
		  select   : { type: 'Alsa', sampleformat: 'S16LE' }
		, number   : { channels: 2 }
		, text     : { device: '' }
		, checkbox : { exclusive: false, loopback: false }
	}
}
var CP = { // capture / playback
	  capture : {
		  Alsa      : CPkv.tcsd
		, CoreAudio : {
			  select   : { type: 'Alsa', sampleformat: 'S16LE' }
			, number   : { channels: 2 }
			, text     : { device: '' }
			, checkbox : { change_format: false }
		}
		, Pulse     : CPkv.tcsd
		, Wasapi    : CPkv.wasapi
		, Jack      : CPkv.tc
		, Stdin     : {
			  select : { type: 'Alsa', sampleformat: 'S16LE' }
			, number : { channels: 2, extra_samples: 0, skip_bytes: 0, read_bytes: 0 }
		}
		, File      : {
			  select : { type: 'Alsa', sampleformat: 'S16LE' }
			, number : { channels: 2, extra_samples: 0, skip_bytes: 0, read_bytes: 0 }
			, text   : { filename: '' }
		}
	}
	, playback : {
		  Alsa      : CPkv.tcsd
		, CoreAudio : {
			  select   : { type: 'Alsa', sampleformat: 'S16LE' }
			, number   : { channels: 2 }
			, text     : { device: '' }
			, checkbox : { exclusive: false, change_format: false }
		}
		, Pulse     : CPkv.tcsd
		, Wasapi    : CPkv.wasapi
		, Jack      : CPkv.tc
		, Stdout    : {
			  select : { type: 'Alsa', sampleformat: 'S16LE' }
			, number : { channels: 2 }
		}
		, File      : {
			  select : { type: 'Alsa', sampleformat: 'S16LE' }
			, number : { channels: 2 }
			, text   : { filename: '' }
		}
	}
}
function key2label( key ) {
	if ( key === 'ms' ) return 'ms'
	
	var str = key[ 0 ].toUpperCase();
	if ( key.length === 1 ) return str
	
	key = key
			.replace( '_act', ' actual' )
			.replace( '_len', ' length' )
			.replace( 'bytes_lines', 'bytes/lines' )
			.replace( 'chunksize', 'chunk size' )
			.replace( 'f_', 'freq ' )
			.replace( 'queuelimit', 'queue limit' )
			.replace( 'samplerate', 'sample rate' )
			.replace( /_/g, ' ' )
			.replace( 'freq', 'frequency' )
			.slice( 1 )
	return str + key
}
function infoDevices( cp ) {
	// select
	var selectlabel = [ 'type' ];
	var select      = [ L.devicetype ];
	var values      = { type: type }
}
function infoFilters( type, subtype ) {
	if ( typeof type === 'object' ) { // saved filters: type = values
		var type    = type.type;
		var subtype = type.subtype;
		var name    = type.name;
		var key_val = type;
	} else {
		var name    = '';
	}
	// select
	var selectlabel = [ 'type' ];
	var select      = [ L.type ];
	var values      = { type: type }
	var key_val     = '';
	if ( subtype ) {
		selectlabel.push( 'subtype' )
		select.push( L.subtype[ type ] );
		values.subtype    = subtype;
		key_val           = F[ subtype ];
	}
	if ( ! key_val ) key_val = F[ type ];
	if ( subtype === 'Uniform' ) key_val.amplitude = 1;
	if ( 'select' in key_val ) {
		var kv = key_val.select;
		var k  = Object.keys( kv );
		selectlabel = [ ...selectlabel, ...k ];
		var subtype = subtype === 'Raw' ? [ S.lscoef, L.format ] : [ S.lscoef ];
		select = [ ...select, ...subtype ];
		values = { ...values, ...kv };
	}
	selectlabel = labelArraySet( selectlabel );
	// text
	var textlabel   = [ 'name' ];
	values.name = name;
	if ( 'text' in key_val ) {
		var kv    = key_val.text;
		var k     = Object.keys( kv );
		textlabel = [ ...textlabel, ...k ];
		values    = { ...values, ...kv };
	}
	textlabel    = labelArraySet( textlabel );
	// number
	var numberlabel = false;
	if ( 'number' in key_val ) {
		var kv      = key_val.number;
		numberlabel = Object.keys( kv );
		values      = { ...values, ...kv };
		numberlabel = labelArraySet( numberlabel );
	}
	// radio
	var radio       = false;
	if ( 'radio' in key_val ) {
		radio  = key_val.radio;
		values = { ...values, radio: numberlabel.slice( -1 )[ 0 ] };
	}
	// checkbox
	var checkbox    = false;
	if ( 'checkbox' in key_val ) {
		var kv   = key_val.checkbox;
		checkbox = Object.keys( kv );
		values   = { ...values, ...kv };
	}
	info( {
		  icon         : 'filters'
		, title        : name ? 'Edit Filter' : 'Add Filter'
		, selectlabel  : selectlabel
		, select       : select
		, textlabel    : textlabel
		, numberlabel  : numberlabel
		, radio        : radio
		, radiosingle  : true
		, checkbox     : checkbox
		, boxwidth     : 198
		, order        : [ 'select', 'text', 'number', 'radio', 'checkbox' ]
		, values       : values
		, checkblank   : true
		, checkchanged : name
		, beforeshow   : () => {
			$( '#infoContent td:first-child' ).css( 'min-width', '125px' );
			$( '.trcheckbox label' ).css( 'text-transform', 'capitalize' );
			var $tdname = $( '#infoContent td' ).filter( function() {
				return $( this ).text() === 'Name'
			} );
			$( '#infoContent tr' ).eq( 0 ).before( $tdname.parent() );
			var $select     = $( '#infoContent select' );
			var $selecttype = $select.eq( 0 );
			$selecttype.on( 'change', function() {
				var type    = $( this ).val();
				var subtype = type in L.subtype ? L.subtype[ type ][ 0 ] : '';
				infoFilters( type, subtype );
			} );
			if ( $select.length > 1 ) {
				$select.eq( 1 ).on( 'change', function() {
					var type    = $selecttype.val();
					var subtype = $( this ).val();
					infoFilters( type, subtype );
				} );
			}
			if ( radio ) {
				var $tr      = $( '#infoContent .trradio' ).prev();
				var itr      = $tr.index()
				var $label   = $tr.find( 'td' ).eq( 0 );
				var $radio   = $( '#infoContent input:radio' );
				$radio.on( 'change', function() {
					var val       = $( this ).filter( ':checked' ).val();
					I.keys[ itr ] = val.toLowerCase();
					$label.text( val );
				} );
			}
		}
		, ok           : () => {
			var val   = infoVal();
			var param = { type: val.subtype }
			$.each( val, ( k, v ) => {
				if ( ! [ 'radio', 'name', 'type', 'subtype' ].includes( k ) ) param[ k ] = v;
			} );
			F[ val.name ] = { type: val.type, parameters : param }
			saveConfig( 'Filter' );
		}
	} );
}
function infoMapping( name, dest ) {
	var values       = [ 0, 0, false, false ];
	var sL           = 1;
	var checkchanged = false;
	if ( name ) {
		var mixer = M[ name ];
		if ( dest < mixer.mapping.length ) {
			var kv       = mixer.mapping[ dest ];
			values       = [];
			kv.sources.forEach( s => {
				[ 'channel', 'gain', 'mute', 'inverted' ].forEach( k => {
					values.push( s[ k ] );
				} );
			} );
			sL           = kv.sources.length;
			checkchanged = true;
		}
		var chin  = mixer.channels.in;
	} else {
		var dest  = 0;
		var chin  = D.capture.channels;
	}
	var option = '';
	for( i = 0; i < chin; i++ ) option += '<option value="'+ i +'">'+ i +'</option>';
	var content = `
<table class="tablemapping">
<tr>
	<td colspan="5">Destination : ${ dest }</td>
</tr>
<tr class="trhead">
	<td>Source</td><td>Gain</td><td>Mute</td><td>Invert</td>
	<td><i class="i-add addsource"></i></td>
</tr>
<tr style="height: 10px"></tr>
`;
	var trsource = `
<tr class="trsource">
	<td><select data-k="channel">${ option }</select></td><td><input type="number" data-k="gain" value="0"></td>
	<td>&nbsp;<input type="checkbox" data-k="mute"></td><td>&nbsp;<input type="checkbox" data-k="inverted">
	<td><i class="i-remove removesource"></i></td>
</tr>
`;
	for ( i = 0; i < sL; i++ ) content += trsource;
	content += '</table>';
	info( {
		  icon         : 'mixers'
		, title        : 'New Mapping'
		, content      : content
		, values       : values
		, contentcssno : true
		, checkblank   : true
		, checkchanged : checkchanged
		, beforeshow   : () => {
			$( '.removesource' ).toggleClass( 'hide', $( '.trsource' ).length < 2 );
			
			$( '#infoContent' ).on( 'click', '.addsource', function() {
				var $trlast = $( '#infoContent tr' ).last();
				$trlast.after( $trlast.clone() );
				$( '.removesource' ).removeClass( 'hide' );
			} ).on( 'click', '.removesource', function() {
				$( this ).parents( 'tr' ).remove();
				$( '.removesource' ).toggleClass( 'hide', $( '.trsource' ).length < 2 );
			} );
		}
		, ok           : () => {
			var sources = [];
			$( '.trsource' ).each( ( i, tr ) => {
				var s = {}
				$( tr ).find( 'select, input' ).each( ( i, el ) => {
					var $this = $( el )
					s[ $this.data( 'k' ) ] = $this.is( ':checkbox' ) ? $this.prop( 'checked' ) : +$this.val();
				} );
				sources.push( s );
			} );
			var mapping = {
				  dest    : dest
				, mute    : false
				, sources : sources
			}
			M[ name ].mapping = mapping;
			console.log(M[ name ].mapping)
		}
	} );
}
function infoMixer( name ) {
	if ( name ) {
		var mixer = M[ name ];
		var values = { name: name, in: mixer.channels.in, out: mixer.channels.out }
	} else {
		var values = { name: '', in: 2, out: 2 }
	}
	var buttons = '<td>'+ ico( 'remove btnicon dn' ) + ico( 'add btnicon up' ) +'</td><td></td>';
	var content = `
<table>
<tr><td>Name</td>
<td colspan="3"><input id="in" type="text"></td>
<tr><td>In</td><td style="width: 50px"><input id="in" type="number" disabled></td>
${ buttons }</tr>
<tr><td>Out</td><td><input id="out" type="number" disabled></td>
${ buttons }</tr>
</table>`
	info( {
		  icon         : 'mixers'
		, title        : 'New Mixer'
		, content      : content
		, values       : values
		, checkblank   : true
		, checkchanged : name
		, beforeshow : () => {
			$( '#infoContent td' ).css( 'width', '50px' );
			$( '#infoContent i' )
				.css( { width: '40px', 'line-height': '40px' } );
			$( '#infoContent' ).on( 'click', 'i', function() {
				var $this = $( this );
				var $input = $this.parents( 'tr' ).find( 'input' );
				var v = +$input.val();
				if ( $( this ).hasClass( 'up' ) ) {
					v++;
					$this.prev().removeClass( 'disabled' );
				} else {
					v--;
					$this.toggleClass( 'disabled', v === 0 );
				}
				$input.val( v ).trigger( 'keyup' );
			} );
		}
		, ok           : () => {
			var val = infoVal();
			if ( val.name in M ) {
				info( {
					  icon    : 'mixers'
					, title   : 'New Mixer'
					, message : 'Mixer: <wh>'+ val.name +'</wh> already exists.'
					, ok      : () => infoMixer( name )
				} );
				return
			}
			
			var mixer = {
				  channels : {
					  in  : val.in
					, out : val.out
				}
				, mapping : [ {
					  dest    : 0
					, mute    : false
					, sources : [ {
						  channel  : 0
						, gain     : 0
						, inverted : false
						, mute     : false
					} ]
				} ]
			}
			M[ val.name ] = mixer;
			console.log(M)
		}
	} );
}
function infoResampling( freeasync ) {
	var selectlabel        = [ 'Resampler type', 'Capture samplerate' ];
	var select             = [ L.sampletype, L.samplerate ];
	var numberlabel        = [ 'Other' ];
	var values             = {};
	[ 'resampler_type', 'capture_samplerate' ].forEach( k => values[ k ] = D[ k ] );
	if ( ! L.samplerate.includes( D.capture_samplerate ) ) values.capture_samplerate = 'Other';
	values.other = values.capture_samplerate;
	if ( freeasync ) {
		selectlabel.push( 'interpolation', 'window' );
		select.push( L.freeasync.interpolation, L.freeasync.window );
		numberlabel.push( 'Sinc length', 'Oversampling ratio', 'Frequency cutoff' );
		var F  = D.resampler_type.FreeAsync || {};
		values = {
			  resampler_type     : 'FreeAsync'
			, capture_samplerate : values.capture_samplerate
			, interpolation      : F.interpolation      || 'Linear'
			, window             : F.window             || 'Blackman2'
			, other              : values.capture_samplerate
			, sinc_len           : F.sinc_len           || 128
			, oversampling_ratio : F.oversampling_ratio || 1024
			, f_cutoff           : F.f_cutoff           || 0.925
		}
	}
	info( {
		  icon         : 'devices'
		, title        : 'Resampling'
		, selectlabel  : selectlabel
		, select       : select
		, numberlabel  : numberlabel
		, boxwidth     : 160
		, order        : [ 'select', 'number' ]
		, values       : values
		, checkchanged : D.enable_resampling
		, beforeshow   : () => {
			var $trnumber = $( '.trnumber' );
			var $trother = $trnumber.eq( 0 );
			var indextr  = freeasync ? [ 2, 1, 0 ] : [ 0 ]
			indextr.forEach( i => $( '.trselect' ).eq( 1 ).after( $trnumber.eq( i ) ) );
			$trother.toggleClass( 'hide', values.capture_samplerate !== 'Other' );
			$( '.trselect select' ).eq( 0 ).on( 'change', function() {
				if ( $( this ).val() === 'FreeAsync' ) {
					infoResampling( 'freeasync' );
				} else if ( $trnumber.length > 1 ) {
					infoResampling();
				}
			} );
			$( '.trselect select' ).eq( 1 ).on( 'change', function() {
				otherToggle( $trother, $( this ).val() );
			} );
		}
		, cancel       : switchCancel
		, ok           : () => {
			var val = infoVal();
			if ( val.capture_samplerate === 'Other' ) val.capture_samplerate = val.other;
			[ 'resampler_type', 'capture_samplerate' ].forEach( k => D[ k ] = val[ k ] );
			if ( freeasync ) {
				var v = {}
				L.freeasync.keys.forEach( k => v[ k ] = val[ k ] );
				D.resampler_type = { FreeAsync: v }
			}
			D.enable_resampling = true;
			saveConfig( 'Resampling' );
		}
	} );
}
function infoSaveFailed( title, name ) {
	info( {
		  icon    : 'SW.icon'
		, title   : title
		, message : iconwarning +'Save <wh>'+ name +'</wh> failed.'
	} );
}
function labelArraySet( array ) {
	var capitalized = array.map( el => key2label( el ) );
	return capitalized
}
function muteDestination( $el ) {
	var mute = $el.hasClass( 'mute' );
	var a    = mute ? 'i-devices mute'   : 'i-mute bl unmute';
	var b    = mute ? 'i-mute bl unmute' : 'i-devices mute';
	$el
		.removeClass( a )
		.addClass( b );
	var $li  = $el.parent();
	var name = $li.data( 'name' );
	var dest = $li.data( 'dest' );
	M[ name ].mapping[ dest ].mute = mute;
	console.log( M )
}
function otherToggle( $trother, rate ) {
	var other = rate === 'Other';
	$trother.toggleClass( 'hide', ! other );
	if ( ! other ) $trother.find( 'input' ).val( rate );
}
function renderDevices() {
	renderDevicesList( 'sampling', L.sampling );
	renderDevicesList( 'capture' );
	renderDevicesList( 'playback' );
	var keys = [];
	if ( D.enable_rate_adjust ) keys.push( 'adjust_period', 'target_level' );
	if ( D.enable_resampling ) keys.push( 'resampler_type', 'capture_samplerate' );
	keys.length ? renderDevicesList( 'options', keys ) : $( '#divoptions .statuslist' ).empty();
}
function renderDevicesList( section, keys ) {
	if ( [ 'capture', 'playback' ].includes( section ) ) {
		var kv = D[ section ]
		keys   = Object.keys( kv );
	} else {
		var kv = D;
	}
	if ( section === 'options' ) {
		var labels = '<hr>';
		var values = '<hr>';
	} else {
		var labels = '';
		var values = '';
	}
	keys.forEach( k => {
		labels += key2label( k ) +'<br>';
		values += kv[ k ] +'<br>';
	} );
	if ( D.resampler_type === 'FreeAsync' ) {
		[ 'sinc_len', 'oversampling_ratio', 'interpolation', 'window', 'f_cutoff' ].forEach( k => {
			labels += key2label( k ) +'<br>';
			values += D.resampler_type.FreeAsync[ k ] +'<br>';
		} );
	}
	$( '#div'+ section +' .statuslist' ).html(
		'<div class="col-l text gr">'+ labels +'</div><div class="col-r text">'+ values +'</div><div style="clear:both"></div>'
	);
}
function renderPage() {
	D        = S.config.devices;
	F        = S.config.filters;
	M        = S.config.mixers;
	P        = S.config.pipeline;
	S.bass   = F.Bass.parameters.gain;
	S.treble = F.Treble.parameters.gain;
	[ 'volume', 'bass', 'treble' ].forEach( el => {
		var val = S[ el ];
		$( '#'+ el +' input' ).val( val );
		$( '#'+ el +' .value' ).text( val +( val ? 'dB' : '' ) );
	} );
	$( '#statusvalue' ).html( S.status );
	var options = '';
	S.lsconf.forEach( f => options += '<option>'+ f.replace( '.yml', '' ) +'</option>' );
	$( '#profile, #fileconf' )
		.html( options )
		.val( S.fileconf );
	$( '#setting-profile' ).removeClass( 'hide' );
	$( '#divcapture, #divplayback' ).toggleClass( 'hide', ! S.camillaconf.capture_playback );
	var controlshide = $( '#controls' ).hasClass( 'hide' );
	if ( S.camillaconf.controls ) {
		if ( controlshide ) {
			$( '#controls' )
				.removeClass( 'hide' )
				.trigger( 'click' );
		}
	} else {
		if ( ! controlshide ) {
			$( '#controls' ).addClass( 'hide' );
			if ( L.currenttab === 'controls' ) $( '#devices' ).trigger( 'click' );
		}
	}
	renderTab( L.currenttab );
	showContent();
}
function renderTab( id ) {
	$( '#divsettings .headtitle' ).eq( 0 ).text( key2label( id ) )
	$( '.tab' ).addClass( 'hide' );
	$( '#div'+ L.currenttab ).removeClass( 'hide' );
	$( '#bar-bottom div' ).removeClass( 'active' );
	$( '#'+ L.currenttab ).addClass( 'active' );
	if ( id === 'devices' ) {
		renderDevices();
		return
	}
	
	var kv = S.config[ id ];
	if ( $.isEmptyObject( kv ) ) return
	
	if ( id === 'pipeline' ) {
		var li = '';
		kv.forEach( el => {
			li += '<li>'+ ico( id ) +'<div class="li1">'+ el.type +'<gr> · channel: '+ el.channel +'<gr></div>'
				 +'<div class="li2">'+ el.names.join( ' | ' ) +'</div></li>';
		} );
		$( '#div'+ id +' .entries' ).html( li );
		return
	}
	
	var data = {};
	Object.keys( kv ).sort().forEach( k => data[ k ] = kv[ k ] );
	if ( id === 'filters' ) {
		var li = '';
		$.each( data, ( k, v ) => {
			var val = JSON.stringify( v.parameters )
						.replace( /[{"}]/g, '' )
						.replace( 'type:', '' )
						.replace( /,/g, ', ' )
			li += '<li>'+ ico( id ) +'<div class="li1">'+ k +'</div>'
				 +'<div class="li2">'+ v.type +': '+ val +'</div></li>';
		} );
	} else if ( id === 'mixers' ) {
		if ( $( '.lihead' ).length ) return
		
		var li = '';
		$.each( data, ( k, v ) => {
			li += '<li>'+ ico( id ) +'<div class="li1">'+ k +'</div>'
				 +'<div class="li2">In: '+ v.channels.in +' - Out: '+ v.channels.out +'</div></li>';
		} );
	}
	$( '#div'+ id +' .entries' ).html( li );
}
function saveConfig( title ) {
	notify( SW.icon, title, 'Change ...' );
	bash( [ 'confsave', JSON.stringify( S.config ), 'CMD JSON' ], error => {
		if ( error ) {
			info( {
				  icon    : SW.icon
				, title   : SW.title
				, message : 'Error: '+ error
			} );
		}
	} );
}
