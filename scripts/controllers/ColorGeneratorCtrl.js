"use strict";

// Define our default color generator controller!
mcgApp.controller('ColorGeneratorCtrl',
function ($scope, $mdDialog, ColourLovers, $rootScope, $mdColorPalette )
{
	// Init function.
	// This is placed into a function
	// for ease-of-use in the future.
	// Often times an app needs to be
	// "Restarted" without a reload.
	$scope.init = function ()
	{
		// Reset palette to default color
		$scope.setDefaultPalette();

		// Define palettes
		$scope.palettes = [];
		$scope.colourlovers = [];

		// Toolbar is hidden by default.
		$scope.initSpeedDial();

		// Add a default palette
		$scope.addPaletteFromObject( $mdColorPalette.indigo );

		// Define theme defaults
		$scope.theme = {
			name: '',
            palettes: $scope.palettes
		};
	};

	$scope.initSpeedDial = function(){
		$scope.dialOpen = false;
	};

	// Function to replace all current palettes with an array of hex values.
	$rootScope.setPalettesByColors = function(colors){
		$scope.palettes = [];
		angular.forEach(colors, function( value ){
			$scope.palette.base = $scope.getLightestBase( '#' + value );
			$scope.addBasePalette();
		});
		$scope.setDefaultPalette();
	};

	// Function to add a palette from import code
	$scope.addPaletteFromJSON = function ( code )
	{
		// Break code into chunks to find JSON
		var chunks = code.split( /[{}]/ );
		var colorsObj = JSON.parse( '{' + chunks[ 1 ] + '}' );

		// Add this palette!
		$scope.addPaletteFromObject(colorsObj);
	};

	// Function to add a palette from
	// a JSON object (angularjs material
	// design format)
	$scope.addPaletteFromObject = function ( objectRef )
	{
		// First, clone object to clean it.
		var paletteObj = angular.copy( objectRef );

		// Init our customized palette values.
		var colors = [];
		var base = $scope.palette.base;

		// Build palette color json format
		angular.forEach( paletteObj, function ( value, key )
		{
			// If this is an object with RGB/Contrast values (Default angularjs palettes)
			if(typeof value == "object")
			{
				var color = {name: key};
				color.darkContrast = value.contrast && value.contrast[0] === 0;
				// Format it for tinycolor
				value = "rgb(" + value.value[ 0 ] + ", " + value.value[ 1 ] + ", " + value.value[ 2 ] + ")";
				color.hex = tinycolor(value).toHexString();
				colors.push(color);
			} else {
				colors.push(getColorObject(value, key));
			}

			// If this key is the base (500), set as base
			if ( key == 500 || key == "500" ) {
				base = value;
			}
		} );

		// Copy the base palette & add our customizations
		var palette = angular.copy( $scope.palette );
		palette.colors = colors;
		palette.base = base;

		// Push to the palette repository.
		$scope.palettes.push( palette );
	};

	function getColorObject(value, name) {
		var c = tinycolor(value);
		return {
			name: name,
			hex: c.toHexString(),
			darkContrast: c.isLight()
		};
	}

	// Function to add a palette to palettes.
	$scope.addBasePalette = function()
	{
		// Push on the default and then calculate it's values from it's base.
		$scope.palettes.push(angular.copy($scope.palette));
		$scope.calcPalette($scope.palettes.length-1);

		// Google Analytics Event Track
		ga('send', 'event', 'mcg', 'add_palette');
	};

	// Function to reset palette back to default.
	$scope.setDefaultPalette = function () {
		// Define base palette
		$scope.palette = {
			colors: [],
			orig:   [],
			base:   '#26a69a',
			json:   '',
			name:   ''
		};
	};

	// Function to calculate all colors for all palettes
	$scope.calcPalettes = function(){
		for(var i = 0; i < $scope.palettes.length; i++){
			$scope.calcPalette(i);
		}
	};

	// Function to delete a palette when passed it's key.
	$scope.deletePalette = function(key){
		$scope.palettes.remove(key);
		// Google Analytics Event Track
		ga('send', 'event', 'mcg', 'remove_palette');
	};

	// Function to assign watchers to all bases
	$scope.calcPalette = function(key){
		$scope.palettes[key].orig = $scope.computeColors($scope.palettes[key].base);
		$scope.palettes[key].colors = $scope.palettes[key].orig;
	};

	// Function to make the definePalette code for a palette.
	$scope.createDefinePalette = function(palette){
		return '$mdThemingProvider.definePalette(\'' + palette.name + '\', ' + $scope.makeColorsJson(palette.colors) + ');';
	};

	// Function to make an exportable json array for themes.
	$scope.makeColorsJson = function(colors){
		var exportable = {};
		var darkColors = [];
		angular.forEach(colors, function(value, key){
			exportable[value.name] = value.hex;
			if (value.darkContrast) {
				darkColors.push(value.name);
			}
		});
		exportable.contrastDefaultColor = 'light';
		exportable.contrastDarkColors = darkColors.join(' ');
		return angular.toJson(exportable, 2).replace(/"/g, "'");
	};

	// Function to calculate all colors from base
	// These colors were determined by finding all
	// HSL values for a google palette, calculating
	// the difference in H, S, and L per color
	// change individually, and then applying these
	// here.
	$scope.computeColors = function(hex)
	{
		// Return array of color objects.
		return [
			getColorObject(tinycolor( hex ).lighten( 52 ), '50'),
			getColorObject(tinycolor( hex ).lighten( 37 ), '100'),
			getColorObject(tinycolor( hex ).lighten( 26 ), '200'),
			getColorObject(tinycolor( hex ).lighten( 12 ), '300'),
			getColorObject(tinycolor( hex ).lighten( 6 ), '400'),
			getColorObject(tinycolor( hex ), '500'),
			getColorObject(tinycolor( hex ).darken( 6 ), '600'),
			getColorObject(tinycolor( hex ).darken( 12 ), '700'),
			getColorObject(tinycolor( hex ).darken( 18 ), '800'),
			getColorObject(tinycolor( hex ).darken( 24 ), '900'),
			getColorObject(tinycolor( hex ).lighten( 52 ), 'A100'),
			getColorObject(tinycolor( hex ).lighten( 37 ), 'A200'),
			getColorObject(tinycolor( hex ).lighten( 6 ), 'A400'),
			getColorObject(tinycolor( hex ).darken( 12 ), 'A700')
		];
	};

	// Function to prevent lightest
	// colors from turning into white.
	// Done by darkening base until the
	// brightest color is no longer #fff.
	$scope.getLightestBase = function(base)
	{
		// If this base's lightest color returns white
		if( tinycolor( base ).lighten( 52 ).toHexString().toLowerCase() == "#ffffff" )
		{
			// Darken it and try again
			return $scope.getLightestBase( tinycolor( base ).darken( 5 ).toHexString() );
		}

		// Otherwise,
		else
		{
			//...base is ready to rock!
			return base;
		}
	};

    // Function to show theme's full code
    $scope.showThemeCode = function()
    {
	    // Check to see that a theme name
	    if(typeof $scope.theme.name === 'undefined' || $scope.theme.name.length < 1) {
			// Set a default theme name
			$scope.theme.name = 'McgTheme';
	    }

		// If the first is not defined, add a palette.
		if(typeof $scope.palettes[0] === "undefined") {
			// Add a default palette
			$scope.addPaletteFromObject( $mdColorPalette.indigo );
		}

		// If the second is not defined, add a palette.
		if(typeof $scope.palettes[1] === "undefined") {
			// Add a default palette
			$scope.addPaletteFromObject( $mdColorPalette.indigo );
		}

		// For each of the user's palettes...
		angular.forEach($scope.palettes, function(palette, key){
			// If this palette does not have a name..
			if(typeof palette.name === 'undefined' || palette.name.length < 1 ) {
				// Define a default name for it
				palette.name = 'McgPalette'+key;
			}
		});

        // Init return string
        var themeCodeString = '';

        // For each palette, add it's declaration
        for(var i = 0; i < $scope.palettes.length; i++){
            themeCodeString = themeCodeString+$scope.createDefinePalette($scope.palettes[i])+'\n\r';
        }

        // Add theme configuration
        themeCodeString = themeCodeString +
        '$mdThemingProvider.theme(\'' + $scope.theme.name + '\')\n\r\t'+
        '.primaryPalette(\''+$scope.palettes[0].name+'\')\n\r\t'+
        '.accentPalette(\''+$scope.palettes[1].name+'\');'
        +'\n\r';

        // Show clipboard with theme code
        $scope.showClipboard(themeCodeString);

	    // Google Analytics Event Track
	    ga('send', 'event', 'mcg', 'copy_code_theme');
    };

	// Function to regenerate json and show dialog for palette.
	$scope.showPaletteCode = function(palette)
	{
		// Check to see that this palette has a name
		if (
			typeof palette === 'undefined' ||
			typeof palette.name === 'undefined' ||
			palette.name.length < 1
		) {
			alert('To generate the code for a palette the palette must have a name.');
			return false;
		}

		// Generate palette's code
		palette.json = $scope.createDefinePalette(palette);

		// Show code
		$scope.showClipboard(palette.json);

		// Google Analytics Event Track
		ga('send', 'event', 'mcg', 'copy_code_palette');
	};

    // Function to show export json for loading carts later
    $scope.showImport = function()
	{
		$mdDialog
			// Show the dialog to allow import
			.show( {
				templateUrl: 'templates/dialogs/import.html',
				controller: DialogImportCtrl
			} )
			// Once the user clicks import...
			.then( function ( code )
			{
				// ...add the palette!
				if ( typeof code == "object" ) {
					$scope.addPaletteFromObject( code );
				}else{
					$scope.addPaletteFromJSON( code );
				}
			}, function () { } );

		// Google Analytics Event Track
		ga( 'send', 'event', 'mcg', 'import_code' );
    };

	// Function to show export json for loading carts later
	$scope.showAbout = function ()
	{
		// Show about us section!
		$mdDialog.show( {
			templateUrl: 'templates/dialogs/about.html',
			controller:  AboutCtrl
		} );

		// Google Analytics Event Track
		ga( 'send', 'event', 'mcg', 'about_us' );
	};

	// Function to show generic clipboard alert dialog
	$scope.showClipboard = function(code)
	{
		// TODO: Move these controllers and templates to their own files.
		$mdDialog.show({
			template   : '<md-dialog aria-label="Clipboard dialog">' +
			'  <md-content>' +
			'    <pre>{{code}}</pre>' +
			'  </md-content>' +
			'  <div class="md-actions">' +
			'    <span ng-if="copied==true" ng-cloak class="animated fadeInUp">Code copied to clipboard!</span>'+
			'    <md-button class="md-accent" ui-zeroclip zeroclip-model="code" zeroclip-copied="showNotice()">' +
			'      Copy' +
			'    </md-button>' +
			'    <md-button ng-click="closeDialog()">' +
			'      Close' +
			'    </md-button>' +
			'  </div>' +
			'</md-dialog>',
			locals     : {
				code: code
			},
			controller : ClipboardDialogController
		});

		// Google Analytics Event Track
		ga('send', 'event', 'mcg', 'copy_code');

		// TODO: Move these controllers and templates to their own files.
		function ClipboardDialogController($scope, $mdDialog, $timeout, code)
		{
			$scope.code = code;
			$scope.copied = false;
			$scope.closeDialog = function () {
				$mdDialog.hide();
			};
			$scope.showNotice = function(){
				$scope.copied = true;
				$timeout(function(){
					$scope.copied = false;
				}, 1500);
			};
		}
	};

	// Function to show generic clipboard alert dialog
	$scope.showColourLovers = function () {
		$mdDialog.show( {
			templateUrl: '/templates/dialogs/colourlovers.html',
			controller: ColourLoversDialogController
		} );

		// Google Analytics Event Track
		ga( 'send', 'event', 'mcg', 'view_colourlovers' );

		function ColourLoversDialogController( $scope, $mdDialog, ColourLovers )
		{
			$scope.init = function(){
				$scope.colourlovers = [];
				$scope.setColors = $rootScope.setPalettesByColors;
				$scope.getTop();
			};

			// Get top colourlover palettes.
			$scope.getTop = function(){
				ColourLovers.getTop().success( function ( data ) {
					$scope.colourlovers = data;
				} );
			};

			// Get new colourlover palettes.
			$scope.getNew = function () {
				ColourLovers.getNew().success( function ( data ) {
					$scope.colourlovers = data;
				} );
			};

			// Get random colourlover palettes.
			$scope.getRandom = function () {
				ColourLovers.getRandom().success( function ( data ) {
					$scope.colourlovers = data;
				} );
			};

			// Function to close dialog
			$scope.closeDialog = function () {
				$mdDialog.hide();
			};

			$scope.init();
		}
	};

    // Function to darken a palette's color.
    $scope.darkenPaletteItem = function(color){
        color.hex = shadeColor(color.hex, -0.1);
    };

    // Function to lighten a palette's color.
    $scope.lightenPaletteItem = function(color){
        color.hex = shadeColor(color.hex, 0.1);
    };

	// Init controller
	$scope.init();
});
