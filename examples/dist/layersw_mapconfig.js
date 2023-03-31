// ol-sld-styler Map Configuration: Layer Switcher demo
// All styling/data-specific settings can reside here
// - changes to this file do not require a Webpack rebuild

/* eslint no-unused-vars: 0 */

var mapConfig = {
    // Vector data layers (+ styles) imported from QGIS in OGC GeoPackage format.
    // (Generated directly in QGIS using Processing > Package Layers)
    gpkgFile: 'QGIS Packaged Layers (D+S Canal).gpkg',

    // Any additional SLD files
    sldFiles: ['sld/Probable path (10m nominal width).sld'],

    // Map View Projection
    displayProjection: 'EPSG:3857',

    // Initial map view [xmin, ymin, xmax, ymax]
    initialMapExtent: [-264129.300615, 6662945.427783, -257542.479715, 6667240.593291],

    // (Optional) DEBUG: Display (in console) template data for this file,
    // i.e. all tables in each Gpkg and their attributes
    //debugShowTableJson: true,

    // (Optional) DEBUG: display (in console) raw SLD for all layer_style tables
    //debugShowSLD: true,

    // Order, grouping and configuration of data layers
    dataLayersConfig: [
        {
            label: 'Dorset & Somerset Canal Summary',
            group: [
                {
                    table: 'Notable features (SVG Marker)',
                    label: 'Notable features'
                },
                {
                    table: 'Probable path evidence'
                },
                {
                    table: 'Probable path evidence',
                    label: 'Probable path (10m nominal width)',
                    styleName: 'Probable path (10m nominal width)'
                }
            ]
        },
        {
            table: 'Planned route (1796 Parliament Act map)',
            label: 'Planned route (1796 Parliament Act map) but the actual' +
                ' route differed in places by more than 200m [demonstrating' +
                ' wrapping of extremely long layer labels]',
        },
        {
            label: 'Digitizing Env Agency LIDAR DTM',
            group: [
                {
                    table: 'Possible infrastructure'
                },
                {
                    visible: false,
                    table: 'Possible canal centreline'
                }
            ]
        },
        {
            label: 'Traced Map Features',
            group: [
                {
                    label: '1840s Tithe',
                    visible: false,
                    group: [
                        {
                            table: '1840s Tithe (boundary lines)',
                            label: 'boundary lines',
                            collapseSymbology: true
                        },
                        {
                            table: '1840s Tithe (canal)',
                            label: 'canal route',
                        }
                    ]
                },
                {
                    table: 'OS 1st edition (SVG Fill)',
                    label: 'OS 1st edition',
                }
            ]
        },
        {
            table: 'Mapping extent'
        }
    ],

    // Configuration of layer styling, for debug and for (optionally)
    // generating symbology icons for Legend and/or Layer Switcher
    sldStylerOptions: {
        // (Optional) Generate symbols for Layer Switcher
        addLayerSwitcherSymbols: true,

        // (Optional) Symbol size overrides for Layer Switcher
        lyrSwiSymbolSizing: {
            width: 25,
            height: 18,
            margin: 2
        },

        // (Optional) DEBUG: display (in console) for all SLD-styled layers the
        // "featureTypeStyle" (i.e. styling from the SLD after parsing)
        //debugShowFeatureTypeStyle: true,

        // (Optional) custom tweaks to "featureTypeStyle" extracted from QGIS
        // "layer_styles" SLD style information in OGC GeoPackage
        tweakFeatureTypeStyle: function(styleName, featureTypeStyle) {
            switch (styleName) {

                // Scale stroke dasharrays by stroke width to overcome bug in QGIS
                // "package layers" export of predefined (not custom) dash patterns
                case 'Probable path evidence':
                case 'Mapping extent':
                case 'Possible infrastructure':
                case 'Possible canal centreline':
                    scaleLineSymbolizerDashArray(featureTypeStyle);
                    break;
            }
            return featureTypeStyle;

            /**
             * Scale all stroke dasharrays in FeatureTypeStyle by stroke width
             * (helper function to overcome bug in QGIS "package layers" export
             *  when using predefined (not custom) dash patterns)
             * @param {object} o - FeatureTypeStyle object
             */
            function scaleLineSymbolizerDashArray(o) {
                if (o.strokeDasharray && o.strokeWidth > 1) {
                    o.strokeDasharray = o.strokeDasharray.split(' ')
                        .map(x => parseFloat(x) * o.strokeWidth).join(' ');
                }
                for (var p in o) {
                    if (Object.prototype.hasOwnProperty.call(o, p) &&
                        typeof o[p] === 'object' ) {
                        scaleLineSymbolizerDashArray(o[p]);
                    }
                }
            }
        },

        // (Optional) overrides to olStyle for things not possible to define
        // in "featureTypeStyle" itself. Gets called for every visible feature
        // (i.e. olStyle array will not be empty)
        // Args:
        //  featureTypeStyle: symbol style definition
        //  olStyle: OpenLayers Styles array
        //  styleName: styleName (or if not defined: table) from dataLayersConfig
        //  feature: current Openlayers Feature (or example feature if createSymbol true)
        //  resolution: (real) resolution in metres/pixel
        //  resolutionChanged: has resolution changed for any styles used by current feature
        //  createSymbol: call is only to create a symbol for Layer Switcher / Legend
        //  symbolLabel: symbol label (only defined when createSymbol true)
        tweakOlStyle: function(featureTypeStyle, olStyle, styleName, feature,
            resolution, resolutionChanged, createSymbol, symbolLabel) {

            // Current layers only need adjusting when resolution (zoom) changes
            if (!resolutionChanged) {
                return olStyle;
            }

            switch (styleName) {
                case 'Notable features (SVG Marker)':
                    // Set Point Symbolizer displacement from SLD values
                    // exported by QGIS (currently ignored by sldreader)
                    setIconDisplacement(
                        featureTypeStyle.rules[0].pointsymbolizer.graphic.displacement,
                        olStyle[0].getImage());
                    break;

                // Scale width from pixels to metres
                // (for a projected SRS, resolution = metres/pixel)
                case 'Probable path (10m nominal width)':
                    if (createSymbol) {
                        resolution = 3.0;
                    }
                    olStyle[0].stroke_.width_ = featureTypeStyle.rules[0]
                        .linesymbolizer.stroke.styling.strokeWidth / resolution;
                    break;

                // Scale (for resolution) sizing of hachure width and spacing
                case 'OS 1st edition (SVG Fill)':
                    if (createSymbol) {
                        // For legend / layer switcher hand-craft resolution
                        // (symbolLabel will be provided)
                        resolution = 0.3;
                    } else {
                        var props = feature.getProperties();
                        symbolLabel = props.Type;
                    }
                    if (symbolLabel === 'Hachure') {
                        var hachureLineSymbolizers =
                            featureTypeStyle.rules[0].linesymbolizer;
                        if (!Array.isArray(hachureLineSymbolizers)) {
                            hachureLineSymbolizers = [hachureLineSymbolizers];
                        }
                        for (var i=0; i < hachureLineSymbolizers.length; i++) {

                            // Scale width from pixels to metres (min 3 pixels)
                            // (for a projected SRS, resolution = metres/pixel)
                            var pixelWidth = hachureLineSymbolizers[i].stroke
                                .styling.strokeWidth / resolution;
                            pixelWidth = (pixelWidth < 3) ? 3 : pixelWidth;
                            olStyle[i].stroke_.width_ = pixelWidth;

                            // Scale any linedash spacing (within limits)
                            var lineDashDef = hachureLineSymbolizers[i].stroke
                                .styling.strokeDasharray;
                            if (lineDashDef) {
                                var linePx = 1;
                                // OS 1st edition style 0 is a background "halo"
                                if (i === 0) {
                                    olStyle[0].stroke_.lineDashOffset_ = 1;
                                    linePx = 3;
                                }
                                var repeatPx = Math.max(3,
                                    Math.min(0.5/resolution, 25));
                                if (linePx >= repeatPx) {
                                    linePx = 1;
                                }
                                var gapPx = repeatPx - linePx;
                                var lineDash = [linePx, gapPx];
                                olStyle[i].stroke_.lineDash_ = lineDash;
                            }
                        }
                    }
                    break;
            }
            return olStyle;

            /**
             * Set Point Symbolizer displacement from SLD displacement values
             * (as exported by QGIS) but currently ignored by sldReader
             * (Uses new setDisplacement() method introduced in OL 6.10.0)
             * @param {object} displacement - Feature Type Style rule
             *      pointsymbolizer.graphic.displacement object
             * @param {object} olStyleIcon - OpenLayers Style Icon Image object
             */
            function setIconDisplacement(displacement, olStyleIcon) {
                // Only define displacement once
                if (olStyleIcon.displacementDefined) {
                    return;
                }
                // Note that QGIS/GeoServer define Point Symbolizer Y
                // displacement as downwards positive, so we negate it here.
                // (It was not defined in SLD 1.0.0 specification, though
                //  SLD SE 1.1.0 unfortunately defined it as upwards positive.)
                var olDispX = Number(displacement.displacementx);
                var olDispY = -Number(displacement.displacementy);
                olStyleIcon.setDisplacement([olDispX, olDispY]);
                olStyleIcon.displacementDefined = true;
            }
        }
    }
};
