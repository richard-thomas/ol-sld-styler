// ol-sld-styler Map Configuration: Full Layer Switcher + Legend demo
// All styling/data-specific settings can reside here
// - changes to this file do not require a Webpack rebuild

/* eslint no-unused-vars: 0 */

var mapConfig = {
    pageTitle: 'Full ol-sld-styler Example',

    // Vector data layers (+ styles) imported from QGIS in OGC GeoPackage format.
    // (Generated directly in QGIS using Processing > Package Layers)
    gpkgFiles: ['QGIS Packaged Layers (D+S Canal).gpkg',
        'QGIS Packaged Layers (OS Open Data).gpkg'],

    // Any additional SLD files
    sldFiles: ['sld/Probable path (10m nominal width).sld',
        'sld/Notable features (embedded PNG Marker).sld',
        'sld/OS 1st edition (PNG fill).sld'],

    // Map View Projection
    displayProjection: 'EPSG:3857',
    //displayProjection: 'EPSG:27700',

    // Initial map view [xmin, ymin, xmax, ymax]
    initialMapExtent: [-274429, 6662425, -272464, 6663939],

    // Radius of map click selection circle in pixels
    selectionHitTolerance: 5,

    // Increase to make (mobile) map click easier (but dragging less subtle)
    clickVsMoveTolerance: 2,

    // (Optional) Turn off visibility/fold map base layer selector at startup
    //baseLayerHideAtStartup: true,
    //baseLayerFoldAtStartup: true,

    // (Optional) DEBUG: Display (in console) dataLayersConfig template data
    // for this file, i.e. all tables in the GeoPackages and their attributes
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
                    label: 'Notable features (SVG marker)',
                    popupAttr: [['title'], ['description']]
                },
                {
                    table: 'Notable features (SVG Marker)',
                    label: 'Notable features (embedded PNG marker)',
                    styleName: 'Notable features (embedded PNG Marker)',
                    popupAttr: [['title'], ['description']],
                    visible: false
                },
                {
                    table: 'Probable path evidence',
                    popupAttr: [['ID'], ['Confidence', 'Confidence (0-10)'],
                       ['Confidence justification'], ['Map evidence rating'],
                       ['Map evidence'], ['Lidar DTM evidence rating'],
                       ['Lidar DTM evidence'], ['Visible evidence'], ['Notes']]
                },
                {
                    table: 'Probable path evidence',
                    label: 'Probable path (10m nominal width)',
                    styleName: 'Probable path (10m nominal width)',
                    selectable: false
                },
            ]
        },
        {
            table: 'Planned route (1796 Parliament Act map)',
            label: 'Planned route (1796 Parliament Act map) but the actual' +
                ' route differed in places by more than 200m [demonstrating' +
                ' wrapping of extremely long layer labels]',
            popupAttr: [['Title']]
        },
        {
            label: 'Digitizing Env Agency LIDAR DTM',
            fold: 'close',
            group: [
                {
                    table: 'Possible infrastructure',
                    popupAttr: [['Title'], ['Description']]
                },
                {
                    table: 'Possible canal centreline',
                    visible: false,
                    popupAttr: [['Description'],
                        ['likelihood_1_to_10', 'Likelihood (1-10)']]
                },
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
                            popupAttr: [['id'], ['Type'], ['Description']],
                            collapseSymbology: true
                        },
                        {
                            table: '1840s Tithe (canal)',
                            label: 'canal route',
                            popupAttr: [['id'], ['Type'], ['Description']]
                        }
                    ]
                },
                {
                    table: 'OS 1st edition (SVG Fill)',
                    label: 'OS 1st edition (SVG fill)',
                    popupAttr: [['id'], ['Type'], ['Title'], ['Description']]
                },
                {
                    label: 'Demo another group level',
                    group: [
                    {
                        label: 'Demo yet another extra group level',
                        group: [
                        {
                            table: 'OS 1st edition (SVG Fill)',
                            label: 'OS 1st edition (PNG fill)',
                            styleName: 'OS 1st edition (PNG fill)',
                            popupAttr: [['id'], ['Type'], ['Title'], ['Description']],
                            visible: false
                        },
                    ]},
                ]},
            ],
        },
        {
            table: 'Mapping extent',
            selectable: false,
        },
        {
            table: 'Contour lines (10m) - OS Terrain 50',
            selectable: false
        },
        {
            label: 'OS Open Data (context if no base map)',
            visible: true,
            group: [
                {
                    label: 'Place names',
                    table: 'OS Open Zoomstack - names',
                    olLayerOptions: {declutter: true},
                    selectable: false
                },
                {
                    label: 'Local buildings',
                    table: 'OS Open Zoomstack - local buildings',
                    selectable: false
                },
                {
                    label: 'Surface water',
                    table: 'OS Open Zoomstack - surface water',
                    forceSingleSymbol: true,
                    selectable: false
                },
                {
                    label: 'Woodland',
                    table: 'OS Open Zoomstack - woodland',
                    forceSingleSymbol: true,
                    selectable: false
                },
            ],
        }
    ],

    // Configuration of layer styling, for debug and for (optionally)
    // generating symbology icons for Legend and/or Layer Switcher
    sldStylerOptions: {
       // Turn on QGIS compatibility options to fix QGIS-specific SLD issues
        qgisCompatibility: {
            enable: true,

            // Redirect QGIS system SVG icon paths to URL relative path
            svgRedirectFolder: 'qgis_svg'
        },

        // (Optional) Generate symbols for Layer Switcher and/or Legend
        addLayerSwitcherSymbols: true,
        showLegend: true,

        // (Optional) Symbol size overrides for Layer Switcher and/or Legend
        lyrSwiSymbolSizing: {
            width: 25,
            height: 18,
            margin: 2
        },
        legendSymbolSizing: {
            width: 20,
            height: 15,
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
             * @param {object} ftso - FeatureTypeStyle object
             */
            function scaleLineSymbolizerDashArray(ftso) {
                // For any stroke dasharray in current object with stroke
                // width > 1, scale dasharray values by stroke width
                if (ftso.strokeDasharray && ftso.strokeWidth > 1) {
                    ftso.strokeDasharray = ftso.strokeDasharray.split(' ')
                        .map(x => parseFloat(x) * ftso.strokeWidth).join(' ');
                }

                // Recursively check any properties that are themselves
                // non-null objects for stroke dasharrays to scale
                for (var prop in ftso) {
                    if (Object.prototype.hasOwnProperty.call(ftso, prop) &&
                        typeof ftso[prop] === 'object' && ftso[prop]) {
                        scaleLineSymbolizerDashArray(ftso[prop]);
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
                case 'OS 1st edition (SVG Fill)':
                case 'OS 1st edition (PNG fill)':
                    // Scale (for resolution) sizing of hachure width and spacing
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
                            featureTypeStyle.rules[0].symbolizers;
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
        }
    }
};
