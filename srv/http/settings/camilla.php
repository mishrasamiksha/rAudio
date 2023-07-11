<?php
function htmlPanel( $title, $content = '', $noadd = '' ) {
	return '
<div id="div'.$title.'" class="section hide">
	<heading class="head"><span class="headtitle">'.i( 'filters' ).ucFirst( $title ).( $noadd ? '' : i( 'plus-circle add' ) ).'</span></heading>
	'.$content.'
</div>
';
}
?>

<div id="divcontrols-status" class="panel">

<div id="divcontrols" class="section">
<heading><span class="headtitle"><?=i( 'volume' )?>Controls</span></heading>
<div id="controls">
	<div id="volume" class="range">
		<code class="name">Gain</code><div class="value">0</div>
		<input type="range" min="-54" max="5" value="0">
	</div>
	<div id="bass" class="range">
		<code class="name">Bass</code><div class="value">0</div>
		<input type="range" min="-6" max="6" step="0.1" value="0">
	</div>
	<div id="treble" class="range">
		<code class="name">Treble</code><div class="value">0</div>
		<input type="range" min="-6" max="6" step="0.1" value="0">
	</div>
</div>
<div style="clear:both"></div>
</div>

<div id="divstatus" class="section">
<heading><span class="headtitle">Status</span><?=i( 'file log' ).i( 'undo' ).i( 'redo' )?></heading>
<div class="col-l text gr">
		State
	<br>Sample rate
	<br>Rate adjust
	<br>Clipped samples
	<br>Buffer level
	<br>Configuration
</div>
<div class="col-r text">
	<div id="statusvalue"></div>
</div>
<div style="clear:both"></div>
</div>

</div>

<div id="divtabs" class="panel tab">

<?php
$title_data = [
	  'Capture'  => ''
	, 'Playback' => ''
	, 'Sampling' => ''
	, 'Options'  => [
		  'Rate Adjust'         => 'enable_rate_adjust'
		, 'Resampling'          => 'enable_resampling'
		, 'Stop on Rate Change' => 'stop_on_rate_change'
	]
];
$htmldevices = '';
foreach( $title_data as $title => $data ) {
	$html = '<div class="statuslist"></div>';
	if ( $title === 'Options' ) {
		$settingtitle = '';
		foreach( $data as $label => $id ) {
			if ( $id === 'stop_on_rate_change' ) {
				$common = '';
				$setting = '';
			} else {
				$common = ' common';
				$setting = '<i id="setting-'.$id.'" class="i-gear setting"></i>';
			}
			$input = '<input id="'.$id.'" type="checkbox" class="switch'.$common.'">'
					.'<div class="switchlabel"></div>'.$setting;
			$html.=  '<div id="div'.$id.'">'
					.'<div class="col-l single name">'.$label.'</div><div class="col-r">'.$input
					.'</div><div style="clear:both"></div>'
					.'</div>';
		}
	} else {
		$settingtitle = i( 'gear' );
	}
	$htmldevices.= '
<div id="div'.lcFirst( str_replace( ' ', '', $title ) ).'" class="section">
<heading class="subhead"><span class="headtitle">'.$title.$settingtitle.'</span></heading>
<div class="content">'.$html.'</div>
</div>
';
}
$html = htmlPanel( 'devices', $htmldevices, 'noadd' );
foreach( [ 'filters', 'mixers', 'pipeline' ] as $tab ) $html.= htmlPanel( $tab );
echo $html;
?>

</div>